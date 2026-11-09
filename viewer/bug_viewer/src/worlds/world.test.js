import test from 'node:test';
import assert from 'node:assert/strict';
import { HM_SIZE, WORLD_SIZE, DRIVE_LIMIT, TILE_SIZE, CORR_CELL, HWY_STEP, SURFACE_CELL, DRIVE, ringMetric } from './world.js';

test('the world is at least as big as the heightmap file covers', () => assert.ok(WORLD_SIZE >= HM_SIZE));
test('the world size divides evenly into every grid built from it', () => {
  for (const g of [TILE_SIZE, CORR_CELL, HWY_STEP, SURFACE_CELL]) assert.equal(WORLD_SIZE % g, 0, `WORLD_SIZE % ${g}`);
});
test('the drive limit (and so the hologram wall) is inside the world', () => assert.ok(DRIVE_LIMIT > 0 && DRIVE_LIMIT < WORLD_SIZE / 2));

test('edge rim: old sides unchanged, south side is a long gentle ramp that climbs to the wall', () => {
  assert.equal(ringMetric(2900, 0), 2900); assert.equal(ringMetric(0, -2900), 2900); assert.equal(ringMetric(-2000, 100), 2000);
  assert.ok(ringMetric(0, 3000) < 2350, 'no rim in the old south part');
  assert.ok(ringMetric(0, DRIVE.z1) > 2600 && ringMetric(0, DRIVE.z1) < DRIVE_LIMIT, 'the south wall stands partway up the rim, not at its crest');
  let last = -1; for (let z = 3000; z <= 4500; z += 50) { const m = ringMetric(0, z); assert.ok(m >= last); last = m; }
});
