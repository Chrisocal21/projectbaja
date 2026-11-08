// Grandpa's place: the run-down garage you inherit, the mess you clear out of it, and the build mode for your own property
// (yard + garage upgrades, fences, decor). Pure data + state changes; the 3D lives in worlds/Home.jsx.
import { game, save, say, addCash } from './store.js';
import { creative } from './settings.js';
import { SITES, PROPERTY, toWorld, height, dynFloors } from '../worlds/county.js';
import { OPENING_PRICE, snapCut, openWhy, wallCircles, segByKey, SEGMENTS } from '../worlds/openings.js';
import { MATERIALS, DEFAULT_MAT, matOf, matName, piecePrice, PIECES, isPiece, inBuilding, snap as snapPiece, supported, conflicts, dependents, circles as pieceCircles, probePoints, floorRect } from '../worlds/structures.js';
import { inOffice, wingFree, annexWallCircles } from '../worlds/office.js';
import { LANE, STALL, lotZ1 } from '../worlds/lot.js';
import { upgradeLevel } from './upgrades.js';
import { MORNING_HOUR } from './clock.js';

const G = SITES.garage;
// ---------------- the mess ----------------
// garage-local positions (the roller door is at local z = +6, the yard runs out to z = +25)
export const JUNK = [
  { id: 'j-boxes', lx: 1.6, lz: -4.1, kind: 'boxes', cash: 0, inside: true, label: 'rotten cardboard boxes' },
  { id: 'j-cans', lx: -4.6, lz: -2.4, kind: 'cans', cash: 6, inside: true, label: 'paint cans and old oil' },
  { id: 'j-papers', lx: -3.0, lz: 3.8, kind: 'papers', cash: 0, inside: true, label: 'decades of newspapers' },
  { id: 'j-tires', lx: -13, lz: 17, kind: 'tires', cash: 12, inside: false, label: 'a pile of bald tires' },
  { id: 'j-scrap', lx: -11, lz: 9, kind: 'scrap', cash: 0, scrap: 5, inside: false, label: 'scrap metal' },
  { id: 'j-fridge', lx: 9, lz: 15, kind: 'fridge', cash: 5, scrap: 2, inside: false, label: 'a dead fridge' },
  { id: 'j-brush', lx: -16, lz: 18, kind: 'brush', cash: 0, inside: false, label: 'tumbleweeds and brush' },
];
export const junkWorld = JUNK.map(j => { const [x, z] = toWorld(G, j.lx, j.lz); return { ...j, x, z }; });
export const isCleared = id => game.home.cleared.includes(id);
export const garageClean = () => JUNK.filter(j => j.inside).every(j => isCleared(j.id));
export function clearJunk(id) {
  const j = JUNK.find(x => x.id === id); if (!j || isCleared(id)) return;
  game.home = { ...game.home, cleared: [...game.home.cleared, id] };
  if (j.cash) addCash(j.cash);
  if (j.scrap) addScrap(j.scrap, true);
  const left = JUNK.filter(x => !isCleared(x.id)).length;
  const tail = !left ? ' The place is finally clean.' : j.inside && garageClean() ? ' Garage floor is clear — press B to start fixing the place up.' : ` ${left} piles left.`;
  say(`Hauled out ${j.label}${j.cash ? ` (+$${j.cash})` : ''}${j.scrap ? ` — kept ${j.scrap} pieces of usable scrap metal` : ''}.${tail}`);
  save();
}
export function flipBreaker() {
  if (game.home.power) { say('The lights are on. Grandpa wired this panel himself — best not to touch it again.'); return; }
  game.home = { ...game.home, power: true }; save(); say('*clunk* ... the old fluorescent tubes flicker on. The lights inside are just lights: flip the OPEN switch by the roller door when you want customers.');
}
/** open for business = power is on AND the sign light is switched on. Only this brings customers. */
export const isOpen = () => !!(game.home?.open && game.home?.power);
export function toggleOpen() {
  if (!game.home.power) { say('The sign light needs power: flip the main breaker inside the garage first.'); return; }
  const open = !game.home.open; game.home = { ...game.home, open }; save();
  say(open ? 'The light over the sign is on, and so are the road signs: you are open for business.' : 'Sign light off: you are closed. No new customers until you open again.');
}
// PLACEHOLDER: canon says Chris writes Walt's letter (under 150 words; OPEN_QUESTIONS F10). Only the last line is canon.
export const LETTER = [
  'Kid —',
  "If you're reading this, the garage is yours. Don't let your mother sell it.",
  "The Bug in the garage was your grandma's. She hasn't run since '09 — I had her apart chasing rust, she picked up a flat on the back, and I pulled the driver's seat to fix the runner. Battery's good. Put her back together and give her a few cranks; she'll wake up.",
  "Al in Dry Wells will sell you anything with wheels. Count your fingers after. Dusty at the gas station is good people.",
  'The old Proving Grounds down Highway 9 are closed, but nobody checks the fence.',
  "My old race car's in the back corner of the garage, under a tarp and forty years of boxes. The shocks, rims and race tires off her are for the Bug - they won't clear the stock body, so you'll have to weld in shock hoops first. Plenty of scrap around. Buy a welder and a bender, do it right.",
  'Folks around here will bring you their little jobs if the lights are on. Take them. That garage paid for itself one oil change at a time.',
  'Fix her up. Then fix the place up. Then go fast.',
  '— Walt',
];

