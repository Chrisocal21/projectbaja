import test from 'node:test';
import assert from 'node:assert/strict';
import { rollRide, rideOf, rideLen, RIDES, paintOf, CAR_PAINTS, BIKE_PAINTS } from './custRides.js';

test('each visit gets its own paint; next customers differ; bikes use bike colours', () => {
  const cars = [1, 2, 3, 4, 5].map(uid => paintOf({ id: 'oil', ride: 'pickup', uid })[0]);
  assert.equal(new Set(cars).size, 5);
  assert.deepEqual(paintOf({ id: 'oil', uid: 7 }), paintOf({ id: 'oil', uid: 7 }));
  assert.ok(BIKE_PAINTS.includes(paintOf({ id: 'tune', ride: 'dirtbike', uid: 2 })));
  assert.ok(CAR_PAINTS.includes(paintOf({ id: 'belt', ride: 'dirtbike', uid: 2 })));   // no bike on a belt job -> pickup
  assert.ok(CAR_PAINTS.includes(paintOf({})));
});

test('bikes only come for jobs a bike can need', () => {
  for (let i = 0; i < 200; i++) assert.ok(!RIDES[rollRide('wipers')].bike);
  const seen = new Set(Array.from({ length: 400 }, () => rollRide('battery')));
  assert.ok(seen.has('dirtbike') || seen.has('moto')); assert.ok(seen.has('sedan'));
});

test('a saved ride is checked; old saves get the pickup', () => {
  assert.equal(rideOf({ id: 'oil' }), 'pickup');
  assert.equal(rideOf({ id: 'oil', ride: 'moto' }), 'moto');
  assert.equal(rideOf({ id: 'belt', ride: 'moto' }), 'pickup');
  assert.equal(rideOf({ id: 'oil', ride: 'hovercraft' }), 'pickup');
  assert.equal(rideLen({ id: 'tune', ride: 'dirtbike' }), 2.1);
  assert.equal(rideOf({ id: 'belt', ride: 'oldpickup' }), 'oldpickup');
});
