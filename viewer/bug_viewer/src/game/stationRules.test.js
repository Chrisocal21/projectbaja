import test from 'node:test';
import assert from 'node:assert/strict';
import { fixQuote, fixedWear } from './stationRules.js';
import { FRESH } from '../wear.js';

test('a new car needs nothing; a worn one is quoted for every worn part at a markup, and comes out fresh', () => {
  assert.deepEqual(fixQuote(FRESH()), { parts: [], cost: 0 });
  const worn = { ...FRESH(), shocks: 0.6, tires: 0.4, flat: { FL: true } };
  const q = fixQuote(worn);
  assert.deepEqual(q.parts, ['shocks', 'tires']);
  assert.ok(q.cost > 0);
  const after = fixedWear(worn);
  assert.equal(after.shocks, 0); assert.equal(after.tires, 0); assert.deepEqual(after.flat, {});
  assert.equal(fixQuote(after).cost, 0);
});
