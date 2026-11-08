// Stateful half of the upgrade track: reads/writes game.home.upgrades. The catalog and its price/level math are pure,
// in worlds/upgrades.js (tested there, no game-state import, same pattern as structures.js and lot.js).
import { game, addCash, save, say } from './store.js';
import { creative } from './settings.js';
import { UPGRADES, upgradeById, isMaxed as isMaxedAt, nextPrice as nextPriceAt, nextNote as nextNoteAt } from '../worlds/upgrades.js';

export { UPGRADES, upgradeById };
export const upgradeLevel = id => game.home?.upgrades?.[id] || 0;
export const isMaxed = id => isMaxedAt(id, upgradeLevel(id));
export const nextPrice = id => nextPriceAt(id, upgradeLevel(id));
export const nextNote = id => nextNoteAt(id, upgradeLevel(id));
/** why the next level can't be bought right now ('' = it can) */
export function upgradeWhy(id) {
  if (isMaxed(id)) return 'Fully built.';
  if (!creative() && game.cash < nextPrice(id)) return `Not enough cash ($${nextPrice(id)}).`;
  return '';
}
export function buyUpgrade(id) {
  const u = upgradeById[id], why = upgradeWhy(id); if (why) { say(why); return false; }
  const level = upgradeLevel(id), price = nextPrice(id), free = creative();
  if (!free) addCash(-price);
  game.home = { ...game.home, upgrades: { ...(game.home.upgrades || {}), [id]: level + 1 } };
  save(); say(`Upgrade: ${u.name}${u.levels > 1 ? ` — level ${level + 1}/${u.levels}` : ''}${free ? ' (creative: free)' : ` (−$${price})`}`);
  return true;
}
