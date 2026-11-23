import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, findRoute, routeLength, offRoute } from './routing.js';
import { regionAt } from './region.js';
const line = (x0, z0, x1, z1, n = 20) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n }));
test('a route follows the roads and joins roads that cross, and gives up when they do not connect', () => {
  const g = buildGraph([line(0, 0, 1000, 0), line(500, -10, 500, 800), line(5000, 0, 6000, 0)]);
  const r = findRoute(g, 10, 5, 520, 790); assert.ok(r); assert.ok(routeLength(r) < 1400 && routeLength(r) > 1250, 'about 500 along then 800 up: ' + routeLength(r));
  assert.ok(offRoute(r, 250, 3) < 10); assert.ok(offRoute(r, 250, 400) > 200);
  assert.equal(findRoute(g, 10, 5, 5500, 5), null, 'the far road is not connected'); assert.equal(findRoute(g, 3000, 3000, 10, 5), null, 'no road near the start');
});
test('regions: states and countries from lat and lon', () => {
  const at = (lat, lon) => regionAt(lat, lon).name;
  assert.equal(at(32.628, -115.454), 'Baja California'); assert.equal(at(32.792, -115.563), 'California'); assert.equal(at(32.693, -114.627), 'Arizona');
  assert.equal(at(31.86, -116.606), 'Baja California'); assert.equal(at(24.133, -110.3), 'Baja California Sur'); assert.equal(at(27.96, -114.056), 'Baja California Sur');
  assert.equal(at(31.0, -113.0), 'Sonora'); assert.equal(regionAt(34.05, -118.24).country, 'USA'); assert.equal(regionAt(32.5, -116.9).country, 'MEX');
});
