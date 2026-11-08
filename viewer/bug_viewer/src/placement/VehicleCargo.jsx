// Vehicle cargo placement in the game (Stage 3, only mounted with ?placement=1). Rendered INSIDE a vehicle's group (DriveWorld's Vehicle for
// the one you use, Fleet for parked ones), so everything here is in the vehicle's own frame: placed items ride along, stay put while driving.
// Each instance draws that vehicle's grid items, its ghost while you aim at it, and registers itself; the instance in the active vehicle
// (host) also runs the aim controller: a ray from the screen centre (the crosshair) against every registered vehicle's items and surfaces.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { game, useGame } from '../game/store.js';
import { held, nameOfItem } from '../game/items.js';
import { Crate } from '../game/Items.jsx';
import { resolve } from '../build.js';
import { BUG } from '../rules/vehicles.js';
import { isFitted } from '../rules/restore.js';
import { HOLO, holoMaterials, ghostify, footprint } from '../hologram.js';
import { snapPoint, rotatedFootprint, restY, why, clipTo, posed } from './rules.js';
import { placement } from './types.js';
import { surfacesFor, toCar, fromCar } from './vehicleSurfaces.js';
import { GAME_PLACEABLES, isTire } from './gameItems.js';
import { aim, keys, holdOf, pidOf, gridItems, toPl } from './cargoStore.js';
import { placementWheel, placementShift } from './input.js';
import { TireModel, useGridGeometry, UNIT_SQUARE } from './Preview.jsx';

const REACH = 3.2;                       // PROPOSAL: metres from your eye you can set something down / take it out
const REG = new Map();                   // veh id -> { root, items, surfaces() }
const CENTER = new THREE.Vector2(0, 0), INV = new THREE.Matrix4(), RAY = new THREE.Ray(), P = new THREE.Vector3(), W = new THREE.Vector3();

/** the vehicle's surfaces right now (all: also the closed ones, to draw what's inside) */
function vehSurfaces(veh, lift, all) {
  const b = game.build;
  return surfacesFor(veh, veh !== 'bug' ? { all } : { all, body: b?.body, parts: b?.parts, lift, coverFitted: id => !!b && isFitted(BUG, b, id), coverOpen: id => !!game.open?.has(id) });
}

/** one placed thing, base at y = 0, centred: tires as tires (flat or upright), everything else as the game draws it (a labelled crate / its model) */
function ItemBody({ it, pose, ghost = false }) {
  const pid = pidOf(it), p = posed(GAME_PLACEABLES[pid], pose);
  if (isTire(it)) return <TireModel dia={GAME_PLACEABLES.tire.footprint[0]} width={GAME_PLACEABLES.tire.height} upright={p.pose === 'upright'} cast={!ghost} />;
  return <Crate item={it} />;
}

export default function VehicleCargo({ veh, host = false }) {
  useGame();
  const root = useRef(), items = useRef();
  const lift = useMemo(() => (veh === 'bug' && game.build ? resolve(game.build).lift || 0 : 0), [veh, game.build]);
  const all = vehSurfaces(veh, lift, true), byId = Object.fromEntries(all.map(s => [s.id, s]));
  useEffect(() => { REG.set(veh, { root, items, surfaces: () => vehSurfaces(veh, lift, false), all: () => vehSurfaces(veh, lift, true) }); return () => { if (REG.get(veh)?.root === root) REG.delete(veh); }; }, [veh, lift]);
  const mine = gridItems(veh).filter(it => byId[it.surf]);
  return <group ref={root}>
    <group ref={items}>{mine.map(it => { const s = byId[it.surf], c = toCar(s, it.x, it.z, it.y || 0);
      return <group key={it.uid} position={[c.x, c.y, c.z]} rotation={[0, s.at.rotY + (it.ry || 0), 0]} userData={{ uid: it.uid }}><React.Suspense fallback={null}><ItemBody it={it} pose={it.pose || null} /></React.Suspense></group>; })}</group>
    <Ghost veh={veh} />
    {host && <Controller />}
  </group>;
}

