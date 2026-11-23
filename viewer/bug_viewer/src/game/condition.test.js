import test from 'node:test';
import assert from 'node:assert/strict';
import { condRows } from './condition.js';
import { FRESH } from '../wear.js';
test('a fresh car reads full and clear; heat, wear and flats raise the levels', () => {
  const ok = condRows({ temp: 80, damage: 0, wear: FRESH(), psi: 22 });
  assert.deepEqual(ok.map(r => r.label), ['TEMP', 'ENGINE', 'TIRES', 'SUSPENSION', 'ALIGNMENT']); assert.ok(ok.every(r => r.level === '')); assert.equal(ok[2].note, '22 PSI');
  const bad = condRows({ temp: 125, damage: 0.5, wear: { ...FRESH(), tires: 0.2, flat: { FL: true }, shocks: 0.8 }, psi: 12 });
  assert.equal(bad[0].level, 'bad'); assert.equal(bad[1].level, 'warn'); assert.equal(bad[2].level, 'bad'); assert.match(bad[2].note, /1 FLAT/); assert.equal(bad[3].level, 'bad');
});
