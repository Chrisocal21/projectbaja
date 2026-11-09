import test from 'node:test';
import assert from 'node:assert/strict';
import { BIOME_DEFS } from './registry.js';
import { createBiomes, regionWeight, edgeRise } from './index.js';
import { hash2, vnoise, fbm } from './noise.js';
import { scatterChunk, CHUNK } from './scatter.js';
import { nearestGrid, gradeProfile, runningMin, fordWindow, shapeRiver, trailProfile, ribbonStrip } from './pathmath.js';
import { makePath, SURFACES } from '../kit.js';

const bio = createBiomes();

test('noise is deterministic and in range', () => {
  assert.equal(hash2(3, 4, 5), hash2(3, 4, 5));
  for (let i = 0; i < 200; i++) { const v = fbm(i * 3.7, i * 1.3, 2), n = vnoise(i * 0.31, i * 0.77, 1); assert.ok(v >= 0 && v <= 1 && n >= 0 && n <= 1); }
});

test('registry: every biome has the data the system needs, and uses real surfaces', () => {
  const ids = new Set();
  for (const d of BIOME_DEFS) {
    assert.ok(!ids.has(d.id)); ids.add(d.id);
    assert.ok(d.name && d.region.r > 0 && d.height && d.ground && Array.isArray(d.scatter));
    for (const k of [d.ground.base, d.ground.steep.key, ...d.ground.patches.map(p => p.key)]) assert.ok(SURFACES[k], 'unknown surface ' + k);
    for (const r of d.scatter) { assert.ok(['conifer', 'broadleaf', 'bush', 'rock'].includes(r.kind)); assert.ok(r.tints.length && r.density > 0); }
  }
  assert.ok(ids.has('grassland') && ids.has('forest'));
});

test('registry: the two biomes do not overlap each other or the map centre', () => {
  const [a, b] = BIOME_DEFS.map(d => d.region);
  assert.ok(Math.hypot(a.cx - b.cx, a.cz - b.cz) > a.r + b.r);
  for (const d of BIOME_DEFS) assert.equal(regionWeight(d, 0, 0), 0);
});

test('region weight is 1 at the heart, 0 far away, and in between at the rim', () => {
  const g = BIOME_DEFS[0];
  assert.equal(regionWeight(g, g.region.cx, g.region.cz), 1);
  assert.equal(regionWeight(g, g.region.cx + g.region.r * 2, g.region.cz), 0);
  let mid = false;
  for (let x = g.region.cx; x < g.region.cx + g.region.r * 1.3; x += 10) { const w = regionWeight(g, x, g.region.cz); if (w > 0.05 && w < 0.95) mid = true; }
  assert.ok(mid);
});

test('shape: base terrain untouched outside, biome height inside, mountain peaks above the grassland', () => {
  assert.equal(bio.shape(0, 0, 12.5), 12.5);
  const f = BIOME_DEFS[1].region, g = BIOME_DEFS[0].region;
  const peak = bio.shape(f.cx, f.cz, 0), flat = bio.shape(g.cx, g.cz, 0);
  assert.ok(peak > 120, 'forest mountain has a real peak: ' + peak);
  assert.ok(flat > -10 && flat < 30, 'grassland is gentle: ' + flat);
  assert.equal(bio.shape(f.cx, f.cz, 7, 0), 7);
  assert.ok(edgeRise(2990, 0) > edgeRise(2000, 0));
});

test('surface: grassland is grass, forest steep ground is rock, outside is null', () => {
  const g = BIOME_DEFS[0].region, f = BIOME_DEFS[1].region;
  const keys = new Set();
  for (let i = 0; i < 300; i++) keys.add(bio.surface(g.cx + (i % 20) * 12 - 120, g.cz + Math.floor(i / 20) * 12 - 80, 0.05));
  assert.ok(keys.has('meadow'));
  for (const k of keys) assert.ok(['meadow', 'dryGrass', 'looseDirt'].includes(k));
  assert.equal(bio.surface(f.cx + 5, f.cz + 5, 0.9), 'rock');
  assert.equal(bio.surface(0, 0, 0), null);
  assert.ok(bio.any(f.cx, f.cz) === 1 && bio.any(0, 0) === 0);
});

test('forest has a trail that crosses its river at a ford, starting on the highway side', () => {
  assert.ok(bio.trails.length >= 1 && bio.rivers.length >= 1);
  const t = bio.trails[0], rv = bio.rivers[0];
  let crossing = Infinity;
  for (const p of t.path.pts) crossing = Math.min(crossing, rv.near(p.x, p.z, 50).d);
  assert.ok(crossing < 3, 'trail meets river: ' + crossing);
  assert.ok(t.path.pts[0].x < 950);
  assert.ok(bio.riverDist(1600, 2300) < 3);
  assert.ok(bio.trailDist(1600, 2300) < 3);
  assert.equal(bio.riverDist(0, 0), Infinity);
});

