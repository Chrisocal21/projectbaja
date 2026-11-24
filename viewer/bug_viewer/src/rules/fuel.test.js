import test from 'node:test';
import assert from 'node:assert/strict';
import { tankOf, startFuel, fuelOf, burn, throttleCap, LIMP, fillUp, startCheck, gaugeWord, FULL_LPS } from './fuel.js';

test('a new Bug has a little old fuel; other vehicles are half full; stored amounts are clamped', () => {
  assert.equal(fuelOf({}, 'bug'), 6); assert.equal(fuelOf({}, 'cajon'), tankOf('cajon') / 2);
  assert.equal(fuelOf({ fuel: { bug: 99 } }, 'bug'), tankOf('bug')); assert.equal(fuelOf({ fuel: { bug: -3 } }, 'bug'), 0);
  assert.ok(startFuel('bug') > 0 && startFuel('bug') < tankOf('bug'));
});
test('driving burns more at full throttle than idling; a tank lasts hours, not minutes', () => {
  assert.ok(burn(1, 1) > burn(0, 1) && burn(-1, 1) === burn(1, 1));
  assert.ok(tankOf('bug') / FULL_LPS > 3600, 'a full tank is over an hour flat out');
});
test('an empty tank limps instead of stranding you', () => {
  assert.equal(throttleCap(5), 1); assert.equal(throttleCap(0), LIMP); assert.ok(LIMP > 0);
});
test('fill-up price follows the missing litres', () => {
  assert.deepEqual(fillUp(38, 38), { litres: 0, price: 0 });
  const f = fillUp(6, 38); assert.equal(f.litres, 32); assert.ok(f.price > 0 && f.price < 60);
});
test('the first start explains what is wrong: no battery, then no fuel', () => {
  assert.match(startCheck({ battery: false, litres: 6 }).why, /battery/); assert.match(startCheck({ battery: true, litres: 0 }).why, /dry/);
  assert.ok(startCheck({ battery: true, litres: 1 }).ok);
  assert.equal(gaugeWord(0, 38), 'EMPTY'); assert.equal(gaugeWord(3, 38), 'LOW'); assert.equal(gaugeWord(20, 38), '');
});

test('the jerry can pours into the tank until the can is empty or the tank is full', async () => {
  const { pourStep, canFuel, canFuelTag, CAN_L, POUR_LPS } = await import('./fuel.js');
  let can = 20, tank = 5; for (let i = 0; i < 100; i++) { const r = pourStep(can, tank, 38, 0.1); can = r.can; tank = r.tank; }
  assert.ok(Math.abs(tank - 25) < 1e-9 && can < 1e-9, 'all 20 L went in');
  const r = pourStep(20, 37.9, 38, 1); assert.ok(Math.abs(r.tank - 38) < 1e-9 && Math.abs(r.can - 19.9) < 1e-9, 'a full tank stops it');
  assert.equal(pourStep(0, 5, 38, 1).moved, 0);
  assert.equal(canFuel({ fuel: 99 }), CAN_L); assert.equal(canFuel({}), 0); assert.ok(POUR_LPS > 0);
  assert.equal(canFuelTag({ kind: 'junk', id: 'jerrycan', fuel: 12.4 }), ' · 12 L'); assert.equal(canFuelTag({ kind: 'junk', id: 'jerrycan' }), ' · empty'); assert.equal(canFuelTag({ kind: 'junk', id: 'drum' }), '');
});