// ---------------- build mode: your property ----------------
/** place-able things. `zone`: 'yard' (outside the garage) or 'garage' (inside). r = collision radius (0 = walk-through) */
const STRUCTURE_ITEMS = Object.values(PIECES).map(p => ({ id: p.id, name: p.name, price: p.price, zone: 'yard', r: 0, cat: 'Structure', struct: true, note: p.note }));
export const BUILD_ITEMS = [
  { id: 'fenceWood', name: 'Wooden fence (3 m)', price: 40, zone: 'yard', r: 0, cat: 'Fences', len: 3 },
  { id: 'fenceChain', name: 'Chain-link fence (3 m)', price: 60, zone: 'yard', r: 0, cat: 'Fences', len: 3 },
  { id: 'gate', name: 'Ranch gate', price: 110, zone: 'yard', r: 0, cat: 'Fences', len: 4 },
  ...STRUCTURE_ITEMS,
  { id: 'wallOpening', name: 'Doorway through an original wall (2 m)', price: OPENING_PRICE, zone: 'yard', r: 0, cat: 'Structure', cut: true, note: "Needs a foundation slab against the garage's right or back wall" },
  { id: 'floodlight', name: 'Floodlight pole', price: 120, zone: 'yard', r: 0.3, cat: 'Yard' },
  { id: 'yardRack', name: 'Steel parts rack', price: 150, zone: 'any', r: 0.6, cat: 'Storage', note: 'More shelf room for parts' },
  { id: 'shelfTires', name: 'Tire & rim shelving (2.4 m)', price: 140, zone: 'any', r: 0.45, len: 2.4, cat: 'Storage', note: "Walt's wall shelving: move it with V" },
  { id: 'shelfSupplies', name: 'Supply shelving (2.4 m)', price: 120, zone: 'any', r: 0.45, len: 2.4, cat: 'Storage', note: 'Oil, cans and paint. Move it with V' },
  { id: 'toolChest', name: 'Rolling tool chest', price: 260, zone: 'garage', r: 0.5, cat: 'Storage' },
  { id: 'engineStand', name: 'Engine stand', price: 140, zone: 'garage', r: 0.5, cat: 'Garage' },
  { id: 'compressor', name: 'Air compressor', price: 220, zone: 'garage', r: 0.4, cat: 'Garage', note: "Walt's compressor: move it with V" },
  { id: 'engineOnStand', name: 'Spare engine on a stand', price: 300, zone: 'garage', r: 0.5, cat: 'Garage', note: "An engine Walt was rebuilding. Move it with V" },
  { id: 'welder', name: 'MIG welder + cart', price: 450, zone: 'garage', r: 0.45, cat: 'Fabrication', note: 'Weld in shock hoops, cages, brackets' },
  { id: 'bender', name: 'Tube bender', price: 320, zone: 'garage', r: 0.5, cat: 'Fabrication', note: 'Bend tube for hoops and cages' },
  { id: 'computer', name: 'Office desk + old PC', price: 320, zone: 'garage', r: 0.6, cat: 'Office', note: 'Order parts online (coming soon)' },
  { id: 'couch', name: 'Busted couch', price: 35, zone: 'any', r: 0.8, cat: 'Office' },
  { id: 'neon', name: '"OPEN" neon sign', price: 75, zone: 'any', r: 0, cat: 'Decor' },
  { id: 'flamingo', name: 'Pink flamingo', price: 15, zone: 'yard', r: 0, cat: 'Decor' },
  { id: 'gnome', name: 'Giant garden gnome', price: 90, zone: 'yard', r: 0.5, cat: 'Decor' },
  { id: 'dinosaur', name: 'Roadside dinosaur', price: 2500, zone: 'yard', r: 2.2, cat: 'Decor', note: 'Visible from the highway. Probably.' },
  { id: 'tireStack', name: 'Tire stack', price: 20, zone: 'any', r: 0.5, cat: 'Decor' },
  { id: 'drum', name: 'Oil drum', price: 10, zone: 'any', r: 0.4, cat: 'Decor' },
  { id: 'picnic', name: 'Picnic table', price: 60, zone: 'yard', r: 1.0, cat: 'Yard' },
  { id: 'grill', name: 'Barbecue grill', price: 80, zone: 'yard', r: 0.5, cat: 'Yard' },
];
export const buildById = Object.fromEntries(BUILD_ITEMS.map(b => [b.id, b]));
/** build categories in menu order, and the item to land on when you jump to one */
export const BUILD_CATS = ['Structure', ...new Set(BUILD_ITEMS.map(b => b.cat).filter(c => c !== 'Structure'))];
export const nextCatItem = (itemId, d) => { const c = BUILD_CATS.indexOf(buildById[itemId].cat), n = BUILD_CATS[(c + d + BUILD_CATS.length) % BUILD_CATS.length]; return BUILD_ITEMS.find(b => b.cat === n).id; };
/** the next item within the same category (mouse wheel while placing) */
export const nextInCat = (itemId, d) => { const list = BUILD_ITEMS.filter(b => b.cat === buildById[itemId].cat), i = list.findIndex(b => b.id === itemId); return list[(i + d + list.length) % list.length].id; };
/** build hotbar (keys 1-8): [{ id, mat? } | null] x 8, saved with the home. Building pieces fill it until you rebind slots. */
export const HOTBAR_N = 8;
const HOTBAR_DEFAULT = ['foundation', 'wall', 'windowWall', 'door', 'garageDoor', 'floor', 'roof', 'pillar'];
export const hotbar = () => Array.from({ length: HOTBAR_N }, (_, i) => { const h = game.home?.hotbar; if (h && h[i] !== undefined) return h[i] && buildById[h[i].id] ? h[i] : null; return buildById[HOTBAR_DEFAULT[i]] ? { id: HOTBAR_DEFAULT[i] } : null; });
export function bindHotbar(i, id, mat) {
  const h = hotbar().map(e => (e && e.id === id && (e.mat || null) === (mat || null) ? null : e));   // one slot per piece+material: binding it again moves it
  h[i] = { id, ...(mat ? { mat } : {}) };
  game.home = { ...game.home, hotbar: h }; save(); say(`Hotbar ${i + 1}: ${buildById[id].name.replace(/ \(.*\)/, '')}${mat ? ` (${MATERIALS.find(m => m.id === mat)?.name})` : ''}`);
}
/** garage-local coordinates of a world point */
export function homeLocal(x, z) { const dx = x - G.x, dz = z - G.z, c = Math.cos(G.rot), s = Math.sin(G.rot); return { lx: dx * c - dz * s, lz: dx * s + dz * c }; }
/** inside the garage building or its attached office (m > 0 shrinks the box, m < 0 grows it) */
const insideGarage = (lx, lz, m = 0) => (Math.abs(lx) < 7 - m && Math.abs(lz) < 6 - m) || inOffice(lx, lz, m);
export const onProperty = (x, z) => { const { lx, lz } = homeLocal(x, z); return Math.abs(lx) < PROPERTY.w / 2 && Math.abs(lz - 8) < PROPERTY.d / 2 + 6; };
/** can this item go here? → '' or why not */
/** why a building piece can't go here ('' = it can). x, z, ry are world values (the snapped ones); the rules run in garage-local metres. */
function structWhy(item, x, z, ry) {
  const l = homeLocal(x, z), ryl = ry - G.rot;
  for (const [px, pz] of probePoints(item.id, l.lx, l.lz, ryl)) {
    if (!(Math.abs(px) < PROPERTY.w / 2 && Math.abs(pz - 8) < PROPERTY.d / 2 + 6)) return "That's past your property line.";
    if (px > 18 && px < 26 && pz > -6 && pz < 8) return 'Keep the camper and its porch clear.';
    if (Math.abs(px) < STALL.inner + STALL.d + 1 && pz > LANE.z0 - 0.01 && pz < lotZ1(upgradeLevel('parking')) + 1) return 'Keep the customer lot clear: the drive lane and the parking bays.';
    if (Math.abs(px) < LANE.half + 1 && pz > LANE.z0 && pz < LANE.z1) return 'Keep the driveway clear.';
  }
  if (inBuilding(item.id, l.lx, l.lz)) return "That's where the garage already is.";
  const existing = game.props.filter(q => isPiece(q.id)).map(q => { const m = homeLocal(q.x, q.z); return { id: q.id, x: m.lx, z: m.lz, ry: (q.ry || 0) - G.rot }; });
  if (conflicts(item.id, l.lx, l.lz, ryl, existing)) return 'Something is already built there.';
  if (!supported(item.id, l.lx, l.lz, ryl, existing)) return 'Build a foundation slab there first.';
  return '';
}
/** snap a free world point to a building piece's grid → { x, z, ry } in world terms */
export function snapWorld(item, x, z) {
  const l = homeLocal(x, z), s = snapPiece(item.id, l.lx, l.lz), [wx, wz] = toWorld(G, s.x, s.z);
  return { x: wx, z: wz, ry: G.rot + s.ry };
}
/** garage-local points of the placed foundation slabs */
const foundationsLocal = () => game.props.filter(q => q.id === 'foundation').map(q => { const m = homeLocal(q.x, q.z); return { x: m.lx, z: m.lz }; });
export const openingKeys = () => game.home?.openings || [];
/** the original-wall opening nearest a world point → { key, x, z, ry } in world terms, or null */
export function snapCutWorld(x, z) {
  const l = homeLocal(x, z), s = snapCut(l.lx, l.lz); if (!s) return null;
  const [wx, wz] = toWorld(G, s.x, s.z); return { key: s.key, x: wx, z: wz, ry: G.rot + s.ry };
}
function cutWhy(item, x, z) {
  const l = homeLocal(x, z), s = snapCut(l.lx, l.lz);
  if (!s) return "Aim at the garage's right wall or its back wall.";
  return openWhy(s, foundationsLocal(), openingKeys()) || (!creative() && game.cash < item.price ? `Not enough cash ($${item.price}).` : '');
}
export function placeWhy(item, x, z, moving = false, ry = 0, mat) {
  if (item.cut) return cutWhy(item, x, z);
  const { lx, lz } = homeLocal(x, z);
  if (!onProperty(x, z)) return "That's past your property line.";
  if (item.struct) { const price = piecePrice(item.id, mat || DEFAULT_MAT); return structWhy(item, x, z, ry) || (!moving && !creative() && game.cash < price ? `Not enough cash ($${price}).` : ''); }
  if (inOffice(lx, lz, -0.4) && item.zone !== 'yard' && !['Office', 'Decor', 'Storage'].includes(item.cat)) return 'Shop tools belong in the garage bay, not the office.';
  if (inOffice(lx, lz, -0.4) && !(item.zone !== 'yard' && wingFree(lx, lz, item.r))) return item.zone === 'yard' ? 'That goes outside, in the yard.' : 'No room there: keep reception, the bathroom, stairs and walkways clear. The back office under the loft is free.';
  if (lx > 18 && lx < 26 && lz > -6 && lz < 8) return 'Keep the camper and its porch clear.';
  if (Math.abs(lx) < STALL.inner + STALL.d + 1 && lz > LANE.z0 && lz < lotZ1(upgradeLevel('parking')) + 1) return 'Keep the customer lot clear: the drive lane and the parking bays.';
  const inG = insideGarage(lx, lz, 0.5), wall = insideGarage(lx, lz, -0.6) && !inG;
  if (wall) return 'Too close to the garage wall.';
  if (item.zone === 'garage' && !inG) return 'That goes inside the garage.';
  if (item.zone === 'yard' && insideGarage(lx, lz, -0.6)) return 'That goes outside, in the yard.';
  if (inG && item.zone !== 'yard' && Math.abs(lx) < 1.6 && lz > -3 && lz < 2) return "Keep the car's spot clear.";
  if (Math.abs(lx) < LANE.half && lz > LANE.z0 && lz < LANE.z1 && item.r > 0) return 'Keep the driveway clear.';
  if (!moving && !creative() && game.cash < item.price) return `Not enough cash ($${item.price}).`;
  return '';
}
export function placeProp(id, x, z, ry, mat) {
  const item = buildById[id], why = placeWhy(item, x, z, false, ry, mat); if (why) { say(why); return false; }
  if (item.cut) {   // cut a doorway through an original wall: no prop, just an entry in the opening list
    const l = homeLocal(x, z), seg = snapCut(l.lx, l.lz);
    const free = creative(); if (!free) addCash(-item.price);
    game.home = { ...game.home, openings: [...openingKeys(), seg.key], ...(free ? { freeOpenings: [...(game.home.freeOpenings || []), seg.key] } : {}) }; game.propsV = (game.propsV || 0) + 1; save();
    say(`Cut a doorway through the garage's ${seg.wall === 'R' ? 'right' : 'back'} wall (${free ? 'creative: free' : `−$${item.price}`})`); return true;
  }
  const m = item.struct ? (mat || DEFAULT_MAT) : undefined, price = item.struct ? piecePrice(id, m) : item.price;
  const free = creative(); if (!free) addCash(-price);
  game.props = [...game.props, { uid: Math.max(0, ...game.props.map(p => p.uid)) + 1, id, x, z, ry, ...(m ? { mat: m } : {}), ...(free ? { free: true } : {}) }];
  game.propsV = (game.propsV || 0) + 1; save(); say(`Built: ${item.name}${m ? `, ${matName(m).toLowerCase()}` : ''} (${free ? 'creative: free' : `−$${price}`})`); return true;
}
/** nearest cut doorway to a world point: { key, d } or null */
export function nearestOpening(x, z) {
  const l = homeLocal(x, z); let best = null;
  for (const k of openingKeys()) { const s = segByKey(k), d = Math.hypot(s.x - l.lx, s.z - l.lz); if (!best || d < best.d) best = { key: k, d }; }
  return best;
}
/** wall a cut doorway back up (50% back) */
export function closeOpening(key) {
  const wasFree = (game.home.freeOpenings || []).includes(key);
  game.home = { ...game.home, openings: openingKeys().filter(k => k !== key), freeOpenings: (game.home.freeOpenings || []).filter(k => k !== key) }; game.propsV = (game.propsV || 0) + 1;
  const back = wasFree ? 0 : OPENING_PRICE; addCash(back); save(); say(`Closed the doorway (+$${back})`);
}
/** Walt's own fixtures: you can move them, never scrap them (nothing of the inherited garage gets erased).
 *  Batched by when each batch was added, so old saves pick up new batches without re-seeding what's already there. */
