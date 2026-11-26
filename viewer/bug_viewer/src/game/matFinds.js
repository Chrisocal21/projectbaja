// Scrap metal and wood lying out in the world (Chris, Nov 27: things to pick up by the road and in the forests; materials are scarce).
// Pure data (no world, no three.js) so it can be tested. items.js puts them into game.items once per save (kind 'mat', id 'wood' | 'scrap', n pieces).
// A find is a bundle you click to pick up; it goes straight onto your materials (game.mats), not into your hands. Counts and odds are PROPOSALs.

export const MAT_NAMES = { wood: 'Wood planks', scrap: 'Scrap metal' };
export const matName = (id, n) => `${MAT_NAMES[id] || id}${n ? ` (${n})` : ''}`;
/** where a roadside find lies, in the place's own frame (x across, z toward the road): beside the loose-part spot at a gas stop, in front of the back box at a rest area */
export const ROADSIDE_MAT = { gas: [-11.8, 2.2], rest: [-6.5, -7.6] };
/** how far off a forest trail's centre line a deadfall bundle lies (m): on the verge, inside the first row of trees (they stand 4.3 m and more out) */
export const FOREST_VERGE = 2.8;

const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const toWorld = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };   // same as worlds/kit.js

/** sites: the roadside stops [{ type, x, z, ry }]; wild: the off-road features [{ kind, x, z, path: [[x, z], ...] }].
 *  Returns [{ key, id, n, x, z, ry }]: about half the stops have one small find; every forest trail has one or two bundles of deadfall, now and then scrap. */
export function matFinds(sites = [], wild = []) {
  const out = [];
  sites.forEach((q, i) => {
    const L = ROADSIDE_MAT[q.type]; if (!L || hash(q.x + 11, q.z) > 0.5) return;
    const [x, z] = toWorld({ x: q.x, z: q.z, rot: q.ry }, L[0], L[1]);
    out.push({ key: 'rs' + i, id: hash(q.z, q.x + 2) < 0.5 ? 'wood' : 'scrap', n: hash(q.x, q.z + 9) < 0.35 ? 2 : 1, x, z, ry: hash(q.x + 3, q.z) * 6.28 });
  });
  wild.forEach((w, k) => {
    if (w.kind !== 'forest' || !w.path || w.path.length < 2) return;
    const P = w.path, picks = hash(w.x, w.z) < 0.5 ? [0.35] : [0.25, 0.7];
    picks.forEach((f, j) => {
      const a = Math.min(P.length - 2, Math.floor(f * (P.length - 1))), p0 = P[a], p1 = P[a + 1], dx = p1[0] - p0[0], dz = p1[1] - p0[1], l = Math.hypot(dx, dz) || 1;
      const side = hash(k + 1, j + 3) < 0.5 ? -1 : 1, mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
      out.push({ key: `wf${k}-${j}`, id: hash(w.z + j, w.x) < 0.8 ? 'wood' : 'scrap', n: hash(w.x + j, w.z + 1) < 0.5 ? 3 : 2, x: mx - dz / l * side * FOREST_VERGE, z: mz + dx / l * side * FOREST_VERGE, ry: Math.atan2(dx, dz) + 0.3 });
    });
  });
  return out;
}
