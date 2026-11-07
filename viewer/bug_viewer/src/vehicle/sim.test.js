import test from 'node:test';
import assert from 'node:assert/strict';
import { buggyConfig } from './config.js';
import { createCar, stepCar, STEP, telemetry } from './sim.js';

const mounts = [['FL', 0.75, 1.1], ['FR', -0.75, 1.1], ['RL', 0.75, -1.28], ['RR', -0.75, -1.28]]
  .map(([name, x, z]) => ({ name, radius: 0.47, center: [x, 0.47, z] }));
const run = (car, inp, sec, log) => { const n = Math.round(sec / STEP); for (let i = 0; i < n; i++) { stepCar(car, typeof inp === 'function' ? inp(i * STEP) : inp, STEP); if (log && i % Math.round(0.5 / STEP) === 0) console.log(log, JSON.stringify(summary(car))); } };
const summary = car => { const t = telemetry(car); return { kmh: +t.kmh.toFixed(1), slip: +t.slipDeg.toFixed(1), latG: +t.latG.toFixed(2), yr: +car.r.toFixed(2), steer: +car.steer.toFixed(2), N: t.wheels.map(w => Math.round(w.load)), used: t.wheels.map(w => +w.used.toFixed(2)) }; };
const fresh = () => createCar(buggyConfig(), mounts);
const none = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };

test('rests without creeping or NaN', () => {
  const car = fresh(); run(car, none, 5);
  assert.ok(Math.abs(car.u) < 0.01 && Math.abs(car.w) < 0.01, 'stays still');
  const t = telemetry(car); const total = t.wheels.reduce((s, w) => s + w.load, 0);
  assert.ok(Math.abs(total - 9810) < 50, 'wheel loads sum to weight: ' + total);
  assert.ok(t.wheels[2].load > t.wheels[0].load, 'rear heavier than front');
});

test('accelerates, weight shifts back, top speed is bounded', () => {
  const car = fresh(); run(car, { ...none, throttle: 1 }, 3);
  const s3 = telemetry(car); assert.ok(s3.kmh > 40, '0-3s speed ' + s3.kmh);
  assert.ok(s3.wheels[2].load > s3.wheels[0].load * 1.2, 'rear loads up under power');
  run(car, { ...none, throttle: 1 }, 20); const top = telemetry(car).kmh;
  assert.ok(top > 100 && top < 160, 'top speed ' + top); assert.ok(Number.isFinite(car.x));
});

test('braking stops in a sane distance and shifts weight forward', () => {
  const car = fresh(); run(car, { ...none, throttle: 1 }, 10); const v0 = car.u, x0 = car.z;
  run(car, { ...none, brake: 1 }, 0.5); assert.ok(telemetry(car).wheels[0].load > telemetry(car).wheels[2].load, 'front loaded when braking');
  run(car, { ...none, brake: 1 }, 6); const d = car.z - x0;
  console.log('brake from', (v0 * 3.6).toFixed(0), 'km/h in', d.toFixed(1), 'm');
  assert.ok(car.u < 0.3, 'stopped'); assert.ok(d < v0 * v0 / (2 * 7) , 'stopping distance ' + d);
});

test('steady turn: grips, no spin, lateral g sensible', () => {
  const car = fresh(); run(car, { ...none, throttle: 0.5 }, 5);
  run(car, { ...none, throttle: 0.35, steer: 1 }, 5, 'turn');
  const t = telemetry(car); assert.ok(Math.abs(t.slipDeg) < 25, 'slip ' + t.slipDeg); assert.ok(t.latG > 0.3, 'lat g ' + t.latG);
});

test('braking in a turn takes grip from cornering (friction circle)', () => {
  const a = fresh(); run(a, { ...none, throttle: 0.6 }, 6); run(a, { ...none, throttle: 0.4, steer: 0.6 }, 2);
  const b = fresh(); run(b, { ...none, throttle: 0.6 }, 6); run(b, { ...none, throttle: 0.4, steer: 0.6 }, 2);
  run(a, { ...none, throttle: 0.4, steer: 0.6 }, 0.6); run(b, { ...none, brake: 1, steer: 0.6 }, 0.6);
  const ua = telemetry(a).wheels[0].used, ub = telemetry(b).wheels[0].used;
  assert.ok(Math.abs(telemetry(b).latG) < Math.abs(telemetry(a).latG) + 1.2, 'lat g with braking not greater'); assert.ok(ub >= ua * 0.8);
});

test('handbrake pivots the rear loose', () => {
  const car = fresh(); run(car, { ...none, throttle: 0.7 }, 6); run(car, { ...none, throttle: 0.3, steer: 0.7 }, 1);
  const before = Math.abs(telemetry(car).slipDeg);
  run(car, { ...none, steer: 0.7, handbrake: 1 }, 0.8, 'hand');
  assert.ok(Math.abs(telemetry(car).slipDeg) > before + 3, 'slip grows ' + before + '->' + telemetry(car).slipDeg);
});

test('same result at different step sizes (fixed step robustness)', () => {
  const a = fresh(), b = fresh();
  for (let i = 0; i < 480; i++) stepCar(a, { ...none, throttle: 1, steer: i > 240 ? 0.4 : 0 }, 1 / 120);
  for (let i = 0; i < 240; i++) stepCar(b, { ...none, throttle: 1, steer: i > 120 ? 0.4 : 0 }, 1 / 60);
  assert.ok(Math.abs(a.u - b.u) / a.u < 0.06, `u ${a.u} vs ${b.u}`); assert.ok(Math.abs(a.h - b.h) < 0.15, `h ${a.h} vs ${b.h}`);
});
