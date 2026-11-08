// Placement Lab: an isolated test scene for grid placement, reached ONLY with ?lab=placement (main.jsx lazy-loads this file; without the flag
// none of it is even downloaded). Not the game: no save, no store, no game state. Pick something up, the ghost follows the mouse over a
// surface (green fits, red doesn't + why), click to put it down. Placement is FREE by default; hold Shift to lock it to the grid.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { snapRot, bounds, overlaps, stackHeight, posed, EPS } from './rules.js';
import { placement } from './types.js';
import { SURFACES, ITEMS, itemById, surfaceById, START, toWorld, toLocal, worldRot } from './labData.js';
import Preview, { ItemModel, probe } from './Preview.jsx';

// CONTROLS (owner decisions). Pick up = LEFT CLICK on the item, never a key. E is reserved in the real game for entering vehicles /
// opening doors, so E may ONLY mean "rotate" WHILE an item is held; never bind E (or any key) to pick-up.
//   free placement by default · hold Shift = snap to the surface's grid · wheel = rotate 5° (Shift: 90°), never zooms while holding
//   Q / E = rotate one way / the other (15°, Shift: 90°) · R = next 90° · [ ] = grid step · Esc / right-click = cancel · Del / X = discard
const DEG = Math.PI / 180, KEY_STEP = 15 * DEG, WHEEL_STEP = 5 * DEG, QUARTER = Math.PI / 2;
const CLICK_PX = 5;   // a press that moves less than this is a click; more is a camera drag
const quarter = r => Math.abs(r / (Math.PI / 2) - Math.round(r / (Math.PI / 2))) < 1e-6;
const deg = r => Math.round(r / DEG) % 360;

/** something sitting right on top of pl? (then it can't be picked up out from under it) */
const loadOn = (pl, placed) => {
  const it = posed(itemById[pl.item], pl.pose), top = stackHeight(pl, it), b = bounds(pl, it);
  return placed.some(e => e.id !== pl.id && e.surface === pl.surface && Math.abs((e.y || 0) - top) < EPS && overlaps(b, bounds(e, posed(itemById[e.item], e.pose))));
};

/** the surfaces as solid things + an invisible hit plane on each top (what the pointer ray lands on) */
function SurfaceView({ s }) {
  const [w, d] = s.size, c = toWorld(s, w / 2, d / 2);
  const hit = <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} userData={{ surf: s.id }}><planeGeometry args={[w, d]} /><meshBasicMaterial visible={false} /></mesh>;
  const solid = (key, size, pos, color) => <mesh key={key} position={pos} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
  let body;
  if (s.id === 'floor') body = solid('f', [w, 0.04, d], [0, -0.02, 0], '#59605d');
  else if (s.id === 'shelf') body = <>{solid('b', [w, 0.03, d], [0, -0.015, 0], '#8a6a45')}{solid('l', [0.04, s.at.y, 0.04], [-w / 2 + 0.05, -s.at.y / 2, d / 2 - 0.05], '#3b4246')}{solid('r', [0.04, s.at.y, 0.04], [w / 2 - 0.05, -s.at.y / 2, d / 2 - 0.05], '#3b4246')}
    {solid('k', [w, 1.6, 0.03], [0, -0.2, -d / 2 - 0.015], '#2b3336')}</>;
  else {   // trunk/bed: a box whose inside floor is the surface; the walls stand OUTSIDE the w x d bed so the rules' rect is the usable space
    const t = 0.05, wh = s.id === 'bed' ? 0.5 : 0.32, cab = s.id === 'bed' ? 1.3 : wh;   // the bed's z0 wall is the cab: taller
    body = <>{solid('b', [w + 2 * t, s.at.y, d + 2 * t], [0, -s.at.y / 2, 0], '#4a3d33')}
      {solid('n', [w + 2 * t, cab, t], [0, cab / 2, -d / 2 - t / 2], s.id === 'bed' ? '#3d4a55' : '#6d5a4a')}{solid('s', [w + 2 * t, wh, t], [0, wh / 2, d / 2 + t / 2], '#6d5a4a')}
      {solid('e', [t, wh, d], [w / 2 + t / 2, wh / 2, 0], '#6d5a4a')}{solid('w', [t, wh, d], [-w / 2 - t / 2, wh / 2, 0], '#6d5a4a')}
      {(s.blocks || []).map((k, i) => solid('k' + i, [k.x1 - k.x0, k.top, k.z1 - k.z0], [(k.x0 + k.x1) / 2 - w / 2, k.top / 2, (k.z0 + k.z1) / 2 - d / 2], '#5a4a3e'))}</>;
  }
  return <group position={[c.x, c.y, c.z]} rotation={[0, s.at.rotY, 0]}>{body}{hit}</group>;
}

