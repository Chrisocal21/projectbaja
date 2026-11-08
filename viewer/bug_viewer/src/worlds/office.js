// Garage-local metres; viewed from the forecourt, -x is LEFT.
export const OFFICE = {
  x0: -13.2, x1: -7,
  z0: -6, z1: 6,
  H: 5.6,
  inner: { z0: 3.2, z1: 5.2 },   // doorway through the shared wall (2.0 m clear)
  entry: { x0: -11.8, x1: -10.2 },
};
export const inOffice = (lx, lz, m = 0) => lx > OFFICE.x0 + m && lx < OFFICE.x1 - m && lz > OFFICE.z0 + m && lz < OFFICE.z1 - m;
export const CAMPER = { x: 22.5, z: 1, doorX: 20.4, doorZ: 2.8 };
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
/** collision circles (garage-local, [lx, lz, r]) for the annex's three solid exterior walls (west, north, south — the fourth side is the doorway through the office wall) */
export function annexWallCircles() {
  const { x0, x1, z0, z1 } = ANNEX, r = 0.15, step = 0.5, out = [];
  for (let z = z0; z <= z1 + 1e-9; z += step) out.push([x0, z, r]);           // west (far) wall
  for (let x = x0; x <= x1 + 1e-9; x += step) { out.push([x, z0, r]); out.push([x, z1, r]); }   // north + south walls
  return out;
}
