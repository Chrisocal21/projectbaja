import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTrailGrid, findTrail, dirtRuns, length } from './trailRoutes.js';

// a flat plain with a ridge across the middle and one low pass (a wash) through it; roads run along both edges
const ridge = (x, z) => 40 * Math.exp(-(((z - 6000) / 500) ** 2)) * (1 - 0.95 * Math.exp(-(((x - 9000) / 700) ** 2))) + 10;
const border = { bounds: { x0: 0, x1: 18000, z0: 0, z1: 12000 }, heightAt: ridge, waterAt: () => null };
const roads = [{ kind: 'major', pts: [[0, 1200], [18000, 1200]] }, { kind: 'major', pts: [[0, 10800], [18000, 10800]] }];

test('a trail between two roads takes the low pass, not over the ridge', () => {
  const g = makeTrailGrid(border, roads);
  const cells = findTrail(g, g.cellOf(8000, 1200), g.cellOf(9500, 10800));
  assert.ok(cells && cells.length > 100);
  const mid = cells.map(k => [g.x0 + ((k % g.nx) + 0.5) * g.cell, g.z0 + (((k / g.nx) | 0) + 0.5) * g.cell]).filter(p => Math.abs(p[1] - 6000) < 120);
  assert.ok(mid.length && mid.every(p => Math.abs(p[0] - 9000) < 1000), JSON.stringify(mid.slice(0, 3)));
});

test('only the off-road stretch becomes a dirt road, and it starts and ends on a road', () => {
  const g = makeTrailGrid(border, roads), cells = findTrail(g, g.cellOf(8000, 1200), g.cellOf(9500, 10800));
  const runs = dirtRuns(g, cells, 1000);
  assert.ok(runs.length >= 1);
  const r = runs.reduce((a, b) => length(b) > length(a) ? b : a);
  assert.ok(length(r) > 8000);
  assert.ok(Math.abs(r[0][1] - 1200) < 140 && Math.abs(r.at(-1)[1] - 10800) < 140);
});

test('water blocks a trail', () => {
  const wet = { ...border, waterAt: (x, z) => (z > 5000 && z < 7000 ? 0 : null) };
  const g = makeTrailGrid(wet, roads);
  assert.equal(findTrail(g, g.cellOf(8000, 1200), g.cellOf(9500, 10800)), null);
});
