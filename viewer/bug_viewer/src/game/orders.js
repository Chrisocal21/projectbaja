// Ordering parts from the phone (PROPOSAL, first slice, docs/GAMEPLAN.md job 4). Orders live in game.home.orders (saved with the game).
// An unnamed supplier: no driver, no truck, no lore. When time is up the box is set down at the shop pickup area, like a bought part.
import { game, save, say, addCash, priceOf, nameOf } from './store.js';
import { boxAtShop, spawnItem } from './items.js';
import { SITES, toWorld } from '../worlds/county.js';
import { newOrder, advanceOrders } from './orderlogic.js';
import { effects } from './upgrades.js';
import { VEHICLE_TYPES, FOR_SALE, lotPose, owned } from './fleet.js';
import { giftArrives } from './cajonGift.js';
import { itemOf } from './garageSupplies.js';
import { standFor, addStock } from './stock.js';

export const ordersOnTheWay = () => game.home?.orders || [];
const bodyId = () => game.build?.body || 'classic';

export function placeOrder(kind, id) {
  if (game.dev) return say('Ordering is off in test sessions.');
  const c = priceOf(kind, id);
  if (game.cash < c) return say(`Not enough cash ($${c}).`);
  addCash(-c, `Ordered: ${nameOf(kind, id, bodyId())}`);
  game.home = { ...game.home, orders: [...ordersOnTheWay(), newOrder(kind, id, effects().orderHours)] };
  save(); say(`Ordered: ${nameOf(kind, id, bodyId())} (arrives at the pickup area in ${effects().orderHours === 1 ? 'about an hour' : effects().orderHours + ' hours'})`);
}

/** game time passes (in-game hours): count orders down, set down whatever is due */
export function passTime(hours) {
  if (hours > 0) { game.marketHours = (game.marketHours || 0) + hours;   // game time, for the buyers' shelves (game/market.js)
    if (game.home) game.home.hoursTotal = (game.home.hoursTotal || 0) + hours; }   // saved game time, for the shops' restocking (game/shopStock.js); in place, this runs every frame
  const list = ordersOnTheWay(); if (!list.length || !(hours > 0)) return;
  let due = false; for (const o of list) { o.left -= hours; if (o.left <= 1e-9) due = true; }   // (counted down in place: this runs every frame)
  if (!due) return;
  const r = advanceOrders(list, 0);
  game.home = { ...game.home, orders: r.orders };
  for (const o of r.arrived) {
    if (o.kind === 'car') { carArrives(o.id); continue; }
    if (o.kind === 'gift') { giftArrives(); continue; }   // Dusty's El Cajon: set down in Walt's yard, not boxed at the shop
    if (o.label) { boxAtShop(o.kind, o.id); say(`Your delivery arrived at the pickup area: ${o.label}`); continue; }   // a road-shop purchase sent to the garage (game/roadShop.js)
    const stand = o.kind === 'garage' ? standFor(...itemOf(o.id)) : null, put = stand ? addStock(game.home, stand.id, 1) : { added: 0 };
    if (put.added) { game.home = put.home; say(`Your order arrived and went straight onto its stand: ${nameOf(o.kind, o.id, bodyId())} (${game.home.stock[stand.id]}/10)`); continue; }   // (a full stand: it waits at the pickup like any other box)
    if (o.kind === 'garage' && itemOf(o.id)[0] === 'epart') {   // small engine pieces come to Walt's door: the first order happens before the Bug runs, and the pickup is 1.6 km away
      const [x, z] = toWorld(SITES.garage, 2.2, 5.2); spawnItem(...itemOf(o.id), x, z);
      say(`Your order was dropped off inside the garage door: ${nameOf(o.kind, o.id, bodyId())}`); continue;
    }
    if (o.kind === 'garage') boxAtShop(...itemOf(o.id)); else boxAtShop(o.kind, o.id);
    say(`Your order arrived at the pickup area: ${nameOf(o.kind, o.id, bodyId())}`);
  }
  save();
}

/** a name for any order (parts, or a car from the Car sales app) */
export const orderName = (o, body = bodyId()) => (o.label ? o.label : o.kind === 'car' ? VEHICLE_TYPES[o.id]?.name || 'Vehicle' : o.kind === 'gift' ? "El Cajon, from Dusty (to Walt's yard)" : nameOf(o.kind, o.id, body));
export const carOnOrder = id => ordersOnTheWay().some(o => o.kind === 'car' && o.id === id);

/** Car sales app (PROPOSAL): pay now, the car is brought to Al's lot after a few game hours and left there, keys in it */
export function orderCar(id) {
  const t = VEHICLE_TYPES[id]; if (!t) return;
  if (game.dev) return say('Buying is off in test sessions.');
  if (owned(id) || carOnOrder(id)) return;
  if (game.cash < t.price) return say(`Not enough cash ($${t.price}).`);
  addCash(-t.price, `Ordered: ${t.name}`);
  game.home = { ...game.home, orders: [...ordersOnTheWay(), newOrder('car', id, effects().orderHours)] };
  save(); say(`Ordered: ${t.name} (it will be left at Al's lot in a few hours)`);
}
function carArrives(id) {
  const spot = FOR_SALE.find(f => f.id === id)?.spot;
  if (!owned(id)) game.fleet = { ...game.fleet, [id]: { pose: spot ? lotPose(spot) : null } };
  say(`Your ${VEHICLE_TYPES[id]?.name || 'car'} was left at Al's lot. Keys are in it.`);
}
