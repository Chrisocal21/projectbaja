// Calling a tow truck from the phone (PURE: the quote). Anywhere on the map, the truck brings you and your vehicle back to Walt's garage.
// PROPOSAL numbers: a call-out fee, then per kilometre of game map; the ride takes game time.
export const TOW = { base: 40, perKm: 6, hoursBase: 1, hoursPerKm: 0.4, maxHours: 10, nearM: 150 };

/** from: { x, z }, garage: { x, z }, cash -> { near, km, fee (what you owe), charge (what he takes: all you have if short), hours } */
export function towQuote(from, garage, cash = 0) {
  const m = Math.hypot(from.x - garage.x, from.z - garage.z), km = m / 1000;
  const fee = Math.round(TOW.base + km * TOW.perKm), hours = Math.min(TOW.maxHours, Math.ceil(TOW.hoursBase + km * TOW.hoursPerKm));
  return { near: m < TOW.nearM, km, fee, charge: Math.min(fee, Math.max(0, Math.floor(cash))), hours };
}
