// Walt's side bay (Chris, Nov 26): a lean-to on the shop's east wall where grandma's Bug stands, so the lift in the main shop is free for
// customer cars. PURE data, garage-local metres (+z = out to the yard, the shop's roller door is at z = 6, its east wall at x = 7).
// It has its own roll-up opening to the yard, and the back corner of the shop's east wall (openings.js segment R0) is open into it for good.
// PROPOSAL: every size here until Chris has walked it.
export const SIDE_BAY = {
  x0: 7, x1: 13, z0: -6, z1: 6,          // x1 on a build-grid line (structures.js), so player buildings can butt up to it
  hHigh: 4.6, hLow: 3.6,                  // the lean-to roof falls from the shop's eave to the outer wall
  door: { x0: 8, x1: 12, h: 3.1 },    // the roll-up opening in the front (z = 6) wall
  apron: { x0: 7.6, x1: 13, z1: 9.6 },  // concrete in front of it, out to the yard
  cut: 'R0',                              // the walk-through from the shop (openings.js: the east wall's 2 m run at z -6..-4)
};
/** where the Bug stands, nose to the roll-up door */
export const BUG_BAY = { x: 10, z: -0.4 };
/** where the Bug used to stand (on the lift); old saves with the Bug still there are moved once (game/home.js ensureBugBay) */
export const OLD_BUG_SPOT = { x: 0, z: -0.5 };
/** inside the side bay's walls (m > 0 shrinks the box, m < 0 grows it) */
export const inSideBay = (lx, lz, m = 0) => lx > SIDE_BAY.x0 + m && lx < SIDE_BAY.x1 - m && lz > SIDE_BAY.z0 + m && lz < SIDE_BAY.z1 - m;
/** the underside of the lean-to roof at lx */
export const roofAt = lx => SIDE_BAY.hHigh + (SIDE_BAY.hLow - SIDE_BAY.hHigh) * Math.max(0, Math.min(1, (lx - SIDE_BAY.x0) / (SIDE_BAY.x1 - SIDE_BAY.x0)));
/** the Bug's own spot: furniture may not be set down on it */
export const onBugSpot = (lx, lz) => Math.abs(lx - BUG_BAY.x) < 1.6 && lz > BUG_BAY.z - 2.6 && lz < BUG_BAY.z + 2.4;
