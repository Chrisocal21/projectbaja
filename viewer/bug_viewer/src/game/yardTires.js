// The new-game yard cleanup (PURE: loads under node). Old tires lie all over Walt's property; you cannot open for business until each one is
// either thrown on the scrap pile (bald ones, paid) or set on a tire rack (the ones with rubber left). PROPOSAL: count, treads, spots and pay.
import { BALD, treadOf } from './tires.js';

export const JUNK_TIRE_PAY = 4;
/** where the tires lie, garage-local metres [x, z, level] (roller door at z = 6, the yard runs out to +z). Chris, Nov 26: not strewn over the yard,
 *  but how a shop looks after a year unused: a few small heaps by the walls, some stacked two high (level 1 lies on the level 0 tire under it). */
export const YARD_SPOTS = [
  [4.9, 7.35], [4.9, 7.35, 1], [5.65, 7.3], [6.45, 7.4],            // by the roller door, right
  [-4.9, 7.35], [-4.9, 7.35, 1], [-5.7, 7.45], [-6.7, 7.6],         // by the roller door, left
  [8.3, 6.9], [9.0, 7.7], [9.75, 7.0], [9.2, 8.6],                  // slumped heap off the front right corner
  [13.0, 1.4], [13.0, 1.4, 1], [13.75, 1.7], [13.2, 2.7],           // round the side (left clear of the side bay to come)
];
export const STACK_UP = 0.26;
/** the scrap tire pile: beside the lot, clear of the parking stalls */
export const TIRE_PILE = { lx: 14.5, lz: 24 };
/** tread of each yard tire: eleven bald, five worth keeping (the last of those has a hole to patch) */
export const YARD_TREADS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.22, 0.3, 0.45, 0.58, 0.38];

/** the sixteen tires of a new game, in a random order over the fixed spots. rng() -> [0,1) */
export function yardTires(rng = Math.random) {
  const order = YARD_TREADS.map((t, i) => ({ t, hole: i === YARD_TREADS.length - 1, k: rng() })).sort((a, b) => a.k - b.k);
  return YARD_SPOTS.map(([lx, lz, level = 0], i) => ({ kind: 'stock', id: 'wheel', set: 'stock', yard: true, tread: order[i].t, ...(order[i].hole ? { hole: true, air: 0 } : {}), lx, lz, ry: rng() * 6, y: level * STACK_UP, ...(level ? { stacked: true } : {}) }));
}
/** a stacked tire whose bottom one was carried off drops to the ground (and one that has been moved stops being stacked). true when anything changed */
export function settleStacks(items) {
  let changed = false;
  for (const it of items) {
    if (!it.stacked) continue;
    if (it.loc !== 'world') { delete it.stacked; continue; }
    if (!items.some(o => o !== it && o.yard && o.loc === 'world' && !o.stacked && Math.hypot(o.x - it.x, o.z - it.z) < 0.2)) { delete it.stacked; it.y = 0; changed = true; }
  }
  return changed;
}
/** can this go on the scrap pile? A loose bald tire (never a customer's wheel) */
export const isScrapTire = it => !!it && !it.cust && it.kind === 'stock' && it.id === 'wheel' && treadOf(it) < BALD;
/** yard tires still to deal with: anything not set down on a rack or shelf (thrown ones are gone from the list) */
export const yardLeft = items => items.filter(i => i.yard && i.loc !== 'garage').length;
export const YARD_TOTAL = YARD_SPOTS.length;
/** is opening for business still blocked by the mess? Only a game that started with the yard tires, until it has been cleared once */
export const yardBlocks = home => !!home?.yard && !home.yard.done;
/** the state after looking at the items: latches done, so taking a tire off the rack later never closes you again. Returns the same object when nothing changed. */
export const yardCheck = (home, items) => (yardBlocks(home) && !yardLeft(items) ? { ...home, yard: { ...home.yard, done: true } } : home);
