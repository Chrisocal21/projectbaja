// Highway gas stations and rest stops: the quick-fix bay. The mechanic does every worn part in one go, at the bench price plus a markup.
import { WEAR_PARTS, partCost, serviced } from '../wear.js';

export const FIX_MARKUP = 1.25;
/** { cost, parts } for a vehicle's wear: what is worn, and what the bay charges for all of it (cost 0: nothing to do) */
export function fixQuote(w) {
  const parts = WEAR_PARTS.filter(p => partCost(w, p) > 0);
  return { parts, cost: Math.round(parts.reduce((s, p) => s + partCost(w, p), 0) * FIX_MARKUP) };
}
/** the wear after the bay has done every worn part */
export const fixedWear = w => WEAR_PARTS.reduce((x, p) => serviced(x, p), w);