const STARTER_FIXTURES_V1 = [
  ['shelfTires', -6.5, -2.4, Math.PI / 2], ['shelfTires', -6.5, 0, Math.PI / 2], ['shelfTires', -6.5, 2.4, Math.PI / 2],
  ['shelfSupplies', 6.5, -3.0, -Math.PI / 2], ['shelfSupplies', 6.5, -0.6, -Math.PI / 2],
];
// compressor, engine-on-a-stand and the loose tire stack: the workbench stays put (loose parts and a toolbox sit on it, see game/loot.js BENCH_TOP)
const STARTER_FIXTURES_V2 = [
  ['compressor', 0.3, -5.4, 0], ['engineOnStand', -4.3, 0.9, Math.PI / 2], ['tireStack', -5.2, 4.6, 0],
];
export const STARTER_FIXTURES = [...STARTER_FIXTURES_V1, ...STARTER_FIXTURES_V2];
/** pieces built before the grid was aligned to the garage (grid version 1) move 1 m along x, once, so they sit on the new grid */
export function migrateGrid() {
  if (game.home.gridV >= 2) return;
  const had = game.props.some(p => isPiece(p.id));
  if (had) { game.props = game.props.map(p => (isPiece(p.id) ? { ...p, x: p.x + Math.cos(G.rot) } : p)); game.propsV = (game.propsV || 0) + 1; }
  game.home = { ...game.home, gridV: 2 }; save();
}
/** seed Walt's movable fixtures once per save, in batches: old saves (fixtures: true, from before V2 existed) only get the new batch */
export function ensureStarterFixtures() {
  const v = game.home.fixturesV ?? (game.home.fixtures ? 1 : 0); if (v >= 2) return;
  let uid = Math.max(0, ...game.props.map(p => p.uid));
  const batch = [...(v < 1 ? STARTER_FIXTURES_V1 : []), ...(v < 2 ? STARTER_FIXTURES_V2 : [])];
  const add = batch.map(([id, lx, lz, ry]) => { const [x, z] = toWorld(G, lx, lz); return { uid: ++uid, id, x, z, ry: G.rot + ry, starter: true }; });
  game.props = [...game.props, ...add]; game.propsV = (game.propsV || 0) + 1;
  game.home = { ...game.home, fixtures: true, fixturesV: 2 }; save();
}
const propHit = (x, z, max) => game.props.filter(q => !isPiece(q.id)).map(q => [q, Math.hypot(q.x - x, q.z - z)]).filter(([, d]) => d < max).sort((a, b) => a[1] - b[1])[0]?.[0];
/** build mode, V: pick the nearest placed thing up to move it (free). It stays where it is until you put it down. */
export function startMove(x, z) {
  const p = propHit(x, z, 3.5); if (!p) { say('Nothing to move here. (Building pieces stay put: take one down with X for 50% back and rebuild it.)'); return false; }
  game.buildMode = { ...game.buildMode, item: p.id, ry: p.ry || 0, moving: { uid: p.uid, x: p.x, z: p.z, ry: p.ry || 0 } };
  say(`Moving the ${buildById[p.id].name.toLowerCase()}: look where it goes, E to put it down, B to cancel`); return true;
}
export function movePropTo(uidN, x, z, ry) {
  const p = game.props.find(q => q.uid === uidN), item = p && buildById[p.id]; if (!item) return false;
  const why = placeWhy(item, x, z, true); if (why) { say(why); return false; }
  game.props = game.props.map(q => (q.uid === uidN ? { ...q, x, z, ry } : q)); game.propsV = (game.propsV || 0) + 1; save();
  say(`Moved the ${item.name.toLowerCase()}`); return true;
}
export function removeProp(uidN) {
  const p = game.props.find(q => q.uid === uidN); if (!p) return;
  if (isPiece(p.id)) {
    const l = homeLocal(p.x, p.z), all = game.props.filter(q => isPiece(q.id)).map(q => { const m = homeLocal(q.x, q.z); return { id: q.id, x: m.lx, z: m.lz, ry: (q.ry || 0) - G.rot, uid: q.uid }; });
    if (dependents(all.find(q => q.uid === p.uid), all).length) return say('Take the walls, floor and roof off that foundation first.');
  }
  if (p.starter) return say("That's Walt's own shelving: you can move it with V, but it stays.");
  const back = p.free ? 0 : Math.round((isPiece(p.id) ? piecePrice(p.id, matOf(p)) : buildById[p.id].price) * 1);   // 100% back (canon #024)   // built in creative mode: nothing back
  game.props = game.props.filter(q => q.uid !== uidN); game.propsV = (game.propsV || 0) + 1; addCash(back); save(); say(`Took down the ${buildById[p.id].name.toLowerCase()} (+$${back})`);
}
let cache = { v: -1, list: [] };
/** colliders for props you have built: [x, z, r, top]. Long things (shelving) get a row of circles along their length. */
export function propObstacles() {
  const v = game.propsV || 0, mv = game.buildMode?.moving?.uid || 0, office = upgradeLevel('office') >= 1;
  const wc = wallCircles(openingKeys()).map(([cx, cz, r]) => { const [wx, wz] = toWorld(G, cx, cz); return [wx, wz, r, 99]; });
  const annexC = office ? annexWallCircles().map(([cx, cz, r]) => { const [wx, wz] = toWorld(G, cx, cz); return [wx, wz, r, 99]; }) : [];
  if (cache.v !== v || cache.nOpen !== openingKeys().length || cache.n !== game.props.length || cache.mv !== mv || cache.office !== office) cache = { v, mv, office, nOpen: openingKeys().length, n: game.props.length, list: [...wc, ...annexC, ...game.props.filter(p => p.uid !== mv && (isPiece(p.id) || buildById[p.id]?.r > 0)).flatMap(p => {
    if (isPiece(p.id)) { const m = homeLocal(p.x, p.z); return pieceCircles(p.id, m.lx, m.lz, (p.ry || 0) - G.rot).map(([cx, cz, r]) => { const [wx, wz] = toWorld(G, cx, cz); return [wx, wz, r, 99]; }); }
    const it = buildById[p.id], ry = p.ry || 0;
    if (!it.len) return [[p.x, p.z, it.r, 99]];
    const n = Math.ceil(it.len / 0.8), c = Math.cos(ry), s = Math.sin(ry);
    return Array.from({ length: n + 1 }, (_, i) => { const t = (i / n - 0.5) * (it.len - 0.4); return [p.x + c * t, p.z - s * t, it.r, 99]; });
  })] };
  if (cache.floorsV !== `${v}|${game.props.length}`) {   // the walkable pieces follow the same cache (rotation 0 only: the garage is not rotated)
    dynFloors.length = 0;
    for (const p of game.props) { if (!isPiece(p.id)) continue; const m = homeLocal(p.x, p.z), f = floorRect(p.id, m.lx, m.lz); if (!f) continue; const [x0, z0] = toWorld(G, f.x0, f.z0), [x1, z1] = toWorld(G, f.x1, f.z1); dynFloors.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), top: height(p.x, p.z) + f.top }); }
    cache.floorsV = `${v}|${game.props.length}`;
  }
  return cache.list;
}

