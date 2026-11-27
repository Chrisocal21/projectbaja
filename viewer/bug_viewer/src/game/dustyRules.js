// Shopping by hand at Dusty's (pure rules). A thing off the shelf is a real item you carry, marked `unpaid: price`,
// until you ring it up at the counter. It cannot leave the store: put it down or walk out and it is back on the shelf.
import { STORE } from '../worlds/dustyLayout.js';

/** inside the building (site-local metres), with a little slack for the doorway */
export const inStore = (lx, lz) => lx > STORE.x0 && lx < STORE.x1 && lz > STORE.z0 && lz < STORE.z1 + 0.35;
export const unpaid = items => items.filter(i => i.unpaid !== undefined);
export const bill = items => unpaid(items).reduce((n, i) => n + i.unpaid, 0);
/** pay for everything on you: null if the cash does not cover it, else { total, items (paid ones kept), mats: [[id, n]] } (materials go on your tally, not in your hands) */
export function ringUp(items, cash) {
  const due = unpaid(items), total = bill(items);
  if (total > cash) return null;
  const mats = due.filter(i => i.kind === 'mat').map(i => [i.id, i.n]);
  return { total, mats, items: items.filter(i => !(i.unpaid !== undefined && i.kind === 'mat')).map(i => { if (i.unpaid === undefined) return i; const { unpaid: _, ...rest } = i; return rest; }) };
}
