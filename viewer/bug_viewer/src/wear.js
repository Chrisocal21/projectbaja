// Wear and failure, forgiving version. Every vehicle has four wear numbers (0 = fresh, 1 = worn out) that creep up with how it is driven:
//   shocks   hard landings and bottoming out: damping fades, the ride gets bouncy
//   tires    rough, fast driving: grip fades a little
//   align    big hits: the car pulls to one side
//   engine   running hot (overheating, or wading while hot): power fades
// Nothing here can strand you: worn-out costs at most ~a quarter of the grip/power, a soft ride and a mild pull. A service puts it all back.
// All rates are estimates to tune by feel. Pure functions (the game keeps the numbers in game.home.wear[vehicleId]).
/** everything wears slowly for now (a quarter of the base rates) until it is dialled in by feel */
export const WEAR_RATE = 0.25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const FRESH = () => ({ shocks: 0, tires: 0, align: 0, engine: 0, side: 1 });
export const WEAR_PARTS = ['shocks', 'tires', 'align', 'engine'];

/** a landing at `imp` m/s downward speed */
export function onLanding(w, imp) { if (imp <= 4.5) return w; return { ...w, shocks: clamp(w.shocks + (imp - 4.5) * 0.006 * WEAR_RATE, 0, 1), align: clamp(w.align + (imp > 8 ? (imp - 8) * 0.01 : 0) * WEAR_RATE, 0, 1), tires: clamp(w.tires + 0.002 * WEAR_RATE, 0, 1) }; }
export const onBottomOut = w => ({ ...w, shocks: clamp(w.shocks + 0.006 * WEAR_RATE, 0, 1) });
/** `dt` s of driving: speed (m/s), rough = surface roughness 0..1 (rr-like), hot = engine over its warn temp, wading depth (m) */
export function drive(w, dt, { speed = 0, rough = 0, hot = false, wading = 0 } = {}) {
  const sp = Math.abs(speed);
  w.tires = clamp(w.tires + dt * sp * (0.2 + rough) * 1.6e-5 * WEAR_RATE, 0, 1);
  if (hot) w.engine = clamp(w.engine + dt * (wading > 0.05 ? 0.03 : 0.004) * WEAR_RATE, 0, 1);   // cold water on a hot engine is harder on it than the heat alone
  return w;
}
/** what the numbers do to the car: multipliers for env (damp, grip, power) and a steering pull (rad) */
export function effects(w) {
  return { damp: 1 - 0.4 * w.shocks, grip: 1 - 0.18 * w.tires, power: 1 - 0.25 * w.engine, pull: (w.side || 1) * 0.02 * w.align };
}
const pct = v => Math.round(v * 100);
/** the clues, worst first: what the driver would notice (never a number you must read; the Admin / garage can show the numbers) */
export function clues(w) {
  const out = [];
  if (w.shocks > 0.25) out.push([w.shocks, w.shocks > 0.6 ? 'The suspension is blown: the ride is floaty and bouncy.' : 'The shocks feel soft after those landings.']);
  if (w.align > 0.2) out.push([w.align, 'The car pulls to one side: something got knocked out of line.']);
  if (w.tires > 0.3) out.push([w.tires, 'The tires are getting slick and worn.']);
  if (w.engine > 0.2) out.push([w.engine, w.engine > 0.6 ? 'The engine is tired and short of power: it has been run hot.' : 'The engine feels a little flat after running hot.']);
  return out.sort((a, b) => b[0] - a[0]).map(c => c[1]);
}
export const summary = w => WEAR_PARTS.map(p => p + ' ' + pct(w[p]) + '%').join(' · ');
/** the price of servicing one part (cheap on purpose; nothing to pay when it is fresh) */
export const PART_NAME = { shocks: 'Shocks', tires: 'Tires', align: 'Alignment', engine: 'Engine tune-up' };
export const partCost = (w, p) => (w[p] < 0.02 ? 0 : Math.round(8 + 60 * w[p]));
export const serviceCost = w => WEAR_PARTS.reduce((s, p) => s + partCost(w, p), 0);
export const serviced = (w, p) => ({ ...w, [p]: 0 });
