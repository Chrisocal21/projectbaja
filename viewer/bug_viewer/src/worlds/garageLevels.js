// Garage levels 0-3 (docs/EXPANSION_PLAN.md). PURE data + maths, garage-local metres (+z = out to the yard and the customer lot, the roller door
// is at z = 6; the old building is x -13.2..7 incl. the office wing, z -6..6). The garage grows BACKWARD (-z) behind the shop: the customer lot and the
// camper are out front and to the right, so nothing there has to move. All sizes are PROPOSAL numbers until Chris has walked it.
//
// THE RULES every level must pass (layoutProblems below, enforced by garageLevels.test.js; the look rules are in docs/EXPANSION_PLAN.md):
//   1. Every bay is inside the building and never overlaps another bay, the bench wall, the drive aisle or the car racks.
//   2. A car can drive into every bay without crossing another bay: through its own roll-up door, or from a drive aisle that has a roll-up door.
//   3. Doors sit on an outside wall, inside its span, and never overlap each other.
//   4. There is always a bench wall (a solid wall at least 6 m long, kept free of bays) where the workbench and pegboard go.
//   5. Car racks stand where the aisle can reach them.
//
// A bay is a floor spot a car works in: { id, x, z, ry, lift, door? | aisle? }. `lift: true` bays take a two-post lift (the lift prop snaps to its bay).
// A door is a roll-up opening: { id, wall: 'back' | 'east', at (x on the back wall, z on the east wall), w }.
import { BUILDING } from './structures.js';

export const BAY = { w: 4.0, d: 7.0 };
export const DOOR_H = 3.8;
const OLD_SHOP = [{ id: 'B0', x: 0, z: -0.5, ry: 0, lift: true, front: true }, { id: 'B1', x: 4.6, z: -0.5, ry: 0, lift: true, front: true }];
/** a row of bays at z, one per x; `door` gives each its own roll-up door in the back wall behind it, else they open onto the aisle */
const row = (z, xs, door) => xs.map((x, i) => ({ id: `R${i + 1}`, x, z, ry: 0, lift: true, ...(door ? { door: `D${i + 1}` } : { aisle: true }) }));
const backDoors = xs => xs.map((x, i) => ({ id: `D${i + 1}`, wall: 'back', at: x, w: 3.4 }));
const BENCH_WALL = { x0: BUILDING.x0, x1: BUILDING.x0 + 4, z0: -14, z1: BUILDING.z0 };   // behind the office wing, on the west wall

export const GARAGE_LEVELS = [
  { level: 0, name: "Walt's shop", z0: -6, h: 4.6, floor: 'concrete', bays: OLD_SHOP.slice(0, 1), doors: [], racks: [], aisle: null, bench: null },
  { level: 1, name: 'Working shop', z0: -14, h: 4.6, floor: 'concrete', bays: [...OLD_SHOP, ...row(-10.5, [-3.2, 0.8], true)], doors: backDoors([-3.2, 0.8]), racks: [], aisle: null, bench: BENCH_WALL },
  { level: 2, name: 'Pro shop', z0: -14, h: 4.6, floor: 'epoxy', bays: [...OLD_SHOP, ...row(-10.5, [-7.2, -3.2, 0.8, 4.8], true)], doors: backDoors([-7.2, -3.2, 0.8, 4.8]), racks: [], aisle: null, bench: BENCH_WALL },
  // level 3 stops at z = -22: the property line is at z = -23 (county.js PROPERTY). The back wall is too close to the line to drive through, so the
  // bays open onto a drive aisle with one big roll-up door on the east side, and whole-car racks line the back wall (3 racks x 3 tiers = 9 cars).
  { level: 3, name: 'Race warehouse', z0: -22, h: 6.4, floor: 'epoxy', bays: [...OLD_SHOP, ...row(-10.5, [-7.2, -3.2, 0.8, 4.8], false)],
    doors: [{ id: 'E1', wall: 'east', at: -16.8, w: 4.6 }], aisle: { x0: BUILDING.x0, x1: BUILDING.x1, z0: -19.6, z1: -14 }, bench: BENCH_WALL,
    racks: [-12.9, -6.2, 0.5].map((x0, i) => ({ id: `K${i + 1}`, x0, x1: x0 + 6.2, z0: -22, z1: -19.6, tiers: 3 })) },
];
export const MAX_LEVEL = GARAGE_LEVELS.length - 1;
export const levelData = level => GARAGE_LEVELS[Math.max(0, Math.min(MAX_LEVEL, level | 0))];

