// Fuel and the first start (pure: no game state). All numbers are PROPOSAL, to tune by feel.
// Each vehicle has a tank in litres (home.fuel[id]). Driving burns it, a pump fills it, an empty tank never strands you (limp mode).
export const TANK_L = { bug: 38, cajon: 60, pickup84: 70, pickup78: 70 };
export const tankOf = id => TANK_L[id] || 45;
/** what a vehicle holds the first time anyone looks: grandma's Bug has a little stale fuel (Walt's letter: she sat since '09); the rest are half full */
export const startFuel = id => (id === 'bug' ? 6 : tankOf(id) / 2);
export const fuelOf = (home, id) => { const f = home?.fuel?.[id]; return typeof f === 'number' ? Math.max(0, Math.min(tankOf(id), f)) : startFuel(id); };
export const IDLE_LPS = 0.0004, FULL_LPS = 0.0039;   // litres per second: idling, and flat out (about 14 L per 100 km at cruise)
export const burn = (throttle, dt) => (IDLE_LPS + (FULL_LPS - IDLE_LPS) * Math.min(1, Math.abs(throttle))) * dt;
export const LIMP = 0.35;   // an empty tank leaves 35% throttle (canon rule 4: never stranded)
export const throttleCap = litres => (litres > 0 ? 1 : LIMP);
export const PRICE_PER_L = 0.8;
/** what a fill-up costs: { litres, price } for a tank that holds `have` of `cap` */
export const fillUp = (have, cap) => { const litres = Math.max(0, cap - have); return { litres, price: Math.ceil(litres * PRICE_PER_L) }; };
/** can the key start the engine? battery: is one fitted. Returns { ok, why } and the why names what is wrong. */
export function startCheck({ battery, litres }) {
  if (!battery) return { ok: false, why: 'Click. Nothing: there is no battery in the car.' };
  if (!(litres > 0)) return { ok: false, why: 'She cranks and cranks but the tank is dry. Fuel from a pump will fix that.' };
  return { ok: true, why: '' };
}
export const gaugeWord = (litres, cap) => (litres <= 0 ? 'EMPTY' : litres / cap < 0.15 ? 'LOW' : '');
