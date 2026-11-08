import test from 'node:test';
import assert from 'node:assert/strict';
import { aimsAt, aimsAtBox, lookDir } from './aim.js';

const eye = { x: 0, y: 1.7, z: 0 }, fwd = lookDir(0, 0);   // looks down -z
const item = { x: 0, z: -2, y: 1.2, h: 1, r: 0.4 };
test('lookDir: yaw 0 looks down -z, pitch up raises y', () => {
  assert.ok(Math.abs(fwd.z + 1) < 1e-9); assert.ok(lookDir(0, 0.5).y > 0.4);
});
test('hit: crosshair on the thing', () => assert.equal(aimsAt(eye, fwd, item, 3), true));
test('near-miss: ray passes 0.8 m to the side', () => assert.equal(aimsAt(eye, lookDir(-0.4, 0), item, 3), false));
test('small angle still hits within the radius', () => assert.equal(aimsAt(eye, lookDir(0.1, 0), item, 3), true));
test('behind the camera is never a hit', () => assert.equal(aimsAt(eye, lookDir(Math.PI, 0), item, 3), false));
test('pitch: looking up or down at your feet misses a post 2 m away', () => {
  assert.equal(aimsAt(eye, lookDir(0, 0.9), item, 3), false);
  assert.equal(aimsAt(eye, lookDir(0, -1.0), item, 3), false);
});
test('pitch down hits a floor item', () => {
  const floor = { x: 0, z: -1.5, y: 0, h: 0.3, r: 0.3 }, d = lookDir(0, -Math.atan2(1.6, 1.5));
  assert.equal(aimsAt(eye, d, floor, 4), true);
  assert.equal(aimsAt(eye, lookDir(0, 0), floor, 4), false);
});
test('reach: too far is not a hit', () => {
  assert.equal(aimsAt(eye, fwd, { ...item, z: -10 }, 3), false);
  assert.equal(aimsAt(eye, fwd, { ...item, z: -10 }, 12), true);
});
test('box: hit, miss, behind, reach', () => {
  const car = { x: 0, z: -4, y: 0, hx: 0.9, hz: 1.7, h: 2, yaw: 0 };
  assert.equal(aimsAtBox(eye, fwd, car, 6), true);
  assert.equal(aimsAtBox(eye, lookDir(0.6, 0), car, 6), false);
  assert.equal(aimsAtBox(eye, lookDir(Math.PI, 0), car, 6), false);
  assert.equal(aimsAtBox(eye, fwd, { ...car, z: -30 }, 6), false);
  assert.equal(aimsAtBox(eye, lookDir(0, 0.6), car, 6), false);   // over the roof
});
test('box yaw: a car turned 90 degrees is long across the view', () => {
  const car = { x: -3, z: 0, y: 0, hx: 0.9, hz: 1.7, h: 1.4, yaw: Math.PI / 2 };
  assert.equal(aimsAtBox({ x: 0, y: 1.0, z: 0.5 }, lookDir(Math.PI / 2, 0), car, 6), true);
});
