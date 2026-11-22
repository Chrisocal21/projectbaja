import test from 'node:test';
import assert from 'node:assert/strict';
import { firingHz, roadNoise } from './audio.js';

test('engine pitch rises with rpm and a flat-four fires 30 times a second at 900 rpm', () => { assert.equal(firingHz(900), 30); assert.ok(firingHz(5000) > firingHz(2000)); assert.equal(firingHz(0), firingHz(500)); });
test('road noise needs speed, grows with slip and loose ground, and stays in 0..1', () => {
  assert.equal(roadNoise(0, 1, 1), 0);
  assert.ok(roadNoise(20, 0.5, 0) > roadNoise(20, 0, 0)); assert.ok(roadNoise(20, 0, 1) > roadNoise(20, 0, 0));
  assert.ok(roadNoise(60, 1, 1) <= 1.0 * 1.75 && roadNoise(14, 0, 0) < roadNoise(28, 0, 0));
});
