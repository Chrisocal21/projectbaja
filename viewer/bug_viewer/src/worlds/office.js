// Garage-local metres; viewed from the forecourt, -x is LEFT.
export const OFFICE = {
  x0: -13.2, x1: -7,
  z0: -6, z1: 6,
  H: 5.6,
  inner: { z0: 3.2, z1: 5.2 },   // doorway through the shared wall (2.0 m clear)
  entry: { x0: -11.8, x1: -10.2 },
};
export const inOffice = (lx, lz, m = 0) => lx > OFFICE.x0 + m && lx < OFFICE.x1 - m && lz > OFFICE.z0 + m && lz < OFFICE.z1 - m;
/** the main breaker panel: on the office side of the shared wall, in the back office under the stairs (garage-local; press E) */
export const BREAKER = { x: -7.16, z: -3.2, y: 1.5 };
export const CAMPER = { x: 22.5, z: 1, doorX: 20.88, doorZ: 2.15 };
export const STAIRS = { x0: -9.1, x1: -7.5, z0: -2, z1: 4, bottom: 0.12, top: 3.12, count: 18 };
export const LOFT = { x0: -13, x1: -7.2, z0: -5.8, z1: -2, y: 3.12 };
export function walkingLevel(x, z, previous = 0.12) {
  if (x >= STAIRS.x0 && x <= STAIRS.x1 && z >= STAIRS.z0 && z <= STAIRS.z1)
    return STAIRS.bottom + Math.min(STAIRS.count, Math.ceil((STAIRS.z1 - z) / 6 * STAIRS.count)) / STAIRS.count * 3;
  if (x >= LOFT.x0 && x <= LOFT.x1 && z >= LOFT.z0 && z <= LOFT.z1 && previous > 2.6) return LOFT.y;
  return 0.12;
}
// Free floor in the wing where build-mode furniture may go (everything else is reception, bath, stairs, storage or a walkway). PROPOSAL.
// The back office under the loft: reached past the stair foot, clear of the bathroom wall (x = -10.4) and the parts shelves (z < -4.4).
export const WING_FREE = [{ x0: -10.0, x1: -7.5, z0: -4.3, z1: -2.2 }];
/** can a thing of radius r stand at (lx, lz) on the wing's free floor? */
export const wingFree = (lx, lz, r = 0) => WING_FREE.some(f => lx >= f.x0 + r && lx <= f.x1 - r && lz >= f.z0 + r && lz <= f.z1 - r);

// ---- the "Office expansion" upgrade (game/upgrades.js): a back room through a cut doorway in the office's west wall ----
// The doorway is openings.js segment 'OW3' (the office west wall's 2 m run at z = 0..2); buying the upgrade opens it.
export const ANNEX = { x0: -17.2, x1: OFFICE.x0, z0: -1, z1: 3, H: 4.4, doorZ0: 0, doorZ1: 2 };
// ---- office level 1 (stage 'office1'): the annex grows into a wing the full depth of the office, west of it (docs/EXPANSION_PLAN.md) ----
// Doorway = openings.js segments OW3 + OW4 (z 0..4). Customer door in the front (z = 6) wall. The service counter stands in the wing, beside the doorway.
export const WING = { x0: -17.2, x1: OFFICE.x0, z0: -6, z1: 6, H: 4.4, door: { x0: -16.5, x1: -14.5 }, openings: ['OW3', 'OW4'],
  counter: { x: -14.6, z0: 0.2, z1: 2.0, r: 0.45 } };
export const officeLevelOf = owned => (owned.has('office3') ? 3 : owned.has('office2') ? 2 : owned.has('office1') ? 1 : 0);
// level 3: the wing gets a second floor (the team room). A stair climbs north along the west wall (it replaces the west shelving),
// the upstairs floor sits at the old office's loft height, and the race planning wall hangs on the east wall. PROPOSAL layout.
export const WING_UP = {
  y: 3.12, H: 6.6,
  stair: { x0: -17.05, x1: -15.9, zBottom: -0.4, zTop: -5.4, count: 16 },
  floor: { x0: -15.9, x1: OFFICE.x0 - 0.1, z0: -5.95, z1: -0.4 },
  landing: { x0: -17.1, x1: -15.9, z0: -5.95, z1: -5.4 },
  table: { x: -14.6, z0: -4.3, z1: -2.1 },
  board: { x: OFFICE.x0 - 0.15, z0: -5.0, z1: -1.4 },
};
/** the floor height (above the garage slab) a walker at (lx, lz) stands on in the wing: the stair, then the upstairs floor, otherwise the ground floor.
 *  `previous` is the height they were at, so someone under the upstairs floor is not lifted onto it. */
