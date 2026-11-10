import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadConnections } from './roadConnections.js';

const road = (a, b) => ({ kind: 'secondary', style: { half: 4.4 }, pts: Array.from({ length: 26 }, (_, i) => ({ x: a[0] + (b[0] - a[0]) * i / 25, z: a[1] + (b[1] - a[1]) * i / 25 })) });

test('a four-way crossing trims all legs and owns a compact center', () => {
  const roads = [road([-100, 0], [0, 0]), road([0, 0], [100, 0]), road([0, -100], [0, 0]), road([0, 0], [0, 100])];
  const result = buildRoadConnections(roads, [{ x: 0, z: 0 }]);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].legs.length, 4);
  assert.ok(result.junctions[0].polygon.length >= 128);
  assert.ok(result.junctions[0].legs.every(leg => Math.hypot(leg.p.x, leg.p.z) < 16));
  assert.ok(result.junctions[0].polygon.every(p => Math.hypot(p.x, p.z) < 20));
  for (const r of roads) assert.ok(result.hidden.get(r)?.length);
});

test('a lone road end remains a dead end', () => {
  const r = road([0, 0], [100, 0]);
  const result = buildRoadConnections([r], [{ x: 0, z: 0 }]);
  assert.equal(result.junctions.length, 0);
  assert.equal(result.hidden.size, 0);
});

test('two roads crossing in their middles share pavement and hide both center spans', () => {
  const a = road([-100, 0], [100, 0]), b = road([0, -100], [0, 100]);
  const result = buildRoadConnections([a, b]);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].legs.length, 4);
  for (const r of [a, b]) {
    const [lo, hi] = result.hidden.get(r)[0];
    assert.ok(lo > 0 && hi < r.pts.length - 1 && lo <= hi);
  }
});

test('the visible crossing takes priority over an offset source junction', () => {
  const roads = [road([-100, 0], [100, 0]), road([0, -100], [0, 100])];
  const result = buildRoadConnections(roads, [{ x: 12, z: 9 }]);
  assert.equal(result.junctions.length, 1);
  assert.ok(Math.hypot(result.junctions[0].center.x, result.junctions[0].center.z) < 0.1);
});

test('a skewed three-leg junction has a simple bounded pavement outline', () => {
  const roads = [road([0, -100], [0, 100]), road([0, 0], [25, 100])];
  const [node] = buildRoadConnections(roads, [{ x: 0, z: 0 }]).junctions;
  assert.equal(node.legs.length, 3);
  assert.ok(node.polygon.every(p => Math.hypot(p.x, p.z) < 25));
  const turn = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const n = node.polygon.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const a = node.polygon[i], b = node.polygon[(i + 1) % n], c = node.polygon[j], d = node.polygon[(j + 1) % n];
    assert.ok(!(turn(a, b, c) * turn(a, b, d) < -1e-8 && turn(c, d, a) * turn(c, d, b) < -1e-8), `outline edges ${i} and ${j} cross`);
  }
});

test('a T junction keeps its through road continuous and trims only the side road', () => {
  const through = road([-100, 0], [100, 0]), side = road([0, -100], [0, 0]);
  const result = buildRoadConnections([through, side], [{ x: 0, z: 0 }]);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].kind, 'tee');
  assert.deepEqual(result.junctions[0].mainRoads, [through, through]);
  assert.equal(result.hidden.has(through), false);
  assert.ok(result.hidden.get(side)?.length);
});

test('a T junction can have its through road split into two source edges', () => {
  const west = road([-100, 0], [0, 0]), east = road([0, 0], [100, 0]), side = road([0, -100], [0, 0]);
  const result = buildRoadConnections([west, east, side], [{ x: 0, z: 0 }]);
  assert.equal(result.junctions[0].kind, 'tee');
  assert.equal(result.hidden.has(west), false);
  assert.equal(result.hidden.has(east), false);
  assert.ok(result.hidden.get(side)?.length);
});
