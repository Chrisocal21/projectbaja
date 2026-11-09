// Ordering parts from the phone (PROPOSAL, first slice, docs/GAMEPLAN.md job 4). Orders live in game.home.orders (saved with the game).
// An unnamed supplier: no driver, no truck, no lore. When time is up the box is set down at the shop pickup area, like a bought part.
import { game, save, say, addCash, priceOf, nameOf } from './store.js';
import { boxAtShop } from './items.js';
import { newOrder, advanceOrders } from './orderlogic.js';
import { VEHICLE_TYPES, FOR_SALE, lotPose, owned } from './fleet.js';

export const ordersOnTheWay = () => game.home?.orders || [];
const bodyId = () => game.build?.body || 'classic';

export function placeOrder(kind, id) {
  if (game.dev) return say('Ordering is off in test sessions.');
  const c = priceOf(kind, id);
  if (game.cash < c) return say(`Not enough cash ($${c}).`);
  addCash(-c, `Ordered: ${nameOf(kind, id, bodyId())}`);
  game.home = { ...game.home, orders: [...ordersOnTheWay(), newOrder(kind, id)] };
  save(); say(`Ordered: ${nameOf(kind, id, bodyId())} (arrives at the pickup area in a few hours)`);
}

/** game time passes (in-game hours): count orders down, set down whatever is due */
export function passTime(hours) {
  const list = ordersOnTheWay(); if (!list.length || !(hours > 0)) return;
  let due = false; for (const o of list) { o.left -= hours; if (o.left <= 1e-9) due = true; }   // (counted down in place: this runs every frame)
  if (!due) return;
  const r = advanceOrders(list, 0);
  game.home = { ...game.home, orders: r.orders };
  for (const o of r.arrived) {
    if (o.kind === 'car') { carArrives(o.id); continue; }
    boxAtShop(o.kind, o.id); say(`Your order arrived at the pickup area: ${nameOf(o.kind, o.id, bodyId())}`);
  }
  save();
}

/** a name for any order (parts, or a car from the Car sales app) */
export const orderName = (o, body = bodyId()) => (o.kind === 'car' ? VEHICLE_TYPES[o.id]?.name || 'Vehicle' : nameOf(o.kind, o.id, body));
export const carOnOrder = id => ordersOnTheWay().some(o => o.kind === 'car' && o.id === id);

/** Car sales app (PROPOSAL): pay now, the car is brought to Al's lot after a few game hours and left there, keys in it */
export function orderCar(id) {
  const t = VEHICLE_TYPES[id]; if (!t) return;
  if (game.dev) return say('Buying is off in test sessions.');
  if (owned(id) || carOnOrder(id)) return;
  if (game.cash < t.price) return say(`Not enough cash ($${t.price}).`);
  addCash(-t.price, `Ordered: ${t.name}`);
  game.home = { ...game.home, orders: [...ordersOnTheWay(), newOrder('car', id)] };
  save(); say(`Ordered: ${t.name} (it will be left at Al's lot in a few hours)`);
}
function carArrives(id) {
  const spot = FOR_SALE.find(f => f.id === id)?.spot;
  if (!owned(id)) game.fleet = { ...game.fleet, [id]: { pose: spot ? lotPose(spot) : null } };
  say(`Your ${VEHICLE_TYPES[id]?.name || 'car'} was left at Al's lot. Keys are in it.`);
}
