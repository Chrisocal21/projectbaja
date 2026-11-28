// Wheel spin and lock-up (physics milestone 4; PURE). Every wheel has its own surface speed u (m/s). While the tire holds, u is the ground speed under it
// and the forces are the solver's gripping forces, unchanged. When the engine or brakes ask for more than the tire can hold, the wheel breaks loose: u is
// then integrated from the torque left over, and the tire gives sliding friction against the way it slips over the ground, so a spinning or locked tire
// also loses most of its sideways grip. It grips again when u comes back to the ground speed. All numbers are PROPOSALs: tune by feel.

export const SPIN = {
  inertiaFront: 1.3, inertiaRear: 2.6,   // kg m2: wheel and tire (rear: plus the axle and what turns with it)
  slide: 0.85,          // sliding friction, as a share of peak grip
  slipPeak: 0.15,       // slip ratio where the force has become pure sliding friction
  slipFloor: 3,         // m/s: slip ratio is measured against at least this speed (so a standing start behaves)
  engineBite: 0.75,     // share of the engine's push that counts toward breaking a tire loose. The game's first gear is arcade-strong (about what the tires can
  //                       hold even on pavement, silently trimmed until now); this keeps pavement hooked up while dirt, sand and mud spin
  spinMargin: 1.05,     // that share must beat the tire by this much
  cornerShare: 0.7,     // in a hard corner the engine must still beat this share of total grip to spin the wheel
  lockMin: 1.5,         // m/s: below this the brakes just hold the car, no lock-up
  maxSlip: 8,           // m/s the tire can run ahead of the ground (the engine runs out of revs)
  spinAlong: 0.35,      // how much a SPINNING tire's forward slip counts against its sideways grip (lower = the tail is easier to catch). A locked tire counts it all: no steering
};

export const createWheel = () => ({ u: 0, state: '' });   // state: '' gripping, 'spin' or 'lock'

const toward0 = (u, d) => (Math.abs(u) <= d ? 0 : u - Math.sign(u) * d);
const gain = (r, front) => r * r / (front ? SPIN.inertiaFront : SPIN.inertiaRear);   // m/s2 of tire surface speed per newton at the tread

/** 0..1: how hard a wheel on the ground is spinning or sliding locked, for dust, ruts, tire noise and the HUD. w = one of the solver's wheel read-outs */
export const looseness = w => (w.touching && w.state ? Math.min(1, Math.abs(w.u - w.vl) / 6) : 0);

/** a wheel with no ground under it: the engine spins it up, the brake stops it, otherwise it coasts down */
export function stepAirWheel(w, { drive, brake, r, front, maxU, dt }) {
  const k = gain(r, front);
  let u = Math.max(-maxU, Math.min(maxU, w.u + drive * k * dt));
  if (brake > 0) u = toward0(u, brake * k * dt); else if (!drive) u *= 1 - 0.15 * dt;
  w.u = u; w.state = '';
  return w;
}

/**
 * one step of a wheel on the ground. vl / vs: ground speed along and across the wheel; cap: the tire's total grip (N); avail: what is left of it for
 * forward force after cornering; grip: { fx, fy } the gripping forces; drive: engine force asked of this wheel (signed N); brake: brake force asked (N, >= 0).
 * -> { fx, fy } the force the ground gives, and updates w.u / w.state
 */
export function stepWheel(w, { vl, vs, cap, avail, grip, drive, brake, r, front, dt }) {
  const push = drive * SPIN.engineBite;
  if (!w.state) {
    const spins = Math.abs(push) - brake > Math.max(avail, SPIN.cornerShare * cap) * SPIN.spinMargin;
    const locks = brake - Math.abs(push) > cap && Math.abs(vl) > SPIN.lockMin;
    if (!spins && !locks) { w.u = vl; return grip; }
    w.state = spins ? 'spin' : 'lock'; w.u = vl;
  }
  const s = w.u - vl, k = gain(r, front);
  const blend = Math.min(1, Math.abs(s) / (SPIN.slipPeak * Math.max(Math.abs(vl), SPIN.slipFloor)));
  const along = Math.abs(w.u) > Math.abs(vl) ? SPIN.spinAlong * s : s, mag = Math.hypot(along, vs) || 1, F = SPIN.slide * cap;
  // forward: friction along the true slip; sideways: what is left (a spinning tire keeps more of it than a locked one)
  const fx = grip.fx + (F * s / (Math.hypot(s, vs) || 1) - grip.fx) * blend, fy = grip.fy + (F * -vs / mag - grip.fy) * blend;
  let u = w.u + (push - fx) * k * dt;
  if (brake > 0) u = toward0(u, brake * k * dt);   // a brake only ever slows the wheel: it cannot turn it backwards
  u = Math.max(Math.min(vl, 0) - SPIN.maxSlip, Math.min(Math.max(vl, 0) + SPIN.maxSlip, u));
  const eased = Math.abs(push) <= avail && brake <= cap;
  const caughtUp = s !== 0 && Math.sign(u - vl) !== Math.sign(s);
  if ((eased && (caughtUp || Math.abs(u - vl) < 0.4)) || (brake > 0 && Math.abs(vl) < 0.5)) { w.u = vl; w.state = ''; return grip; }
  w.u = u; w.state = Math.abs(u) < Math.abs(vl) ? 'lock' : 'spin';
  return { fx, fy };
}

/** what each driven wheel is asked to push [left, right]: the force the diff passes to the ground (Fd), plus the torque that has nowhere to go and spins it */
export function driveRequests(F, FdL, FdR, capL, capR, type) {
  if (type === 'locker') { const over = Math.max(0, F - FdL - FdR) / 2; return [FdL + over, FdR + over]; }
  // open / limited slip: the weaker side takes the spare torque; the stronger side only spins when its own grip is what held it back
  const half = F / 2, req = (fd, cap, other) => (fd < half - 1e-6 && (cap <= other || fd >= cap - 1) ? half : fd);
  return [req(FdL, capL, capR), req(FdR, capR, capL)];
}
