import test from 'node:test';
import assert from 'node:assert/strict';
import { custWheel, isCustWheel, custWheelReady } from './custJobs.js';

test('the customer wheel starts punctured and flat, and is not ready', () => {
  const w = custWheel(() => 0.5);
  assert.equal(w.hole, true); assert.ok(w.air < 0.3); assert.equal(isCustWheel(w), true);
  assert.equal(custWheelReady(w).ok, false);
});
test('it is ready only once patched and inflated', () => {
  const w = custWheel();
  assert.match(custWheelReady({ ...w, hole: false }).why, /flat/);
  assert.match(custWheelReady(w).why, /hole/);
  assert.equal(custWheelReady({ ...w, hole: false, air: 1 }).ok, true);
});
test('a missing wheel gives a hint, and plain wheels are not the customer\'s', () => {
  assert.equal(custWheelReady(null).ok, false);
  assert.equal(isCustWheel({ kind: 'stock', id: 'wheel' }), false);
});
