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
