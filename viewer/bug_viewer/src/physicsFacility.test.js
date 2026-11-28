// The physics test facility (docs/vehicle-physics/PHYSICS_AUDIT.md, milestone 1): headless runs of the real Bug that print numbers for
// docs/vehicle-physics/PHYSICS_TEST_RESULTS.md and fail if the car stops behaving physically. Nothing here changes the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBody, stepBody, readBody, G } from './rigid.js';
import { massModel } from './vehiclePhysics.js';
import { envFor } from './driveMeasure.js';

const STEP = 1 / 120, R0 = 0.345717;
/** the Bug's drive dims as build.js resolve() makes them (stock wheels, no parts), optionally on bigger tires / a lift kit */
export function bugDims({ scale = 1, kit = 0, widen = 0 } = {}) {
  const tr = (scale - 1) * R0, lift = kit + tr, m = massModel({ body: 'classic', parts: {} }, 2.38), x = 0.65163 + widen;
  return { wheelbase: 2.38, track: 2 * x, lift, bellyHeight: 0.14 + lift, cabEye: [0.31, 1.32 + lift, -0.15], offroad: false, mass: m.mass, cgY: m.cgY + kit * 0.85 + tr, cgFromRear: m.cgFromRear,
    mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: R0 * scale, center: [name.endsWith('L') ? x : -x, R0 * scale, name.startsWith('F') ? 1.19 : -1.19], halfWidth: 0.132 })) };
}
const idle = { throttle: 0, brake: false, steer: 0 };
const out = [];   // printed at the end for the results doc
const note = s => { out.push(s); };

test('static pad: the four tire loads carry the car (within 5%), about 42/58 front/rear, and it sits still', () => {
  const d = bugDims(), b = createBody(d, { y: 0.3 }), e = envFor('dirt');
  for (let i = 0; i < 4 / STEP; i++) stepBody(b, d, idle, e, STEP);
  const s = readBody(b, {}), loads = b.wheels.map(w => w.load), sum = loads.reduce((a, x) => a + x, 0), weight = b.shape.mass * G, front = (loads[0] + loads[1]) / sum;
  note(`static pad: loads ${loads.map(x => x.toFixed(0)).join(' / ')} N, sum ${(sum / weight * 100).toFixed(1)}% of weight (${b.shape.mass.toFixed(0)} kg at ${G.toFixed(2)} m/s2), front ${(front * 100).toFixed(1)}%, travel ${b.travel.map(t => t.toFixed(3)).join(' / ')} m`);
  assert.ok(Math.abs(sum / weight - 1) < 0.05, `loads ${sum} vs weight ${weight}`);
  assert.ok(front > 0.36 && front < 0.48, 'front share ' + front);
  assert.ok(Math.hypot(s.v, s.lateralV, s.vy) < 0.05 && s.upY > 0.999);
});

/** DriveWorld's sub-stepping (Vehicle useFrame): a frame of dt is split into 1-5 steps of up to 1.6 x STEP */
const frameSteps = dt => { const n = Math.min(5, Math.max(1, Math.ceil(dt / (STEP * 1.2)))); return Array(n).fill(Math.min(dt / n, STEP * 1.6)); };
test('frame rate: the same 6 s full-throttle run at 30 / 60 / 144 fps (today within 5%; milestone 2 aims for 1%)', () => {
  const runs = [30, 60, 144].map(fps => {
    const d = bugDims(), b = createBody(d, { y: 0.3 }), e = envFor('dirt'), steps = frameSteps(1 / fps);
    for (let i = 0; i < 2 * fps; i++) for (const h of steps) stepBody(b, d, idle, e, h);
    const z0 = readBody(b, {}).z;
    for (let i = 0; i < 6 * fps; i++) for (const h of steps) stepBody(b, d, { throttle: 1, brake: false, steer: 0 }, e, h);
    const s = readBody(b, {}); return { fps, dist: s.z - z0, v: s.v, simSec: 6 * fps * steps.reduce((a, x) => a + x, 0) };
  });
  const dists = runs.map(r => r.dist), spread = (Math.max(...dists) - Math.min(...dists)) / Math.min(...dists);
  note(`frame rate: ${runs.map(r => `${r.fps} fps ${r.dist.toFixed(1)} m, ${r.v.toFixed(2)} m/s, ${r.simSec.toFixed(2)} s simulated`).join(' | ')}; spread ${(spread * 100).toFixed(2)}%`);
  assert.ok(spread < 0.05, 'spread ' + spread);
});

test('skidpad: steady circle at 12 m/s, lateral g and body roll, stock vs 33s on the 4-inch kit', () => {
  for (const [name, d] of [['stock', bugDims()], ['33s + 4in', bugDims({ scale: 1.22, kit: 0.1, widen: 0.08 })]]) {
    const b = createBody(d, { y: 0.4, v: 12 }), e = envFor('dirt'); let g = 0, roll = 0;
    for (let i = 0; i < 8 / STEP; i++) { const s = readBody(b, {}); const thr = s.v < 12 ? 0.6 : 0.1; stepBody(b, d, { throttle: thr, brake: false, steer: 0.12 }, e, STEP); if (i > 5 / STEP) { const r = readBody(b, {}); g = Math.max(g, Math.abs(r.v * r.yr) / 9.81); roll = Math.max(roll, Math.abs(r.roll) * 57.3); } }
    const s = readBody(b, {});
    note(`skidpad ${name}: ${s.v.toFixed(1)} m/s, lateral ${g.toFixed(2)} g, roll ${roll.toFixed(1)} deg, upright ${s.upY.toFixed(2)}`);
    assert.ok(!s.rolled && g > 0.2, name);
  }
});

test('single-wheel bump: only the front-left rides up, and the car settles again', () => {
  const d = bugDims(), bump = (x, z) => (x > 0.3 && Math.abs(z - 8) < 0.5 ? 0.12 * (0.5 + 0.5 * Math.cos(Math.PI * (z - 8) / 0.5)) : 0);
  const b = createBody(d, { y: 0.3, z: -6, v: 4 }), e = { ...envFor('dirt'), height: bump }; let fl = -1, fr = -1;
  for (let i = 0; i < 8 / STEP; i++) { stepBody(b, d, { throttle: 0.15, brake: false, steer: 0 }, e, STEP); const fz = readBody(b, {}).z + 1.19; if (fz > 7.4 && fz < 8.6) { fl = Math.max(fl, b.travel[0]); fr = Math.max(fr, b.travel[1]); } }   // only while the front axle is over the bump
  const s = readBody(b, {});
  note(`single-wheel bump 12 cm at 4 m/s: max travel FL ${fl.toFixed(3)} m, FR ${fr.toFixed(3)} m; afterwards roll ${(s.roll * 57.3).toFixed(2)} deg`);
  assert.ok(fl > fr + 0.03, JSON.stringify([fl, fr]));
  assert.ok(Math.abs(s.roll) < 0.02 && s.upY > 0.99);
});

test('print the facility table (for PHYSICS_TEST_RESULTS.md)', () => { console.log('\n' + out.join('\n')); });