export function wingLevel(lx, lz, previous = 0.12) {
  const { stair: s, floor: f, landing: l, y } = WING_UP;
  if (lx >= s.x0 && lx <= s.x1 && lz <= s.zBottom && lz >= s.zTop)
    return 0.12 + Math.min(s.count, Math.ceil((s.zBottom - lz) / (s.zBottom - s.zTop) * s.count)) / s.count * (y - 0.12);
  if (previous > 2.6) for (const r of [f, l]) if (lx >= r.x0 && lx <= r.x1 && lz >= r.z0 && lz <= r.z1) return y;
  return 0.12;
}
// level 2: parts shelving along the back room's west and east walls, and the supplier desk beside the counter
export const PARTS_ROOM = { shelves: [{ x: -16.75, z0: -5.6, z1: -1.4 }, { x: -13.65, z0: -5.6, z1: -1.4 }], desk: { x: -16.5, z0: 0.4, z1: 2.2 } };
/** the supplier desk: at level 3 it slides south so the foot of the stair stays clear */
export const deskOf = level => (level >= 3 ? { ...PARTS_ROOM.desk, z0: 1.4, z1: 3.0 } : PARTS_ROOM.desk);
export const inWing = (lx, lz, m = 0) => lx > WING.x0 + m && lx < WING.x1 - m && lz > WING.z0 + m && lz < WING.z1 - m;
/** collision circles ([lx, lz, r]) for the wing's west, north and front walls (the front has the customer door gap) and the service counter */
export function wingWallCircles(level = 1) {
  const { x0, x1, z0, z1, door, counter } = WING, r = 0.15, step = 0.5, out = [], FLOOR = 2.7;
  // [lx, lz, r, top, bottom]: walls reach all the way up (top 99); things standing on the ground floor stop at FLOOR so the second floor is clear of them
  for (let z = z0; z <= z1 + 1e-9; z += step) out.push([x0, z, r, 99]);
  for (let x = x0; x <= x1 + 1e-9; x += step) { out.push([x, z0, r, 99]); if (x < door.x0 - 1e-9 || x > door.x1 + 1e-9) out.push([x, z1, r, 99]); }
  for (let z = counter.z0 + 0.1; z <= counter.z1 + 1e-9; z += 0.5) out.push([counter.x, z, counter.r, FLOOR]);
  if (level >= 2) {
    PARTS_ROOM.shelves.forEach((sh, i) => { if (level >= 3 && i === 0) return; for (let z = sh.z0; z <= sh.z1 + 1e-9; z += 0.6) out.push([sh.x, z, 0.3, FLOOR]); });   // level 3: the west shelving makes way for the stair
    const dk = deskOf(level); for (let z = dk.z0; z <= dk.z1 + 1e-9; z += 0.6) out.push([dk.x, z, 0.35, FLOOR]);
  }
  if (level >= 3) {
    const tb = WING_UP.table;
    for (let z = tb.z0; z <= tb.z1 + 1e-9; z += 0.5) out.push([tb.x, z, 0.5, 99, 2.6]);   // the team table upstairs: only bites when you stand on the second floor
  }
  return out;
}

/** collision circles (garage-local, [lx, lz, r]) for the annex's three solid exterior walls (west, north, south — the fourth side is the doorway through the office wall) */
export function annexWallCircles() {
  const { x0, x1, z0, z1 } = ANNEX, r = 0.15, step = 0.5, out = [];
  for (let z = z0; z <= z1 + 1e-9; z += step) out.push([x0, z, r]);           // west (far) wall
  for (let x = x0; x <= x1 + 1e-9; x += step) { out.push([x, z0, r]); out.push([x, z1, r]); }   // north + south walls
  return out;
}
