import test from 'node:test';
import assert from 'node:assert/strict';
import { regionalDirtRoads } from './regionalRoads.js';

test('dirt branches attach to a mapped road and avoid water', () => {
  const roads = [{ name: 'Mex 1', kind: 'secondary', pts: [[0, 0], [200, 0], [400, 0], [600, 0], [800, 0], [1000, 0]] }];
  const border = { bounds: { x0: -2000, x1: 2000, z0: -2000, z1: 2000 }, heightAt: () => 0, waterAt: (x, z) => z > 300 ? 0 : null };
  const branches = regionalDirtRoads(roads, border);
  assert.ok(branches.length >= 1);
  for (const branch of branches) {
    assert.equal(branch.kind, 'dirt');
    assert.ok(roads[0].pts.some(p => p[0] === branch.pts[0][0] && p[1] === branch.pts[0][1]));
    assert.ok(branch.pts.every(([x, z]) => border.waterAt(x, z) == null));
  }
});
