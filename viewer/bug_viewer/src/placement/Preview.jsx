// Placement preview (lab only for now): the ghost that follows the mouse, the grid on the surface under it and the landing outline.
// It READS the rules (snapPoint / restY / why) and the lab's data; it never owns game state. Each frame it writes what it would place into
// `outRef` (the caller confirms from that) and calls onHud when the one-line summary changes.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { HOLO, holoMaterials, ghostify, footprint } from '../hologram.js';
import { snapPoint, rotatedFootprint, restY, why, clipTo } from './rules.js';
import { placement } from './types.js';
import { surfaceById, itemById, toWorld, toLocal, worldRot } from './labData.js';

const GHOST_ID = 'ghost';
const UP = new THREE.Vector3(0, 1, 0), PLANE = new THREE.Plane(), TMP = new THREE.Vector3();

/** what the pointer is over: the first hit among the surface hit-planes and placed items under `group`.
 *  -> { surface, local: {x, z}, plId } or null. The ray stops at the first thing, so an item's top wins over the floor beneath it. */
export function probe(raycaster, group) {
  if (!group) return null;
  for (const h of raycaster.intersectObject(group, true)) {
    const u = h.object.userData;
    const s = surfaceById[u.surf];
    if (!s) continue;
    return { surface: s, local: toLocal(s, h.point.x, h.point.z), plId: u.plId || null };
  }
  return null;
}

/** an item drawn with primitives, base at y = 0, centred, footprint w along x at rot 0 */
export function ItemModel({ item, surf, plId, cast = true }) {
  const [w, d] = item.footprint, h = item.height, { shape, color, handle } = item.look;
  const ud = { surf, plId };   // what probe() reads back off a hit
  // a plain function, not a component: a component defined in here would remount (and lose its ghost materials) on every render
  const m = (key, geo, pos, col = color, rough = 0.7, metal = 0) => <mesh key={key} position={pos} castShadow={cast} receiveShadow userData={ud}>{geo}<meshStandardMaterial color={col} roughness={rough} metalness={metal} /></mesh>;
  if (shape === 'bottle') return <group>
    {m('b', <cylinderGeometry args={[w / 2 * 0.9, w / 2 * 0.9, h * 0.82, 16]} />, [0, h * 0.41, 0], color, 0.2)}
    {m('c', <cylinderGeometry args={[w * 0.2, w * 0.3, h * 0.18, 12]} />, [0, h * 0.91, 0], '#e9eef0')}
  </group>;
  if (shape === 'tire') return <group>
    {m('t', <cylinderGeometry args={[w / 2, w / 2, h, 28]} />, [0, h / 2, 0], color, 0.95)}
    {m('h', <cylinderGeometry args={[w * 0.27, w * 0.27, h * 1.02, 20]} />, [0, h / 2, 0], '#8d9296', 0.4, 0.6)}
  </group>;
  if (shape === 'can') return <group>
    {m('b', <boxGeometry args={[w, h * 0.88, d]} />, [0, h * 0.44, 0])}
    {m('s', <cylinderGeometry args={[0.025, 0.025, h * 0.12, 10]} />, [w * 0.3, h * 0.94, 0], '#2d2d2d')}
    {m('h', <boxGeometry args={[w * 0.4, 0.03, 0.03]} />, [-w * 0.15, h * 0.9, 0], '#2f5527')}
  </group>;
  return <group>
    {m('b', <boxGeometry args={[w, handle ? h * 0.85 : h, d]} />, [0, handle ? h * 0.425 : h / 2, 0])}
    {handle && m('h', <boxGeometry args={[w * 0.45, h * 0.15, 0.03]} />, [0, h * 0.925, 0], '#222')}
  </group>;
}

