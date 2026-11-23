// The Bug starts taken apart (PURE, loads under node): every part the car can come apart into is lying in the garage, and putting it
// back together IS the opening. Uses the car's own slots (rules/vehicles.js) so what lies on the floor is exactly what planFit accepts.
import { BUG } from '../rules/vehicles.js';
import { withSlot, isFitted, checkFit } from '../rules/restore.js';
import { freshParts } from './engineRules.js';

/** already lying in the garage from the start (the loose wheel and the driver's seat), so they are not spawned twice */
export const ALREADY = ['wheelRR', 'seatDriver'];
export const STAYS = ['shell'];   // the body shell stays on the car: it only lifts off a stripped car on the hoist, and is not a loose part
/** what comes off for the opening: picked so every piece has a proper place in the garage (the rest stays bolted on) */
export const LOOSE = ['engine', 'battery', 'wheelFL', 'wheelFR', 'wheelRL', 'seatPassenger', 'seatBack', 'doorL', 'doorR', 'fenderFL', 'fenderFR', 'steering', 'engineLid', 'hoodPanel', 'headlights', 'taillights'];
export const apartSlots = () => BUG.slots.filter(s => LOOSE.includes(s.id));
/** the car with every part off (the body shell stays: it only lifts off a stripped car on the hoist) */
export const apartBuild = b => apartSlots().reduce((n, s) => withSlot(BUG, n, s.id, false), b);
const noPlugs = p => { const o = { ...p }; delete o.plugs; return o; };
/** the loose part for each slot: [kind, id, extra] */
export function apartItems(rng = Math.random) {
  return apartSlots().map(s => s.wheel ? ['stock', 'wheel', { set: 'stock' }]
    : s.id === 'engine' ? ['stock', 'engine', { parts: noPlugs(freshParts(rng)) }]   // Walt pulled the plugs: ordering a new set is the first order
    : s.id === 'battery' ? ['stock', 'battery', { charge: 0.1 }]   // dead flat: the charger is the lesson
    : ['stock', s.id]);
}
/** floor spots in garage-local metres, in rows down the open right side of the garage: [[lx, lz, ry], ...]. Clear of the shelves (x 6.5), the lift (x 0) and the old starter items. */
export function gridSpots(n) {
  const cols = [2.7, 3.6, 4.5, 5.4], rows = [], skip = [[4.2, 0.6], [2.7, 2.4]];
  for (let z = -4.8; z <= 5.4 && rows.length < n; z += 0.95) for (const x of cols) { if (rows.length < n && !skip.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 0.6)) rows.push([x, Math.round(z * 100) / 100, 0]); }
  return rows;
}
/** Walt's first red supply shelf (home.js STARTER_FIXTURES_V1: x 6.5, z -3.0, facing into the garage). Board tops 0.58 / 1.48 / 2.38 m, 2.2 m usable.
 *  Heavy doors and the battery low, fenders and steering wheel at chest height, light panels and lamps on top. The second red shelf stays free for customer boxes. */
export const SHELF = { x: 6.5, z: -3.0, len: 2.2, boards: [0.58, 1.48, 2.38], ry: -Math.PI / 2,
  rows: [['doorL', 'doorR', 'battery'], ['fenderFL', 'fenderFR', 'steering'], ['engineLid', 'hoodPanel', 'headlights', 'taillights']] };
/** wheels stand upright on the bottom board of the middle blue tire shelf (x -6.5, z 0): surface-local x along the board */
export const TIRE_SHELF = { lz: 0, level: 0, at: { wheelFL: -0.8, wheelFR: -0.27, wheelRL: 0.27, wheelRR: 0.8 } };
/** on the floor along the right wall in front of the red shelves (the middle lane stays clear for driving onto the lift):
 *  the three seats in a row against the wall facing in, the engine out in front of them where the hoist can reach it */
