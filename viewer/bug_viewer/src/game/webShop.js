// Buying from the phone browser's sites (rules and data: game/web.js). Orders ride the same queue as parts (game.home.orders, game/orders.js passTime):
// materials and junk lots are dropped at Walt's garage door as bundles you pick up (kind 'web'); used parts are boxed at the pickup area like any part.
import { game, save, say, addCash, catalogFor, priceOf, nameOf } from './store.js';
import { newOrder } from './orderlogic.js';
import { effects } from './upgrades.js';
import { SUPPLY_BUNDLES, SUPPLY_DELIVERY, classifieds, boardDay, openListings, listingTotal } from './web.js';
import { matName } from './matFinds.js';

const queue = o => { game.home = { ...game.home, orders: [...(game.home?.orders || []), o] }; };
const hoursText = () => (effects().orderHours === 1 ? 'about an hour' : `${effects().orderHours} hours`);

/** a seed per save, so two saves do not see the same classifieds */
export function webSeed() {
  if (game.home?.webSeed == null) game.home = { ...game.home, webSeed: Math.floor(Math.random() * 9973) };   // (no save() here: this runs while the page draws; the autosave keeps it)
  return game.home.webSeed;
}
/** the classifieds board today, without what you already bought */
export function todaysBoard() {
  const body = game.build?.body || 'classic', parts = catalogFor(body).part.map(p => ({ kind: 'part', id: p.id, name: nameOf('part', p.id, body), price: priceOf('part', p.id) }));
  return openListings(classifieds(boardDay(game.home?.hoursTotal), parts, webSeed()), game.home?.webSold || {});
}
/** hours until the board changes */
export const boardHoursLeft = () => { const h = game.home?.hoursTotal || 0; return 24 - (h - boardDay(h) * 24); };

export function buyBundle(id) {
  const b = SUPPLY_BUNDLES.find(x => x.id === id); if (!b) return;
  if (game.dev) return say('Ordering is off in test sessions.');
  const cost = b.price + SUPPLY_DELIVERY; if (game.cash < cost) return say(`Not enough cash ($${cost}).`);
  addCash(-cost, `Ordered: ${b.name}`);
  queue({ ...newOrder('web', b.id, effects().orderHours), mat: b.mat, n: b.n, label: b.name });
  save(); say(`Ordered: ${b.name}. Delivered to Walt's garage door in ${hoursText()}.`);
}

export function buyListing(listingId) {
  const l = todaysBoard().find(x => x.id === listingId); if (!l) return say('That listing is gone.');
  if (game.dev) return say('Buying is off in test sessions.');
  const cost = listingTotal(l); if (game.cash < cost) return say(`Not enough cash ($${cost}).`);
  addCash(-cost, `Classifieds: ${l.title}`);
  const day = boardDay(game.home?.hoursTotal), sold = Object.fromEntries(Object.entries(game.home?.webSold || {}).filter(([k]) => k.startsWith(`d${day}-`)));   // only today's sales are kept
  game.home = { ...game.home, webSold: { ...sold, [l.id]: true } };
  if (l.type === 'junk') { queue({ ...newOrder('web', l.lot, effects().orderHours), mat: l.mat, n: l.n, label: `${l.title}, from ${l.town}` }); save(); return say(`Bought: ${l.title}. The seller in ${l.town} drops it at Walt's garage door in ${hoursText()}.`); }
  queue({ ...newOrder(l.kind, l.partId, effects().orderHours), label: `${l.title}, from ${l.town}` });   // a labelled order is boxed at the pickup area (orders.js)
  save(); say(`Bought: ${l.title}. It will be boxed at the pickup area in ${hoursText()}.`);
}
/** what a web order is called on the Orders list */
export const webOrderName = o => o.label || matName(o.mat, o.n);
