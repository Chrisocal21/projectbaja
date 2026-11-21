// Glue between the tire machine rules (game/machineRules.js) and the game: is a machine within reach, what would a hold-click do right now.
import { game } from './store.js';
import { held, packItems } from './items.js';
import { hasInGarage } from './home.js';
import { nearestProp } from './fixtures.js';
import { planMachine } from './machineRules.js';
import { wheelById } from '../build.js';
import { tireSizeOf } from './tires.js';
import { sizeFromDia, rimSizeOf } from './wheelAssembly.js';

export const REACH = 2.6;   // how close you stand to the machine
/** rim size classes in inches (the Bug's tire is 15"; catalog tire sets by their diameter) */
export const sizes = {
  tireSize: set => { const s = tireSizeOf(wheelById[set]); return s ? sizeFromDia(s.dia) : 15; },
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
