// Pure data + helpers for Walt's big garage fixtures once they are movable props (Stage 4d): workbench, car lift (lift1 only), pegboard.
// No game state here (home.js can't load under node), so it is all testable. Local coordinates are garage-local metres; prop-local axes follow the
// existing prop convention: local +x -> world (cos ry, -sin ry), local +z -> world (sin ry, cos ry).

/** the seed batch for fixturesV 3: [id, garage-local x, z, rotation relative to the garage]. These are the spots the old fixed models stood on. */
export const STARTER_FIXTURES_V3 = [
  ['workbench', -3, -5.2, 0], ['carLift', 0, -0.5, 0], ['pegboard', -3, -5.85, 0],
];
export const BENCH = { len: 5.2, depth: 1.1, top: 0.98, front: 1.2 };   // front = how far in front of the bench centre you stand to use it (old E spot was 1.2 m out)
/** the two lift posts, prop-local [x, z, radius]; the car drives between them (the old fixed collision blobs) */
export const LIFT_POSTS = [[-1.65, 0, 0.3], [1.65, 0, 0.3]];
/** the pegboard is 5.4 m wide, 1.5 m tall, its centre 2.0 m up */
export const PEG = { w: 5.4, h: 1.5, y: 2.0 };
/** Tool spots. PROPOSAL: only the hand tools (wrench); the floor jack lives on the floor, not on the board; x/y are prop-local on the board face; gameplay gating of specialty tools comes later. */
export const PEG_SLOTS = [
  { id: 'wrenchA', tool: 'wrench', x: -2.0, y: 2.1 },
  { id: 'wrenchB', tool: 'wrench', x: -1.4, y: 2.1 },
];

const rot = (p, lx, lz) => { const c = Math.cos(p.ry || 0), s = Math.sin(p.ry || 0); return [p.x + c * lx + s * lz, p.z - s * lx + c * lz]; };
const toLocal = (p, x, z) => { const c = Math.cos(p.ry || 0), s = Math.sin(p.ry || 0), dx = x - p.x, dz = z - p.z; return [dx * c - dz * s, dx * s + dz * c]; };
export const propPoint = rot;

/** world collision circles [x, z, r, top] for a list of prop-local circles */
export const localCircles = (p, list, top = 99) => list.map(([lx, lz, r]) => { const [x, z] = rot(p, lx, lz); return [x, z, r, top]; });
/** the nearest prop with this id (to x, z if given), or null */
export function nearestProp(props, id, x = 0, z = 0) {
  let best = null, bd = Infinity;
  for (const p of props) if (p.id === id) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
  return best;
}
/** where you stand to use the bench: BENCH.front in front of its centre, so E works the same when it is in its original spot */
export const benchSpot = p => rot(p, 0, BENCH.front);

/** is a world item lying on this bench's top? (world items on benches have y = BENCH.top, floor items y = 0) */
export const onBench = (it, bench) => {
  if (it.loc !== 'world' || (it.y || 0) < 0.5) return false;
  const [lx, lz] = toLocal(bench, it.x, it.z);
  return Math.abs(lx) <= BENCH.len / 2 + 0.1 && Math.abs(lz) <= BENCH.depth / 2 + 0.1;
};
/** the bench is going away: whatever lay on it falls to the floor where it was (same x / z, y 0). Returns [{ uid, patch }]. PROPOSAL: straight down, no spreading. */
export const benchDrops = (items, bench) => items.filter(it => onBench(it, bench)).map(it => ({ uid: it.uid, patch: { y: 0 } }));

/** tools hung on a pegboard: item = { kind: 'tool', id, loc: 'garage', spot: 'peg', peg: '<propUid>:<slotId>' } */
export const pegKey = (uid, slot) => `${uid}:${slot}`;
export const hung = (items, uid) => items.filter(i => i.loc === 'garage' && i.spot === 'peg' && String(i.peg).split(':')[0] === String(uid));
/** every slot with the tool hanging in it, or null when empty */
export const pegState = (items, uid) => {
  const h = hung(items, uid);
  return PEG_SLOTS.map(s => ({ slot: s, item: h.find(i => i.peg === pegKey(uid, s.id)) || null }));
};
/** the first empty slot this tool fits, or null */
export const freeSlotFor = (items, uid, toolId) => pegState(items, uid).find(s => !s.item && s.slot.tool === toolId)?.slot || null;
/** the pegboard is going away: hung tools fall to the floor in front of it. Returns [{ uid, patch }]; the caller deletes spot / peg. */
export function pegDrops(items, peg) {
  return hung(items, peg.uid).map((it, k) => { const [x, z] = rot(peg, -1.5 + k * 0.5, 0.6); return { uid: it.uid, patch: { loc: 'world', x, z, y: 0 } }; });
}
