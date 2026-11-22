import test from 'node:test';
import assert from 'node:assert/strict';
import { createBody, stepBody, readBody } from './rigid.js';
import { DRIFT_BASELINE, BUGGY, OFFROAD_TRUCK } from './handlingProfiles.js';

const STEP = 1 / 120;
const mounts = [['FL', 0.96, 1.61], ['FR', -0.96, 1.61], ['RL', 0.94, -1.61], ['RR', -0.94, -1.61]].map(([name, x, z]) => ({ name, radius: 0.51, center: [x, 0.513, z] }));
const truck = { wheelbase: 3.22, track: 1.92, offroad: true, lift: 0, bellyHeight: 0.36, cabEye: [-0.4, 1.68, 0.12], mass: 2200, cgY: 0.85, cgFromRear: 1.9, mounts };
const highSpeedTurn = handling => {
  const dims = { ...truck, handling }, b = createBody(dims, { v: 38 }), env = { height: () => 0, mu: 1.4, rr: 1, ACC: 11, MAXV: 60, DRG: 0.3 * 11 / 1600 };
  let minUp = 1, peak = 0;
  for (let i = 0; i < 4 / STEP; i++) { stepBody(b, dims, { throttle: 0.35, brake: false, steer: 0.08 }, env, STEP); const s = readBody(b); minUp = Math.min(minUp, s.upY); peak = Math.max(peak, Math.abs(s.lateralV)); }
  return { minUp, peak };
};
test('the saved drift baseline is the old loose balance (a truck at 38 m/s with a little steering spins or rolls)', () => {
  assert.deepEqual([DRIFT_BASELINE.fs, DRIFT_BASELINE.rs, DRIFT_BASELINE.rc, DRIFT_BASELINE.rcHigh, DRIFT_BASELINE.rsHigh], [0.14, 0.14, 0.95, 0.95, 0.14]);
  const r = highSpeedTurn(DRIFT_BASELINE); assert.ok(r.minUp < 0.5 || r.peak > 8, JSON.stringify(r));
});
test('the off-road truck profile keeps a truck planted at 38 m/s: upright, little sideways slide', () => {
  const r = highSpeedTurn(OFFROAD_TRUCK); assert.ok(r.minUp > 0.9 && r.peak < 3, JSON.stringify(r));
});
test('the buggy profile sits between the baseline and the truck', () => { assert.ok(BUGGY.rcHigh > DRIFT_BASELINE.rcHigh && BUGGY.rcHigh < OFFROAD_TRUCK.rcHigh && BUGGY.rsHigh < DRIFT_BASELINE.rsHigh); assert.equal(BUGGY.rc, DRIFT_BASELINE.rc);   /* slow-speed feel unchanged for the buggy */ });
