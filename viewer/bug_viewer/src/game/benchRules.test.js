import test from 'node:test';
import assert from 'node:assert/strict';
import { chargeOf, chargeStep, batteryCheck, serviceBlock, serviceTo, CHARGE_S, CAP } from './benchRules.js';

test('a battery with no charge field is full, and the charger fills one up and stops', () => {
  assert.equal(chargeOf({}), 1); assert.equal(chargeOf({ charge: 0.3 }), 0.3);
  let c = 0; for (let i = 0; i < CHARGE_S * 2; i++) c = chargeStep(c, 1);
  assert.equal(c, 1);
  assert.ok(chargeStep(0, 9) > 0 && chargeStep(0, 9) < 0.2);
});
test('a flat battery will not start the car and says so; a half one will', () => {
  assert.match(batteryCheck(0.1).why, /flat \(10%\)/);
  assert.equal(batteryCheck(0.5).ok, true); assert.equal(batteryCheck(undefined).ok, true);
});
test('a service helps a worn piece up to the cap, once, and cannot save a shot one', () => {
  assert.equal(serviceBlock({ cond: 50 }), '');
  assert.match(serviceBlock({ cond: 50, serviced: true }), /already had/);
  assert.match(serviceBlock({ cond: 10 }), /shot/);
  assert.match(serviceBlock({ cond: 90 }), /as good as/);
  assert.equal(serviceTo(50), 75); assert.equal(serviceTo(70), CAP);
});
import { WASH_S } from './benchRules.js';
test('a dirty piece cannot be serviced until it is washed', () => {
  assert.match(serviceBlock({ cond: 50, grimy: true }), /wash it/);
  assert.equal(serviceBlock({ cond: 50, grimy: false }), '');
  assert.ok(WASH_S > 0);
});
