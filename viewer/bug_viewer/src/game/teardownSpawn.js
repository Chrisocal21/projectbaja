// Glue: put the Bug's loose parts on Walt's red shelf, the tire shelf and the floor (layout and rules: teardown.js). Called once, for a NEW story game.
import { game, save } from './store.js';
import { SITES, toWorld, height, groundHeight } from '../worlds/county.js';
import { allocUid } from './saveFormat.js';
import { apartSlots, apartItems, layoutParts, gridSpots, TIRE_SHELF, SHOP_TIRE_SHELF } from './teardown.js';
import { ensureStarterFixtures, ensureShopTires } from './home.js';
import { rackSurfId } from '../placement/garageSurfaces.js';
import { isTire } from '../placement/gameItems.js';

export function spawnApartParts() {
  ensureStarterFixtures();   // the shelves have to be standing before parts go on them (seeded once per save, so this is safe)
  const G = SITES.garage, lay = layoutParts(), slots = apartSlots(), items = apartItems(), extra = gridSpots(items.length);
  const near = (p, lz) => { const dx = p.x - G.x, dz = p.z - G.z, z = dx * Math.sin(G.rot) + dz * Math.cos(G.rot); return Math.abs(z - lz) < 0.5; };   // garage-local z (inverse of toWorld)
  const tires = game.props.find(p => p.id === 'shelfTires' && near(p, TIRE_SHELF.lz));
  let fallback = 0;
  items.forEach(([kind, id, ex], i) => {
    const sid = slots[i].id, uid = allocUid(game.nextUid, 'items', game.items);
    if (tires && TIRE_SHELF.at[sid] != null) {
      game.items.push({ uid, kind, id, ...(ex || {}), loc: 'garage', spot: 'grid', surf: rackSurfId(tires.uid, TIRE_SHELF.level), x: TIRE_SHELF.at[sid], z: 0, y: 0, ry: 0, pose: 'upright' });
      return;
    }
    const p = lay[sid] || (() => { const [lx, lz] = extra[fallback++]; return { x: lx, z: lz, y: 0, ry: 0 }; })();
    const [x, z] = toWorld(G, p.x, p.z);
    game.items.push({ uid, kind, id, loc: 'world', x, z, y: p.y + groundHeight(x, z) - height(x, z), ry: G.rot + p.ry, ...(ex || {}) });
  });
  // the loose wheel and the driver's seat that every new game already has (items.js) join the others: wheel on the tire shelf, seat in the row
  const old = (kind, id) => game.items.find(i => i.loc === 'world' && i.kind === kind && i.id === id && Math.hypot(i.x - G.x, i.z - G.z) < 8);
  const w = old('stock', 'wheel'); if (w && tires) Object.assign(w, { loc: 'garage', spot: 'grid', surf: rackSurfId(tires.uid, TIRE_SHELF.level), x: TIRE_SHELF.at.wheelRR, z: 0, y: 0, ry: 0, pose: 'upright' });
  const s = old('stock', 'seatDriver'), sp = lay.seatDriver;
  if (s && sp) { const [x, z] = toWorld(G, sp.x, sp.z); Object.assign(s, { x, z, y: groundHeight(x, z) - height(x, z), ry: G.rot + sp.ry }); }
  // the shop's worn tires leave the floor for the front tire shelf
  ensureShopTires();
  const front = game.props.find(p => p.id === 'shelfTires' && near(p, SHOP_TIRE_SHELF.lz));
  if (front) game.items.filter(i => i.loc === 'world' && isTire(i) && Math.hypot(i.x - G.x, i.z - G.z) < 8).slice(0, SHOP_TIRE_SHELF.at.length)
    .forEach((t, i) => Object.assign(t, { loc: 'garage', spot: 'grid', surf: rackSurfId(front.uid, SHOP_TIRE_SHELF.level), x: SHOP_TIRE_SHELF.at[i], z: 0, y: 0, ry: 0, pose: 'upright' }));
  game.items = [...game.items]; save();
}
