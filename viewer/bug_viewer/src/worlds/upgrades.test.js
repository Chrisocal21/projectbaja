import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, upgradeById, isMaxed, nextPrice, nextNote } from './upgrades.js';
import { PARKING_LEVELS, rowsAtLevel } from './lot.js';

test('every upgrade has one price and note per level', () => {
  for (const u of UPGRADES) {
    assert.equal(u.prices.length, u.levels, `${u.id} prices`);
    assert.equal(u.notes.length, u.levels, `${u.id} notes`);
    for (const p of u.prices) assert.ok(p > 0, `${u.id} price > 0`);
  }
});
test('the parking upgrade matches the lot it actually builds', () => {
  const u = upgradeById.parking;
  assert.equal(u.levels, PARKING_LEVELS);
  for (let i = 0; i < u.levels; i++) assert.ok(u.notes[i].includes(String(rowsAtLevel(i + 1) * 2)));
});
test('level math: maxed at the top level, prices/notes step through, null past the top', () => {
  const u = upgradeById.lift2;   // a single-level upgrade
  assert.equal(isMaxed('lift2', 0), false); assert.equal(isMaxed('lift2', 1), true);
  assert.equal(nextPrice('lift2', 0), u.prices[0]); assert.equal(nextPrice('lift2', 1), null);
  assert.equal(nextNote('lift2', 0), u.notes[0]); assert.equal(nextNote('lift2', 1), null);
  const p = upgradeById.parking;   // a multi-level upgrade
  for (let lvl = 0; lvl < p.levels; lvl++) { assert.equal(isMaxed('parking', lvl), false); assert.equal(nextPrice('parking', lvl), p.prices[lvl]); }
  assert.equal(isMaxed('parking', p.levels), true); assert.equal(nextPrice('parking', p.levels), null);
});
