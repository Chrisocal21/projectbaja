// Delivery truck (PROPOSAL, visual only): while an order is on the way, a plain box truck drives in along the town street and stops at the shop.
// It has no state of its own: its place on the road is worked out from the order's remaining hours, so it always matches the ETA (and the map marker).
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { game } from './store.js';
import { ORDER_HOURS } from './orderlogic.js';
import { ROADS, SITES, height } from '../worlds/county.js';

/** the street the truck uses (the one that passes the shop) and the point on it nearest the shop */
function route() {
  const s = SITES.shop; let best = null;
  for (const r of ROADS) {
    if (r.kind !== 'street') continue;
    const pts = r.path.pts; let bi = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i].x - s.x, pts[i].z - s.z); if (d < bd) { bd = d; bi = i; } }
    if (bd < 60 && (!best || bd < best.bd)) best = { pts, stop: bi, bd };
  }
  return best;
}

export default function DeliveryTruck() {
  const g = useRef(), rt = useMemo(route, []);
  useFrame(() => {
    const o = (game.home?.orders || [])[0];
    if (!g.current) return;
    if (!o || !rt || rt.stop < 2) { g.current.visible = false; return; }
    const f = Math.min(1, Math.max(0, 1 - o.left / ORDER_HOURS)), i = Math.min(rt.stop - 1, Math.floor(f * rt.stop));
    const a = rt.pts[i], b = rt.pts[i + 1];
    g.current.visible = true; g.current.position.set(a.x, height(a.x, a.z), a.z); g.current.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  });
  return <group ref={g} visible={false}>
    <mesh position={[0, 1.7, -1.3]} castShadow><boxGeometry args={[2.3, 2.4, 4.2]} /><meshStandardMaterial color="#e8e4da" roughness={0.8} /></mesh>
    <mesh position={[0, 1.35, 1.6]} castShadow><boxGeometry args={[2.2, 1.8, 1.8]} /><meshStandardMaterial color="#d8a93a" roughness={0.7} /></mesh>
    <mesh position={[0, 1.8, 2.52]}><boxGeometry args={[1.9, 0.7, 0.05]} /><meshStandardMaterial color="#223" roughness={0.3} /></mesh>
    {[[-1.1, 1.8], [1.1, 1.8], [-1.1, -2.2], [1.1, -2.2]].map(([x, z], k) => <mesh key={k} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.3, 14]} /><meshStandardMaterial color="#151515" roughness={0.9} /></mesh>)}
  </group>;
}
