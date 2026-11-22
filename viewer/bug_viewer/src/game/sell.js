// Selling to Dusty: the runtime side of game/selling.js. Only what you are carrying (hands and pack) can be sold; the money moves in one save.
import { game, say, save, addCash, priceOf } from './store.js';
import { SUPPLIES, supplyPrice } from './garageSupplies.js';
import { nameOfItem } from './items.js';
import { sellValue } from './selling.js';

const basePrice = it => {
  try {
    if (it.kind === 'supply') return SUPPLIES[it.id]?.price || 0;
    if (it.kind === 'tool') return supplyPrice('tool:' + it.id);
    if (it.kind === 'stock' && it.id === 'battery') return 60;
    if (it.kind === 'part' || it.kind === 'wheel' || it.kind === 'rim' || it.kind === 'stock') return priceOf(it.kind, it.id);
  } catch {}
  return 0;
};
/** what you are carrying that Dusty will buy: [{ it, value }] */
export const sellable = () => game.items.filter(i => i.loc === 'hand' || i.loc === 'pack').map(it => ({ it, value: sellValue(it, basePrice(it)) })).filter(r => r.value > 0);
export function sellItem(uid) {
  const r = sellable().find(x => x.it.uid === uid); if (!r) return say("Dusty won't take that.");
  game.items = game.items.filter(i => i !== r.it);
  addCash(r.value, `Sold to Dusty: ${nameOfItem(r.it)}`); save(); say(`Sold ${nameOfItem(r.it)} to Dusty (+$${r.value}).`);
}
