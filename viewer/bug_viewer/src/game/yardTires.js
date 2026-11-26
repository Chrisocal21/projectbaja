// The new-game yard cleanup (PURE: loads under node). Old tires lie all over Walt's property; you cannot open for business until each one is
// either thrown on the scrap pile (bald ones, paid) or set on a tire rack (the ones with rubber left). PROPOSAL: count, treads, spots and pay.
import { BALD, treadOf } from './tires.js';

export const JUNK_TIRE_PAY = 4;
/** where the tires lie, garage-local metres (roller door at z = 6, the yard runs out to +z). Clear of the building, the junk piles and the middle lane. */
export const YARD_SPOTS = [
  [-19, 4], [-22, 15], [-14, 13], [-9, 22], [-17, 28], [-7, 33], [-24, -3], [-18, -11],
  [-6, -11], [4, -13], [14, -8], [18, 4], [13, 10], [21, 20], [9, 31], [16, 34],
];
/** the scrap tire pile: beside the lot, clear of the parking stalls */
export const TIRE_PILE = { lx: 14.5, lz: 24 };
/** tread of each yard tire: eleven bald, five worth keeping (the last of those has a hole to patch) */
export const YARD_TREADS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.22, 0.3, 0.45, 0.58, 0.38];

/** the sixteen tires of a new game, in a random order over the fixed spots. rng() -> [0,1) */
export function yardTires(rng = Math.random) {
  const order = YARD_TREADS.map((t, i) => ({ t, hole: i === YARD_TREADS.length - 1, k: rng() })).sort((a, b) => a.k - b.k);
  return YARD_SPOTS.map(([lx, lz], i) => ({ kind: 'stock', id: 'wheel', set: 'stock', yard: true, tread: order[i].t, ...(order[i].hole ? { hole: true, air: 0 } : {}), lx, lz, ry: rng() * 6 }));
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
