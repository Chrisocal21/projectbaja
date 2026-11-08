// Tires on the garage floor and tire racks (Stage 4c). Same approach as VehicleCargo.jsx: draws the stored tires, runs an aim controller (a ray from the
// crosshair against the tire surfaces) and shows the shared green / red ghost (VehicleCargo's Ghost). One group in garage-local space (at the garage
// site, turned by G.rot), so a tire on a rack follows the rack when it is moved. Only a held TIRE is aimed at the garage; other items are untouched.
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { game, useGame } from '../game/store.js';
import { held, nameOfItem } from '../game/items.js';
import { SITES, groundHeight } from '../worlds/county.js';
import { buildById } from '../game/home.js';
import { snapPoint, restY, why, clipTo, posed } from './rules.js';
import { placement } from './types.js';
import { toCar, fromCar } from './vehicleSurfaces.js';
import { GAME_PLACEABLES, isTire } from './gameItems.js';
import { aim, keys, holdOf } from './cargoStore.js';
import { garageAim, garageGrid } from './garageStore.js';
import { garageSurfaces, garagePl } from './garageSurfaces.js';
import { ItemBody, Ghost } from './VehicleCargo.jsx';

const G = SITES.garage, REACH = 3.2;   // PROPOSAL: same reach as vehicle cargo
const CENTER = new THREE.Vector2(0, 0), INV = new THREE.Matrix4(), RAY = new THREE.Ray(), P = new THREE.Vector3(), W = new THREE.Vector3();
const uidUnder = o => { for (; o; o = o.parent) if (o.userData?.uid) return o.userData.uid; return null; };
export const liveSurfaces = () => garageSurfaces(game.props, buildById, G, groundHeight, game.buildMode?.moving?.uid || 0);

export default function GarageCargo() {
  useGame();
  const root = useRef(), items = useRef();
  const surfaces = useMemo(liveSurfaces, [game.props, game.buildMode?.moving?.uid]);
  const byId = Object.fromEntries(surfaces.map(s => [s.id, s]));
  const mine = garageGrid().filter(it => byId[it.surf]);
  return <group ref={root} position={[G.x, G.y || 0, G.z]} rotation={[0, G.rot, 0]}>
    <group ref={items}>{mine.map(it => { const s = byId[it.surf], c = toCar(s, it.x, it.z, it.y || 0);
      return <group key={it.uid} position={[c.x, c.y, c.z]} rotation={[0, s.at.rotY + (it.ry || 0), 0]} userData={{ uid: it.uid }}><React.Suspense fallback={null}><ItemBody it={it} pose={null} /></React.Suspense></group>; })}</group>
    <Ghost veh="garage" src={garageAim} />
    <Controller root={root} items={items} />
  </group>;
}

function Controller({ root, items }) {
  const { camera, raycaster } = useThree();
  const hint = useRef(null), last = useRef('');
  useEffect(() => {
    const el = document.createElement('div'); el.dataset.garageHint = '';
    Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: '6px', background: 'rgba(10,16,18,0.78)', color: '#e6efe9', font: '600 13px system-ui, sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: 20, display: 'none', whiteSpace: 'pre' });
    document.body.appendChild(el); hint.current = el;
    window.__garage = {   // test hook: what's aimed at, the surfaces, and where a surface-local point is in the world
      aim: garageAim, surfaces: () => liveSurfaces().map(s => ({ id: s.id, size: s.size, y: s.at.y })),
      world(sid, lx, lz, ly = 0) { const s = liveSurfaces().find(x => x.id === sid); if (!s || !root.current) return null; const c = toCar(s, lx, lz, ly); return root.current.localToWorld(new THREE.Vector3(c.x, c.y, c.z)).toArray(); },
    };
    return () => { el.remove(); garageAim.cur = null; delete window.__garage; };
  }, []);
  const show = (text, color) => { const k = text + color; if (k === last.current || !hint.current) return; last.current = k; hint.current.style.display = text ? 'block' : 'none'; hint.current.style.color = color || '#e6efe9'; hint.current.textContent = text; };

  useFrame(() => {
    garageAim.cur = null;
    if (!game.onFoot || game.buildMode || game.paused || !root.current || aim.cur) return show('');   // (aim.cur = the vehicle cargo has the crosshair)
    const h = held(); if (h && !isTire(h)) return show('');
    raycaster.setFromCamera(CENTER, camera);
    root.current.updateWorldMatrix(true, false); INV.copy(root.current.matrixWorld).invert(); RAY.copy(raycaster.ray).applyMatrix4(INV);
    const surfaces = liveSurfaces(); let best = null;
    const hit = items.current && raycaster.intersectObject(items.current, true).find(x => x.distance < REACH);
    if (hit) best = { d: hit.distance, uid: uidUnder(hit.object), point: hit.point.clone() };
    for (const s of surfaces) {
      if (Math.abs(RAY.direction.y) < 1e-4) continue;
      const t = (s.at.y - RAY.origin.y) / RAY.direction.y; if (t <= 0) continue;
      RAY.at(t, P); const l = fromCar(s, P.x, P.z);
      if (l.x < -0.05 || l.z < -0.05 || l.x > s.size[0] + 0.05 || l.z > s.size[1] + 0.05) continue;
      const d = W.copy(P).applyMatrix4(root.current.matrixWorld).distanceTo(camera.position);
      if (d < REACH && (!best || d < best.d)) best = { d, s, local: l };
    }
    if (!best) return show('');
    const grid = garageGrid();
    if (!h) {   // empty-handed: aiming at a stored tire = take it
      const it = best.uid && grid.find(i => i.uid === best.uid); if (!it) return show('');
      garageAim.cur = { mode: 'take', veh: 'garage', uid: it.uid, name: nameOfItem(it) };
      return show(`Click — Take ${nameOfItem(it)}`);
    }
    let s = best.s, local = best.local;
    if (best.uid) {   // the ray landed on a stored tire: use its surface and the hit point (so you can stack on it)
      const it = grid.find(i => i.uid === best.uid); s = it && surfaces.find(x => x.id === it.surf); if (!s) return show('');
      const c = root.current.worldToLocal(best.point); local = fromCar(s, c.x, c.z);
    }
    const hp = holdOf(h), existing = grid.map(garagePl), T = GAME_PLACEABLES.tire, free = !keys.shift, item = posed(T, null);
    const p = snapPoint(s, local.x, local.z, free ? 'free' : 0, item.footprint, hp.rot);
    let cand = placement({ id: 'ghost', item: 'tire', surface: s.id, x: p.x, z: p.z, rot: hp.rot, free });
    cand.y = restY(cand, item, existing, GAME_PLACEABLES);
    const clipped = free ? clipTo(s, item, cand, existing, GAME_PLACEABLES) : cand, didClip = clipped !== cand; cand = clipped;
    const reason = why(s, item, cand, existing, GAME_PLACEABLES);
    garageAim.cur = { mode: 'place', veh: 'garage', surface: s, cand, reason, clipped: didClip, name: nameOfItem(h) };
    const status = reason || (cand.y > 1e-6 ? 'fits (stacked)' : didClip ? 'fits (clipped)' : 'fits');
    show(`${nameOfItem(h)} → ${s.name}: ${status}\nClick — Put it here  ·  Q/E — Turn  ·  R — 90°  ·  Shift — Grid`, reason ? '#ff8a7a' : '#7dff98');
  });
  return null;
}