/** the hologram of the held item where it would go on this vehicle, its landing outline and the surface grid */
function Ghost({ veh }) {
  const mats = useMemo(() => holoMaterials(), []);
  const patch = useMemo(() => { const m = footprint(1, 1, mats); m.position.y = 0; return m; }, [mats]);
  const g = useRef(), inner = useRef(), land = useRef(), grid = useRef();
  const [shown, setShown] = useState(null);   // { key, it, pose, sid, step } of what the ghost shows (render state only)
  useEffect(() => () => { mats.dispose(); patch.geometry.dispose(); }, [mats, patch]);
  const gs = shown?.s, lines = useGridGeometry(gs, shown?.step || 1);
  useFrame(({ clock }) => {
    const a = aim.cur, it = held(), on = a?.mode === 'place' && a.veh === veh && !!it;   // (aim.cur is last frame's: the item may have just been put down)
    if (!on) { if (shown) setShown(null); return; }
    const key = `${it.uid}|${a.cand.pose || ''}|${a.surface.id}|${a.surface.gridSteps[0]}`;
    if (shown?.key !== key) setShown({ key, it, pose: a.cand.pose || null, s: a.surface, step: a.surface.gridSteps[0] });
    if (!g.current) return;
    if (inner.current) ghostify(inner.current, mats);
    mats.pulse(clock.elapsedTime, true); mats.set(a.reason ? HOLO.bad : HOLO.ok);
    const s = a.surface, c = toCar(s, a.cand.x, a.cand.z, a.cand.y);
    g.current.position.set(c.x, c.y, c.z); g.current.rotation.set(0, s.at.rotY + a.cand.rot, 0);
    const [fw, fd] = rotatedFootprint(posed(GAME_PLACEABLES[a.cand.item], a.cand.pose).footprint, a.cand.rot), l = toCar(s, a.cand.x, a.cand.z, a.cand.y + 0.006);
    land.current.position.set(l.x, l.y, l.z); land.current.rotation.set(0, s.at.rotY, 0); land.current.scale.set(fw, 1, fd);
    if (grid.current) { const o = toCar(s, 0, 0, 0.004); grid.current.position.set(o.x, o.y, o.z); grid.current.rotation.set(0, s.at.rotY, 0); }
  });
  if (!shown) return null;
  return <>
    <group ref={g}><group ref={inner} key={shown.key}><React.Suspense fallback={null}><ItemBody it={shown.it} pose={shown.pose} ghost /></React.Suspense></group></group>
    <group ref={land}><primitive object={patch} /><lineLoop geometry={UNIT_SQUARE} material={mats.edge} renderOrder={12} /></group>
    {lines && <group ref={grid}>
      <lineSegments geometry={lines.lines} renderOrder={8}><lineBasicMaterial color="#dff6ff" transparent opacity={0.28} depthWrite={false} /></lineSegments>
      <lineLoop geometry={lines.border} renderOrder={8}><lineBasicMaterial color="#dff6ff" transparent opacity={0.7} depthWrite={false} /></lineLoop>
    </group>}
  </>;
}

const uidUnder = o => { for (; o; o = o.parent) if (o.userData?.uid) return o.userData.uid; return null; };

