import test from 'node:test';
import assert from 'node:assert/strict';
import { CAJON, defOfBuild } from '../rules/vehicles.js';
import { isFitted, isDriveable, missingToDrive } from '../rules/restore.js';
import { CAJON_PRICE, GIFT_PILE, cajonCatalog, shellBuild, pileSpots, toWorldFrame, shouldOffer, GIFT_HOURS, YARD_SPOT, HOIST_REACH } from './cajonParts.js';
import { toLocal } from './workTarget.js';

test('the shell arrives bare: every part off, a Cajon build, and it does not run', () => {
  const b = shellBuild();
  assert.equal(defOfBuild(b), CAJON);
  for (const s of CAJON.slots) assert.equal(isFitted(CAJON, b, s.id), false, s.id);
  assert.equal(isDriveable(CAJON, b), false);
  assert.deepEqual(missingToDrive(CAJON, b).map(s => s.id).sort(), ['ecBattery', 'ecEngine', 'ecSeat', 'ecSteering', 'ecWheelFL', 'ecWheelFR', 'ecWheelRL', 'ecWheelRR']);
  assert.deepEqual(b.parts, {}); assert.equal(b.wheels, 'stock');
});
test('every part Dusty leaves in the pile is a real slot, and what is left to buy is not empty', () => {
  const ids = new Set(CAJON.slots.map(s => s.id));
  for (const id of GIFT_PILE) assert.ok(ids.has(id), id);
  assert.equal(new Set(GIFT_PILE).size, GIFT_PILE.length);
  assert.ok(!GIFT_PILE.includes('ecEngine') && !GIFT_PILE.some(id => id.startsWith('ecWheel')));   // the engine and the wheels are still to find
});
test('the phone catalogue lists every slot once (the four wheels as one stock wheel) and each has a price', () => {
  const cat = cajonCatalog(), have = cat.map(c => c.id);
  assert.equal(new Set(have).size, have.length);
  assert.deepEqual(CAJON.slots.filter(s => !s.wheel).map(s => s.id).filter(id => !have.includes(id)), []);
  assert.ok(have.includes('wheel'));
  for (const c of cat) { assert.ok(c.price > 0, c.id); assert.equal(c.price, CAJON_PRICE[c.id]); assert.match(c.name, /^(El Cajon |Stock wheel)/); }
});
test('buying every missing part new costs less than a good car (a rebuild is cheaper than buying one, but not free)', () => {
  const left = cajonCatalog().filter(c => !GIFT_PILE.includes(c.id)).reduce((n, c) => n + c.price * (c.id === 'wheel' ? 4 : 1), 0);
  assert.ok(left > 600 && left < 2500, `${left}`);
});
test('the pile is laid out along the truck\'s left side, clear of the doors, whichever way the truck faces', () => {
  for (const h of [0, 0.7, -2.2, Math.PI]) {
    const pose = { x: 100, z: -40, h }, spots = pileSpots(pose);
    assert.equal(spots.length, GIFT_PILE.length);
    for (const s of spots) { const l = toLocal(pose, s.x, s.z); assert.ok(Math.abs(l.lx - 2.9) < 1e-9, `lx ${l.lx}`); assert.ok(Math.abs(l.lz) < 3, `lz ${l.lz}`); }
    const zs = spots.map(s => toLocal(pose, s.x, s.z).lz).sort((a, b) => a - b); for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] >= 0.99);   // not on top of each other
  }
});
test('toWorldFrame is the inverse of the work-target frame', () => {
  const pose = { x: 12, z: -7, h: 1.1 }, w = toWorldFrame(pose, 1.3, -2.4), l = toLocal(pose, w.x, w.z);
  assert.ok(Math.abs(l.lx - 1.3) < 1e-9 && Math.abs(l.lz + 2.4) < 1e-9);
});

test('Dusty offers once: when your Bug runs and you open his store, never in a test session, never twice', () => {
  const ok = { dev: false, state: null, ownsBug: true, bugActive: true, bugRuns: true };
  assert.equal(shouldOffer(ok), true);
  assert.equal(shouldOffer({ ...ok, dev: true }), false);
  assert.equal(shouldOffer({ ...ok, state: { offered: true } }), false);
  assert.equal(shouldOffer({ ...ok, bugRuns: false }), false);      // a Bug that does not run is not hauling anything yet
  assert.equal(shouldOffer({ ...ok, bugActive: false }), false);    // something else is your active vehicle
  assert.equal(shouldOffer({ ...ok, ownsBug: false }), false);
  assert.ok(GIFT_HOURS > 0 && YARD_SPOT.lz > 6 && YARD_SPOT.lz < 25);   // after the roller door (z = 6), inside the yard (to z = 25)
});
test('the truck is set down where the garage hoist and jack reach everything that needs them, clear of the fridge and the shell spots', () => {
  const pose = { x: YARD_SPOT.lx, z: YARD_SPOT.lz, h: YARD_SPOT.ry };   // garage-local stands in for world: only distances matter
  const spots = [[2.6, 1.8], [-2.6, 1.8], [2.6, -1.3], [-2.6, -1.3], [0, 3.6]];   // beside each wheel (the jack) and in front of the hood (the engine hoist), in the truck's own frame
  for (const [lx, lz] of spots) { const m = toWorldFrame(pose, lx, lz); assert.ok(Math.hypot(m.x, m.z) < HOIST_REACH - 1, `${lx},${lz} is ${Math.hypot(m.x, m.z).toFixed(1)} m from the garage`); }
  assert.ok(Math.hypot(YARD_SPOT.lx - 9, YARD_SPOT.lz - 15) > 5);   // the dead fridge (9, 15)
  for (const x of [-4, 0.5, 5]) assert.ok(Math.hypot(YARD_SPOT.lx - x, YARD_SPOT.lz - 13) > 2.5, `shell spot ${x}`);   // the lifted-off body shells
  const p = pileSpots(pose).map(s => Math.hypot(s.x, s.z)); assert.ok(Math.max(...p) < HOIST_REACH);   // the pile is inside the garage's reach too
  assert.ok(YARD_SPOT.lz - 2.75 > 6.5);   // the nose stays clear of the roller door (z = 6)
});
