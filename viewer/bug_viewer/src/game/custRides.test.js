import test from 'node:test';
import assert from 'node:assert/strict';
import { rollRide, rideOf, rideLen, RIDES } from './custRides.js';

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
