import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestRaceRoad, raceShoulder, approachRoadPoint } from './raceFixtures.js';

test('race signs follow built roads and remain beyond the driving surface', () => {
  const road = { kind: 'major', style: { half: 6 }, pts: [{ x: 0, z: 0 }, { x: 0, z: 300 }] };
  const pose = nearestRaceRoad({ x: 30, z: 100 }, [road]);
  assert.ok(pose && pose.x === 0 && pose.z === 100);
  const network = { isNear: (x, z, pad) => Math.abs(x) <= road.style.half + pad };
  const sign = raceShoulder(pose, network, () => null, () => 12);
  assert.ok(sign && Math.abs(sign.x) > road.style.half + 2);
  assert.equal(sign.y, 12);
});

test('race signs try the other shoulder when the first is water', () => {
  const p = { x: 0, z: 0, h: 0, half: 3 };
  const sign = raceShoulder(p, { isNear: () => false }, x => x > 0 ? 0 : null, () => 1);
  assert.ok(sign.x < 0);
});

test('place signs move past nearby crossing pavement before being placed', () => {
  const p = { x: 0, z: 0, h: 0, half: 5 };
  const network = { isNear: (x, z, clearance) => x < 15 && clearance >= 5 };
  const sign = raceShoulder(p, network, () => null, () => 4, 1, 5);
  assert.equal(sign.x, 19);
});

test('town approach follows the same road 240 metres before the place', () => {
  const road = { name: 'Mex 1', style: { half: 5 }, pts: Array.from({ length: 31 }, (_, i) => ({ x: 0, z: i * 20, s: i * 20, tx: 0, tz: 1 })) };
  const hit = nearestRaceRoad({ x: 12, z: 500 }, [road]);
  const before = approachRoadPoint(hit);
  assert.equal(before.z, 260);
  assert.equal(before.half, 5);
});
