import test from 'node:test';
import assert from 'node:assert/strict';
import { turnRy, ghostSpot, aimedProp, normRy } from './furnish.js';

const D = Math.PI / 180, near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
test('rotation steps: wheel 5, Q/E 15, Shift 90, R 90, wraps', () => {
  near(turnRy(0, 'wheel', false, 1), 5 * D); near(turnRy(0, 'wheel', false, -1), 355 * D);
  near(turnRy(0, 'e'), 15 * D); near(turnRy(0, 'q'), 345 * D);
  near(turnRy(0, 'e', true), 90 * D); near(turnRy(0, 'wheel', true, -1), 270 * D);
  near(turnRy(300 * D, 'r'), 30 * D); near(normRy(-D), 359 * D);
});
test('ghost spot is free by default and 0.5 m on a grid with Shift', () => {
  const f = { x: 0, z: -1 };
  const g = ghostSpot(1.13, 2.2, f, 4, false); near(g.x, 1.13); near(g.z, -1.8);
  assert.deepEqual(ghostSpot(1.13, 2.2, f, 4, true), { x: 1, z: -2 });
});
test('aimedProp picks the nearest prop on the view ray, ignores off-ray, behind and far ones', () => {
  const f = { x: 0, z: -1 }, ps = [{ uid: 1, x: 0, z: -3, r: 0.5 }, { uid: 2, x: 0.2, z: -5, r: 0.5 }, { uid: 3, x: 3, z: -3, r: 0.5 }, { uid: 4, x: 0, z: 3, r: 1 }, { uid: 5, x: 0, z: -20, r: 1 }];
  assert.equal(aimedProp(ps, 0, 0, f).uid, 1);
  assert.equal(aimedProp(ps.slice(1), 0, 0, f).uid, 2);
  assert.equal(aimedProp([ps[2], ps[3], ps[4]], 0, 0, f), null);
});
