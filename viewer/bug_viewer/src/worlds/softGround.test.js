import test from 'node:test';
import assert from 'node:assert/strict';
import { softKind, patchAt, SOFT_GROUND } from './softGround.js';

const open = (x, z) => ({ x, z, wash: 0, dunes: 0, lake: 0, built: false, home: 5000 });

test('silt beds lie scattered over the open flats: a few percent of the ground, the same every time', () => {
  let silt = 0, n = 0;
  for (let x = 2000; x < 30000; x += 23) for (let z = 2000; z < 30000; z += 29) { n++; if (softKind(open(x, z)) === 'silt') silt++; }
  const f = silt / n; assert.ok(f > 0.02 && f < 0.1, `silt covers ${(f * 100).toFixed(1)}%`);
  assert.equal(patchAt(1234, 5678), patchAt(1234, 5678));
});
test('deep washes and dune hearts hold soft sand; a dry lake has a silt ring', () => {
  assert.equal(softKind({ ...open(9000, 9000), wash: 0.9 }), 'softSand');
  let dune = 0, ring = 0;
  for (let x = 0; x < 4000; x += 37) { if (softKind({ ...open(x, 777), dunes: 0.9 }) === 'softSand') dune++; if (softKind({ ...open(x, 777), lake: 0.45 }) === 'silt') ring++; }
  assert.ok(dune > 10 && ring > 10);
});
test('never near Walt\'s garage, in towns or on built ground', () => {
  assert.equal(softKind({ ...open(10, 10), wash: 1, home: 14 }), null);
  assert.equal(softKind({ ...open(9000, 9000), wash: 1, built: true }), null);
  assert.ok(SOFT_GROUND.awayFromHome >= 200);
});
