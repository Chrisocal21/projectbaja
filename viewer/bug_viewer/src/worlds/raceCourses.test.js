import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_COURSES, routeLeg, nearestOnRoads, pavedLeg, buildRaceCourses } from './raceCourses.js';

const meta = { home: [32.95, -115.55], hScale: 0.04 };   // the real border.json projection numbers
const BOUNDS = { x0: -16000, x1: 24000, z0: -7000, z1: 45000 };
const flat = { heightAt: () => 10, waterAt: () => null, bounds: BOUNDS };

test('the course list is well formed: unique ids, both series, a start, and every dirt leg has two ends', () => {
  assert.equal(new Set(RACE_COURSES.map(c => c.id)).size, RACE_COURSES.length);
  assert.ok(RACE_COURSES.some(c => c.series === 'SCORE') && RACE_COURSES.some(c => c.series === 'MDR'));
  for (const c of RACE_COURSES) {
    assert.ok(c.pts.length >= 3, c.id);
    for (const [lat, lon, m] of c.pts) { assert.ok(lat > 22 && lat < 34.6 && lon > -119.8 && lon < -109.2, `${c.id} inside the map`); assert.ok(m === undefined || m === 'D' || m === 'P'); }
  }
  for (const c of RACE_COURSES.filter(c => c.series === 'MDR')) assert.ok(c.pts.slice(1).every(p => p[2] === 'D'), c.id + ' is all dirt');
  for (const c of RACE_COURSES.filter(c => c.series === 'SCORE')) assert.ok(c.pts.some(p => p[2] === 'D') && c.pts.some(p => p[2] === 'P'), c.id + ' mixes dirt and paved');
});
test('routeLeg: a straight run over flat ground stays close to straight and ends where asked', () => {
  const r = routeLeg(flat, { x: 0, z: 0 }, { x: 6000, z: 3000 });
  assert.deepEqual(r[0], [0, 0]); assert.deepEqual(r.at(-1), [6000, 3000]);
  const len = r.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0);
  assert.ok(len < Math.hypot(6000, 3000) * 1.12, `length ${len}`);
});
test('routeLeg goes round a lake and over the lowest part of a ridge, and never through water', () => {
  const lake = { ...flat, waterAt: (x, z) => (Math.hypot(x - 3000, z) < 1200 ? 0 : null) };
  const r = routeLeg(lake, { x: 0, z: 0 }, { x: 6000, z: 0 });
  assert.ok(r.every(([x, z]) => Math.hypot(x - 3000, z) >= 1150), 'no point in the lake');
  assert.ok(r.some(p => Math.abs(p[1]) > 600), 'detoured');
  const ridge = { ...flat, heightAt: (x, z) => (Math.abs(x - 3000) < 400 && Math.abs(z) < 1800 ? 200 : 10) };   // a wall with an open end beyond z 1800
  const r2 = routeLeg(ridge, { x: 0, z: 0 }, { x: 6000, z: 0 }, { maxSlope: 0.2 });
  assert.ok(r2 && r2.some(p => Math.abs(p[1]) >= 1750), 'went round the end of the wall');
});
test('routeLeg gives up (null) when the start is walled in', () => {
  const walled = { ...flat, heightAt: (x, z) => (Math.hypot(x, z) > 800 && Math.hypot(x, z) < 1600 ? 500 : 10) };
  assert.equal(routeLeg(walled, { x: 0, z: 0 }, { x: 6000, z: 0 }, { maxSlope: 0.15 }), null);
});
test('nearestOnRoads finds the closest point on a polyline within reach, null when too far', () => {
  const roads = [{ name: 'Mex 1', pts: [[0, 0], [1000, 0]] }];
  const p = nearestOnRoads({ x: 400, z: 300 }, roads, 1000);
  assert.ok(Math.abs(p.x - 400) < 1e-9 && Math.abs(p.z) < 1e-9 && p.road === 'Mex 1');
  assert.equal(nearestOnRoads({ x: 400, z: 5000 }, roads, 1000), null);
});
test('paved race legs follow road bends instead of cutting across terrain', () => {
  const roads = [{ name: 'Mex 1', pts: [[0, 0], [500, 0], [500, 500], [1000, 500]] }];
  const route = pavedLeg({ x: 50, z: 10 }, { x: 950, z: 490 }, roads);
  assert.ok(route.some(([x, z]) => x === 500 && z === 0));
  assert.ok(route.some(([x, z]) => x === 500 && z === 500));
  assert.deepEqual(route[0], [50, 0]);
  assert.deepEqual(route.at(-1), [950, 500]);
});
test('an unroutable dirt leg does not create a phantom paved shortcut', () => {
  const blocked = { ...flat, waterAt: () => 0 };
  const course = { id: 'blocked', series: 'SCORE', name: 'Blocked', kind: 'point', pts: [[32.95, -115.55], [32.94, -115.54, 'D'], [32.93, -115.53, 'P']] };
  const result = buildRaceCourses({ meta, ground: blocked, roads: [] }, [course]);
  assert.equal(result.courses.length, 0);
  assert.equal(result.dirtRoads.length, 0);
});
test('buildRaceCourses: every course gets a start, a closed MDR loop and dirt roads that begin and end on the ground it was given', () => {
  const r = buildRaceCourses({ meta, ground: flat, roads: [] });
  assert.equal(r.courses.length, RACE_COURSES.length);
  for (const c of r.courses) { assert.ok(Number.isFinite(c.start.x) && Number.isFinite(c.start.h), c.id); assert.ok(c.line.length >= 3); }
  const mdr = r.courses.find(c => c.id === 'mdr-ocotillo');
  assert.ok(mdr.dirtLength > 4000 && mdr.pavedLength === 0, 'an all-dirt loop, a few km round: ' + mdr.dirtLength);
  assert.deepEqual(mdr.line[0], mdr.line.at(-1), 'closed');
  assert.ok(r.dirtRoads.length > 10 && r.dirtRoads.every(d => d.kind === 'dirt' && d.pts.length >= 2));
});

import { pointsAlong } from './raceCourses.js';
test('pointsAlong puts a point every spacing metres, facing the way the line runs, across corners too', () => {
  const p = pointsAlong([[0, 0], [1000, 0], [1000, 1000]], 400);
  assert.equal(p.length, 5);   // 400, 800, then 1200 (200 into the second leg), 1600 and 2000 (the end)
  assert.ok(Math.abs(p[0].x - 400) < 1e-6 && Math.abs(p[0].h - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(p[2].x - 1000) < 1e-6 && Math.abs(p[2].z - 200) < 1e-6 && Math.abs(p[2].h) < 1e-9);
  assert.deepEqual(pointsAlong([[0, 0], [100, 0]], 400), []);
});