/** the extension behind the old building at this level, or null at level 0: x from the old west wall to the east wall, z from the new back wall to the old one */
export const extension = level => { const d = levelData(level); return d.z0 < BUILDING.z0 ? { x0: BUILDING.x0, x1: BUILDING.x1, z0: d.z0, z1: BUILDING.z0 } : null; };
/** is (lx, lz) inside the extension (margin m shrinks it)? */
export const inExtension = (level, lx, lz, m = 0) => { const e = extension(level); return !!e && lx > e.x0 + m && lx < e.x1 - m && lz > e.z0 + m && lz < e.z1 - m; };

/** the garage level a save has: the highest of garage1..3 owned (stage ids, see worlds/upgrades.js) */
export const garageLevelOf = owned => (owned.has('garage3') ? 3 : owned.has('garage2') ? 2 : owned.has('garage1') ? 1 : 0);

/** the bays at a level, and the nearest one to a point (the lift prop snaps to it; null if none within `reach`) */
export const baysAt = level => levelData(level).bays;
export function nearestBay(level, x, z, reach = 3, liftOnly = false) {
  let best = null, bd = reach;
  for (const b of baysAt(level)) { if (liftOnly && !b.lift) continue; const d = Math.hypot(b.x - x, b.z - z); if (d <= bd) { bd = d; best = b; } }
  return best;
}
/** the bay a car at (x, z) is parked in (inside the bay rectangle), or null */
export const bayOf = (level, x, z) => baysAt(level).find(b => Math.abs(x - b.x) <= BAY.w / 2 && Math.abs(z - b.z) <= BAY.d / 2) || null;
/** bays with no car in them. cars = [{ x, z }] */
export const freeBays = (level, cars) => baysAt(level).filter(b => !cars.some(c => Math.abs(c.x - b.x) <= BAY.w / 2 && Math.abs(c.z - b.z) <= BAY.d / 2));

export const EXT_H = 4.6;   // wall height of the old garage (Sites.jsx); each level has its own `h` (the race warehouse is taller: 3 cars stacked on a rack)
/** the old back wall (openings.js wall B, segments B0..B6) is open from level 1 on: the extension is one room with the shop */
export const levelOpenings = level => (level >= 1 ? ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'] : []);

/** door gaps [a, b] along a wall ('back': x, 'east': z) */
export const doorGaps = (level, wall) => levelData(level).doors.filter(d => d.wall === wall).map(d => [d.at - d.w / 2, d.at + d.w / 2]);
const inGap = (v, gaps) => gaps.some(([a, b]) => v > a && v < b);
/** collision circles [lx, lz, r] for the extension's outside walls (west, east, back), with the roll-up doors left open */
export function extensionWallCircles(level) {
  const e = extension(level); if (!e) return [];
  const r = 0.15, step = 0.5, out = [], east = doorGaps(level, 'east'), back = doorGaps(level, 'back');
  for (let z = e.z0; z <= e.z1 + 1e-9; z += step) { out.push([e.x0, z, r]); if (!inGap(z, east)) out.push([e.x1, z, r]); }
  for (let x = e.x0; x <= e.x1 + 1e-9; x += step) if (!inGap(x, back)) out.push([x, e.z0, r]);
  return out;
}

/** the inside wall faces of the garage at a level, for wall-mounted things (game/wallhang.js). Each: { id, axis, at, ry, sign, pieces: [[a, b]], gaps: [[a, b]] }.
 *  axis 'z' = a wall at constant z running along x; 'x' = constant x running along z. `sign` points from the wall into the room. */
export function wallFaces(level) {
  const e = extension(level), H = 7, Z = 6, DOOR = 3.5 + 0.3;
  const front = { id: 'front', axis: 'z', at: Z, ry: Math.PI, sign: -1, pieces: [[-H, -DOOR], [DOOR, H]], gaps: [[-DOOR, DOOR]] };
  const left = { id: 'left', axis: 'x', at: -H, ry: Math.PI / 2, sign: 1, pieces: [[-Z, Z]], gaps: [] };
  if (!e) return [{ id: 'back', axis: 'z', at: -Z, ry: 0, sign: 1, pieces: [[-H, H]], gaps: [] }, front, left, { id: 'right', axis: 'x', at: H, ry: -Math.PI / 2, sign: -1, pieces: [[-Z, Z]], gaps: [] }];
  const cut = (a, b, gaps) => { const out = []; let s = a; for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > s) out.push([s, g0]); s = Math.max(s, g1); } if (b > s) out.push([s, b]); return out; };
  const back = doorGaps(level, 'back'), east = doorGaps(level, 'east');
  return [
    { id: 'back', axis: 'z', at: e.z0, ry: 0, sign: 1, pieces: cut(e.x0, e.x1, back), gaps: back },
    front, left,
    { id: 'right', axis: 'x', at: e.x1, ry: -Math.PI / 2, sign: -1, pieces: cut(e.z0, Z, east), gaps: east },
    { id: 'west', axis: 'x', at: e.x0, ry: Math.PI / 2, sign: 1, pieces: [[e.z0, e.z1]], gaps: [] },
    { id: 'officeBack', axis: 'z', at: e.z1, ry: Math.PI, sign: -1, pieces: [[e.x0, -H]], gaps: [] },
  ];
}

