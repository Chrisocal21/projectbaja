// Glue: scatter the Bug's loose parts on the garage floor (rules: teardown.js). Called once, for a NEW story game.
import { game, save } from './store.js';
import { SITES, toWorld, height, groundHeight } from '../worlds/county.js';
import { allocUid } from './saveFormat.js';
import { apartItems, gridSpots } from './teardown.js';

export function spawnApartParts() {
  const list = apartItems(), spots = gridSpots(list.length), G = SITES.garage;
  list.forEach(([kind, id, extra], i) => {
    const [lx, lz, ry] = spots[i], [x, z] = toWorld(G, lx, lz);
    game.items.push({ uid: allocUid(game.nextUid, 'items', game.items), kind, id, loc: 'world', x, z, y: groundHeight(x, z) - height(x, z), ry: G.rot + ry + (i % 3) * 0.4, ...(extra || {}) });
  });
  game.items = [...game.items]; save();
}
