// Who buys what, and for how much. Pure rules (no game state): Dusty and the Salvage & Surplus warehouse each pay a share of an item's value that moves with
// how much of that kind of thing they already hold: sell a pile of tires to one buyer and his price falls, wait (or go to the other buyer) and it recovers.
// Their shelves empty slowly with game time (DECAY_PER_HOUR), so the world does not move while the game is closed (canon). Every number is a PROPOSAL.
import { sellValue } from './selling.js';

export const BUYERS = {
  dusty: { name: "Dusty's corner store", short: 'Dusty', rates: { parts: 1, supplies: 1, tools: 1, tires: 1, junk: 1 } },
  mart: { name: 'the mart', short: 'the mart', rates: { supplies: 0.8, tools: 0.8 } },   // a gas-station shop: small stuff only
  barn: { name: 'the barn', short: 'the barn', rates: { supplies: 0.9, tools: 1.0, junk: 1.3, parts: 0.6, tires: 0.8 } },
  junkyard: { name: 'the junkyard', short: 'the yard', rates: { parts: 0.75, tools: 0.7, tires: 1.5, junk: 2 } },
  offroad: { name: 'the off-road store', short: 'the store', rates: { parts: 1.05, tools: 0.9, supplies: 0.8, tires: 1.2 } },
  warehouse: { name: 'Salvage & Surplus', short: 'the warehouse', rates: { parts: 0.9, tools: 1, tires: 1.4, junk: 1.8 } },   // no supplies: it is a scrapyard
};
export const CAT_NAMES = { parts: 'parts', supplies: 'supplies', tools: 'tools', tires: 'tires', junk: 'junk' };
export const CAP = 8, MAX_MULT = 1.35, MIN_MULT = 0.5, DECAY_PER_HOUR = 0.5;

export function categoryOf(it) {
  switch (it?.kind) {
    case 'part': case 'wheel': case 'rim': case 'stock': return 'parts';
    case 'supply': return 'supplies'; case 'tool': return 'tools'; case 'tire': return 'tires'; case 'junk': return 'junk';
    default: return null;
  }
}
/** the price multiplier for a buyer that already holds n of a category: high when bare, low when flooded */
export const demand = n => MAX_MULT - (MAX_MULT - MIN_MULT) * Math.min(1, Math.max(0, n) / CAP);
export const demandWord = n => (n < 2 ? 'wants more' : n < CAP * 0.5 ? 'fair' : n < CAP ? 'well stocked' : 'flooded');

/** units a buyer holds of a category right now: the saved count, less what has been sold on since. market[buyer][cat] = { n, at } (at = game hours) */
export function heldNow(market, buyer, cat, now) {
  const e = market?.[buyer]?.[cat]; if (!e) return 0;
  const gone = e.at <= now ? (now - e.at) * DECAY_PER_HOUR : 0;   // (a new session restarts the game clock at 0: nothing has passed yet)
  return Math.max(0, e.n - gone);
}
/** { price, word } for selling `it` (list price `base`) to `buyer`, or price 0 when they do not buy it */
export function offer(it, base, buyer, market, now) {
  const cat = categoryOf(it), b = BUYERS[buyer], rate = b?.rates[cat]; if (!cat || !rate) return { price: 0, word: '' };
  const n = heldNow(market, buyer, cat, now), v = sellValue(it, base);
  return { price: v ? Math.max(1, Math.round(v * rate * demand(n))) : 0, word: demandWord(n) };
}
/** the market after selling one `it` to `buyer` */
export function recordSale(market, it, buyer, now) {
  const cat = categoryOf(it), n = heldNow(market, buyer, cat, now) + 1;
  return { ...(market || {}), [buyer]: { ...(market?.[buyer] || {}), [cat]: { n, at: now } } };
}
