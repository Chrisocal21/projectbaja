import test from 'node:test';
import assert from 'node:assert/strict';
import { wallSpot, HANG_Y } from './wallhang.js';

const G = { x: 0, z: 0, rot: 0, y: 0 };
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('back wall: stand near it, it hangs in front of you facing the room', () => {
  const s = wallSpot(G, 2, -5.2);
  assert.equal(s.wall, 'back'); assert.ok(near(s.x, 2)); assert.ok(s.z < -5.9 && s.z > -6); assert.equal(s.y, HANG_Y); assert.equal(s.ry, 0);
});
test('side walls face into the room', () => {
  assert.equal(wallSpot(G, -6.3, 1).ry, Math.PI / 2);
  assert.equal(wallSpot(G, 6.3, 1).ry, -Math.PI / 2);
});
test('middle of the room: nothing in reach', () => assert.equal(wallSpot(G, 0, 0), null));
test('outside the garage: nothing', () => assert.equal(wallSpot(G, 9, 0), null));
test('never across the roller door', () => assert.equal(wallSpot(G, 0, 5.4), null));
test('front wall beside the door is fine', () => assert.equal(wallSpot(G, 5, 5.4).wall, 'front'));
test('stays off the corner', () => { const s = wallSpot(G, 6.9, -5.9); assert.ok(Math.abs(s.x) <= 6.6 + 0.04); });
test('rotated garage: positions rotate with it', () => {
  const R = { x: 10, z: 20, rot: Math.PI / 2, y: 0 }, s = wallSpot(R, 10, 20);
  assert.equal(s, null);
});