// ---- the rules (see the top of this file) ----
const rect = b => ({ x0: b.x - BAY.w / 2, x1: b.x + BAY.w / 2, z0: b.z - BAY.d / 2, z1: b.z + BAY.d / 2 });
const overlap = (a, b) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;
const touches = (a, b) => a.x0 <= b.x1 + 0.05 && b.x0 <= a.x1 + 0.05 && a.z0 <= b.z1 + 0.05 && b.z0 <= a.z1 + 0.05;
/** what is wrong with a level's layout: [] when it passes every rule */
export function layoutProblems(level) {
  const d = levelData(level), e = extension(level), out = [], B = BUILDING;
  const inside = r => r.x0 >= B.x0 - 1e-6 && r.x1 <= B.x1 + 1e-6 && r.z1 <= B.z1 + 1e-6 && r.z0 >= (e ? e.z0 : B.z0) - 1e-6;
  const others = [...(d.bench ? [['bench wall', d.bench]] : []), ...(d.aisle ? [['aisle', d.aisle]] : []), ...d.racks.map(k => [`rack ${k.id}`, k])];
  d.bays.forEach((b, i) => {
    const r = rect(b);
    if (!inside(r)) out.push(`${b.id} is outside the building`);
    d.bays.slice(i + 1).forEach(c => { if (overlap(r, rect(c))) out.push(`${b.id} overlaps ${c.id}`); });
    others.forEach(([n, o]) => { if (overlap(r, o)) out.push(`${b.id} overlaps the ${n}`); });
    if (b.front) return;   // the old shop's bays come in through the roller door
    if (b.door) { const dr = d.doors.find(x => x.id === b.door); if (!dr || dr.wall !== 'back' || Math.abs(dr.at - b.x) > 0.3 || Math.abs(r.z0 - e.z0) > 0.3) out.push(`${b.id} has no roll-up door behind it`); }
    else if (b.aisle) { if (!d.aisle || !touches(r, d.aisle) || !d.doors.length) out.push(`${b.id} cannot be reached from a drive aisle with a door`); }
    else out.push(`${b.id} has no way in for a car`);
  });
  d.doors.forEach((dr, i) => {
    const span = dr.wall === 'back' ? [B.x0, B.x1] : [e ? e.z0 : B.z0, B.z0];
    if (!e || dr.at - dr.w / 2 < span[0] + 0.3 || dr.at + dr.w / 2 > span[1] - 0.3) out.push(`door ${dr.id} does not fit its wall`);
    d.doors.slice(i + 1).forEach(o => { if (o.wall === dr.wall && Math.abs(o.at - dr.at) < (o.w + dr.w) / 2 + 0.3) out.push(`doors ${dr.id} and ${o.id} overlap`); });
    if (dr.wall === 'east' && d.aisle && !(dr.at - dr.w / 2 >= d.aisle.z0 - 1e-6 && dr.at + dr.w / 2 <= d.aisle.z1 + 1e-6)) out.push(`door ${dr.id} does not open onto the aisle`);
  });
  if (e && !d.bench) out.push('no bench wall');
  if (d.bench && (Math.abs(d.bench.x0 - B.x0) > 0.05 || d.bench.z1 - d.bench.z0 < 6)) out.push('the bench wall is not on a solid wall at least 6 m long');
  d.racks.forEach(k => { if (!d.aisle || !touches(k, d.aisle)) out.push(`rack ${k.id} cannot be reached from the aisle`); if (!inside(k)) out.push(`rack ${k.id} is outside the building`); });
  return out;
}
