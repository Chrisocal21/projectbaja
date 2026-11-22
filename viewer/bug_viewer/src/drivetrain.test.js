import test from 'node:test';
import assert from 'node:assert/strict';
import { splitDrive, torqueAt, createEngine, stepEngine, finalDrive } from './drivetrain.js';
import { createBody, stepBody, readBody } from './rigid.js';

test('open diff: drive is limited by the weaker wheel; a wheel off the ground means no drive at all', () => {
  const [l, r] = splitDrive(6000, 0, 5000, 'open'); assert.equal(l + r, 0);
  const [a, c] = splitDrive(6000, 4000, 4000, 'open'); assert.equal(a + c, 6000);
});
test('locker keeps driving on the grounded wheel; LSD in between', () => {
  const [l, r] = splitDrive(6000, 0, 5000, 'locker'); assert.ok(l === 0 && r === 5000, [l, r].join());
  const [a, b] = splitDrive(6000, 600, 5000, 'lsd'); assert.ok(a + b > 600 * 2 && a + b < 5600, [a, b].join());
});
test('torque curve peaks mid-range and the limiter cuts above it; taller tires raise top speed', () => {
  assert.ok(torqueAt(3500) > torqueAt(900) && torqueAt(7000) === 0);
});
test('a taller tire gives less pull (force) at the same speed', () => {
  const f = r => { const e = createEngine(); let F = 0; for (let i = 0; i < 20; i++) F = stepEngine(e, { throttle: 1 }, 3, r, 40, 8000, 1 / 120); return F; };
  assert.ok(f(0.45) < f(0.38));
});
test('sustained slow full-throttle pull overheats the air-cooled engine: warning, then power loss, then damage', () => {
  const e = createEngine(); const seen = []; let F0 = null, Flast = 0;
  for (let t = 0; t < 400; t += 1 / 120) { Flast = stepEngine(e, { throttle: 1 }, 3, 0.38, 40, 8000, 1 / 120); if (F0 === null && Flast > 0) F0 = Flast; if (e.hot && !seen.includes('warn')) seen.push('warn'); if (e.derate < 1 && !seen.includes('loss')) seen.push('loss'); if (e.damage > 0 && !seen.includes('damage')) seen.push('damage'); }
  assert.deepEqual(seen, ['warn', 'loss', 'damage']); assert.ok(Flast < F0 * 0.8);
  const cool = createEngine(); for (let t = 0; t < 400; t += 1 / 120) stepEngine(cool, { throttle: 0.5 }, 25, 0.38, 40, 8000, 1 / 120);
  assert.ok(!cool.hot, 'cruising at speed must stay cool: ' + cool.temp);
});

const dims = { wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0.31, 1.32, -0.15],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19] })) };
test('one rear wheel hanging in a hole: open diff stalls, locker drives out', () => {
  const hole = (x, z) => (z < -0.95 && z > -1.5 && x > 0.4 ? -0.9 : 0);
  const trial = diff => { const b = createBody(dims, {}); const env = { height: hole, mu: 0.9, rr: 1, ACC: 11, MAXV: 40, DRG: 0.01, diff };
    for (let i = 0; i < 4 * 120; i++) stepBody(b, dims, { throttle: 1, brake: false, steer: 0 }, env, 1 / 120); const s = readBody(b); return s.z; };
  const open = trial('open'), lock = trial('locker');
  console.log('distance in 4 s with one rear wheel in the hole: open', open.toFixed(2), 'locker', lock.toFixed(2));
  assert.ok(lock > open + 2, JSON.stringify([open, lock]));
});
