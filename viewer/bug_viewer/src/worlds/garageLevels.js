// Garage levels 0-3 (docs/EXPANSION_PLAN.md). PURE data + maths, garage-local metres (+z = out to the yard and the customer lot, the roller door
// is at z = 6; the old building is x -13.2..7 incl. the office wing, z -6..6). The garage grows BACKWARD (-z) behind the shop: the customer lot and the
// camper are out front and to the right, so nothing there has to move. All sizes are PROPOSAL numbers until Chris has walked it.
//
// A bay is a floor spot a car works in: { id, x, z, ry, lift }. `lift: true` bays take a two-post lift (the lift prop snaps to its bay).
// `racks` is floor reserved for wall racks that hold whole cars off the floor (level 3, like the race-team shop photo).
import { BUILDING } from './structures.js';

export const BAY = { w: 4.0, d: 7.0 };
const COLS = [-11.2, -7.2, -3.2, 0.8, 4.8];   // five 4 m columns across the 20.2 m width
const row = (prefix, z, cols) => cols.map((x, i) => ({ id: `${prefix}${i + 1}`, x, z, ry: 0, lift: true }));
const OLD_SHOP = [{ id: 'B0', x: 0, z: -0.5, ry: 0, lift: true }, { id: 'B1', x: 4.6, z: -0.5, ry: 0, lift: true }];

export const GARAGE_LEVELS = [
  { level: 0, name: "Walt's shop", z0: -6, floor: 'concrete', bays: OLD_SHOP.slice(0, 1), racks: [] },
  { level: 1, name: 'Working shop', z0: -14, floor: 'concrete', bays: [...OLD_SHOP, ...row('R', -10.5, COLS.slice(1, 3))], racks: [] },
  { level: 2, name: 'Pro shop', z0: -14, floor: 'epoxy', bays: [...OLD_SHOP, ...row('R', -10.5, COLS.slice(0, 4))], racks: [] },
  // level 3 stops at z = -22: the property line is at z = -23 (county.js PROPERTY), so the warehouse cannot go further back
  { level: 3, name: 'Race warehouse', z0: -22, floor: 'epoxy', bays: [...OLD_SHOP, ...row('R', -10.5, COLS), ...row('S', -17.5, COLS.slice(2))],
    racks: [{ id: 'rack1', x0: -13.2, x1: -5.2, z0: -22, z1: -14 }] },
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

export const EXT_H = 4.6;   // wall height of the extension (matches the old garage, Sites.jsx)
/** the old back wall (openings.js wall B, segments B0..B6) is open from level 1 on: the extension is one room with the shop */
export const levelOpenings = level => (level >= 1 ? ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'] : []);
/** collision circles [lx, lz, r] for the extension's three outside walls (west, east, back) */
export function extensionWallCircles(level) {
  const e = extension(level); if (!e) return [];
  const r = 0.15, step = 0.5, out = [];
  for (let z = e.z0; z <= e.z1 + 1e-9; z += step) { out.push([e.x0, z, r]); out.push([e.x1, z, r]); }
  for (let x = e.x0; x <= e.x1 + 1e-9; x += step) out.push([x, e.z0, r]);
  return out;
}