/** grid lines at `step` across a w x d surface (local coords, corner origin) + a brighter border */
function useGridGeometry(s, step) {
  const g = useMemo(() => {
    if (!s) return null;
    const [w, d] = s.size, pts = [], n = (span) => Math.floor(span / step + 1e-6);
    for (let i = 1; i <= n(w); i++) { const x = i * step; if (x < w - 1e-6) pts.push(x, 0, 0, x, 0, d); }
    for (let i = 1; i <= n(d); i++) { const z = i * step; if (z < d - 1e-6) pts.push(0, 0, z, w, 0, z); }
    const lines = new THREE.BufferGeometry(); lines.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const border = new THREE.BufferGeometry().setFromPoints([[0, 0], [w, 0], [w, d], [0, d], [0, 0]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    return { lines, border };
  }, [s?.id, step]);
  useEffect(() => () => { g?.lines.dispose(); g?.border.dispose(); }, [g]);
  return g;
}

const UNIT_SQUARE = new THREE.BufferGeometry().setFromPoints([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]].map(([x, z]) => new THREE.Vector3(x, 0, z)));

/**
 * holding: { itemId, moveId, rot } | null. placed: placements already down (a moved item's original stays in the list; the shared id makes the rules skip it).
 * stepIdx: { surfaceId: index into gridSteps }. snapRef.current = lock to the grid (Shift held); otherwise placement is free. groupRef = the hit group probe() searches.
 */
export default function Preview({ holding, placed, stepIdx, snapRef, groupRef, outRef, onHud }) {
  const mats = useMemo(() => holoMaterials(), []);
  const ghost = useRef(), inner = useRef(), land = useRef(), patch = useMemo(() => { const m = footprint(1, 1, mats); m.position.y = 0; return m; }, [mats]);
  const [gridOn, setGridOn] = useState(null);   // { sid, step } of the surface currently showing its grid (local view state only)
  const hudKey = useRef('');
  const item = holding ? itemById[holding.itemId] : null;
  useEffect(() => () => { mats.dispose(); patch.geometry.dispose(); }, [mats, patch]);
  const gs = gridOn ? surfaceById[gridOn.sid] : null, grid = useGridGeometry(gs, gridOn?.step || 1);
  const gridAt = gs ? toWorld(gs, 0, 0, 0.004) : null;

  useFrame(({ raycaster, pointer, camera, clock }) => {
    const report = (out, hud) => { outRef.current = out; const k = JSON.stringify(hud); if (k !== hudKey.current) { hudKey.current = k; onHud(hud); } };
    if (!item || !ghost.current) { if (gridOn) setGridOn(null); return report(null, null); }
    if (inner.current) ghostify(inner.current, mats);
    mats.pulse(clock.elapsedTime, true);
    raycaster.setFromCamera(pointer, camera);
    const hit = probe(raycaster, groupRef.current);
    if (!hit) { ghost.current.visible = land.current.visible = false; if (gridOn) setGridOn(null); return report(null, { item: item.name, surface: null, reason: 'point at a surface', color: 'none' }); }
    const s = hit.surface, free = !snapRef.current, si = Math.min(stepIdx[s.id] ?? 0, s.gridSteps.length - 1), rot = holding.rot;
    // a picked-up item keeps its grip while it stays on its own surface: the cursor ray is read at the height the item was grabbed at
    // (its old base) plus the grab offset, so it doesn't jump when the original vanishes and the ray reaches whatever was under it
    let at = hit.local;
    const g = holding.grab;
    if (g && g.sid === s.id && raycaster.ray.intersectPlane(PLANE.set(UP, -(s.at.y + g.y)), TMP)) { const l = toLocal(s, TMP.x, TMP.z); at = { x: l.x + g.x, z: l.z + g.z }; }
    const p = snapPoint(s, at.x, at.z, free ? 'free' : si, item.footprint, rot);
    let cand = placement({ id: holding.moveId || GHOST_ID, item: item.id, surface: s.id, x: p.x, z: p.z, rot, free });
    cand.y = restY(cand, item, placed, itemById);
    // free placement: near one of its own kind it clips flush beside it (if there's room). With Shift held the grid wins, so no clip.
    const clipped = free ? clipTo(s, item, cand, placed, itemById) : cand;
    const didClip = clipped !== cand; cand = clipped;
    const reason = why(s, item, cand, placed, itemById), color = reason ? HOLO.bad : HOLO.ok;   // PROPOSAL: free is the default now, so no amber; green fits, red doesn't
    mats.set(color);
    const w = toWorld(s, cand.x, cand.z, cand.y);
    ghost.current.visible = land.current.visible = true;
    ghost.current.position.set(w.x, w.y, w.z); ghost.current.rotation.set(0, worldRot(s, cand.rot), 0);
    const [fw, fd] = rotatedFootprint(item.footprint, cand.rot), lw = toWorld(s, cand.x, cand.z, cand.y + 0.006);   // the AABB the rules use, in the surface's axes
    land.current.position.set(lw.x, lw.y, lw.z); land.current.rotation.set(0, s.at.rotY, 0); land.current.scale.set(fw, 1, fd);
    const step = s.gridSteps[si];
    if (!gridOn || gridOn.sid !== s.id || gridOn.step !== step) setGridOn({ sid: s.id, step });
    report({ cand, reason, surface: s }, { item: item.name, surface: s.name, step: free ? 'free' : step, gridStep: step, steps: s.gridSteps, reason, color: reason ? 'bad' : 'ok', stacked: cand.y > 1e-6, clipped: didClip });
  });

  if (!item) return null;
  return <>
    <group ref={ghost} visible={false}><group ref={inner} key={item.id}><ItemModel item={item} cast={false} /></group></group>
    <group ref={land} visible={false}><primitive object={patch} /><lineLoop geometry={UNIT_SQUARE} material={mats.edge} renderOrder={12} /></group>
    {grid && gridAt && <group position={[gridAt.x, gridAt.y, gridAt.z]} rotation={[0, gs.at.rotY, 0]}>
      <lineSegments geometry={grid.lines} renderOrder={8}><lineBasicMaterial color="#dff6ff" transparent opacity={0.28} depthWrite={false} /></lineSegments>
      <lineLoop geometry={grid.border} renderOrder={8}><lineBasicMaterial color="#dff6ff" transparent opacity={0.7} depthWrite={false} /></lineLoop>
    </group>}
  </>;
}