// ---------------- scrap metal (a stack, not sized items) ----------------
export function addScrap(n, quiet = false) { game.mats = { ...game.mats, scrap: (game.mats?.scrap || 0) + n }; save(); if (!quiet) say(`+${n} scrap metal (${game.mats.scrap} total)`); }
/** scrap heaps lying around the county: each gives its metal once. [id, site, lx, lz, amount] */
export const SCRAP_HEAPS = [['h-barn', 'barn', 9.5, 4, 3], ['h-ware', 'warehouse', -9, 6, 4], ['h-ware2', 'warehouse', 9, -5.5, 3], ['h-shack2', 'shack2', 4.5, 2, 2], ['h-pg', 'proving', 9, -2, 4], ['h-shack3', 'shack3', -4, 2.5, 2]]
  .map(([id, site, lx, lz, n]) => { const [x, z] = toWorld(SITES[site], lx, lz); return { id, x, z, n, site }; });
export const heapTaken = id => !!game.home.heaps?.includes(id);
export function takeHeap(id) {
  const h = SCRAP_HEAPS.find(x => x.id === id); if (!h || heapTaken(id)) return;
  game.home = { ...game.home, heaps: [...(game.home.heaps || []), id] }; addScrap(h.n);
}

// ---------------- grandpa's race car (back-right corner of the garage, under a tarp and a pile of boxes) ----------------
export const RACECAR = { lx: 4.3, lz: -2.7, ry: 0, ly: 0.12 };   // ly: stands on the garage slab
export const raceCarWorld = (() => { const [x, z] = toWorld(G, RACECAR.lx, RACECAR.lz); return { x, z, h: G.rot + RACECAR.ry }; })();
export function uncoverRaceCar() {
  if (game.home.raceCar) return;
  game.home = { ...game.home, raceCar: true }; save();
  say("You shift the boxes and drag the tarp off. Under it: grandpa's old #7 desert racer. Everything on her has seized from decades of sitting, but she's still wearing race shocks and four beadlock tires. Those are the Bug's now.");
}