test('nearestGrid finds the true nearest point', () => {
  const path = makePath([[0, 0], [100, 0], [200, 60]], false, 2), q = nearestGrid(path.pts, 30);
  for (const [x, z] of [[50, 10], [150, 40], [-5, 3], [199, 70]]) {
    let best = Infinity;
    for (const p of path.pts) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
    assert.ok(Math.abs(q(x, z, 80).d - best) < 1e-9);
  }
  assert.equal(q(1000, 1000, 50).i, -1);
});

test('gradeProfile smooths, runningMin never rises', () => {
  const g = gradeProfile([0, 10, 0, 10, 0, 10, 0, 10, 0, 10], 2);
  assert.ok(Math.max(...g) - Math.min(...g) < 10);
  const m = runningMin([5, 6, 3, 9, 4, 1, 8]);
  for (let i = 1; i < m.length; i++) assert.ok(m[i] <= m[i - 1]);
});

test('ford window: 1 at the ford, 0 well away', () => {
  assert.equal(fordWindow(100, 100), 1);
  assert.equal(fordWindow(140, 100), 0);
  const e = fordWindow(118, 100);
  assert.ok(e > 0 && e < 1);
});

test('river water flows downhill, bed is below water, ford bed is shallow', () => {
  const rv = bio.rivers[0], pts = rv.path.pts;
  shapeRiver(rv.path, (x, z) => 100 - x * 0.05 + 3 * Math.sin(z * 0.05), { depth: 1.6, fordPts: rv.fords });
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].wl <= pts[i - 1].wl + 1e-9);
  const ford = pts.find(p => p.ford === 1), deep = pts.find(p => p.ford === 0);
  assert.ok(ford && deep);
  assert.ok(Math.abs(ford.wl - ford.bed - 0.45) < 1e-9);
  assert.ok(Math.abs(deep.wl - deep.bed - 1.6) < 1e-9);
});

test('trail profile dips onto the river bed at the crossing and ties to the road at the start', () => {
  const rv = bio.rivers[0], t = bio.trails[0];
  shapeRiver(rv.path, () => 50, { fordPts: rv.fords });
  const rn = (x, z) => { const q = rv.near(x, z, 60); return q.i >= 0 ? { d: q.d, bed: rv.path.pts[q.i].bed } : null; };
  trailProfile(t.path, () => 60, { riverNear: rn, startTie: 33 });
  assert.ok(Math.abs(t.path.pts[0].hs - 33) < 1e-6);
  const mid = t.path.pts.reduce((b, p) => (rv.near(p.x, p.z, 50).d < rv.near(b.x, b.z, 50).d ? p : b));
  assert.ok(mid.hs < 52, 'dips to the ford bed: ' + mid.hs);
  assert.ok(Math.abs(t.path.pts[t.path.pts.length - 1].hs - 60) < 1);
});

test('scatter: deterministic, respects rules, keeps off trails and rivers', () => {
  const def = BIOME_DEFS[1], ctx = { weight: () => 1, height: (x) => 50 + 0.01 * x, onRoad: () => false, trailDist: x => (x < 0 ? 0 : 99), riverDist: () => 99 };
  const a = scatterChunk(def, 10, 12, ctx), b = scatterChunk(def, 10, 12, ctx);
  assert.deepEqual(a, b);
  assert.ok(a.length > 20, 'a forest chunk is full: ' + a.length);
  for (const p of a) { assert.ok(p.x >= 10 * CHUNK && p.x < 11 * CHUNK && p.z >= 12 * CHUNK && p.z < 13 * CHUNK); assert.ok(p.s > 0); }
  assert.equal(scatterChunk(def, -3, 12, ctx).length, 0);
  assert.equal(scatterChunk(def, 10, 12, { ...ctx, weight: () => 0 }).length, 0);
  const high = scatterChunk(def, 10, 12, { ...ctx, height: () => 400 }).filter(p => p.kind === 'conifer');
  assert.equal(high.length, 0, 'no conifers above the treeline');
});

test('scatter: forest is much denser than grassland, grassland trees are few', () => {
  const ctx = { weight: () => 1, height: () => 20, onRoad: () => false, trailDist: () => 99, riverDist: () => 99 };
  const count = (d, kind) => { let n = 0; for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) n += scatterChunk(d, i, j, ctx).filter(p => p.kind === kind).length; return n; };
  const trees = d => count(d, 'conifer') + count(d, 'broadleaf');
  assert.ok(trees(BIOME_DEFS[1]) > trees(BIOME_DEFS[0]) * 8);
  assert.ok(count(BIOME_DEFS[1], 'bush') > count(BIOME_DEFS[0], 'bush'));
});

test('ribbonStrip builds a valid strip', () => {
  const path = makePath([[0, 0], [60, 0]], false, 2), s = ribbonStrip(path.pts, 5, () => 3, 2, 2);
  assert.equal(s.pos.length / 3, Math.ceil(path.pts.length / 2) * 3);
  assert.ok(s.idx.every(i => i < s.pos.length / 3));
  assert.equal(s.pos[1], 3);
});
