import test from 'node:test';
import assert from 'node:assert/strict';
import { GAS_BRANDS, gasBrand, gasIndexes } from './brands.js';

test('two knock-off brands, neither of them Dusty', () => {
  assert.equal(GAS_BRANDS.length, 2); assert.ok(GAS_BRANDS.every(b => !/dusty/i.test(b.name)));
  assert.notEqual(GAS_BRANDS[0].name, GAS_BRANDS[1].name);
});
test('brands alternate along the road, counting gas stations only', () => {
  const idx = gasIndexes([{ type: 'gas' }, { type: 'rest' }, { type: 'gas' }, { type: 'gas' }, { type: 'rest' }]);
  assert.deepEqual(idx, [0, -1, 1, 2, -1]);
  assert.equal(gasBrand(0).id, 'pemax'); assert.equal(gasBrand(1).id, 'exxan'); assert.equal(gasBrand(2).id, 'pemax'); assert.equal(gasBrand(-1).id, 'exxan');
});
