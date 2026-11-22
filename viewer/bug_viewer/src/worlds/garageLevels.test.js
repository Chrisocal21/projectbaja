import test from 'node:test';
import assert from 'node:assert/strict';
import { GARAGE_LEVELS, levelData, extension, inExtension, garageLevelOf, baysAt, nearestBay, bayOf, freeBays, BAY } from './garageLevels.js';
import { STAGES, ownedStages, stageById } from './upgrades.js';

test('bays grow 1, 4, 6, 10 and never overlap', () => {
  assert.deepEqual(GARAGE_LEVELS.map(l => l.bays.length), [1, 4, 6, 10]);
  for (const l of GARAGE_LEVELS) for (const a of l.bays) for (const b of l.bays) if (a !== b)
    assert.ok(Math.abs(a.x - b.x) >= BAY.w - 1e-9 || Math.abs(a.z - b.z) >= BAY.d - 1e-9, `${l.level}: ${a.id} overlaps ${b.id}`);
});
test('every bay sits inside the shell at its level', () => {
  for (const l of GARAGE_LEVELS) for (const b of l.bays) {
    const old = Math.abs(b.x) < 7 && Math.abs(b.z) < 6;
    assert.ok(old || inExtension(l.level, b.x, b.z), `${l.level}: ${b.id}`);
  }
});
// property depth 50 m is county.js PROPERTY.d (county.js cannot load under node)
test('level 0 has no extension; the shell stays on the property', () => {
  assert.equal(extension(0), null);
  for (const l of GARAGE_LEVELS) assert.ok(l.z0 > 8 - (50 / 2 + 6), `level ${l.level} past the property line`);
});
test('garage level comes from the stages owned, and the stages chain', () => {
  assert.equal(garageLevelOf(new Set()), 0);
  assert.equal(garageLevelOf(new Set(['garage1'])), 1);
  assert.equal(garageLevelOf(new Set(['garage1', 'garage2', 'garage3'])), 3);
  assert.ok(stageById.garage3.needs.includes('garage2'));
  assert.equal(garageLevelOf(ownedStages({ stages: ['garage2'] })), 2);
});
test('nearest bay, bay of a car, free bays', () => {
  assert.equal(nearestBay(1, 0.3, -0.2).id, 'B0');
  assert.equal(nearestBay(0, 4.6, -0.5), null);
  assert.equal(bayOf(3, -3.2, -17.5).id, 'S1');
  assert.equal(freeBays(1, [{ x: 0, z: -0.5 }]).length, 3);
});

test('nearestBay liftOnly: a lift aimed near a bay snaps to it, far away it does not', () => {
  assert.equal(nearestBay(3, -7.0, -10.0, 3.5, true).id, 'R2');
  assert.equal(nearestBay(3, 30, 30, 3.5, true), null);
});