/** the aim controller (one, in the active vehicle): decides aim.cur every frame and shows a one-line hint */
function Controller() {
  const { camera, raycaster } = useThree();
  const hint = useRef(null), last = useRef('');
  useEffect(() => {
    const el = document.createElement('div'); el.dataset.cargoHint = '';
    Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: '6px', background: 'rgba(10,16,18,0.78)', color: '#e6efe9', font: '600 13px system-ui, sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: 20, display: 'none', whiteSpace: 'pre' });
    document.body.appendChild(el); hint.current = el;
    window.__cargo = {   // test hook: what's aimed at, and where a surface-local point is in the world
      aim, vehicles: () => [...REG.keys()], surfaces: veh => REG.get(veh)?.all().map(s => ({ id: s.id, size: s.size, usable: s.usable })),
      world(veh, sid, lx, lz, ly = 0) { const r = REG.get(veh), s = r?.all().find(x => x.id === sid); if (!s) return null; const c = toCar(s, lx, lz, ly); return r.root.current.localToWorld(new THREE.Vector3(c.x, c.y, c.z)).toArray(); },
    };
    const wheel = e => placementWheel(e), sh = e => placementShift(e);
    window.addEventListener('wheel', wheel, { capture: true, passive: false }); window.addEventListener('keydown', sh); window.addEventListener('keyup', sh); window.addEventListener('blur', sh);
    return () => { el.remove(); aim.cur = null; delete window.__cargo; window.removeEventListener('wheel', wheel, { capture: true }); window.removeEventListener('keydown', sh); window.removeEventListener('keyup', sh); window.removeEventListener('blur', sh); };
  }, []);
  const show = (text, color) => { const k = text + color; if (k === last.current || !hint.current) return; last.current = k; hint.current.style.display = text ? 'block' : 'none'; hint.current.style.color = color || '#e6efe9'; hint.current.textContent = text; };

  useFrame(() => {
    aim.cur = null;
    if (!game.onFoot || game.buildMode || game.paused) return show('');
    raycaster.setFromCamera(CENTER, camera);
    let best = null;
    for (const [veh, r] of REG) {
      if (!r.root.current || !r.items.current) continue;
      const hit = raycaster.intersectObject(r.items.current, true).find(h => h.distance < REACH);
      if (hit && (!best || hit.distance < best.d)) best = { d: hit.distance, veh, r, uid: uidUnder(hit.object), point: hit.point.clone() };
      INV.copy(r.root.current.matrixWorld).invert(); RAY.copy(raycaster.ray).applyMatrix4(INV);
      for (const s of r.surfaces()) {
        if (Math.abs(RAY.direction.y) < 1e-4) continue;
        const t = (s.at.y - RAY.origin.y) / RAY.direction.y; if (t <= 0) continue;
        RAY.at(t, P); const l = fromCar(s, P.x, P.z);
        if (l.x < -0.05 || l.z < -0.05 || l.x > s.size[0] + 0.05 || l.z > s.size[1] + 0.05) continue;
        const d = W.copy(P).applyMatrix4(r.root.current.matrixWorld).distanceTo(camera.position);
        if (d < REACH && (!best || d < best.d)) best = { d, veh, r, s, local: l };
      }
    }
    const h = held();
    if (!best) return show('');
    if (!h) {   // empty-handed: aiming at a placed item = take it out
      const it = best.uid && game.items.find(i => i.uid === best.uid);
      if (!it) return show('');
      const s = best.r.surfaces().find(x => x.id === it.surf) || vehSurfaces(best.veh, 0, true).find(x => x.id === it.surf);
      aim.cur = { mode: 'take', veh: best.veh, uid: it.uid, surface: s, name: nameOfItem(it) };
      return show(`Click — Take out ${nameOfItem(it)}`);
    }
    const pid = pidOf(h); if (!pid) return show(`${nameOfItem(h)} won't fit on a vehicle`, '#ffb43a');
    let s = best.s, local = best.local;
    if (best.uid) {   // the ray landed on a placed item: use its surface and the hit point (so you can stack on it)
      const it = game.items.find(i => i.uid === best.uid);
      s = best.r.surfaces().find(x => x.id === it?.surf); if (!s) return show('');
      const c = best.r.root.current.worldToLocal(best.point); local = fromCar(s, c.x, c.z);
    }
    const hp = holdOf(h), item = posed(GAME_PLACEABLES[pid], hp.pose), free = !keys.shift;
    const p = snapPoint(s, local.x, local.z, free ? 'free' : 0, item.footprint, hp.rot);
    const existing = gridItems(best.veh).map(toPl);
    let cand = placement({ id: 'ghost', item: pid, surface: s.id, x: p.x, z: p.z, rot: hp.rot, free, pose: hp.pose });
    cand.y = restY(cand, item, existing, GAME_PLACEABLES);
    const clipped = free ? clipTo(s, item, cand, existing, GAME_PLACEABLES) : cand;
    const didClip = clipped !== cand; cand = clipped;
    const reason = why(s, item, cand, existing, GAME_PLACEABLES);
    aim.cur = { mode: 'place', veh: best.veh, surface: s, cand, reason, clipped: didClip, name: nameOfItem(h) };
    const status = reason || (cand.y > 1e-6 ? 'fits (stacked)' : didClip ? 'fits (clipped)' : 'fits');
    show(`${nameOfItem(h)} → ${s.name}: ${status}\nClick — Put it here  ·  Q/E — Turn  ·  R — 90°${GAME_PLACEABLES[pid].poses && Object.keys(GAME_PLACEABLES[pid].poses).length ? '  ·  T — Stand up / lay flat' : ''}  ·  Shift — Grid`, reason ? '#ff8a7a' : '#7dff98');
  });
  return null;
}
