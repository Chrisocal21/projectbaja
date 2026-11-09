import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trunkRadius, colliderOf, createTrunkGrid } from './trunks.js';
import { scatterChunk } from './scatter.js';
import { BIOME_DEFS } from './registry.js';

test('only trees and big rocks block', () => {
  assert.equal(trunkRadius({ kind: 'bush', s: 2 }), 0);
  assert.equal(trunkRadius({ kind: 'rock', s: 0.8 }), 0);
  assert.ok(trunkRadius({ kind: 'rock', s: 1.5 }) > 1);
  assert.ok(Math.abs(trunkRadius({ kind: 'conifer', s: 1 }) - 0.34) < 1e-9);
  assert.deepEqual(colliderOf({ kind: 'conifer', x: 1, z: 2, s: 1 }, 5), [1, 2, 0.34, 99]);
  assert.equal(colliderOf({ kind: 'bush', x: 1, z: 2, s: 1 }, 5), null);
  assert.ok(colliderOf({ kind: 'rock', x: 0, z: 0, s: 2 }, 10)[3] < 99);
});
test('grid set / near / remove', () => {
  const g = createTrunkGrid(16), a = [5, 5, 0.4, 99], b = [500, 500, 0.4, 99];
  g.set('c1', [a]); g.set('c2', [b]);
  assert.deepEqual(g.near(6, 6), [a]);
  assert.deepEqual(g.near(499, 501), [b]);
  assert.equal(g.near(6, 6), g.near(7, 7), 'same cell, unchanged -> cached list');
  g.set('c1', []);
  assert.deepEqual(g.near(6, 6), []);
  assert.equal(g.size(), 1);
  g.remove('c2'); assert.equal(g.size(), 0);
});
test('grid finds neighbours across cell borders', () => {
  const g = createTrunkGrid(16), c = [17, 0.5, 0.4, 99]; g.set('k', [c]);
  assert.ok(g.near(15.9, 0.5).includes(c));
});
test('a real forest chunk yields colliders and nearby queries stay small', () => {
  const def = BIOME_DEFS.find(d => d.id === 'forest'), ctx = { weight: () => 1, height: () => 50, onRoad: () => false, trailDist: () => 99, riverDist: () => 99 };
  const items = scatterChunk(def, 12, 12, ctx), cols = items.map(i => colliderOf(i, 50)).filter(Boolean);
  assert.ok(cols.length > 50);
  const g = createTrunkGrid(); g.set('12,12', cols);
  const [x, z] = cols[0]; assert.ok(g.near(x, z).includes(cols[0]));
  assert.ok(g.near(x, z).length < cols.length / 2, 'broadphase narrows the set');
});
