import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceClock, dayPhase, goldenPhase, isNight, sunElevationDeg, sunPosition, formatClock, SUNRISE, SUNSET, DAY_LENGTH_SEC, CLOCK_RATE } from './clock.js';

test('the clock advances at the right rate and wraps at midnight', () => {
  assert.ok(Math.abs(advanceClock(10, 1) - (10 + CLOCK_RATE)) < 1e-9);
  assert.ok(Math.abs(advanceClock(23.9, DAY_LENGTH_SEC) - 23.9) < 1e-6, 'one full DAY_LENGTH_SEC is exactly one lap');
  const wrapped = advanceClock(23.99, 1);
  assert.ok(wrapped >= 0 && wrapped < 1, `wraps past 24, got ${wrapped}`);
});
test('day phase is full daylight between sunrise and sunset, smoothly fades at the edges, and is fully night by two hours either side', () => {
  assert.equal(dayPhase(12), 1); assert.equal(dayPhase(SUNRISE), 1); assert.equal(dayPhase(SUNSET), 1);
  assert.equal(dayPhase(SUNRISE - 2), 0); assert.equal(dayPhase(SUNSET + 2), 0);
  assert.equal(dayPhase(0), 0); assert.equal(dayPhase(24 - 1e-9), 0);
  const mid = dayPhase(SUNRISE - 1);
  assert.ok(mid > 0 && mid < 1, 'partway through sunrise is partway lit');
  for (let h = 0; h <= 24; h += 0.25) assert.ok(dayPhase(h) >= 0 && dayPhase(h) <= 1, `in range at ${h}`);
});
test('night is only true well away from sunrise/sunset, and the sun actually sits below the horizon then', () => {
  assert.ok(isNight(1)); assert.ok(isNight(23)); assert.ok(!isNight(12)); assert.ok(!isNight(SUNRISE)); assert.ok(!isNight(SUNSET));
  assert.ok(sunElevationDeg(0) < 0, 'midnight: the sun is below the horizon');
  assert.ok(sunElevationDeg(12) > 0, 'noon: the sun is up');
  assert.ok(Math.abs(sunElevationDeg(SUNRISE)) < 1e-9 && Math.abs(sunElevationDeg(SUNSET)) < 1e-9, 'sunrise/sunset: right on the horizon');
});
test('the golden hour peaks exactly at sunrise and sunset and fades to ~0 by noon/midnight', () => {
  assert.equal(goldenPhase(SUNRISE), 1); assert.equal(goldenPhase(SUNSET), 1);
  assert.equal(goldenPhase(12), 0); assert.equal(goldenPhase(0), 0);
});
test('the sun position is always a unit-length direction (times the distance given), and is up at noon, down at midnight', () => {
  for (const h of [0, 3, 6, 9, 12, 15, 18, 21]) { const [x, y, z] = sunPosition(h, 1); assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-9, `unit length at ${h}`); }
  assert.ok(sunPosition(12)[1] > 0); assert.ok(sunPosition(0)[1] < 0);
});
test('the clock reads like a clock', () => {
  assert.equal(formatClock(7), '7:00 AM'); assert.equal(formatClock(0), '12:00 AM'); assert.equal(formatClock(12), '12:00 PM');
  assert.equal(formatClock(13.5), '1:30 PM'); assert.equal(formatClock(23.999), '11:59 PM');
});
