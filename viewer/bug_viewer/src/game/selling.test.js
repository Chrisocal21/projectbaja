import test from 'node:test';
import assert from 'node:assert/strict';
import { sellValue, JUNK_VALUE } from './selling.js';

test('parts fetch 40% of the shop price in $5 steps, never less than $5', () => {
  assert.equal(sellValue({ kind: 'part' }, 300), 120); assert.equal(sellValue({ kind: 'wheel' }, 300), 120); assert.equal(sellValue({ kind: 'part' }, 10), 5);
  assert.equal(sellValue({ kind: 'part' }, 0), 0);
});
test('supplies and tools, junk, tires', () => {
  assert.equal(sellValue({ kind: 'supply', id: 'oil' }, 12), 6); assert.equal(sellValue({ kind: 'supply', id: 'bulb' }, 1), 1);
  assert.equal(sellValue({ kind: 'tool', id: 'jack' }, 90), 36); assert.equal(sellValue({ kind: 'tire' }), 20);
  assert.equal(sellValue({ kind: 'junk', id: 'engineblock' }), JUNK_VALUE.engineblock); assert.equal(sellValue({ kind: 'junk', id: 'mystery' }), 0);
});
test('keepsakes and shells are not for sale', () => {
  assert.equal(sellValue({ kind: 'memento', id: 'letter' }, 100), 0); assert.equal(sellValue({ kind: 'shell' }, 500), 0); assert.equal(sellValue(null), 0);
});
