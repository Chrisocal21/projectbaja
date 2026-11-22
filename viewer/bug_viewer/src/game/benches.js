// The battery charger and the workbench service (impure; rules are in benchRules.js). Same idea as the tire machine and engine stand:
// set the part on the bench and wait. A battery lying within reach of a charger gains charge (needs the garage power on). An engine piece lying
// on the workbench top gets a service after a few seconds: cleaned and adjusted, up to what a used part can be.
import { game, save, say } from './store.js';
import { nearestProp, onBench } from './fixtures.js';
import { chargeOf, chargeStep, serviceBlock, serviceTo, SERVICE_S, WASH_S } from './benchRules.js';
import { slotOf } from './engineRules.js';

export const CHARGER_R = 1.2, WASHER_R = 1.2;
const timers = new Map(), told = new Map();
let sinceSave = 0;   // charging changes the battery every frame: write the save about every 2 s, not every frame
const tellOnce = (key, msg) => { if (told.get(key) !== msg) { told.set(key, msg); say(msg); } };

export function tickBenches(dt) {
  if (game.dev || game.paused) return;
  let changed = false;
  const chargers = game.props.filter(p => p.id === 'batteryCharger');
  for (const m of chargers) {
    const bats = game.items.filter(i => i.kind === 'stock' && i.id === 'battery' && i.loc === 'world' && i.x !== undefined && Math.hypot(i.x - m.x, i.z - m.z) <= CHARGER_R);
    for (const b of bats) {
      const c = chargeOf(b);
      if (c >= 1) { if (b.charge !== undefined && b.charge < 1) b.charge = 1; if (told.get('b' + b.uid) === 'on') { told.set('b' + b.uid, 'full'); say('The battery is fully charged.'); changed = true; } continue; }
      if (!game.home?.power) { tellOnce('p' + m.uid, 'The charger is dead: flip the main breaker in the garage first.'); continue; }
      b.charge = chargeStep(c, dt); told.set('b' + b.uid, 'on'); changed = true;
      if (!timers.has(b.uid)) { say(`Charging: ${Math.round(c * 100)}%. It takes about a minute and a half from empty.`); timers.set(b.uid, 1); }
    }
  }
  for (const m of game.props.filter(p => p.id === 'partsWasher')) {   // grime off, so the real condition can be read
    for (const it of game.items) {
      if (it.kind !== 'epart' || !it.grimy || it.onEngine || it.loc !== 'world' || it.x === undefined || Math.hypot(it.x - m.x, it.z - m.z) > WASHER_R) continue;
      if (!game.home?.power) { tellOnce('p' + m.uid, 'The parts washer pump is dead: flip the main breaker in the garage first.'); continue; }
      const t = (timers.get('w' + it.uid) || 0) + dt; timers.set('w' + it.uid, t);
      if (t < WASH_S) continue;
      timers.delete('w' + it.uid); it.grimy = false; changed = true;
      say(`${slotOf(it.id)?.name || 'Part'} washed: it is at ${Math.round(it.cond ?? 70)}%.`);
    }
  }
  const bench = nearestProp(game.props, 'workbench', game.pos?.x || 0, game.pos?.z || 0);
  if (bench) {
    for (const it of game.items) {
      if (it.kind !== 'epart' || it.onEngine || !onBench(it, bench)) { if (it.kind === 'epart') timers.delete('s' + it.uid); continue; }
      const why = serviceBlock(it);
      if (why) { tellOnce('s' + it.uid, `${slotOf(it.id)?.name || 'Part'}: ${why}`); continue; }
      const t = (timers.get('s' + it.uid) || 0) + dt; timers.set('s' + it.uid, t);
      if (t < SERVICE_S) continue;
      timers.delete('s' + it.uid);
      const before = Math.round(it.cond ?? 70); it.cond = serviceTo(it.cond ?? 70); it.serviced = true; changed = true;
      say(`${slotOf(it.id)?.name || 'Part'} serviced: ${before}% to ${it.cond}%.`);
    }
  }
  sinceSave += dt;
  if (changed && (sinceSave > 2 || told.size && [...told.values()].includes('full'))) { sinceSave = 0; for (const [k, v] of told) if (v === 'full') told.set(k, 'done'); game.items = [...game.items]; save(); }
}
