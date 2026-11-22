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
    if (branch.joins) {
      assert.ok(branch.joins.pts.some(p => Math.hypot(p[0] - branch.pts[0][0], p[1] - branch.pts[0][1]) < 0.001));
    } else {
      assert.equal(branch.pts[0][1], 0);
      assert.ok(Math.abs(branch.pts.at(-1)[1]) < 0.001);
    }
    assert.ok(branch.pts.every(([x, z]) => border.waterAt(x, z) == null));
  }
});

test('wash routes have a sandy bed and vehicle-scale ridges, with level ground at the highway', async () => {
  const { makeBadlands } = await import('./badlands.js');
  const { makeHighways } = await import('./highways.js');
  const roads = [{ kind: 'major', pts: [[-2000, 0], [0, 0], [2200, 0]] }];
  const border = { bounds: { x0: -3000, x1: 3000, z0: -2000, z1: 2000 }, waterAt: () => null, heightAt: () => 0 };
  const routes = regionalDirtRoads(roads, border), land = makeBadlands(routes, roads, border, []);
  assert.ok(land.count >= 3);
  let peak = 0, bed = 0;
  for (let x = -2000; x < 2200; x += 8) {
    assert.equal(land.heightAt(x, 0), 0);
    for (let z = -700; z <= 700; z += 8) {
      const h = land.heightAt(x, z);
      peak = Math.max(peak, h); bed = Math.min(bed, h);
    }
  }
  assert.ok(peak >= 15 && peak < 36 && bed < -1, JSON.stringify({ peak, bed }));
  const hw = makeHighways([...roads, ...routes], land.heightAt);
  for (const road of hw.roads.filter(r => r.name === 'Desert wash trail')) {
    for (const p of [road.pts[0], road.pts.at(-1)]) {
      assert.ok(hw.pavedAt(p.x, p.z)); assert.ok(Math.abs(p.hs) < 0.01);
    }
  }
});
