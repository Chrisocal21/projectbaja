import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHighways, HW_STYLE } from './highways.js';

test('straight dirt wears below its grade and eases out near features and road ends', () => {
  const H = makeHighways([{ name: 'trail', kind: 'dirt', pts: [[0, 0], [400, 0]] }], () => 5);
  const grade = H.near(200, 0).h;
  assert.ok(Math.abs(H.blend(200, 0, 5) - (grade - 0.2)) < 0.02);
  assert.ok(Math.abs(H.blend(3, 0, 5) - grade) < 0.03);
  H.setFeatureHeight(() => 0.3);
  assert.ok(Math.abs(H.blend(200, 0, 5) - grade) < 0.02);
});

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
test('a side road ending near a highway joins its centre line', () => {
  const H = makeHighways([
    { name: 'Main', kind: 'major', pts: [[-500, 0], [500, 0]] },
    { name: 'Side', kind: 'secondary', pts: [[20, 12], [20, 300]] },
  ], () => 0);
  const side = H.roads.find(r => r.name === 'Side');
  assert.ok(Math.hypot(side.pts[0].x - 20, side.pts[0].z) < 2);
  assert.ok(H.crossingDistance(side.pts[0].x, side.pts[0].z, side) < 2);
});
test('a short mapped gap at a paved junction is connected', () => {
  const H = makeHighways([
    { name: 'Through', kind: 'major', pts: [[-200, 0], [200, 0]] },
    { name: 'Approach', kind: 'secondary', pts: [[0, 45], [0, 200]] },
  ], () => 0);
  const approach = H.roads.find(r => r.name === 'Approach');
  assert.ok(Math.hypot(approach.pts[0].x, approach.pts[0].z) < 3);
});

test('a longer mapped gap joins even when the approach is built first', () => {
  const H = makeHighways([
    { name: 'Approach', kind: 'secondary', pts: [[30, 110], [30, 500]] },
    { name: 'Through', kind: 'secondary', pts: [[-400, 0], [400, 0]] },
  ], () => 0);
  const approach = H.roads.find(r => r.name === 'Approach');
  assert.ok(H.crossingDistance(approach.pts[0].x, approach.pts[0].z, approach) < 1);
  assert.ok(Math.abs(approach.pts[0].hs) < 0.01);
});

test('pavement owns a dirt-road crossing in surface and grade', () => {
  const H = makeHighways([
    { name: 'Main', kind: 'major', pts: [[-500, 0], [500, 0]] },
    { name: 'Dirt', kind: 'dirt', pts: [[0, -300], [0, 300]] },
  ], (x, z) => z === 0 ? 2 : 8);
  assert.equal(H.surfaceKey(0, 0), 'asphalt');
  assert.equal(H.pavedAt(0, 0), true);
  assert.equal(H.surfaceKey(0, 100), 'dirt');
  assert.equal(H.crossingDistance(0, 0, H.roads.find(r => r.kind === 'major')), Infinity);
  const paved = makeHighways([{ name: 'Main', kind: 'major', pts: [[-500, 0], [500, 0]] }], (x, z) => z === 0 ? 2 : 8);
  assert.ok(Math.abs(H.blend(0, 0, 2) - paved.blend(0, 0, 2)) < 0.01);
});

test('a regional dirt branch meets the final paved alignment', () => {
  const H = makeHighways([
    { name: 'Main', kind: 'major', pts: [[-500, 0], [500, 0]] },
    { name: 'Dirt road', kind: 'dirt', pts: [[40, 120], [40, 600]] },
  ], () => 0);
  const dirt = H.roads.find(r => r.kind === 'dirt');
  assert.ok(H.crossingDistance(dirt.pts[0].x, dirt.pts[0].z, dirt) < 1);
  assert.equal(H.surfaceKey(dirt.pts[0].x, dirt.pts[0].z), 'asphalt');
});

test('a dirt branch connects its far end only when another road is nearby', () => {
  const H = makeHighways([
    { name: 'Main', kind: 'major', pts: [[-500, 0], [500, 0]] },
    { name: 'Cross trail', kind: 'dirt', pts: [[-300, 480], [300, 480]] },
    { name: 'Dirt road', kind: 'dirt', pts: [[40, 90], [40, 450]] },
  ], () => 0);
  const branch = H.roads.find(r => r.name === 'Dirt road');
  const far = branch.pts.at(-1);
  const cross = H.roads.find(r => r.name === 'Cross trail');
  assert.ok(Math.min(...cross.pts.map(p => Math.hypot(p.x - far.x, p.z - far.z))) < 5);
});

test('a mapped mountain road grades through a ridge without a sheer fill', () => {
  const ground = (x) => 100 - 96 * Math.max(0, Math.min(1, (x + 500) / 900)) ** 0.5;
  const H = makeHighways([{ name: 'Mex 2D', kind: 'major', pts: [[-500, 0], [400, 0]] }], ground);
  const p = H.roads[0].pts;
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
    assert.ok(Math.abs(p[i].hs - p[i - 1].hs) / d <= 0.141);
    assert.ok(Math.abs(p[i].hs - ground(p[i].x)) <= 35.1);
  }
});

test('one paved road carries through a junction while the other stops at it', () => {
  const H = makeHighways([
    { name: 'Through', kind: 'major', pts: [[-200, 0], [200, 0]] },
    { name: 'Joining', kind: 'secondary', pts: [[0, -200], [0, 200]] },
  ], () => 0);
  const through = H.roads.find(r => r.name === 'Through');
  const joining = H.roads.find(r => r.name === 'Joining');
  assert.equal(H.higherRoadAt(0, 0, joining), true);
  assert.equal(H.higherRoadAt(0, 0, through), false);
  assert.equal(H.higherRoadAt(0, 20, joining), false);
});
