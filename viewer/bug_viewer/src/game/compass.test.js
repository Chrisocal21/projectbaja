import test from 'node:test'; import assert from 'node:assert/strict';
import { bearingOf, bearingFromYaw, compassPoint, bearingTo, relative, discovered, newlyDiscovered } from './compass.js';
const r = x => Math.round(x * 1e6) / 1e6;
test('bearing: north is -z, east is +x', () => {
  assert.equal(r(bearingOf(0, -1)), 0); assert.equal(r(bearingOf(1, 0)), 90); assert.equal(r(bearingOf(0, 1)), 180); assert.equal(r(bearingOf(-1, 0)), 270);
});
test('yaw -> bearing matches the facing vector (forward = (sin yaw, cos yaw))', () => {
  for (const y of [0, 0.7, 2, 4]) assert.equal(r(bearingFromYaw(y)), r(bearingOf(Math.sin(y), Math.cos(y))));
});
test('8-way points', () => {
  assert.deepEqual([0, 44, 46, 90, 135, 180, 225, 270, 315, 359].map(compassPoint), ['N', 'NE', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']);
});
test('real world: Dry Wells is south-east of the garage, dunes are west', () => {
  const dw = bearingTo(0, 0, 1360, 600), du = bearingTo(0, 0, -1980, 500);
  assert.ok(dw > 90 && dw < 180); assert.ok(du > 180 && du < 270);
});
test('relative angle is signed, + to the right', () => { assert.equal(relative(0, 90), 90); assert.equal(relative(350, 10), 20); assert.equal(relative(10, 350), -20); });
test('discovery: garage known, only on the pad / road in front, additive state', () => {
  const places = [{ id: 'garage', x: 0, z: 0, r: 30 }, { id: 'barn', x: -960, z: 950, r: 22 }, { id: 'lot', x: 1380, z: 648, r: 38 }];
  assert.deepEqual([...discovered(undefined)], ['garage']); assert.deepEqual([...discovered({ cleared: [] })], ['garage']);
  assert.deepEqual(newlyDiscovered({}, -960, 950 - 26, places), ['barn']);        // on the dirt road 26 m in front of the barn
  assert.deepEqual(newlyDiscovered({}, 1380, 648 + 48, places), ['lot']);        // on the street 48 m from Al's centre
  assert.deepEqual(newlyDiscovered({}, -960, 950 - 150, places), []);             // 150 m away: no
  assert.deepEqual(newlyDiscovered({}, -960, 950 - 60, places), []);              // next road over / across the field: no
  assert.deepEqual(newlyDiscovered({ discovered: ['barn'] }, -960, 950, places), []);
  assert.deepEqual(newlyDiscovered({}, 0, 0, [{ id: 'x', x: 40, z: 0 }]), ['x']); // no pad radius: fallback 50 m
});
