// The customer lot, garage-local metres (+z = out into the yard, the roller door is at z = 6, x = 0).
// PROPOSAL layout: the driveway runs straight at the garage door; stalls line both sides of it, cars pulled in nose-out.
// Pure data, no imports, so the paint, the customer logic and the tests all read the same stalls.
export const LANE = { half: 4.5, z0: 6, z1: 40 };   // the drive lane: always kept clear
export const STALL = { w: 3.0, d: 5.4, inner: 5.5, z0: 10.5, perSide: 6 };   // w along z, d along x, inner = x of the edge nearest the lane
export const STALLS = [-1, 1].flatMap(side => Array.from({ length: STALL.perSide }, (_, k) => ({
  id: `${side < 0 ? 'L' : 'R'}${k + 1}`, side,
  lx: side * (STALL.inner + STALL.d / 2), lz: STALL.z0 + STALL.w * (k + 0.5),
  fx: side, fz: 0,   // nose-in: the car faces away from the lane
})));
/** the stalls with no vehicle within `clear` metres of their centre. occupied = [{ lx, lz }] */
export const openStalls = (occupied, clear = 2.0) => STALLS.filter(s => !occupied.some(o => Math.hypot(o.lx - s.lx, o.lz - s.lz) < clear));
/** one open stall chosen with rand() in [0,1), or null when the lot is full */
export const pickStall = (occupied, rand = Math.random) => { const open = openStalls(occupied); return open.length ? open[Math.floor(rand() * open.length) % open.length] : null; };
