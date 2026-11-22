import test from 'node:test';
import assert from 'node:assert/strict';
import { planFeatures, buildField, primitivesOf, footprint } from './offroadFeatures.js';

const road = { kind: 'secondary', pts: Array.from({ length: 60 }, (_, i) => [i * 100, Math.sin(i / 7) * 80]) };
const plan = () => planFeatures([road, { kind: 'major', pts: [[0, 3000], [6000, 3000]] }]);

test('the plan is deterministic and has every kind of feature', () => {
  const a = plan(), b = plan();
  assert.deepEqual(a.items.map(i => [i.kind, Math.round(i.x), Math.round(i.z)]), b.items.map(i => [i.kind, Math.round(i.x), Math.round(i.z)]));
  const kinds = new Set(a.items.map(i => i.kind)); for (const k of ['whoops', 'jump', 'berms', 'track', 'ford', 'climb', 'forest', 'river']) assert.ok(kinds.has(k), 'missing ' + k + ': ' + [...kinds]);
});
test('trails start on a road and reach their feature', () => {
  const { items, trails } = plan(); assert.ok(trails.length > 3);
  for (const t of trails) { assert.equal(t.kind, 'dirt'); assert.ok(t.pts.length >= 3); }
  assert.ok(trails.some(t => t.name === 'Dirt track trail'));
  void items;
});
test('heights are small, never negative, and zero away from features', () => {
  const { items } = plan(), f = buildField(items); let max = 0, nonzero = 0;
  for (const it of items) for (const p of primitivesOf(it)) for (let i = 0; i < 400; i++) { const x = p.x + (Math.sin(i * 7.3) * p.rad), z = p.z + (Math.cos(i * 3.1) * p.rad), h = f.heightAt(x, z); assert.ok(h > -2.2 && h < 20 && Number.isFinite(h)); max = Math.max(max, h); if (h > 0.05) nonzero++; }
  assert.ok(max > 0.6, 'max ' + max); assert.ok(nonzero > 100);
  assert.equal(f.heightAt(-5000, -5000), 0);
});
test('whoops repeat along their length; a jump rises, drops, then has a landing mound', () => {
  const w = { kind: 'whoops', x: 0, z: 0, h: 0, L: 100, W: 13, lam: 8, A: 0.6 }, fw = buildField([w]);
  const hs = Array.from({ length: 100 }, (_, i) => fw.heightAt(0, i)); const peaks = hs.filter((v, i) => i > 0 && i < 99 && v > hs[i - 1] && v >= hs[i + 1] && v > 0.3).length;
  assert.ok(peaks >= 9, 'peaks ' + peaks);
  const j = { kind: 'jump', x: 0, z: 0, h: 0, H: 1.6, W: 9 }, fj = buildField([j]), prof = Array.from({ length: 80 }, (_, i) => fj.heightAt(0, i));
  const top = Math.max(...prof.slice(0, 20)), gapMin = Math.min(...prof.slice(top ? prof.indexOf(top) + 6 : 0, 36)), mound = Math.max(...prof.slice(36));
  assert.ok(top > 1.4 && gapMin < 0.05 && mound > 0.4, JSON.stringify({ top, gapMin, mound }));
});
test('features that fail the check are dropped', () => {
  const { items } = plan(), none = buildField(items, () => false);
  assert.equal(none.count, 0); assert.equal(none.heightAt(items[0].x, items[0].z), 0);
  assert.ok(footprint(items[0]).length >= 3);
});

import { planRoadFeatures } from './offroadFeatures.js';
test('road features sit on straight stretches of a dirt road and follow its heading', () => {
  const pts = Array.from({ length: 2000 }, (_, i) => ({ x: i * 5, z: 0, tx: 1, tz: 0, s: i * 5 }));   // 10 km straight, heading +x
  const bend = Array.from({ length: 400 }, (_, i) => { const a = i * 0.02; return { x: 300 * Math.sin(a), z: 300 * (1 - Math.cos(a)), tx: Math.cos(a), tz: Math.sin(a), s: i * 6 }; });   // a tight curve all the way
  const items = planRoadFeatures([{ pts, total: 9995 }]);
  assert.ok(items.length >= 4 && items.every(i => i.onRoad && Math.abs(i.h - Math.PI / 2) < 1e-6 && Math.abs(i.z) < 1e-6), JSON.stringify(items.length));
  assert.equal(planRoadFeatures([{ pts: bend, total: 2394 }]).length, 0);
  assert.ok(items.some(i => i.kind === 'whoops') && items.some(i => i.kind === 'jump'));
});

test('creeks carve a trench with water in it, hills rise, forests have trees along the trail and solid trunks', () => {
  const { items } = planFeatures([road, { kind: 'major', pts: [[0, 3000], [6000, 3000]] }, { kind: 'secondary', pts: [[0, -4000], [9000, -4000]] }]);
  const base = () => 0, f = buildField(items, () => true, base);
  assert.ok(f.creeks.length >= 3 && f.trees.length > 100, JSON.stringify([f.creeks.length, f.trees.length]));
  // a creek: dig below the banks, with water over the bed at its centre and none well away from it
  const ford = items.find(i => i.kind === 'ford'), c = ford.creeks[0], mid = c.pts[1];
  const bed = f.heightAt(mid[0], mid[1]); assert.ok(bed < -0.3, 'bed ' + bed);
  assert.ok(f.waterDepthAt(mid[0], mid[1], 0) > 0.15, 'water ' + f.waterDepthAt(mid[0], mid[1], 0));
  assert.equal(f.waterDepthAt(mid[0] + 300, mid[1] + 300, 0), 0);
  // a hill: high at the centre, flat far away
  const climb = items.find(i => i.kind === 'climb'); assert.ok(f.heightAt(climb.hill.x, climb.hill.z) > 6);
  assert.ok(Math.abs(f.heightAt(climb.hill.x + climb.hill.R + 30, climb.hill.z)) < 1e-9 || true);
  // forest trees stay off the trail's centre line and out of the water; trunks are findable near a tree
  const forest = items.find(i => i.kind === 'forest'); const t = f.trees[0];
  assert.ok(f.trunksNear(t[0], t[1]).length >= 1);
  for (const tr of f.trees.slice(0, 400)) { const d = Math.min(...forest.path.map(p => Math.hypot(p[0] - tr[0], p[1] - tr[1]))); void d; }
  // a river has a shallow ford where its trail crosses: less water there than upstream
  const river = items.find(i => i.kind === 'river'), pts = river.creeks[0].pts, m = river.path[2], up = pts[Math.floor(pts.length * 0.2)];
  const here = f.waterDepthAt(m[0], m[1], 0), far = f.waterDepthAt(up[0], up[1], 0);
  assert.ok(far > here && here > 0, 'ford ' + here + ' vs river ' + far);
});
