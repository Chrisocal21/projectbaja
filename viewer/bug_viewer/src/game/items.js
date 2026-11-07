// Physical parts. Every item lives somewhere: on the ground / a bench / a shelf ('world'), in a container ('box'),
// in your hands ('hand'), in your pack ('pack') or in the car ('car', cab or roof). Nothing floats, nothing is magic.
import { game, save, say, addCash, catalogFor } from './store.js';
import { partById, wheelById, rimById, labelFor } from '../build.js';
import { SITES, toWorld } from '../worlds/testcenter.js';
import { containers, containerById, spots, CONTAINER_RULES, STARTER } from './loot.js';
import { BUG } from '../rules/vehicles.js';

export const TOOLS = { wrench: { name: 'Wrench', size: 1 }, jack: { name: 'Floor jack', size: 3 } };
const STOCK = Object.fromEntries(BUG.slots.map(s => [s.id, s]));

/** how bulky a part is (1 = fits in your pack ... 4 = fills the whole cabin) */
const SLOT_SIZE = { engineCarb: 2, engineBore: 3, engineIgnition: 1, engineCooling: 2, engine: 4, rearBumper: 4, suspension: 3, shocks: 2, fenders: 3, hood: 2, rearDeck: 2, frontBumper: 3, rockers: 2, roofRack: 3, lightBar: 2, rearCarrier: 2, exhaust: 2, frontLights: 1, rearLights: 1, roofGear: 2, skid: 2, mudFlaps: 1, antenna: 1 };
export const sizeOf = (kind, id) => (kind === 'part' ? SLOT_SIZE[partById[id]?.slot] || 2 : kind === 'wheel' ? 4 : kind === 'stock' ? (id === 'wheel' ? 3 : STOCK[id]?.size || 2) : kind === 'tool' ? TOOLS[id]?.size || 1 : 3);
export const SIZE_NAME = { 1: 'small', 2: 'medium', 3: 'large', 4: 'huge' };
export const nameOfItem = it => it.kind === 'stock' ? (it.id === 'wheel' ? (it.set && it.set !== 'stock' ? `${wheelById[it.set]?.label || 'Custom'} wheel` : 'Stock wheel') : it.id === 'engine' ? 'Stock 1600 engine' : `${STOCK[it.id]?.name || it.id} (stock)`) : it.kind === 'tool' ? TOOLS[it.id]?.name || it.id : labelFor((it.kind === 'part' ? partById : it.kind === 'wheel' ? wheelById : rimById)[it.id] || { label: it.id }, game.build?.body);
export const itemSize = it => sizeOf(it.kind, it.id);

// ---- storage ----
/** pack: small parts only. car: the cab, plus a roof deck when a roof rack is fitted (anything up to "large") */
export const CAPACITY = { pack: 4, cab: 4, roof: 6 };
export const hasRack = () => !!game.build?.parts?.roofRack;
export const used = spot => game.items.filter(i => (spot === 'pack' ? i.loc === 'pack' : i.loc === 'car' && i.spot === spot)).reduce((n, i) => n + itemSize(i), 0);
export const held = () => game.items.find(i => i.loc === 'hand');
export const packItems = () => game.items.filter(i => i.loc === 'pack');
export const carItems = () => game.items.filter(i => i.loc === 'car');
export const garageItems = () => game.items.filter(i => i.loc === 'garage');
/** the garage shelves: unlimited storage, only reachable inside your garage */
export function storeInGarage(uidN) { const it = game.items.find(i => i.uid === uidN); if (!it || !['hand', 'pack', 'car'].includes(it.loc)) return; at(it).loc = 'garage'; commit(); say(`${nameOfItem(it)} → garage shelves`); }
export function takeFromGarage(uidN) { const it = game.items.find(i => i.uid === uidN); if (!it || it.loc !== 'garage') return; const w = takeOnto(it); if (!w) return say(fullMsg(it)); commit(); }
export function giveToGarage(kind, id, extra = {}) { game.items.push({ uid: uid(), kind, id, loc: 'garage', ...extra }); commit(); }
export const boxItems = id => game.items.filter(i => i.loc === 'box' && i.box === id);
export function spotFor(it) {
  const s = itemSize(it);
  if (used('cab') + s <= CAPACITY.cab) return 'cab';
  if (hasRack() && s <= 3 && used('roof') + s <= CAPACITY.roof) return 'roof';
  return null;
}
const fitsPack = it => itemSize(it) === 1 && used('pack') + 1 <= CAPACITY.pack;
const commit = () => { game.items = [...game.items]; save(); };
const uid = () => Math.max(0, ...game.items.map(i => i.uid)) + 1;
const at = it => { delete it.x; delete it.z; delete it.y; delete it.ry; delete it.spot; delete it.box; return it; };

