// The runtime side of discoveries: the list for this world (set when the world mounts), and marking a place found (saved in game.home.found).
import { game, say, save } from './store.js';

let LIST = [];
export const setDiscoverables = list => { LIST = list; };
export const discoverables = () => LIST;
export const foundMap = () => game.home?.found || {};
export function markFound(items) {
  if (!items.length) return;
  const found = { ...foundMap() }; for (const d of items) found[d.id] = true;
  game.home = { ...game.home, found }; save();
  for (const d of items) say(`Discovered: ${d.name}`);
}
