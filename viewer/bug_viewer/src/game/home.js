// Grandpa's place: the run-down garage you inherit, the mess you clear out of it, and the build mode for your own property
// (yard + garage upgrades, fences, decor). Pure data + state changes; the 3D lives in worlds/Home.jsx.
import { game, save, say, addCash } from './store.js';
import { SITES, PROPERTY, toWorld } from '../worlds/county.js';

const G = SITES.garage;
// ---------------- the mess ----------------
// garage-local positions (the roller door is at local z = +6, the yard runs out to z = +25)
export const JUNK = [
  { id: 'j-boxes', lx: 3.2, lz: -3.6, kind: 'boxes', cash: 0, inside: true, label: 'rotten cardboard boxes' },
  { id: 'j-cans', lx: -4.6, lz: -2.4, kind: 'cans', cash: 6, inside: true, label: 'paint cans and old oil' },
  { id: 'j-papers', lx: 4.4, lz: 3.6, kind: 'papers', cash: 0, inside: true, label: 'decades of newspapers' },
  { id: 'j-tires', lx: 10.5, lz: 4, kind: 'tires', cash: 12, inside: false, label: 'a pile of bald tires' },
  { id: 'j-scrap', lx: -11, lz: 9, kind: 'scrap', cash: 28, inside: false, label: 'scrap metal' },
  { id: 'j-fridge', lx: 9, lz: 13, kind: 'fridge', cash: 15, inside: false, label: 'a dead fridge' },
  { id: 'j-brush', lx: -6, lz: 18, kind: 'brush', cash: 0, inside: false, label: 'tumbleweeds and brush' },
];
export const junkWorld = JUNK.map(j => { const [x, z] = toWorld(G, j.lx, j.lz); return { ...j, x, z }; });
export const isCleared = id => game.home.cleared.includes(id);
export const garageClean = () => JUNK.filter(j => j.inside).every(j => isCleared(j.id));
export function clearJunk(id) {
  const j = JUNK.find(x => x.id === id); if (!j || isCleared(id)) return;
  game.home = { ...game.home, cleared: [...game.home.cleared, id] };
  if (j.cash) addCash(j.cash);
  const left = JUNK.filter(x => !isCleared(x.id)).length;
  const tail = !left ? ' The place is finally clean.' : j.inside && garageClean() ? ' Garage floor is clear — press B to start fixing the place up.' : ` ${left} piles left.`;
  say(`Hauled out ${j.label}${j.cash ? ` (+$${j.cash} scrap)` : ''}.${tail}`);
  save();
}
export function flipBreaker() {
  if (game.home.power) { say('The lights are on. Grandpa wired this panel himself — best not to touch it again.'); return; }
  game.home = { ...game.home, power: true }; save(); say('*clunk* ... the old fluorescent tubes flicker on.');
}
export const LETTER = [
  'Kid —',
  "If you're reading this, the garage is yours. Don't let your mother sell it.",
  "The Bug in the garage was your grandma's. She hasn't run since '09 — the battery's shot, I had a wheel off for the brakes and pulled the driver's seat to fix the runner. All of it's still here somewhere.",
  "Al in Dry Wells will sell you anything with wheels. Count your fingers after. Dusty at the gas station is good people.",
  'The old Proving Grounds down Highway 9 are closed, but nobody checks the fence.',
  'Fix her up. Then fix the place up. Then go fast.',
  '— Walt',
];

