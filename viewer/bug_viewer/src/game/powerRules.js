// Garage power (PURE, loads under node): each machine draws amps while it is actually working; the service panel has a limit. Over the limit the
// breaker trips and the lights go out until you reset it. Numbers are PROPOSALS, tune by feel.
export const AMPS = { tireChanger: 12, batteryCharger: 8, partsWasher: 10 };
export const NAME = { tireChanger: 'tire machine', batteryCharger: 'battery charger', partsWasher: 'parts washer' };
export const PANEL_AMPS = 24;   // Walt's old panel: the charger and washer together are fine, a third machine is not
/** active: { machineId: count of that machine working }. -> amps drawn */
export const loadOf = active => Object.entries(active || {}).reduce((s, [id, n]) => s + (AMPS[id] || 0) * (n || 0), 0);
/** does this trip the breaker? -> '' or the message naming what was running */
export function tripWhy(active, limit = PANEL_AMPS) {
  const amps = loadOf(active); if (amps <= limit) return '';
  const names = Object.entries(active).filter(([id, n]) => n > 0 && AMPS[id]).map(([id, n]) => (n > 1 ? n + ' ' : 'the ') + NAME[id] + (n > 1 ? 's' : ''));
  return `*CLACK* The breaker trips: ${names.join(', ').replace(/, ([^,]*)$/, ' and $1')} together pull ${amps} amps and the old panel only takes ${limit}. Reset the breaker, and run less at once.`;
}
/** why one machine will not run: '' when it can */
export const noPowerWhy = (power, name) => (power ? '' : `The ${name} is dead: flip the main breaker in the garage first.`);
