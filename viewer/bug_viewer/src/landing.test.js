import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP, createVehicleState, stepSuspension } from './suspension.js';

const dims = {
  wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0, 1.25, 0],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({
    name, radius: 0.38, halfWidth: 0.14,
    center: [(name.endsWith('L') ? 1 : -1) * 0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19],
  })),
};
const flat = () => 0;

/** Drop the car from a height with the given attitude and rates, run 6 s, report the outcome. */
function drop({ h = 3, vy = 0, pitch = 0, roll = 0, pitchV = 0, rollV = 0, yr = 0, v = 0, lat = 0 }) {
  const st = createVehicleState();
  Object.assign(st, { x: 0, z: 0, y: h, vy, pitch, roll, pitchV, rollV, yr, v, lateralV: lat });
  let maxPitch = 0, maxRoll = 0, peakVy = 0;
  for (let i = 0; i < 6 / STEP; i++) {
    stepSuspension(st, dims, STEP, flat);
    maxPitch = Math.max(maxPitch, Math.abs(st.pitch)); maxRoll = Math.max(maxRoll, Math.abs(st.roll));
    peakVy = Math.min(peakVy, st.vy);
    assert.ok(Number.isFinite(st.y) && Number.isFinite(st.pitch) && Number.isFinite(st.roll), 'state went non-finite');
  }
  return { st, maxPitch, maxRoll, peakVy, upright: Math.cos(st.pitch) * Math.cos(st.roll) > 0.8 };
}

test('level drop settles upright', () => { const r = drop({ h: 2.5 }); assert.ok(r.upright, JSON.stringify([r.st.pitch, r.st.roll])); assert.ok(Math.abs(r.st.pitch) < 0.08); });
test('hard nose-first landing at speed dives hard and scrubs most of the speed', () => {
  const r = drop({ h: 3, vy: -4, v: 25, pitch: -0.5, pitchV: -1.5 });
  assert.ok(r.maxPitch > 0.8 && r.st.v < 12, JSON.stringify([r.maxPitch, r.st.v]));
});
test('moderate nose-first landing tips forward and scrubs speed but recovers', () => {
  const r = drop({ h: 3, v: 20, pitch: -0.4, pitchV: -0.6 });
  assert.ok(r.maxPitch > 0.6 && r.upright && r.st.v < 12, JSON.stringify([r.maxPitch, r.st.v, r.st.pitch]));
});
test('gentle nose-down landing recovers', () => { const r = drop({ h: 1.2, v: 10, pitch: -0.15 }); assert.ok(r.upright, JSON.stringify([r.st.pitch, r.st.roll])); });
test('sideways landing with roll rate rolls the car right over', () => {
  const r = drop({ h: 3, v: 15, lat: 5, roll: 0.5, rollV: 2.5 });
  assert.ok(r.maxRoll > 2.5, 'max roll ' + r.maxRoll);
});
test('slightly crooked landing stays on its wheels', () => { const r = drop({ h: 1.5, v: 15, lat: 3, roll: 0.2 }); assert.ok(r.upright && r.maxRoll < 0.4, JSON.stringify([r.st.pitch, r.st.roll])); });
