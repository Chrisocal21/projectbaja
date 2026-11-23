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
/** Parts racks along the right side of the garage (garage-local metres; length runs along z). Boards are 0.45, 1.05 and 1.65 m up; each lists what lies on it, left to right.
 *  Grouped so the car comes together in order: small drive parts, panels, big panels, bumpers. Heavy things (engine, wheels) go on the floor beside the lift. */
export const RACK = { len: 2.4, boards: [0.45, 1.05, 1.65], ry: Math.PI / 2 };
export const RACKS = [
  { x: 3.2, z: 1.9, name: 'small parts', boards: [['battery', 'steering', 'pedals', 'plate', 'mats'], ['handles', 'headlights', 'taillights', 'sideWindows', 'turnSignals'], ['hoodTrim']] },
  { x: 3.2, z: 4.5, name: 'panels and seats', boards: [['dash', 'seatPassenger', 'engineLid'], ['hoodPanel', 'nosePanel', 'tailPanel'], ['rearWindow']] },
  { x: 5.2, z: 1.9, name: 'doors and fenders', boards: [['doorL', 'doorR', 'windshield'], ['fenderFL', 'fenderFR', 'fenderRL'], ['fenderRR', 'seatBack', 'sideTrim']] },
  { x: 5.2, z: 4.5, name: 'bumpers', boards: [['frontBumper', 'rearBumper']] },
];
export const FLOOR_SPOTS = { engine: [4.3, -3.8], wheelFL: [2.6, -2.2], wheelFR: [2.6, -3.0], wheelRL: [2.6, -3.8] };
const WIDTH = { 1: 0.34, 2: 0.5, 3: 0.72, 4: 0.9 };
/** where each part goes: { [slotId]: { x, z, y, ry } } in garage-local metres, y = height above the floor. Unassigned parts get floor spots after the racks. */
export function layoutParts() {
  const out = {};
  for (const r of RACKS) r.boards.forEach((ids, bi) => {
    const ws = ids.map(id => WIDTH[BUG.slots.find(s => s.id === id).size] + 0.05), total = ws.reduce((a, b) => a + b, 0);
    let at = -total / 2;
    ids.forEach((id, i) => { out[id] = { x: r.x, z: r.z + at + ws[i] / 2, y: RACK.boards[bi] + 0.03, ry: RACK.ry }; at += ws[i]; });
  });
  for (const [id, [x, z]] of Object.entries(FLOOR_SPOTS)) out[id] = { x, z, y: 0, ry: 0.3 };
  return out;
}
/** the next thing to fit, as a short hint: the drive parts first, then the body. null when the car is whole. */
export function nextStep(b) {
  const order = s => (['start', 'steer', 'drive', 'grip'].includes(s.fn) ? 0 : 1);
  const open = BUG.slots.filter(s => !isFitted(BUG, b, s.id) && checkFit(BUG, b, s, {}).code !== 'blocked').sort((a, c) => order(a) - order(c));
  const fitted = BUG.slots.filter(s => isFitted(BUG, b, s.id)).length;
  return open.length ? { slot: open[0], fitted, total: BUG.slots.length, text: `Putting her back together: ${fitted}/${BUG.slots.length} on · next: ${open[0].name.toLowerCase()}${open[0].cover && isFitted(BUG, b, open[0].cover) ? ` (open the ${BUG.covers[open[0].cover].name} first)` : ''}` } : null;
}