/** put an item on you: small parts go in the pack, anything else needs free hands */
/** can the player take this right now (pack or free hands)? */
export const canCarry = (kind, id) => (sizeOf(kind, id) === 1 && used('pack') + 1 <= CAPACITY.pack) || !held();
/** hand a brand-new item to the player (detached part, store purchase). Check canCarry first. */
export function giveToPlayer(kind, id, extra = {}) { const it = { uid: uid(), kind, id, loc: 'world', ...extra }; game.items.push(it); const w = takeOnto(it); commit(); return w; }
function takeOnto(it) {
  if (fitsPack(it)) { at(it).loc = 'pack'; return 'pack'; }
  if (!held()) { at(it).loc = 'hand'; return 'hand'; }
  return null;
}
const fullMsg = it => (itemSize(it) === 1 ? 'Pack is full and your hands are busy.' : 'Your hands are full — put that down first (G).');

export function spawnItem(kind, id, x, z, y = 0, ry = Math.random() * 6) { game.items.push({ uid: uid(), kind, id, loc: 'world', x, z, y, ry }); commit(); }
const near = (d = 1.4, jitter = 0.5) => ({ x: game.pos.x + game.face.x * d + (Math.random() - 0.5) * jitter, z: game.pos.z + game.face.z * d + (Math.random() - 0.5) * jitter });
export function dropNearPlayer(kind, id) { const p = near(1.8, 1.4); spawnItem(kind, id, p.x, p.z); }

export function pickUp(uidN) {
  const it = game.items.find(i => i.uid === uidN); if (!it || it.loc !== 'world') return;
  const where = takeOnto(it); if (!where) return say(fullMsg(it));
  commit(); say(`${nameOfItem(it)} → ${where === 'pack' ? 'pack' : 'hands'}`);
}
/** put something you carry down at your feet */
export function dropItem(uidN) {
  const it = uidN ? game.items.find(i => i.uid === uidN) : held(); if (!it || !['hand', 'pack'].includes(it.loc)) return;
  const p = near(); at(it); Object.assign(it, { loc: 'world', x: p.x, z: p.z, y: 0, ry: Math.random() * 6 }); commit();
}
export const dropHeld = () => dropItem();
/** move a pack item into your hands (to install it), swapping what you hold back into the pack if it fits */
export function holdItem(uidN) {
  const it = game.items.find(i => i.uid === uidN); if (!it || it.loc !== 'pack') return;
  const h = held();
  if (h) { if (itemSize(h) === 1) h.loc = 'pack'; else return say('Your hands are full.'); }
  it.loc = 'hand'; commit();
}
export function stowInCar(uidN) {
  const it = uidN ? game.items.find(i => i.uid === uidN) : held(); if (!it || !['hand', 'pack'].includes(it.loc)) return;
  const spot = spotFor(it);
  if (!spot) return say(itemSize(it) >= 4 || !hasRack() ? "Won't fit in the car. You'll need a bigger vehicle (or a roof rack for smaller parts)." : 'The car is full.');
  at(it); it.loc = 'car'; it.spot = spot; commit(); say(`${nameOfItem(it)} → ${spot === 'roof' ? 'roof rack' : 'car'}`);
}
export const loadHeld = () => stowInCar();
export function takeFromCar(uidN) {
  const it = uidN ? game.items.find(i => i.uid === uidN) : [...carItems()].reverse().find(i => fitsPack(i) || !held());
  if (!it) return say(carItems().length ? 'Your hands are full.' : 'Nothing in the car.');
  const where = takeOnto(it); if (!where) return say(fullMsg(it));
  commit(); say(`Took out: ${nameOfItem(it)}`);
}

