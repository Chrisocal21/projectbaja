import test from 'node:test';
import assert from 'node:assert/strict';
import { steerAssist, speedFov } from './handling.js';
import { createBody, stepBody, readBody } from './rigid.js';

const dims = { wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0.31, 1.32, -0.15],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19] })) };
const env = { height: () => 0, mu: 1.08, rr: 1, ACC: 11, MAXV: 40, DRG: 0.0019 };
const run = (assist, v0 = 25) => {
  const b = createBody(dims, { v: v0 }); let h0 = 0, maxYaw = 0, steer = 0;
  for (let i = 0; i < 8 * 120; i++) {
    const t = i / 120, s = readBody(b), want = t < 1.2 ? 0.42 * Math.min(1, t / 0.2) : 0;   // hard left, then hands off
    const extra = assist ? steerAssist(s.lateralV, s.v, want / 0.42) : 0;
    steer += ((want + extra) - steer) * Math.min(1, 10 / 120);
    stepBody(b, dims, { throttle: 0.2, brake: false, steer: steer }, env, 1 / 120); maxYaw = Math.max(maxYaw, Math.abs(readBody(b).yr));
  }
  const s = readBody(b); return { yr: s.yr, lat: s.lateralV, v: s.v, upY: s.upY };
};
test('without help a hard flick at speed leaves the car sliding; with help it straightens out', () => {
  const free = run(false), aided = run(true);
  console.log('hands off after 8 s -> unaided', JSON.stringify(free), 'aided', JSON.stringify(aided));
  assert.ok(Math.abs(aided.yr) < 0.25 && Math.abs(aided.lat) < 1.5 && aided.upY > 0.95, JSON.stringify(aided));
});
test('the help vanishes when you steer hard, so full lock still slides', () => {
  assert.ok(Math.abs(steerAssist(6, 25, 1)) < 1e-9 && Math.abs(steerAssist(6, 25, 0)) > 0.1);
  assert.equal(steerAssist(6, 2, 0), 0);   // not at a crawl
});
test('field of view widens with speed, capped', () => { assert.ok(speedFov(60, 0) === 60 && speedFov(60, 40) > 70 && speedFov(60, 90) < 76); });
