import test from 'node:test';
import assert from 'node:assert/strict';
import { HM_SIZE, WORLD_SIZE, DRIVE_LIMIT, TILE_SIZE, CORR_CELL, HWY_STEP, SURFACE_CELL } from './world.js';

test('the world is at least as big as the heightmap file covers', () => assert.ok(WORLD_SIZE >= HM_SIZE));
test('the world size divides evenly into every grid built from it', () => {
  for (const g of [TILE_SIZE, CORR_CELL, HWY_STEP, SURFACE_CELL]) assert.equal(WORLD_SIZE % g, 0, `WORLD_SIZE % ${g}`);
});
test('the drive limit (and so the hologram wall) is inside the world', () => assert.ok(DRIVE_LIMIT > 0 && DRIVE_LIMIT < WORLD_SIZE / 2));
