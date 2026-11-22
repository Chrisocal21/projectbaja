// Selling to Dusty or to the Salvage & Surplus warehouse: the runtime side of game/market.js. Only what you are carrying (hands and pack) can be sold.
// Each sale moves that buyer's shelf (game.home.market), which moves his next price; the shelf empties with game time (see passTime in orders.js).
import { game, say, save, addCash, priceOf } from './store.js';
import { SUPPLIES, supplyPrice } from './garageSupplies.js';
import { nameOfItem } from './items.js';
import { BUYERS, offer, recordSale } from './market.js';

const basePrice = it => {
  try {
    if (it.kind === 'supply') return SUPPLIES[it.id]?.price || 0;
    if (it.kind === 'tool') return supplyPrice('tool:' + it.id);
    if (it.kind === 'stock' && it.id === 'battery') return 60;
    if (it.kind === 'part' || it.kind === 'wheel' || it.kind === 'rim' || it.kind === 'stock') return priceOf(it.kind, it.id);
  } catch {}
  return 0;
};
export const gameHours = () => game.marketHours || 0;
/** what you are carrying that this buyer will take: [{ it, value, word }] */
export const sellable = (buyer = 'dusty') => game.items.filter(i => i.loc === 'hand' || i.loc === 'pack')
  .map(it => { const o = offer(it, basePrice(it), buyer, game.home?.market, gameHours()); return { it, value: o.price, word: o.word }; }).filter(r => r.value > 0);
export function sellItem(uid, buyer = 'dusty') {
  const r = sellable(buyer).find(x => x.it.uid === uid); if (!r) return say(`${BUYERS[buyer]?.short || 'They'} won't take that.`);
  game.items = game.items.filter(i => i !== r.it);
  game.home = { ...game.home, market: recordSale(game.home?.market, r.it, buyer, gameHours()) };
  addCash(r.value, `Sold to ${BUYERS[buyer].short}: ${nameOfItem(r.it)}`); save(); say(`Sold ${nameOfItem(r.it)} to ${BUYERS[buyer].short} (+$${r.value}).`);
}
