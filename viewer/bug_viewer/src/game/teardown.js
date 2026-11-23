// The Bug starts taken apart (PURE, loads under node): every part the car can come apart into is lying in the garage, and putting it
// back together IS the opening. Uses the car's own slots (rules/vehicles.js) so what lies on the floor is exactly what planFit accepts.
import { BUG } from '../rules/vehicles.js';
import { withSlot, isFitted, checkFit } from '../rules/restore.js';
import { freshParts } from './engineRules.js';

/** already lying in the garage from the start (the loose wheel and the driver's seat), so they are not spawned twice */
export const ALREADY = ['wheelRR', 'seatDriver'];
export const STAYS = ['shell'];   // the body shell stays on the car: it only lifts off a stripped car on the hoist, and is not a loose part
export const apartSlots = () => BUG.slots.filter(s => !ALREADY.includes(s.id) && !STAYS.includes(s.id));
/** the car with every part off (the body shell stays: it only lifts off a stripped car on the hoist) */
export const apartBuild = b => apartSlots().reduce((n, s) => withSlot(BUG, n, s.id, false), b);
/** the loose part for each slot: [kind, id, extra] */
export function apartItems(rng = Math.random) {
  return apartSlots().map(s => s.wheel ? ['stock', 'wheel', { set: 'stock' }]
    : s.id === 'engine' ? ['stock', 'engine', { parts: freshParts(rng) }]
    : s.id === 'battery' ? ['stock', 'battery', { charge: 0.1 }]   // dead flat: the charger is the lesson
    : ['stock', s.id]);
}
/** floor spots in garage-local metres, in rows down the open right side of the garage: [[lx, lz, ry], ...]. Clear of the shelves (x 6.5), the lift (x 0) and the old starter items. */
export function gridSpots(n) {
  const cols = [2.7, 3.6, 4.5, 5.4], rows = [], skip = [[4.2, 0.6], [2.7, 2.4]];
  for (let z = -4.8; z <= 5.4 && rows.length < n; z += 0.95) for (const x of cols) { if (rows.length < n && !skip.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 0.6)) rows.push([x, Math.round(z * 100) / 100, 0]); }
  return rows;
}
/** the next thing to fit, as a short hint: the drive parts first, then the body. null when the car is whole. */
export function nextStep(b) {
  const order = s => (['start', 'steer', 'drive', 'grip'].includes(s.fn) ? 0 : 1);
  const open = BUG.slots.filter(s => !isFitted(BUG, b, s.id) && checkFit(BUG, b, s, {}).code !== 'blocked').sort((a, c) => order(a) - order(c));
  const fitted = BUG.slots.filter(s => isFitted(BUG, b, s.id)).length;
  return open.length ? { slot: open[0], fitted, total: BUG.slots.length, text: `Putting her back together: ${fitted}/${BUG.slots.length} on · next: ${open[0].name.toLowerCase()}${open[0].cover && isFitted(BUG, b, open[0].cover) ? ` (open the ${BUG.covers[open[0].cover].name} first)` : ''}` } : null;
}
