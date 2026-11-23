import test from 'node:test';
import assert from 'node:assert/strict';
import { GAS_BRANDS, gasBrand, gasIndexes } from './brands.js';

test('several knock-off brands, none of them Dusty, all different', () => {
  assert.ok(GAS_BRANDS.length >= 5); assert.ok(GAS_BRANDS.every(b => !/dusty/i.test(b.name)));
  assert.equal(new Set(GAS_BRANDS.map(b => b.name)).size, GAS_BRANDS.length);
});
test('brands alternate along the road, counting gas stations only', () => {
  const idx = gasIndexes([{ type: 'gas' }, { type: 'rest' }, { type: 'gas' }, { type: 'gas' }, { type: 'rest' }]);
  assert.deepEqual(idx, [0, -1, 1, 2, -1]);
  assert.equal(gasBrand(0).id, 'pemax'); assert.equal(gasBrand(1).id, 'exxan'); assert.equal(gasBrand(GAS_BRANDS.length).id, 'pemax'); assert.equal(gasBrand(-1).id, GAS_BRANDS.at(-1).id);
});
