import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBody, stepBody, readBody, uprightBody } from './rigid.js';

const STEP = 1 / 120;
const dims = {
  wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0.31, 1.32, -0.15],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19] })),
};
const flat = () => 0;
const env = (height = flat, mu = 0.9) => ({ height, mu, rr: 1, ACC: 11, MAXV: 40, DRG: 0.3 * 11 / 1600 });
const run = (b, seconds, ctl, e, each) => { for (let i = 0; i < seconds / STEP; i++) { const c = typeof ctl === 'function' ? ctl(i * STEP) : ctl; stepBody(b, dims, c, e, STEP); each?.(i * STEP); } return readBody(b); };
const settled = s => Math.hypot(s.v, s.lateralV, s.vy) < 0.2 && Math.abs(s.yr) < 0.15;

test('a car dropped on flat ground settles upright on its wheels and stays put', () => {
  const b = createBody(dims, { y: 0.3 }), s = run(b, 4, { throttle: 0, brake: false, steer: 0 }, env());
  assert.ok(s.upY > 0.99 && settled(s) && Math.abs(s.y) < 0.08, JSON.stringify([s.upY, s.v, s.y]));
  assert.equal(s.contacts, 4);
});
test('full throttle accelerates in a straight line towards top speed', () => {
  const b = createBody(dims), s = run(b, 10, { throttle: 1, brake: false, steer: 0 }, env());
  assert.ok(s.v > 20 && s.v < 40, s.v); assert.ok(Math.abs(s.x) < 0.5 && s.upY > 0.99);
});
test('braking from speed stops the car, flat and straight', () => {
  const b = createBody(dims, { v: 25 }), s = run(b, 6, { throttle: 0, brake: true, steer: 0 }, env());
  assert.ok(s.v < 0.3 && s.upY > 0.98, JSON.stringify([s.v, s.upY]));
});
test('a moderate turn at moderate speed stays on four wheels and turns', () => {
  const b = createBody(dims, { v: 14 }); let minUp = 1;
  const s = run(b, 5, { throttle: 0.3, brake: false, steer: 0.12 }, env(), () => { minUp = Math.min(minUp, readBody(b).upY); });
  assert.ok(minUp > 0.93, minUp); assert.ok(Math.abs(s.h) > 0.5, 'did not turn: ' + s.h);
});
test('a car thrown onto its side comes to rest and stays there (no endless spinning)', () => {
  const b = createBody(dims, { y: 1.2, v: 8 });
  b.q.setFromEuler(new THREE.Euler(0.4, 0.5, 1.9)); b.w.set(1, 2, 3);
  const s = run(b, 25, { throttle: 0, brake: false, steer: 0 }, env());
  assert.ok(settled(s), JSON.stringify([s.v, s.lateralV, s.yr]));
});
test('a hard swerve at speed on a slope can roll the car, and it still comes to rest', () => {
  const slope = (x, z) => x * 0.35;   // tilts sideways
  const b = createBody(dims, { v: 24, h: 0.3 }); let rolled = false;
  const s = run(b, 30, t => ({ throttle: t < 4 ? 0.5 : 0, brake: t > 22, steer: t < 4 ? 0 : 0.35 }), env(slope, 1.0), () => { rolled = rolled || readBody(b).upY < 0.5; });
  assert.ok(Number.isFinite(s.x + s.y + s.z));
  assert.ok(settled(s), JSON.stringify([rolled, s.v, s.lateralV, s.yr, s.upY]));
});
test('a rolled car can be stood back up', () => {
  const b = createBody(dims, { y: 1 }); b.q.setFromEuler(new THREE.Euler(0, 0, Math.PI));
  run(b, 6, { throttle: 0, brake: false, steer: 0 }, env());
  assert.ok(readBody(b).rolled);
  uprightBody(b, dims); const s = run(b, 3, { throttle: 0, brake: false, steer: 0 }, env());
  assert.ok(s.upY > 0.98 && settled(s));
});
test('a jump lands and settles without blowing up', () => {
  const ramp = (x, z) => (z > 10 && z < 18 ? (z - 10) * 0.35 : 0);
  const b = createBody(dims, { z: 0, v: 18 }); let air = 0;
  const s = run(b, 12, { throttle: 0, brake: false, steer: 0 }, env(ramp), () => { air += readBody(b).air ? 1 : 0; });
  assert.ok(air > 20, 'never left the ground: ' + air); assert.ok(Number.isFinite(s.y) && s.upY > 0.9, JSON.stringify([s.upY, s.y]));
});
