// Dusty's store as a walk-in building (pure numbers: the drawing in DustyStore.jsx and the collision in siteData.js both read these).
// Local frame of SITES.gas: +z faces the pumps. PROPOSAL sizes.
export const STORE = { x0: -8, x1: 8, z0: -15.5, z1: -8.5, h: 4, t: 0.2 };
export const DOOR = { x0: -6.4, x1: -4.8, h: 2.5 };
export const WINDOW = { x0: -3.6, x1: 5.4, y0: 0.9, y1: 2.6 };
/** the sales counter: centre and size. You stand on its +z side. */
export const COUNTER = { x: -5.9, z: -13.1, w: 2.6, d: 0.7, h: 1.05 };
/** shelf runs along x: centre, length, depth */
export const SHELVES = [
  { x: 1.8, z: -11.8, w: 6.4, d: 0.7, h: 1.18 },   // the island between the two aisles
  { x: 1.8, z: -15.05, w: 8.4, d: 0.6, h: 2.1 },   // along the back wall
];
/** the drinks cooler against the right wall */
export const COOLER = { x: 7.5, z: -12.2, w: 0.7, d: 4.2, h: 2.2 };
