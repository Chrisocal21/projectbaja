// Glue: put the Bug's loose parts on Walt's red shelf, the tire shelf and the floor (layout and rules: teardown.js). Called once, for a NEW story game.
import { game, save } from './store.js';
import { SITES, toWorld, height, groundHeight } from '../worlds/county.js';
import { allocUid } from './saveFormat.js';
import { apartSlots, apartItems, layoutParts, gridSpots, TIRE_SHELF, fixShelfWheels } from './teardown.js';
import { ensureStarterFixtures, spawnYardTires } from './home.js';
import { rackSurfId } from '../placement/garageSurfaces.js';

/** once per save: wheels an older new game stood half off the tire shelf go onto its board (teardown.js fixShelfWheels) */
export function ensureShelfWheels() {
  if ((game.home?.shelfWheelsV || 0) >= 1) return;
  game.home = { ...game.home, shelfWheelsV: 1 };
  const next = fixShelfWheels(game.items); if (next !== game.items) game.items = next;
  save();
}
export function spawnApartParts() {
  ensureStarterFixtures();   // the shelves have to be standing before parts go on them (seeded once per save, so this is safe)
  const G = SITES.garage, lay = layoutParts(), slots = apartSlots(), items = apartItems(), extra = gridSpots(items.length);
  const near = (p, lz) => { const dx = p.x - G.x, dz = p.z - G.z, z = dx * Math.sin(G.rot) + dz * Math.cos(G.rot); return Math.abs(z - lz) < 0.5; };   // garage-local z (inverse of toWorld)
  const tires = game.props.find(p => p.id === 'shelfTires' && near(p, TIRE_SHELF.lz));
  let fallback = 0;
  items.forEach(([kind, id, ex], i) => {
    const sid = slots[i].id, uid = allocUid(game.nextUid, 'items', game.items);
    if (tires && TIRE_SHELF.at[sid] != null) {
      game.items.push({ uid, kind, id, ...(ex || {}), loc: 'garage', spot: 'grid', surf: rackSurfId(tires.uid, TIRE_SHELF.level), x: TIRE_SHELF.at[sid], z: TIRE_SHELF.z, y: 0, ry: 0, pose: 'upright' });
      return;
    }
    const p = lay[sid] || (() => { const [lx, lz] = extra[fallback++]; return { x: lx, z: lz, y: 0, ry: 0 }; })();
    const [x, z] = toWorld(G, p.x, p.z);
    game.items.push({ uid, kind, id, loc: 'world', x, z, y: p.y + groundHeight(x, z) - height(x, z), ry: G.rot + p.ry, ...(ex || {}) });
  });
  // the loose wheel and the driver's seat that every new game already has (items.js) join the others: wheel on the tire shelf, seat in the row
  const old = (kind, id) => game.items.find(i => i.loc === 'world' && i.kind === kind && i.id === id && Math.hypot(i.x - G.x, i.z - G.z) < 8);
  const w = old('stock', 'wheel'); if (w && tires) Object.assign(w, { loc: 'garage', spot: 'grid', surf: rackSurfId(tires.uid, TIRE_SHELF.level), x: TIRE_SHELF.at.wheelRR, z: TIRE_SHELF.z, y: 0, ry: 0, pose: 'upright' });
  const s = old('stock', 'seatDriver'), sp = lay.seatDriver;
  if (s && sp) { const [x, z] = toWorld(G, sp.x, sp.z); Object.assign(s, { x, z, y: groundHeight(x, z) - height(x, z), ry: G.rot + sp.ry }); }
  spawnYardTires();   // the old shop tires are not on the shelf: they lie all over the property, yours to clear
  game.items = [...game.items]; save();
}
