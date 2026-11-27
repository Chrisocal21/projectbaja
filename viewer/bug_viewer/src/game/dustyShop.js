// The runtime side of shopping by hand at Dusty's (rules in dustyRules.js).
import { game, say, save, addCash } from './store.js';
import { STORE_ITEMS } from './jobs.js';
import { canCarry, giveToPlayer, nameOfItem, held, dropItem } from './items.js';
import { MAT_PACKS, addMats } from './materials.js';
import { dustyVisit } from './cajonGift.js';
import { inStore, unpaid, bill, ringUp } from './dustyRules.js';
import { SITES } from '../worlds/county.js';

const localOf = (s, x, z) => { const dx = x - s.x, dz = z - s.z, c = Math.cos(s.rot), n = Math.sin(s.rot); return [dx * c - dz * n, dx * n + dz * c]; };
const rowOf = what => STORE_ITEMS.find(r => r[0] === what);
export const goodPrompt = what => { const r = rowOf(what); return r ? `Press E — Take: ${r[1]} ($${r[2]})` : ''; };
export const counterPrompt = () => { const n = unpaid(game.items).length; return n ? `Press E — Pay $${bill(game.items)} for ${n} thing${n > 1 ? 's' : ''}` : 'Press E — Corner store (sell, car wash)'; };

/** take one off the shelf: it is in your pack or hands, not yet paid for */
export function takeGood(what) {
  const r = rowOf(what); if (!r) return;
  const [kind, id] = what.split(':'), extra = { unpaid: r[2], ...(kind === 'mat' ? { n: MAT_PACKS[id].n } : {}) };
  if (!canCarry(kind, id)) return say('Your hands are full. Right-click to put that back.');
  giveToPlayer(kind, id, extra); say(`${r[1]}, $${r[2]}: pay at the counter.`);
}
/** right click with something unpaid: it goes back on the shelf (what you hold, or with free hands the last thing you pocketed) */
export function putBackGood() {
  const h = held(), it = h ? (h.unpaid !== undefined ? h : null) : unpaid(game.items).at(-1);
  if (!it) return false;
  dropItem(it.uid); return true;
}
/** E at the counter. True if it rang something up (or you cannot afford it); false means: open the store menu. */
export function ringAtCounter() {
  dustyVisit();
  const n = unpaid(game.items).length; if (!n) return false;
  const sale = ringUp(game.items, game.cash);
  if (!sale) { say(`That comes to $${bill(game.items)} and you have $${game.cash}. Right-click to put something back.`); return true; }
  game.items = sale.items;
  for (const [id, count] of sale.mats) game.mats = addMats(game.mats, { [id]: count });
  addCash(-sale.total, `Bought at Dusty's: ${n} thing${n > 1 ? 's' : ''}`); save(); say(`Paid Dusty $${sale.total}.`);
  return true;
}
/** called every frame: whatever you have not paid for stays in the store */
export function tickDustyShop() {
  if (!game.items.some(i => i.unpaid !== undefined)) return;
  const [lx, lz] = localOf(SITES.gas, game.pos.x, game.pos.z);
  if (game.onFoot && inStore(lx, lz)) return;
  const left = unpaid(game.items).map(i => nameOfItem({ ...i, unpaid: undefined }));
  game.items = game.items.filter(i => i.unpaid === undefined); save();
  say(`Not paid for, so it went back on the shelf: ${left.join(', ')}.`);
}
