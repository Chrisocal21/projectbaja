// Press E on the pegboard (Stage 4d): hang a tool you carry in a free matching slot, otherwise take one back. Game glue around game/fixtures.js (pure).
import { game, save, say } from './store.js';
import { held, packItems, nameOfItem, takeFromGarage } from './items.js';
import { nearestProp, freeSlotFor, hung, pegKey } from './fixtures.js';

export function pegInteract() {
  const peg = nearestProp(game.props, 'pegboard', game.pos.x, game.pos.z); if (!peg) return;
  const carried = [held(), ...packItems()].filter(i => i && i.kind === 'tool');
  for (const it of carried) {   // hand first, then the pack
    const slot = freeSlotFor(game.items, peg.uid, it.id); if (!slot) continue;
    Object.assign(it, { loc: 'garage', spot: 'peg', peg: pegKey(peg.uid, slot.id) }); game.items = [...game.items]; save(); say(`${nameOfItem(it)} → pegboard`); return;
  }
  const on = hung(game.items, peg.uid)[0];
  if (!on) return say(carried.length ? 'Every spot for that tool is taken.' : 'Nothing hanging here. Carry a wrench or a floor jack to hang one.');
  const before = on.loc; takeFromGarage(on.uid); if (on.loc !== before) { delete on.spot; delete on.peg; game.items = [...game.items]; save(); }
}
