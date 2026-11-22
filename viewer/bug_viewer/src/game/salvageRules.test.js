import test from 'node:test';
import assert from 'node:assert/strict';
import { salvageGate, feeOf, isFree, ROADSIDE_FEE } from './salvageRules.js';

const wreck = { uid: 5, name: "'63 Bug" };
test('the first try only tells you the fee, the second pays it, and then it is yours', () => {
  const a = salvageGate(wreck, 500); assert.equal(a.allow, false); assert.equal(a.offered, true); assert.match(a.msg, /\$35 buys the right/);
  const b = salvageGate({ ...wreck, salvageOffered: true }, 500); assert.equal(b.allow, true); assert.equal(b.charge, ROADSIDE_FEE);
  assert.equal(salvageGate({ ...wreck, salvagePaid: true }, 0).allow, true);
});
test('without the cash it says so and charges nothing', () => {
  const r = salvageGate({ ...wreck, salvageOffered: true }, 12.5); assert.equal(r.allow, false); assert.equal(r.charge, 0); assert.match(r.msg, /\$35 and you have \$12/);
});
test('the yard donors have their own fees and your own car is always free', () => {
  assert.equal(feeOf({ uid: 1 }), 25); assert.equal(feeOf({ uid: 2 }), 60); assert.equal(feeOf(wreck), 35);
  assert.equal(isFree({ id: 'bug' }), true); assert.equal(isFree(null), true); assert.equal(isFree(wreck), false);
});
