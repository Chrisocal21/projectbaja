// Glue: put the Bug's loose parts on parts racks and the floor (layout and rules: teardown.js). Called once, for a NEW story game.
import { game, save } from './store.js';
import { SITES, toWorld, height, groundHeight } from '../worlds/county.js';
import { allocUid } from './saveFormat.js';
import { apartSlots, apartItems, layoutParts, gridSpots, RACKS, RACK } from './teardown.js';
import { storedProps } from './home.js';

export function spawnApartParts() {
  const G = SITES.garage, lay = layoutParts(), slots = apartSlots(), items = apartItems(), extra = gridSpots(items.length);
  let fallback = 0;
  RACKS.forEach(r => { const [x, z] = toWorld(G, r.x, r.z); game.props = [...game.props, { uid: allocUid(game.nextUid, 'props', game.props, storedProps()), id: 'partsRack', x, z, ry: G.rot + RACK.ry, starter: true }]; });
  game.propsV = (game.propsV || 0) + 1;
  items.forEach(([kind, id, ex], i) => {
    const p = lay[slots[i].id] || (() => { const [lx, lz] = extra[fallback++]; return { x: lx, z: lz, y: 0, ry: 0 }; })();
    const [x, z] = toWorld(G, p.x, p.z);
    game.items.push({ uid: allocUid(game.nextUid, 'items', game.items), kind, id, loc: 'world', x, z, y: p.y + groundHeight(x, z) - height(x, z), ry: G.rot + p.ry, ...(ex || {}) });
  });
  game.items = [...game.items]; save();
}
