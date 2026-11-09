import test from 'node:test';
import assert from 'node:assert/strict';
import { carPartAim } from './carAim.js';
import { lookDir } from './aim.js';

// car at the origin facing +z (h = 0): driver's side is +x
const pose = { x: 0, z: 0, h: 0 };
const eyeAt = (x, z) => ({ x, y: 1.0, z });

test('looking at the driver door handle picks the door, elsewhere on the side does not', () => {
  // stand on the driver's side (+x), look toward -x at the handle
  const look = { x: -1, y: -0.05, z: 0 };
  assert.equal(carPartAim(eyeAt(2.2, 0), look, pose), 'doorL');
  assert.equal(carPartAim(eyeAt(2.2, 1.5), look, pose) === 'doorL', false);   // the front wing is not a door
});
test('hood and engine lid are only the front and rear panels', () => {
  assert.equal(carPartAim(eyeAt(0, 3.4), { x: 0, y: -0.3, z: -1 }, pose), 'hood');
  assert.equal(carPartAim(eyeAt(0, -3.4), { x: 0, y: -0.3, z: 1 }, pose), 'lid');
});
test('lookDir with yaw 0 looks down -z (used by the game)', () => { assert.ok(lookDir(0, 0).z < 0); });
