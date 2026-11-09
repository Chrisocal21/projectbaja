import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBorder, SEA_Y } from './border.js';

// a 4x3 toy map, 10 m cells: west column is sea (bit0), one Salton Sea cell (bit1)
const meta = { nx: 4, nz: 3, cell: 10, x0: -20, z0: -10, lakeLevel: -8.9 };
const H = Float32Array.from([-5, 3, 10, 50, -5, 3, -12, 50, -5, 3, 10, 50]);
const M = Uint8Array.from([1, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0]);
const B = makeBorder(meta, H, M);

test('height is bilinear between cells and open sea outside the box', () => {
  assert.equal(B.heightAt(-20, -10), -5);
  assert.equal(B.heightAt(-15, -10), (-5 + 3) / 2);
  assert.ok(B.heightAt(500, 500) < -20);
});
test('water: ocean at sea level, Salton Sea at its own level, none on land', () => {
  assert.equal(B.waterAt(-20, 0), SEA_Y);
  assert.equal(B.waterAt(0, 0), meta.lakeLevel);
  assert.equal(B.waterAt(10, 0), null);
  assert.equal(B.surfaceAt(-20, 0).key, 'water');
});
