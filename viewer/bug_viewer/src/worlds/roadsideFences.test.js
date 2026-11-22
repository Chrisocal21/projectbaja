import test from 'node:test';
import assert from 'node:assert/strict';
import { ranchFenceSites } from './roadsideFences.js';

test('ranch fence stays clear of pavement and is skipped on water or steep ground', () => {
  const road = { name: 'Mex 1', kind: 'major', style: { half: 5 }, pts: Array.from({ length: 51 }, (_, i) => ({ x: 0, z: i * 20, s: i * 20, tx: 0, tz: 1 })) };
  const network = { roads: [road], isNear: (x, z, pad) => Math.abs(x) < 5 + pad };
  const sites = ranchFenceSites([{ name: 'Loreto' }], () => ({ x: 0, z: 600 }), network, () => null, () => 2);
  assert.equal(sites.length, 1);
  assert.ok(sites[0].posts.every(p => !network.isNear(p.x, p.z, 8)));
  assert.equal(ranchFenceSites([{ name: 'Loreto' }], () => ({ x: 0, z: 600 }), network, () => 0, () => 2).length, 0);
  assert.equal(ranchFenceSites([{ name: 'Loreto' }], () => ({ x: 0, z: 600 }), network, () => null, (x, z) => z / 3).length, 0);
});
