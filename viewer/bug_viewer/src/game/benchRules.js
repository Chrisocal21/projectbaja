// Bench recipes (PURE, loads under node): what a bench does to a part you set on it. PROPOSAL numbers, tune by feel.
// Battery: item.charge 0..1 (no field = full). A charger raises charge only; it never changes how worn the battery is.
// Engine piece: cond 0..100. A workbench service cleans and adjusts it, but only as far as the part allows (CAP), once per piece (item.serviced).
export const CHARGE_S = 90;        // seconds on the charger from empty to full
export const FLAT = 0.2;           // a battery below this cannot crank the engine
export const WASH_S = 5;           // seconds in the parts washer
export const SERVICE_S = 4;        // seconds on the bench for a service
export const SERVICE_GAIN = 25;    // condition points a service gives
export const CAP = 85;             // a serviced piece never gets past this: only a new one is better
export const DEAD = 15;            // below this the piece is shot: no service saves it
export const chargeOf = it => (typeof it?.charge === 'number' ? Math.max(0, Math.min(1, it.charge)) : 1);
/** one tick on a charger: -> new charge */
export const chargeStep = (charge, dt) => Math.min(1, charge + dt / CHARGE_S);
/** a battery's start check: { ok, why }. charge undefined = full. */
export function batteryCheck(charge) {
  const c = typeof charge === 'number' ? charge : 1;
  return c >= FLAT ? { ok: true, why: '' } : { ok: false, why: `The starter barely turns: the battery is flat (${Math.round(c * 100)}%). Put it on a charger.` };
}
/** may this piece be serviced on the bench? -> '' or the reason */
export function serviceBlock(it) {
  const c = it?.cond ?? 70;
  if (it?.grimy) return 'Too dirty to judge: wash it in the parts washer first.';
  if (it?.serviced) return 'That piece has already had its service: only a new one is better.';
  if (c < DEAD) return 'That piece is shot: no cleaning will save it. It needs replacing.';
  if (c >= CAP) return 'That piece is already as good as a used one gets.';
  return '';
}
/** the condition after a service */
export const serviceTo = c => Math.min(CAP, Math.round(c + SERVICE_GAIN));