// ---------------- waking grandma's Bug: the first start takes a few cranks ----------------
/** has the Bug run since you inherited it? Until then the gas does nothing and E turns the key. */
export const bugAsleep = () => game.active === 'bug' && !game.home.bugFired && !game.dev;
const CRANKS = [
  'Rrr-rrr-rrr-rrr… nothing. Fuel\'s been sitting in there since \'09.',
  'Rrr-rrr-rrr… *pop* — she coughs once and dies. Getting closer.',
];
export function crankBug() {
  if (!bugAsleep() || game.cranking) return;
  game.cranking = true; say('*click* … rrr-rrr-rrr…');
  setTimeout(() => {
    game.cranking = false;
    const n = (game.crankTries = (game.crankTries || 0) + 1);
    if (n <= CRANKS.length) { say(CRANKS[n - 1]); return; }
    game.home = { ...game.home, bugFired: true }; save();
    say("*BRRRAAAP* — she fires! Grandma's Bug is running for the first time since '09. Let her warm up, then take her out.");
  }, 1400);
}

// ---------------- fabrication at the workbench ----------------
/** is this build item placed inside the garage? */
export const hasInGarage = id => game.props.some(p => { const l = homeLocal(p.x, p.z); return p.id === id && insideGarage(l.lx, l.lz); });
export const RECIPES = [
  { id: 'shockHoops', name: 'Shock hoops (front + rear)', scrap: 10, tools: ['welder', 'bender'], note: 'Tube hoops that carry long-travel shocks and clear big tires. Weld them into the Bug with the welder.' },
];
export function fabricate(id, giveToPlayer, canCarry) {
  const r = RECIPES.find(x => x.id === id); if (!r) return;
  const miss = r.tools.filter(t => !hasInGarage(t)); if (miss.length) return say(`You need a ${miss.map(t => buildById[t].name.toLowerCase()).join(' and a ')} in the garage (build mode, B).`);
  if ((game.mats?.scrap || 0) < r.scrap) return say(`Not enough scrap metal: ${game.mats?.scrap || 0}/${r.scrap}. Clear the yard, and check the barn, the shacks and the salvage warehouse.`);
  if (!canCarry('fab', id)) return say('Hands full — put that down first.');
  game.mats = { ...game.mats, scrap: game.mats.scrap - r.scrap };
  giveToPlayer('fab', id); say(`Cut, bent and tacked together: ${r.name}. Now weld them into the Bug.`);
}

