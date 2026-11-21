import test from 'node:test';
import assert from 'node:assert/strict';
import { dropSpot } from './dropSpot.js';

const car = { x: 0, z: 0, h: 0, width: 1.6, length: 4.1 };
const outside = p => Math.abs(p.x) >= 0.8 + 0.35 - 1e-9 || Math.abs(p.z) >= 2.05 + 0.35 - 1e-9;

test('a part never lands under the car, even when you face the car', () => {
  const p = dropSpot({ x: 1.4, z: 0 }, { x: -1, z: 0 }, car);   // standing beside the car, looking at it
  assert.ok(outside(p), JSON.stringify(p));
});
test('it lands in front of you when that is clear', () => {
  const p = dropSpot({ x: 5, z: 5 }, { x: 1, z: 0 }, null);
  assert.ok(p.x > 5 && Math.abs(p.z - 5) < 0.01);
});
test('parts already on the ground are not landed on', () => {
  const first = dropSpot({ x: 5, z: 5 }, { x: 1, z: 0 }, null);
  const second = dropSpot({ x: 5, z: 5 }, { x: 1, z: 0 }, null, [first]);
  assert.ok(Math.hypot(second.x - first.x, second.z - first.z) >= 0.8);
});
test('works with a rotated car', () => {
  const rc = { ...car, h: Math.PI / 2 };
  const p = dropSpot({ x: 0, z: 1.4 }, { x: 0, z: -1 }, rc);
  const c = Math.cos(rc.h), s = Math.sin(rc.h), lx = p.x * c - p.z * s, lz = p.x * s + p.z * c;
  assert.ok(Math.abs(lx) >= 1.15 - 1e-9 || Math.abs(lz) >= 2.4 - 1e-9);
});

test('with several cars, a part lands under none of them', () => {
  const cars = [{ x: 0, z: 0, h: 0, width: 1.6, length: 4.1 }, { x: 3, z: 0, h: 0, width: 1.6, length: 4.1 }];
  const p = dropSpot({ x: 1.5, z: 0 }, { x: 1, z: 0 }, cars);   // standing in the gap between two cars
  for (const c of cars) assert.ok(Math.abs(p.x - c.x) >= 0.8 + 0.35 - 1e-9 || Math.abs(p.z - c.z) >= 2.05 + 0.35 - 1e-9);
});
