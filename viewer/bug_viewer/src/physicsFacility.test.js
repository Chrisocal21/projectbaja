// The physics test facility (docs/vehicle-physics/PHYSICS_AUDIT.md, milestone 1): headless runs of the real Bug that print numbers for
// docs/vehicle-physics/PHYSICS_TEST_RESULTS.md and fail if the car stops behaving physically. Nothing here changes the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBody, stepBody, readBody, G } from './rigid.js';
import { massModel } from './vehiclePhysics.js';
import { envFor } from './driveMeasure.js';
import { tireGround, createWheelGround, REQUERY } from './wheelGround.js';
import { SURFACES } from './worlds/kit.js';

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

// ---------- milestone 3: each tire reads its own ground ----------
const STOCK_TIRE = { mu: 1, rr: 1, surf: {} };
const under = key => { const g = tireGround({ ...SURFACES[key], key }, { psi: 30, tire: STOCK_TIRE }); return { mu: g.mu, rr: g.rr, name: g.name }; };
/** drive at v0, then apply ctl for secs; ground(i) = what wheel i stands on (0 FL, 1 FR, 2 RL, 3 RR; left = +x) */
function onGround(ground, { v0 = 0, secs = 4, ctl, diff } = {}) {
  const d = bugDims(), b = createBody(d, { y: 0.3 }), e = { ...envFor('dirt'), diff, tireAt: (x, z, i) => ground(i) };
  for (let i = 0; i < 2 / STEP; i++) stepBody(b, d, idle, e, STEP);
  b.vel.set(0, 0, v0); const z0 = readBody(b, {}).z;
  for (let i = 0; i < secs / STEP; i++) { stepBody(b, d, ctl, e, STEP); if (ctl.throttle < 0 && readBody(b, {}).v < 0.6) break; }
  const s = readBody(b, {}); return { ...s, dist: s.z - z0, wheels: b.wheels };
}

test('per-wheel ground: giving every wheel the same ground drives exactly like the one-ground car', () => {
  const d = bugDims(), plain = envFor('dirt'), each = { ...plain, tireAt: () => ({ mu: plain.mu, rr: plain.rr }) };
  const [a, b] = [plain, each].map(e => { const car = createBody(d, { y: 0.3 }); for (let i = 0; i < 6 / STEP; i++) stepBody(car, d, { throttle: 1, brake: false, steer: i > 3 / STEP ? 0.15 : 0 }, e, STEP); return readBody(car, {}); });
  assert.equal(a.x, b.x); assert.equal(a.z, b.z); assert.equal(a.h, b.h);
});

test('split ground, braking: left wheels on asphalt and right wheels on sand pulls toward the asphalt side, and mirrors', () => {
  const brake = { throttle: -1, brake: false, steer: 0 };
  const left = onGround(i => under(i % 2 === 0 ? 'asphalt' : 'sand'), { v0: 15, secs: 6, ctl: brake });
  const right = onGround(i => under(i % 2 === 0 ? 'sand' : 'asphalt'), { v0: 15, secs: 6, ctl: brake });
  const both = onGround(() => under('asphalt'), { v0: 15, secs: 6, ctl: brake });
  note(`split-mu braking from 54 km/h: asphalt left pulls ${(left.h * 57.3).toFixed(1)} deg / ${left.x.toFixed(2)} m, asphalt right ${(right.h * 57.3).toFixed(1)} deg / ${right.x.toFixed(2)} m, all asphalt ${(both.h * 57.3).toFixed(1)} deg`);
  assert.ok(left.h > 0.03 && left.x > 0, 'pulls left toward the asphalt: ' + left.h);
  assert.ok(right.h < -0.03 && right.x < 0, 'pulls right toward the asphalt: ' + right.h);
  assert.ok(Math.abs(both.h) < 0.01, 'even ground brakes straight: ' + both.h);
});

test('split ground, launch: one rear wheel on mud holds an open diff back more than a locker', () => {
  const ground = i => under(i === 3 ? 'mud' : 'dirt'), go = { throttle: 1, brake: false, steer: 0 };
  const open = onGround(ground, { secs: 3, ctl: go, diff: 'open' }), locked = onGround(ground, { secs: 3, ctl: go, diff: 'locker' });
  note(`split launch, right rear in mud, 3 s: open diff ${open.dist.toFixed(1)} m, locker ${locked.dist.toFixed(1)} m`);
  assert.ok(locked.dist > open.dist * 1.05, `locker ${locked.dist} vs open ${open.dist}`);
});

test('wheel ground memory: looks the ground up again only after the wheel rolls on, or the tires or map change', () => {
  const g = createWheelGround(); let n = 0; const look = () => ++n;
  g.at(0, 0, 0, 'a', look); g.at(0, REQUERY * 0.9, 0, 'a', look); assert.equal(n, 1);
  g.at(0, REQUERY * 1.1, 0, 'a', look); assert.equal(n, 2);
  g.at(0, REQUERY * 1.1, 0, 'b', look); g.at(1, 0, 0, 'b', look); assert.equal(n, 4);
});

test('print the facility table (for PHYSICS_TEST_RESULTS.md)', () => { console.log('\n' + out.join('\n')); });
