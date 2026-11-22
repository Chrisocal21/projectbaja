// E at a supply stand: put what you carry onto it, or take one off. (Rules and numbers: game/stock.js)
import { game, say, save } from './store.js';
import { giveToPlayer, canCarry, nameOfItem } from './items.js';
import { standById, addStock, takeStock, standPrompt } from './stock.js';

const carried = s => game.items.find(i => i.kind === s.kind && i.id === s.item && (i.loc === 'hand' || i.loc === 'pack'));
export const standText = id => { const s = standById[id]; return s ? standPrompt(game.home, id, !!carried(s)) : ''; };
export function useStand(id) {
  const s = standById[id]; if (!s) return;
  const it = carried(s);
  if (it) {
    const r = addStock(game.home, id, 1);
    if (r.added) { game.items = game.items.filter(i => i !== it); game.home = r.home; save(); return say(`Stocked: ${nameOfItem(it)} (${game.home.stock[id]}/10)`); }
  }
  if (!(game.home?.stock?.[id] > 0)) return say(standText(id));
  if (!canCarry(s.kind, s.item)) return say('Your hands are full.');
  const r = takeStock(game.home, id); game.home = r.home; giveToPlayer(s.kind, s.item); save();
  say(`Took one: ${s.name.toLowerCase()} (${game.home.stock[id]}/10 left)`);
}
