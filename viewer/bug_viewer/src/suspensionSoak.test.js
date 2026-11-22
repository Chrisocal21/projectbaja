import test from 'node:test';
import assert from 'node:assert/strict';
import { createBody, stepBody, readBody } from './rigid.js';

// A trophy-truck-style long-travel suspension leaves the body nearly still over whoops while the wheels do the moving (see the reference video frames).
const STEP = 1 / 120;
const base = { wheelbase: 3.1, track: 1.8, offroad: true, lift: 0, bellyHeight: 0.34, cabEye: [0.4, 1.55, -0.05], mass: 2400, cgY: 0.8,
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.45, center: [name.endsWith('L') ? 0.9 : -0.9, 0.45, name.startsWith('F') ? 1.5 : -1.6] })) };
const whoops = (lam, A) => (x, z) => z < 20 || z > 140 ? 0 : A * (0.5 - 0.5 * Math.cos(2 * Math.PI * (z - 20) / lam)) * Math.min(1, (z - 20) / 12) * Math.min(1, (140 - z) / 12);
function bodyHeave(dims, v, A) {
  const b = createBody(dims, { v }), env = { height: whoops(8, A), mu: 1.2, rr: 1, ACC: 11, MAXV: 60, DRG: 0.3 * 11 / 1600 };
  let lo = 1e9, hi = -1e9, travel = 0;
  for (let i = 0; i < 12 / STEP; i++) {
    stepBody(b, dims, { throttle: 0.5, brake: false, steer: 0 }, env, STEP); const s = readBody(b);
    if (s.z > 75 && s.z < 130) { lo = Math.min(lo, s.y); hi = Math.max(hi, s.y); for (const t of b.travel) travel = Math.max(travel, Math.abs(t)); }
    if (s.z > 132) break;
  }
  return { heave: hi - lo, travel };
}
test('long-travel suspension keeps the body quiet over whoops while the wheels work', () => {
  const long = bodyHeave({ ...base, longTravel: true }, 28, 0.4), stock = bodyHeave(base, 28, 0.4);
  assert.ok(long.heave < 0.15, 'body moved ' + long.heave + ' m over 0.4 m whoops');
  assert.ok(long.travel > 0.25, 'wheels barely moved: ' + long.travel);
  assert.ok(long.heave < stock.heave * 0.5, JSON.stringify([long, stock]));
});
test('even the biggest whoops do not throw a long-travel truck into the air', () => {
  const big = bodyHeave({ ...base, longTravel: true }, 25, 0.7); assert.ok(big.heave < 1.0, 'heave ' + big.heave);
});
