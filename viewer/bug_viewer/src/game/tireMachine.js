// Glue between the tire machine rules (game/machineRules.js) and the game: is a machine within reach, what would a hold-click do right now.
import { game, save } from './store.js';
import { held, packItems } from './items.js';
import { hasInGarage } from './home.js';
import { nearestProp } from './fixtures.js';
import { planMachine, planTray } from './machineRules.js';
import { spawnItem } from './items.js';
import { say } from './store.js';
import { wheelById } from '../build.js';
import { tireSizeOf } from './tires.js';
import { sizeFromDia, rimSizeOf } from './wheelAssembly.js';

export const REACH = 2.6;   // how close you stand to the machine
/** rim size classes in inches (the Bug's tire is 15"; catalog tire sets by their diameter) */
export const sizes = {
  tireSize: set => { if (wheelById[set]?.rimSize) return wheelById[set].rimSize; const s = tireSizeOf(wheelById[set]); return s ? sizeFromDia(s.dia) : 15; },
  rimSize: rimSizeOf,
};

export const machineNear = () => { const m = nearestProp(game.props, 'tireChanger', game.pos.x, game.pos.z); return m && Math.hypot(m.x - game.pos.x, m.z - game.pos.z) <= REACH ? m : null; };

/** what a hold-click at the machine would do with what you hold: null when it is not for the machine, else planMachine's plan */
export function planAtMachine() {
  const m = machineNear(), h = held(); if (!m || !h) return null;
  const nearby = game.items.filter(i => i.loc === 'world' && (i.kind === 'tire' || i.kind === 'rim') && Math.hypot(i.x - m.x, i.z - m.z) < 3.2);   // loose tires and rims on the floor beside it
  const hasKit = packItems().some(i => i.kind === 'supply' && i.id === 'plug');   // a tire plug kit ($10 at Dusty's) from your pack
  const p = planMachine({ held: h, nearby, hasKit, hasAir: hasInGarage('compressor'), sizes });
  return p.na ? null : p;
}

export const TRAY_R = 1.5;   // a rim and a tire set down within this of the machine are the tray
let tray = { key: '', t: 0, warned: '' };
/** the machine works on its own: set a rim and a tire down beside it and, after a few seconds, a wheel is put together (air 0). Called every frame. */
export function tickTray(dt) {
  if (game.dev || game.paused) return;
  const machines = game.props.filter(p => p.id === 'tireChanger'); if (!machines.length) return;
  for (const m of machines) {
    const items = game.items.filter(i => i.loc === 'world' && (i.kind === 'rim' || i.kind === 'tire') && Math.hypot(i.x - m.x, i.z - m.z) <= TRAY_R);
    const plan = items.length >= 2 ? planTray(items, sizes) : null;
    if (!plan) { if (tray.key.startsWith(m.uid + ':')) tray = { key: '', t: 0, warned: tray.warned }; continue; }
    if (!plan.ok) { if (tray.warned !== plan.why) { tray.warned = plan.why; say('Tire machine: ' + plan.why); } continue; }
    const key = m.uid + ':' + plan.consume.join(',');
    if (tray.key !== key) { tray = { key, t: 0, warned: '' }; say('Tire machine: mounting the tire…'); }
    tray.t += dt;
    if (tray.t >= plan.seconds) {
      game.items = game.items.filter(i => !plan.consume.includes(i.uid));
      spawnItem('stock', 'wheel', m.x + 0.5, m.z + 0.5); Object.assign(game.items[game.items.length - 1], plan.wheel);
      tray = { key: '', t: 0, warned: '' }; save(); say('Tire machine: the tire is on the rim. It still needs air.');
    }
  }
}