export const FLOOR_SPOTS = { engine: [4.3, 2.6, 0], seatDriver: [6.0, 1.3, Math.PI / 2], seatPassenger: [6.0, 2.1, Math.PI / 2], seatBack: [6.0, 3.1, Math.PI / 2] };
/** the shop's worn tires (home.js ensureShopTires) stand on the bottom board of the front blue tire shelf (z 2.4) */
export const SHOP_TIRE_SHELF = { lz: 2.4, level: 0, at: [-0.8, -0.27, 0.27, 0.8] };
const WIDTH = { 1: 0.34, 2: 0.5, 3: 0.72, 4: 0.9 };
/** where each shelf / floor part goes: { [slotId]: { x, z, y, ry } } in garage-local metres, y = height above the floor. Wheels are placed on the tire shelf (TIRE_SHELF) instead. */
export function layoutParts() {
  const out = {};
  SHELF.rows.forEach((ids, bi) => {
    const ws = ids.map(id => WIDTH[BUG.slots.find(s => s.id === id).size] + 0.05), total = ws.reduce((a, b) => a + b, 0);
    let at = -total / 2;
    ids.forEach((id, i) => { out[id] = { x: SHELF.x - 0.05, z: SHELF.z + at + ws[i] / 2, y: SHELF.boards[bi] + 0.01, ry: SHELF.ry }; at += ws[i]; });
  });
  for (const [id, [x, z, ry]] of Object.entries(FLOOR_SPOTS)) out[id] = { x, z, y: 0, ry };
  return out;
}
const WHERE = { front: 'the front of the car', rear: 'the back of the car', driver: "the driver's door", passenger: 'the passenger door', cabin: 'a door' };
/** one line of how-to for fitting this slot: where to stand, what tool, and the special cases. b: the build (to know whether a lid is shut over it) */
export function tipFor(slot, b) {
  if (slot.id === 'engine') return 'The engine is heavy and needs the hoist, so this one is done in the garage. Set it on an engine stand first if you want to check its pieces. Pick it up, stand at the back of the car and hold left click.';
  if (slot.id === 'battery') return 'This one is flat. Fit it, then put it on the battery charger (garage power on) before the key will turn her over.';
  if (slot.wheel) return 'Wheels need the jack. Pick the wheel up, stand at the bare hub and hold left click.';
  const lid = slot.cover && isFitted(BUG, b, slot.cover) ? ` Open the ${BUG.covers[slot.cover].name} first (E at the car).` : '';
  const tool = slot.tool === 'wrench' ? ' with your wrench in the pack' : '';
  return `Click it to pick it up, go to ${WHERE[slot.zone] || 'the car'} and hold left click on the car to bolt it on${tool}.${lid}`;
}
/** the next thing to fit, as a short hint: the drive parts first, then the body. null when the car is whole. */
export const PLUGS_TIP = "She has no spark plugs: Walt pulled them. Order a set on your phone (Internet, Supplies tab). They get dropped off inside the garage door. Put the engine on the engine stand, set the plugs beside it and fit them, then hoist the engine in.";
/** eng: the loose engine item, if any (to see whether its plugs are in) */
export function nextStep(b, eng) {
  const n = nextStepOf(b);
  return n && n.slot.id === 'engine' && eng?.parts && !eng.parts.plugs ? { ...n, tip: PLUGS_TIP } : n;
}
function nextStepOf(b) {
  const order = s => (['start', 'steer', 'drive', 'grip'].includes(s.fn) ? 0 : 1);
  const open = BUG.slots.filter(s => !isFitted(BUG, b, s.id) && checkFit(BUG, b, s, {}).code !== 'blocked').sort((a, c) => order(a) - order(c));
  const fitted = BUG.slots.filter(s => isFitted(BUG, b, s.id)).length;
  return open.length ? { slot: open[0], tip: tipFor(open[0], b), fitted, total: BUG.slots.length, text: `Putting her back together: ${fitted}/${BUG.slots.length} on · next: ${open[0].name.toLowerCase()}${open[0].cover && isFitted(BUG, b, open[0].cover) ? ` (open the ${BUG.covers[open[0].cover].name} first)` : ''}` } : null;
}
