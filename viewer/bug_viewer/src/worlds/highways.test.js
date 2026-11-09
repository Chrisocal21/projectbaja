import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHighways, HW_STYLE } from './highways.js';

const hill = (x, z) => 20 * Math.exp(-((x - 500) ** 2) / 20000);   // a 20 m bump at x = 500

test('a highway follows its line and is paved there', () => {
  const H = makeHighways([{ name: 'I-8', kind: 'major', pts: [[0, 0], [1000, 0]] }], () => 5);
  assert.equal(H.roads.length, 1);
  const q = H.near(300, 2); assert.ok(q && q.d < 2.5 && Math.abs(q.h - 5) < 1e-6);
  assert.equal(H.surfaceKey(300, 1), 'asphalt');
  assert.equal(H.surfaceKey(300, HW_STYLE.major.half - 0.3), 'gravel');
  assert.equal(H.surfaceKey(300, 80), null);
  assert.equal(H.near(300, 200), null);
  assert.ok(H.isNear(300, 0) && !H.isNear(300, 40));
});

test('the grade smooths a bump and the ground eases onto it', () => {
  const H = makeHighways([{ name: 'X', kind: 'secondary', pts: [[0, 0], [1000, 0]] }], hill);
  const top = H.near(500, 0).h;
  assert.ok(top < 15 && top > 2, 'graded below the bump top: ' + top);
  assert.equal(H.blend(500, 0, 20), top);                 // on the road: road height
  assert.equal(H.blend(500, 300, 7), 7);                  // far away: untouched
  const mid = H.blend(500, HW_STYLE.secondary.half + 6, 20); assert.ok(mid > top && mid < 20);
});

test('a highway stays above water and bends round a keep-clear place', () => {
  const H = makeHighways([{ name: 'Y', kind: 'secondary', pts: [[0, 0], [1000, 0]] }], () => -10, { water: () => 0, avoid: [{ x: 500, z: 0, r: 80 }] });
  assert.ok(H.roads[0].pts.every(p => p.hs >= 1.2 - 1e-6));
  assert.ok(H.roads[0].pts.every(p => Math.hypot(p.x - 500, p.z) >= 79));
  assert.equal(H.surfaceKey(500, 0), null);
});

test('junctions meet at one height', () => {
  const ground = (x, z) => (z > 0 ? z * 0.05 : 0);
  const H = makeHighways([
    { name: 'A', kind: 'major', pts: [[-800, 0], [800, 0]] },
    { name: 'B', kind: 'secondary', pts: [[0, 0], [0, 900]] },
  ], ground);
  const b = H.roads.find(r => r.name === 'B'), a = H.roads.find(r => r.name === 'A');
  const ai = a.pts.reduce((m, p, i) => (Math.abs(p.x) < Math.abs(a.pts[m].x) ? i : m), 0);
  assert.ok(Math.abs(b.pts[0].hs - a.pts[ai].hs) < 0.3, b.pts[0].hs + ' vs ' + a.pts[ai].hs);
});
