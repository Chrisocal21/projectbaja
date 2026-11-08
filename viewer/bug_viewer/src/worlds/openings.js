// Doorways cut through the original garage's walls, so a room you build next to it can be walked into from inside.
// PURE rules (no rendering, no game state). Coordinates are garage-local metres, on the same grid as structures.js:
// each original wall is split into 2 m segments that start and end on grid lines; one segment = one possible opening.
// First pass: the garage's right wall (x = 7) and back wall (z = -6). The front has the roller door and the left joins the office wing.
// PROPOSAL: more walls (the wing's) and door types can follow.
export const OPENING_PRICE = 120;
export const WALL_H = 4.6;       // the garage's wall height (Sites.jsx)
export const OPEN_H = 2.6;       // the top of a cut doorway
const SEG = 2;

export const WALLS = {
  R: { key: 'R', axis: 'z', at: 7, from: -6, to: 6, ry: Math.PI / 2, inside: -1, label: 'right wall' },    // runs along z; inside is -x
  B: { key: 'B', axis: 'x', at: -6, from: -7, to: 7, ry: 0, inside: 1, label: 'back wall' },              // runs along x; inside is +z
};
/** every possible opening: { key, wall, c (centre along the wall), x, z (centre), ry, out: [x, z] the grid cell centre just outside } */
export const SEGMENTS = Object.values(WALLS).flatMap(w => Array.from({ length: Math.round((w.to - w.from) / SEG) }, (_, i) => {
  const c = w.from + SEG / 2 + i * SEG;
  return w.axis === 'z'
    ? { key: `R${i}`, wall: 'R', i, c, x: w.at, z: c, ry: w.ry, out: [w.at + 1, c] }
    : { key: `B${i}`, wall: 'B', i, c, x: c, z: w.at, ry: w.ry, out: [c, w.at - 1] };
}));
export const segByKey = key => SEGMENTS.find(s => s.key === key);

/** the opening the aim point (garage-local) is closest to, or null when it is not near an original wall */
export function snapCut(x, z, reach = 2.4) {
  let best = null, bd = reach;
  for (const s of SEGMENTS) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
  return best;
}
/** why this opening can't be cut ('' = it can). foundations = [{ x, z }] of the placed foundation slabs; open = the keys already cut */
export function openWhy(seg, foundations, open) {
  if (open.includes(seg.key)) return 'There is already an opening there.';
  if (!foundations.some(f => Math.abs(f.x - seg.out[0]) < 0.05 && Math.abs(f.z - seg.out[1]) < 0.05)) return 'Build a foundation slab against that wall first, so there is somewhere to walk to.';
  return '';
}
/** collision circles [x, z, r] for the original right and back walls with the given segments cut open. r is thin, so a cut leaves a 1.1 m walk-through. */
export function wallCircles(open = []) {
  const out = [];
  for (const s of SEGMENTS) {
    if (open.includes(s.key)) continue;
    for (let t = -SEG / 2; t <= SEG / 2 + 1e-9; t += 0.5) out.push(s.wall === 'R' ? [s.x, s.z + t, 0.15] : [s.x + t, s.z, 0.15]);
  }
  return out;
}
/** how to draw one wall: runs of solid wall and of cut opening, as [from, to] intervals along the wall */
export function wallRuns(wallKey, open = []) {
  const w = WALLS[wallKey], solid = [], cut = [];
  for (const s of SEGMENTS.filter(q => q.wall === wallKey)) {
    const run = open.includes(s.key) ? cut : solid, u0 = s.c - SEG / 2, u1 = s.c + SEG / 2, last = run[run.length - 1];
    if (last && Math.abs(last[1] - u0) < 1e-9) last[1] = u1; else run.push([u0, u1]);
  }
  return { w, solid, cut };
}