// ---- containers ----
export function searchBox(id) {
  const b = game.boxes[id] || (game.boxes[id] = { cash: 0, searched: false });
  if (!b.searched) { b.searched = true; if (b.cash) { addCash(b.cash); say(`Found $${b.cash} in the ${CONTAINER_RULES[containerById[id].type].label}.`); } }
  save();
}
export function takeFromBox(uidN) {
  const it = game.items.find(i => i.uid === uidN); if (!it || it.loc !== 'box') return;
  const where = takeOnto(it); if (!where) return say(fullMsg(it));
  commit();
}

/** parts that were on the old build but are not on the new one end up on the floor */
export function dropRemoved(oldB, newB) {
  const now = new Set(Object.values(newB.parts));
  for (const id of Object.values(oldB.parts)) if (!now.has(id)) dropNearPlayer('part', id);
  if (oldB.wheels !== newB.wheels && oldB.wheels !== 'stock') dropNearPlayer('wheel', oldB.wheels);
  if (oldB.rim !== newB.rim && oldB.rim !== 'steel') dropNearPlayer('rim', oldB.rim);
}

/** the part shop's pickup area: bought boxes are set down here */
const SHOP_PICKUP = { x: 10.7, z: 14.2, px: -0.59, pz: 0.81 };
export function boxAtShop(kind, id) {
  const k = game.items.filter(i => i.loc === 'world' && Math.hypot(i.x - SHOP_PICKUP.x, i.z - SHOP_PICKUP.z) < 5).length;
  spawnItem(kind, id, SHOP_PICKUP.x + SHOP_PICKUP.px * (k % 5), SHOP_PICKUP.z + SHOP_PICKUP.pz * (k % 5) + Math.floor(k / 5) * 1.1);
}

/** new game: stock the garage, then hide parts and cash around the map */
export function seedWorld(bodyId) {
  game.items = []; game.boxes = {};
  const cat = catalogFor(bodyId || 'classic'), pool = [...cat.part.map(p => ['part', p.id]), ...cat.wheel.map(w => ['wheel', w.id]), ...cat.rim.map(r => ['rim', r.id]), ['stock', 'battery'], ['stock', 'headlights'], ['stock', 'seatPassenger'], ['tool', 'jack']];
  const pick = max => { const ok = pool.filter(([k, id]) => sizeOf(k, id) <= max); return ok[Math.floor(Math.random() * ok.length)]; };
  const rint = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
  let n = 0; const add = (o) => game.items.push({ uid: ++n, ...o });
  const g = SITES.garage;
  for (const [k, id, lx, lz, ly] of [STARTER.garageBench, STARTER.garageFloor]) { const [x, z] = toWorld(g, lx, lz); add({ kind: k, id, loc: 'world', x, z, y: ly, ry: g.rot + 0.1 }); }
  for (const c of containers) {
    const rule = CONTAINER_RULES[c.type], fixed = STARTER[c.id];
    game.boxes[c.id] = { cash: fixed ? fixed.cash : Math.random() < 0.6 ? rint(rule.cash) : 0, searched: false };
    const list = fixed ? fixed.items : Array.from({ length: rint(rule.n) }, () => pick(rule.max)).filter(Boolean);
    for (const [k, id] of list) add({ kind: k, id, loc: 'box', box: c.id });
  }
  add({ kind: 'tool', id: 'wrench', loc: 'pack' });   // you start with a wrench in your pack
  for (const s of spots) if (Math.random() < 0.8) { const p = pick(s.max); if (p) add({ kind: p[0], id: p[1], loc: 'world', x: s.x, z: s.z, y: s.ly, ry: s.wry + (Math.random() - 0.5) * 0.6 }); }
  save();
}
export const inGarageZone = (x, z) => Math.hypot(x - SITES.garage.x, z - SITES.garage.z) < 20;