function PlacedView({ pl }) {
  const s = surfaceById[pl.surface], it = itemById[pl.item], w = toWorld(s, pl.x, pl.z, pl.y || 0);
  return <group position={[w.x, w.y, w.z]} rotation={[0, worldRot(s, pl.rot), 0]}><ItemModel item={posed(it, pl.pose)} surf={s.id} plId={pl.id} /></group>;
}

/** lab-only scripting hook: window.__lab.screen(surfaceId, lx, lz, ly) -> client pixel coords of a surface-local point, so a test can drive the real mouse */
function DebugHook({ api }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    window.__lab = { ...api.current, get: () => api.current.get(), cam: () => camera.position.toArray(), screen(sid, lx, lz, ly = 0) {
      const w = toWorld(surfaceById[sid], lx, lz, ly), v = new THREE.Vector3(w.x, w.y, w.z).project(camera), r = gl.domElement.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    } };
    return () => { delete window.__lab; };
  }, [camera, gl, api]);
  return null;
}

/** pick-up probe: what placed item is under the pointer right now (only used on a click when not holding anything) */
function PickProbe({ probeRef, groupRef, st }) {
  const { raycaster, pointer, camera } = useThree();
  useEffect(() => {
    probeRef.current = () => {
      raycaster.setFromCamera(pointer, camera);
      const hit = probe(raycaster, groupRef.current);
      if (!hit?.plId) return hit;
      // where the same ray crosses the picked item's BASE plane: the grab offset is measured there, so the ghost doesn't jump when
      // the original disappears and the ray suddenly reaches whatever was under it
      const pl = st.current.placed.find(e => e.id === hit.plId), s = hit.surface, v = new THREE.Vector3();
      const base = pl && raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(s.at.y + (pl.y || 0))), v);
      return { ...hit, base: base ? toLocal(s, v.x, v.z) : null };
    };
  }, [raycaster, pointer, camera]);
  return null;
}

