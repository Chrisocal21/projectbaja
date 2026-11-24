// The jerry can (rules/fuel.js): fill it at a pump (E with it in your hands), pour it into the car's tank (hold left click on the car).
import { game, save, say, addCash } from './store.js';
import { held } from './items.js';
import { tankOf, fuelOf, PRICE_PER_L, CAN_L, canFuel, pourStep } from '../rules/fuel.js';

let timer = 0, last = 0;
export const canInHand = () => { const h = held(); return h?.kind === 'junk' && h.id === 'jerrycan' ? h : null; };
const carHave = () => fuelOf(game.home, game.active);

/** the prompt line while a can is in hand and you look at the car */
export function canPrompt() {
  const c = canInHand(); if (!c) return null;
  const l = canFuel(c), room = tankOf(game.active) - carHave();
  return l < 0.05 ? 'Jerry can: empty. Fill it at a pump (E)' : room < 0.5 ? 'The tank is full.' : `Hold left click to pour the jerry can into the tank (${Math.round(l)} L)`;
}
/** E at a pump with a can in hand: fill the can instead of the car. Returns true if it handled it. */
export function fillCanAtPump() {
  const c = canInHand(); if (!c) return false;
  const want = CAN_L - canFuel(c); if (want < 0.5) { say('The jerry can is already full.'); return true; }
  const litres = game.cash >= Math.ceil(want * PRICE_PER_L) ? want : Math.floor(game.cash / PRICE_PER_L);
  if (litres < 1) { say(`Not enough cash for fuel ($${Math.ceil(want * PRICE_PER_L)} to fill the can).`); return true; }
  const price = Math.ceil(litres * PRICE_PER_L); addCash(-price, 'Gas (jerry can)');
  c.fuel = canFuel(c) + litres; game.items = [...game.items]; save(); say(`Filled the jerry can with ${Math.round(litres)} L: $${price}`);
  return true;
}
export function startPour() {
  stopPour(false);
  const c = canInHand(); if (!c) return false;
  if (canFuel(c) < 0.05) { say('The jerry can is empty. Fill it at a pump.'); return true; }
  if (tankOf(game.active) - carHave() < 0.5) { say('The tank is full.'); return true; }
  last = performance.now(); game.holdBar = { t0: last, dur: 1e9, label: 'Pouring…', frac: 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (!game.target?.startsWith('car:')) return;   // looked away: nothing happens until you look back
    const can = canInHand(); if (!can) return stopPour(true);
    const cap = tankOf(game.active), r = pourStep(canFuel(can), carHave(), cap, dt);
    game.home = { ...game.home, fuel: { ...(game.home.fuel || {}), [game.active]: r.tank } };
    can.fuel = r.can; if (game.holdBar) game.holdBar.frac = Math.min(1, r.tank / cap);
    if (r.can < 0.05) { say('The jerry can is empty.'); stopPour(true); } else if (cap - r.tank < 0.05) { say('The tank is full.'); stopPour(true); }
  }, 90);
  return true;
}
export function stopPour(persist = true) {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
  if (persist) { game.items = [...game.items]; save(); }
}
