// The tow truck (game/towLogic.js): called from the phone's Tow app. Pays the driver, passes the ride's game time, and sets you and your vehicle down at Walt's garage.
import { game, save, say, addCash } from './store.js';
import { spawns } from '../worlds/county.js';
import { passTime } from './orders.js';
import { tickFinish } from './finishTick.js';
import { towQuote } from './towLogic.js';

const garage = () => spawns.find(s => s.key === '0') || spawns[0];
/** where you are (the vehicle you drive, or you on foot) */
const here = () => (!game.onFoot && game.pose ? game.pose : game.pos);
export const towNow = () => towQuote(here(), garage(), game.cash);

export function callTow() {
  const g = garage(), q = towNow();
  if (q.near) return say("You're already at the garage.");
  if (game.flyMode) return say('Land first.');
  if (q.charge > 0) addCash(-q.charge, 'Tow truck');
  game.clock = ((game.clock ?? 9) + q.hours) % 24; passTime(q.hours); tickFinish(0, q.hours);   // the ride takes time: orders count down, bare steel rusts a little
  const dest = { x: g.x, z: g.z, h: g.h || 0 }, side = { x: g.x + Math.cos(dest.h) * 5, z: g.z - Math.sin(dest.h) * 5, h: dest.h };
  game.carTo = dest; game.teleportTo = game.onFoot ? side : dest;
  if (game.home?.sink?.[game.active]) game.home = { ...game.home, sink: { ...game.home.sink, [game.active]: { n: 0 } } };   // pulled out of the silt (bogDown.js)
  save();
  say(q.charge < q.fee ? `The driver takes what you have ($${q.charge}) and drops you at the garage.` : `The tow truck brings you home: $${q.charge}, ${q.hours} h.`);
}