const css = {
  wrap: { position: 'fixed', inset: 0, background: '#172124', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', color: '#e6efe9' },
  panel: { position: 'absolute', background: 'rgba(10,16,18,0.82)', border: '1px solid #2c3b3e', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, pointerEvents: 'auto' },
  btn: on => ({ display: 'block', width: '100%', textAlign: 'left', margin: '3px 0', padding: '5px 8px', fontSize: 13, cursor: 'pointer', borderRadius: 4, border: '1px solid ' + (on ? '#55ff77' : '#3a4a4d'), background: on ? '#1d3a26' : '#1a2629', color: '#e6efe9' }),
  key: { display: 'inline-block', minWidth: 16, padding: '0 4px', marginRight: 6, border: '1px solid #55666a', borderRadius: 3, textAlign: 'center', fontSize: 11, background: '#1f2b2e' },
};
const COLORS = { ok: '#55ff77', bad: '#ff5544', none: '#9aa8ab' };
const LEGEND = [['1-5', 'pick an item'], ['L-click item', 'pick it up (move it)'], ['L-click', 'put down (Ctrl: keep placing)'], ['', 'placement is free by default'], ['', 'like items clip together when close (Shift: grid instead)'], ['hold Shift', 'snap to the grid'],
  ['wheel', 'rotate 5° (Shift: 90°)'], ['Q / E', 'rotate 15° each way (Shift: 90°)'], ['R', 'next 90°'], ['[  ]', 'grid step coarser / finer'],
  ['Esc / R-click', 'cancel'], ['Del / X', 'discard held item'], ['R-drag', 'orbit · M-drag pan · wheel zoom (empty-handed)']];

export default function Lab() {
  const [placed, setPlaced] = useState(START), [holding, setHolding] = useState(null), [stepIdx, setStepIdx] = useState({});
  const [hud, setHud] = useState(null), [msg, setMsg] = useState('Press 1-5 or pick from the list to start placing.');
  const snapRef = useRef(false), groupRef = useRef(), outRef = useRef(null), probeRef = useRef(null), down = useRef(null);
  const st = useRef(); st.current = { placed, holding, stepIdx, hud };   // for the window listeners (they're bound once)

  const act = useMemo(() => {
    const S = () => st.current;
    const pick = i => { const it = ITEMS[i]; if (!it) return; setHolding(h => ({ itemId: it.id, moveId: null, rot: h?.rot ?? 0, pose: h?.itemId === it.id ? h.pose : null })); setMsg(`Holding: ${it.name}`); };
    const rotate = f => setHolding(h => h && { ...h, rot: f(h.rot) });
    const cancel = () => { if (S().holding) { setHolding(null); setMsg(S().holding.moveId ? 'Move cancelled: it stays where it was' : 'Put away'); } };
    const discard = () => { const h = S().holding; if (!h) return; if (h.moveId) setPlaced(p => p.filter(e => e.id !== h.moveId)); setHolding(null); setMsg(`Discarded: ${itemById[h.itemId].name}`); };
    const confirm = keep => {
      const h = S().holding, out = outRef.current; if (!h) return false;
      if (!out?.cand) { setMsg('Point at a surface first'); return false; }
      if (out.reason) { setMsg(`Can't put it there: ${out.reason}`); return false; }
      const { item, surface, x, z, rot, y, free, pose } = out.cand, pl = placement({ id: h.moveId || undefined, item, surface, x, z, rot, y, free, pose });
      setPlaced(p => h.moveId ? p.map(e => (e.id === h.moveId ? pl : e)) : [...p, pl]);
      setHolding(keep && !h.moveId ? { ...h } : null);
      setMsg(`Placed: ${itemById[item].name} on the ${surfaceById[surface].name.toLowerCase()}${y > EPS ? ` (stacked, y ${y.toFixed(2)} m)` : ''}`);
      return true;
    };
    const pickUp = () => {
      const hit = probeRef.current?.(); if (!hit?.plId) return false;
      const pl = S().placed.find(e => e.id === hit.plId); if (!pl) return false;
      if (loadOn(pl, S().placed)) { setMsg("Something's sitting on it: take that off first"); return false; }
      const grab = hit.base ? { sid: pl.surface, y: pl.y || 0, x: pl.x - hit.base.x, z: pl.z - hit.base.z } : null;   // keep the item where it is under the cursor
      setHolding({ itemId: pl.item, moveId: pl.id, rot: pl.rot, pose: pl.pose, grab }); setMsg(`Moving: ${itemById[pl.item].name}`); return true;
    };
    const cycleStep = d => {
      const s = outRef.current?.surface; if (!s) return setMsg('Point at a surface to change its grid');
      const n = s.gridSteps.length, i = (((S().stepIdx[s.id] ?? 0) + d) % n + n) % n;
      setStepIdx(m => ({ ...m, [s.id]: i })); setMsg(`${s.name} grid: ${s.gridSteps[i]} m`);
    };
    return { pick, rotate, cancel, discard, confirm, pickUp, cycleStep };
  }, []);

  useEffect(() => {
    // turn by `step`: free steps keep the angle as-is; with Shift held (grid lock) the turn lands on the next quarter turn
    const turn = (dir, step, locked) => act.rotate(r => (locked ? snapRot(r + dir * QUARTER, '90') : snapRot(r + dir * step, 'free')));
    const key = e => {
      if (e.key === 'Shift') { snapRef.current = true; return; }
      if (e.repeat && !/^Key[QE]$/.test(e.code)) return;
      const n = /^Digit([1-9])$/.exec(e.code);
      if (n) return act.pick(+n[1] - 1);
      if (e.code === 'Escape') return act.cancel();
      if (!st.current.holding) return;   // everything below only acts on a HELD item (E in particular: see CONTROLS above)
      if (e.code === 'KeyR') act.rotate(r => snapRot(r + QUARTER, '90'));
      else if (e.code === 'KeyQ') turn(-1, KEY_STEP, e.shiftKey);
      else if (e.code === 'KeyE') turn(1, KEY_STEP, e.shiftKey);
      else if (e.code === 'BracketRight') act.cycleStep(1);
      else if (e.code === 'BracketLeft') act.cycleStep(-1);
      else if (e.code === 'Delete' || e.code === 'KeyX') act.discard();
    };
    const keyUp = e => { if (e.key === 'Shift') snapRef.current = false; };
    const blur = () => { snapRef.current = false; };
    const move = e => { snapRef.current = e.shiftKey; };
    const onCanvas = e => e.target?.tagName === 'CANVAS';
    const pDown = e => { if (onCanvas(e)) down.current = { x: e.clientX, y: e.clientY, b: e.button }; };
    const pUp = e => {
      const d = down.current; down.current = null;
      if (!d || !onCanvas(e) || d.b !== e.button || Math.hypot(e.clientX - d.x, e.clientY - d.y) > CLICK_PX) return;   // a drag moves the camera, not the item
      if (e.button === 0) { if (st.current.holding) act.confirm(e.ctrlKey); else act.pickUp(); }
      else if (e.button === 2) act.cancel();
    };
    const wheel = e => {   // the wheel turns a HELD item; capture phase + stopPropagation so the camera never zooms at the same time
      if (!st.current.holding) return;
      e.preventDefault(); e.stopPropagation();
      const dd = e.deltaY || e.deltaX;   // Chrome turns Shift+wheel into a sideways scroll (deltaX)
      if (dd) turn(Math.sign(dd), WHEEL_STEP, e.shiftKey);
    };
    const ctx = e => { if (onCanvas(e)) e.preventDefault(); };
    window.addEventListener('keydown', key); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);
    window.addEventListener('pointermove', move); window.addEventListener('pointerdown', pDown); window.addEventListener('pointerup', pUp);
    window.addEventListener('wheel', wheel, { capture: true, passive: false }); window.addEventListener('contextmenu', ctx);
    return () => {
      window.removeEventListener('keydown', key); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', pDown); window.removeEventListener('pointerup', pUp);
      window.removeEventListener('wheel', wheel, { capture: true }); window.removeEventListener('contextmenu', ctx);
    };
  }, [act]);

  const api = useRef(); api.current = { ...act, get: () => ({ placed: st.current.placed, holding: st.current.holding, hud: st.current.hud, msg, ghost: outRef.current?.cand || null }) };
  const shown = holding?.moveId ? placed.filter(p => p.id !== holding.moveId) : placed;   // a moved item's original is hidden (the rules still know it by id)
  const held = holding && itemById[holding.itemId];
  const rotTxt = holding ? (quarter(holding.rot) ? `90° snap · ${deg(holding.rot)}°` : `free · ${deg(holding.rot)}°`) + (holding.pose ? ` · ${holding.pose}` : '') : '-';
  const stepTxt = !hud?.surface ? '-' : hud.step === 'free' ? `free (Shift snaps to ${hud.gridStep} m)` : `snapped ${hud.step} m  [${hud.steps.join(' / ')}]`;
  const reasonTxt = !hud ? '' : hud.reason ? hud.reason : hud.stacked ? 'fits (stacked)' : hud.clipped ? 'fits (clipped beside its own kind)' : 'fits';

  return <div style={css.wrap}>
    <Canvas shadows camera={{ position: [3.4, 3.1, 4.3], fov: 45, near: 0.05, far: 100 }} dpr={[1, 2]}>
      <color attach="background" args={['#172124']} />
      <ambientLight intensity={0.9} /><hemisphereLight args={['#e6e9d5', '#384348', 1.3]} />
      <directionalLight position={[4, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#232c2e" roughness={1} /></mesh>
      <group ref={groupRef}>
        {SURFACES.map(s => <SurfaceView key={s.id} s={s} />)}
        {shown.map(p => <PlacedView key={p.id} pl={p} />)}
      </group>
      <Preview holding={holding} placed={placed} stepIdx={stepIdx} snapRef={snapRef} groupRef={groupRef} outRef={outRef} onHud={setHud} />
      <OrbitControls makeDefault target={[1.0, 0.3, -0.2]} mouseButtons={{ LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} maxPolarAngle={Math.PI / 2.1} minDistance={1.5} maxDistance={16} />
      <PickProbe probeRef={probeRef} groupRef={groupRef} st={st} />
      <DebugHook api={api} />
    </Canvas>

    <div style={{ ...css.panel, left: 14, top: 14, width: 210 }}>
      <div style={{ fontWeight: 700, letterSpacing: 1, fontSize: 12, color: '#9fb3b6' }}>PLACEMENT LAB</div>
      {ITEMS.map((it, i) => <button key={it.id} style={css.btn(held?.id === it.id)} onClick={() => act.pick(i)}><span style={css.key}>{i + 1}</span>{it.name} <span style={{ color: '#7f9093', fontSize: 11 }}>{it.tags.join(', ')}{it.stackable ? ', stacks' : ''}{it.clip ? ', clips' : ''}</span></button>)}
      <div style={{ color: '#7f9093', fontSize: 11, marginTop: 6 }}>Floor takes anything · Shelf: small · Trunk: small, medium · '84 bed: anything (wheel wells block)</div>
    </div>

    <div style={{ ...css.panel, right: 14, top: 14, width: 270 }}>
      {LEGEND.map(([k, v]) => <div key={v}>{k ? <span style={css.key}>{k}</span> : <i style={{ color: '#9fb3b6' }}>· </i>}{v}</div>)}
    </div>

    <div data-lab-hud style={{ ...css.panel, left: '50%', transform: 'translateX(-50%)', bottom: 16, minWidth: 520, textAlign: 'center' }}>
      <div><b>{held ? held.name : 'Nothing held'}</b>{held && <> · on: {hud?.surface || '-'} · grid: {stepTxt} · rotation: {rotTxt}</>}</div>
      {held && <div data-lab-reason style={{ color: COLORS[hud?.color || 'none'], fontWeight: 600 }}>{reasonTxt}</div>}
      <div style={{ color: '#9fb3b6', fontSize: 12 }}>{msg}</div>
    </div>
  </div>;
}
