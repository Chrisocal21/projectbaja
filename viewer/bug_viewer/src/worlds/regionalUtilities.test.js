import test from 'node:test';
import assert from 'node:assert/strict';
import { regionalUtilityPoles, utilityWireSpan, roadsideReflectors } from './regionalUtilities.js';

test('utility poles follow mapped roads beyond the shoulder and skip water', () => {
  const road = { name: 'Mex 1', style: { half: 5 }, pts: Array.from({ length: 201 }, (_, i) => ({ x: 5000, z: i * 20, tx: 0, tz: 1 })) };
  const network = { roads: [road], isNear: (x, z, pad) => Math.abs(x - 5000) <= 5 + pad };
  const poles = regionalUtilityPoles(network, (x, z) => z > 1600 && z < 2000 ? 0 : null);
  assert.ok(poles.length > 5);
  assert.ok(poles.every(p => Math.abs(p.x - 5000) > 8));
  assert.ok(poles.every(p => p.z <= 1600 || p.z >= 2000));
});

test('utility wires sag smoothly while clearing a rise between poles', () => {
  const a = { x: 0, z: 0, h: 0 }, b = { x: 0, z: 160, h: 0 };
  const terrain = (x, z) => z > 60 && z < 100 ? 2 : 0;
  const span = utilityWireSpan(a, b, 1, terrain);
  assert.equal(span.length, 9);
  assert.ok(span[4][1] < span[0][1]);
  assert.ok(span.every(([x, y, z]) => y >= terrain(x, z) + 5.5));
});

test('road reflectors stay beyond pavement and leave crossings and water clear', () => {
  const road = { name: 'Mex 1', kind: 'major', style: { half: 5 }, pts: Array.from({ length: 101 }, (_, i) => ({ x: 5000, z: i * 20, tx: 0, tz: 1 })) };
  const network = { roads: [road], isNear: (x, z, pad) => Math.abs(x - 5000) <= 5 + pad || (z > 800 && z < 1000) };
  const posts = roadsideReflectors(network, (x, z) => z > 1400 && z < 1600 ? 0 : null, () => 2);
  assert.ok(posts.length > 4);
  assert.ok(posts.every(p => Math.abs(p.x - 5000) > 8));
  assert.ok(posts.every(p => p.z <= 800 || p.z >= 1000));
  assert.ok(posts.every(p => p.z <= 1400 || p.z >= 1600));
});