// ---------------- build mode: your property ----------------
/** place-able things. `zone`: 'yard' (outside the garage) or 'garage' (inside). r = collision radius (0 = walk-through) */
export const BUILD_ITEMS = [
  { id: 'fenceWood', name: 'Wooden fence (3 m)', price: 40, zone: 'yard', r: 0, cat: 'Fences', len: 3 },
  { id: 'fenceChain', name: 'Chain-link fence (3 m)', price: 60, zone: 'yard', r: 0, cat: 'Fences', len: 3 },
  { id: 'gate', name: 'Ranch gate', price: 110, zone: 'yard', r: 0, cat: 'Fences', len: 4 },
  { id: 'floodlight', name: 'Floodlight pole', price: 120, zone: 'yard', r: 0.3, cat: 'Yard' },
  { id: 'yardRack', name: 'Steel parts rack', price: 150, zone: 'any', r: 0.6, cat: 'Storage', note: 'More shelf room for parts' },
  { id: 'toolChest', name: 'Rolling tool chest', price: 260, zone: 'garage', r: 0.5, cat: 'Storage' },
  { id: 'lift', name: 'Two-post car lift', price: 1800, zone: 'garage', r: 0, cat: 'Garage', note: 'Work under the car (coming soon)' },
  { id: 'engineStand', name: 'Engine stand', price: 140, zone: 'garage', r: 0.5, cat: 'Garage' },
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
  { id: 'carSpot', name: 'Car lot space (gravel + paint)', price: 200, zone: 'yard', r: 0, cat: 'Car lot', note: 'Park, store and later sell cars here' },
];
export const buildById = Object.fromEntries(BUILD_ITEMS.map(b => [b.id, b]));
/** garage-local coordinates of a world point */
export function homeLocal(x, z) { const dx = x - G.x, dz = z - G.z, c = Math.cos(G.rot), s = Math.sin(G.rot); return { lx: dx * c - dz * s, lz: dx * s + dz * c }; }
const insideGarage = (lx, lz, m = 0) => Math.abs(lx) < 7 - m && Math.abs(lz) < 6 - m;
export const onProperty = (x, z) => { const { lx, lz } = homeLocal(x, z); return Math.abs(lx) < PROPERTY.w / 2 && Math.abs(lz - 8) < PROPERTY.d / 2 + 6; };
/** can this item go here? → '' or why not */
export function placeWhy(item, x, z) {
  const { lx, lz } = homeLocal(x, z);
  if (!onProperty(x, z)) return "That's past your property line.";
  const inG = insideGarage(lx, lz, 0.5), wall = insideGarage(lx, lz, -0.6) && !inG;
  if (wall) return 'Too close to the garage wall.';
  if (item.zone === 'garage' && !inG) return 'That goes inside the garage.';
  if (item.zone === 'yard' && insideGarage(lx, lz, -0.6)) return 'That goes outside, in the yard.';
  if (inG && item.zone !== 'yard' && Math.abs(lx) < 1.6 && lz > -3 && lz < 2) return "Keep the car's spot clear.";
  if (Math.abs(lx) < 4 && lz > 6 && lz < 25 && item.r > 0) return 'Keep the driveway clear.';
  if (game.cash < item.price) return `Not enough cash ($${item.price}).`;
  return '';
}
export function placeProp(id, x, z, ry) {
  const item = buildById[id], why = placeWhy(item, x, z); if (why) { say(why); return false; }
  addCash(-item.price);
  game.props = [...game.props, { uid: Math.max(0, ...game.props.map(p => p.uid)) + 1, id, x, z, ry }];
  game.propsV = (game.propsV || 0) + 1; save(); say(`Built: ${item.name} (−$${item.price})`); return true;
}
export function removeProp(uidN) {
  const p = game.props.find(q => q.uid === uidN); if (!p) return;
  const back = Math.round(buildById[p.id].price * 0.5);
  game.props = game.props.filter(q => q.uid !== uidN); game.propsV = (game.propsV || 0) + 1; addCash(back); save(); say(`Took down the ${buildById[p.id].name.toLowerCase()} (+$${back})`);
}
let cache = { v: -1, list: [] };
/** colliders for props you have built: [x, z, r, top] */
export function propObstacles() {
  const v = game.propsV || 0;
  if (cache.v !== v || cache.n !== game.props.length) cache = { v, n: game.props.length, list: game.props.filter(p => buildById[p.id]?.r > 0).map(p => [p.x, p.z, buildById[p.id].r, 99]) };
  return cache.list;
}
