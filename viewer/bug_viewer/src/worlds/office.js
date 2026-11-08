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
