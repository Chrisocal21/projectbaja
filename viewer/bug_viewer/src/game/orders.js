// Ordering parts from the phone (PROPOSAL, first slice, docs/GAMEPLAN.md job 4). Orders live in game.home.orders (saved with the game).
// An unnamed supplier: no driver, no truck, no lore. When time is up the box is set down at the shop pickup area, like a bought part.
import { game, save, say, addCash, priceOf, nameOf } from './store.js';
import { boxAtShop } from './items.js';
import { newOrder, advanceOrders } from './orderlogic.js';

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
  for (const o of r.arrived) { boxAtShop(o.kind, o.id); say(`Your order arrived at the pickup area: ${nameOf(o.kind, o.id, bodyId())}`); }
  save();
}