// ---------------- grandpa's trailer: fix it up to live in ----------------
export const TRAILER_UPGRADES = [
  { id: 'roof', name: 'Patch the roof', price: 250, note: 'Stops the leaks. Then you can sleep here (skips ahead to the next customer).' },
  { id: 'porch', name: 'Build a porch', price: 220, note: 'Wooden deck and steps.' },
  { id: 'paint', name: 'Fresh paint', price: 180, note: 'Cream and turquoise, like it was in 1966.' },
  { id: 'ac', name: 'Window A/C unit', price: 380, note: 'It is the desert.' },
  { id: 'lights', name: 'String lights', price: 60, note: 'For the porch. Purely morale.' },
];
export const trailerHas = id => !!game.home.trailer?.includes(id);
export function upgradeTrailer(id) {
  const u = TRAILER_UPGRADES.find(x => x.id === id); if (!u || trailerHas(id)) return;
  if (game.cash < u.price) return say('Not enough cash.');
  addCash(-u.price); game.home = { ...game.home, trailer: [...(game.home.trailer || []), id] }; save(); say(`Trailer: ${u.name.toLowerCase()} — done.`);
}
export function sleep() {
  if (!trailerHas('roof')) return say('The roof leaks right onto the bed. Patch it first.');
  game.home = { ...game.home, jobClock: 1e6 }; game.clock = MORNING_HOUR; save(); say('You sleep like a rock. Morning.');
}
