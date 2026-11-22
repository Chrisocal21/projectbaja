import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSpot, spotClear } from './clearSpot.js';

test('an empty place is used as asked', () => {
  const w = { x: 0, z: 0, h: 0 }; assert.deepEqual(clearSpot(w, 4, 2, []), w);
});
test('a blocked place moves to a clear one nearby', () => {
  const w = { x: 0, z: 0, h: 0 }, wall = [[0, 0, 3]], s = clearSpot(w, 4, 2, wall);
  assert.ok(s && s !== w && spotClear(s, 4, 2, wall));
});
test('the extra poses (lot stalls) come before the rings', () => {
  const w = { x: 0, z: 0, h: 0 }, st = { x: 30, z: 30, h: 1 };
  assert.deepEqual(clearSpot(w, 4, 2, [[0, 0, 3]], [st]), st);
});
test('a long vehicle needs the whole length clear', () => {
  assert.equal(spotClear({ x: 0, z: 0, h: 0 }, 6, 2, [[0, 2.5, 0.5]]), false);
  assert.equal(spotClear({ x: 0, z: 0, h: 0 }, 6, 2, [[0, 8, 0.5]]), true);
});
