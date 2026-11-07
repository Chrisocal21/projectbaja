// Physical parts: boxed items you buy, find, pick up, carry, load into the car and bolt on by hand.
import { game, save, say, addCash, catalogFor, itemKey } from './store.js';
import { partById, wheelById, rimById, labelFor } from '../build.js';
import { SITES, toWorld } from '../worlds/testcenter.js';

/** how bulky a part is (1 = pocketable ... 4 = fills the whole cabin) */
const SLOT_SIZE = { engine: 4, rearBumper: 4, suspension: 3, shocks: 2, fenders: 3, hood: 2, rearDeck: 2, frontBumper: 3, rockers: 2, roofRack: 3, lightBar: 2, rearCarrier: 2, exhaust: 2, frontLights: 1, rearLights: 1, roofGear: 2, skid: 2, mudFlaps: 1, antenna: 1 };
export const sizeOf = (kind, id) => (kind === 'part' ? SLOT_SIZE[partById[id]?.slot] || 2 : kind === 'wheel' ? 4 : 1);
export const SIZE_NAME = { 1: 'small', 2: 'medium', 3: 'large', 4: 'huge' };
export const nameOfItem = it => labelFor((it.kind === 'part' ? partById : it.kind === 'wheel' ? wheelById : rimById)[it.id] || { label: it.id }, game.build?.body);

/** where a vehicle can stow things: cab holds 4 units; a fitted roof rack adds a 6-unit deck for anything up to "large" */
export const CAPACITY = { cab: 4, roof: 6 };
export const hasRack = () => !!game.build?.parts?.roofRack;
export const used = spot => game.items.filter(i => i.loc === 'car' && i.spot === spot).reduce((n, i) => n + sizeOf(i.kind, i.id), 0);
export function spotFor(it) {
  const s = sizeOf(it.kind, it.id);
  if (used('cab') + s <= CAPACITY.cab) return 'cab';
  if (hasRack() && s <= 3 && used('roof') + s <= CAPACITY.roof) return 'roof';
  return null;
}

export const held = () => game.items.find(i => i.loc === 'hand');
const commit = () => { game.items = [...game.items]; save(); };
let uidSeq = 0;
export function spawnItem(kind, id, x, z) {
  uidSeq = Math.max(uidSeq, ...game.items.map(i => i.uid), 0) + 1;
  game.items.push({ uid: uidSeq, kind, id, loc: 'world', x, z }); commit();
}
const near = (d = 1.4, jitter = 0.5) => ({ x: game.pos.x + game.face.x * d + (Math.random() - 0.5) * jitter, z: game.pos.z + game.face.z * d + (Math.random() - 0.5) * jitter });
export function dropNearPlayer(kind, id) { const p = near(1.8, 1.4); spawnItem(kind, id, p.x, p.z); }

export function pickUp(uid) {
  const it = game.items.find(i => i.uid === uid); if (!it || it.loc !== 'world') return;
  if (held()) return say('Your hands are full — put it down (G) first.');
  it.loc = 'hand'; commit(); say(`Picked up: ${nameOfItem(it)} (${SIZE_NAME[sizeOf(it.kind, it.id)]})`);
}
export function dropHeld() {
  const it = held(); if (!it) return;
  const p = near(); it.loc = 'world'; it.x = p.x; it.z = p.z; commit();
}
export function loadHeld() {
  const it = held(); if (!it) return;
  const spot = spotFor(it);
  if (!spot) return say(sizeOf(it.kind, it.id) >= 4 || !hasRack() ? "Won't fit in the car. You'll need a bigger vehicle (or a roof rack for smaller parts)." : 'The car is full.');
  it.loc = 'car'; it.spot = spot; commit(); say(`Loaded ${nameOfItem(it)} ${spot === 'roof' ? 'on the roof rack' : 'in the car'}.`);
}
export function takeFromCar() {
  if (held()) return say('Your hands are full.');
  const it = [...game.items].reverse().find(i => i.loc === 'car'); if (!it) return say('Nothing in the car.');
  it.loc = 'hand'; delete it.spot; commit(); say(`Took out: ${nameOfItem(it)}`);
}

/** parts that were on the old build but are not on the new one end up on the floor */
export function dropRemoved(oldB, newB) {
  const was = [...Object.values(oldB.parts)], now = new Set(Object.values(newB.parts));
  for (const id of was) if (!now.has(id)) dropNearPlayer('part', id);
  if (oldB.wheels !== newB.wheels && oldB.wheels !== 'stock') dropNearPlayer('wheel', oldB.wheels);
  if (oldB.rim !== newB.rim && oldB.rim !== 'steel') dropNearPlayer('rim', oldB.rim);
}

/** the part shop's pickup area: bought boxes appear here */
const SHOP_PICKUP = { x: 10.7, z: 14.2, px: -0.59, pz: 0.81 };
export function boxAtShop(kind, id) {
  const k = game.items.filter(i => i.loc === 'world' && Math.hypot(i.x - SHOP_PICKUP.x, i.z - SHOP_PICKUP.z) < 5).length;
  spawnItem(kind, id, SHOP_PICKUP.x + SHOP_PICKUP.px * (k % 5) * 1.0, SHOP_PICKUP.z + SHOP_PICKUP.pz * (k % 5) * 1.0 + Math.floor(k / 5) * 1.1);
}
/** a new game: a couple of small bits already on the garage floor */
export function seedStarter() {
  game.items = [];
  const g = SITES.garage;
  [['part', 'LIGHT_BumperPods', 4.2, -1.2], ['part', 'ACC_LightBar', 4.2, 0.2], ['part', 'GUARD_MudFlaps', 4.4, 1.4]].forEach(([k, id, lx, lz]) => { const [x, z] = toWorld(g, lx, lz); spawnItem(k, id, x, z); });
}
export const inGarageZone = (x, z) => Math.hypot(x - SITES.garage.x, z - SITES.garage.z) < 20;

/** a loot crate was opened out in the world: cash, or a boxed part lying where the crate was */
export function lootCrate(bodyId, x, z) {
  const c = catalogFor(bodyId), pool = [];
  for (const k of ['part', 'wheel', 'rim']) for (const it of c[k]) pool.push([k, it.id]);
  if (Math.random() < 0.3) { const n = 100 + Math.floor(Math.random() * 4) * 50; addCash(n); say(`+$${n} cash`); return; }
  const [k, id] = pool[Math.floor(Math.random() * pool.length)];
  spawnItem(k, id, x, z); say(`Found: ${nameOfItem({ kind: k, id })} — pick it up (${SIZE_NAME[sizeOf(k, id)]})`);
}
void itemKey;
