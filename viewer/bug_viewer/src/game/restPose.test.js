import test from 'node:test';
import assert from 'node:assert/strict';
import { REST, REST_CAJON, restOf, restOfCajon, carryScale, CARRY_MAX } from './restPose.js';
import { BUG, CAJON, groupOf } from '../rules/vehicles.js';

test('every rest pose names a real body piece of the Bug', () => {
  const pieces = new Set(BUG.slots.map(s => s.piece).filter(Boolean));
  for (const id of Object.keys(REST)) assert.ok(pieces.has(id), `${id} is not a Bug body piece`);
});

test('left and right pieces lie opposite ways, front and rear opposite ways', () => {
  assert.equal(REST.doorL[1], -REST.doorR[1]);
  assert.equal(REST.fenderFL[1], -REST.fenderFR[1]);
  assert.equal(REST.windshield[0], -REST.rearWindow[0]);
});

test('unknown or upright parts get no turn', () => {
  assert.deepEqual(restOf('seatDriver'), [0, 0]);
  assert.deepEqual(restOf('nope'), [0, 0]);
});

test('carry scale shrinks big parts to the carry box and never enlarges', () => {
  assert.equal(carryScale(0.3), 1);
  assert.ok(Math.abs(carryScale(1.2) * 1.2 - CARRY_MAX) < 1e-9);
  assert.equal(carryScale(0), 1);
});

test('every El Cajon rest pose names a real group of the El Cajon, and doors lie opposite ways', () => {
  const groups = new Set(CAJON.slots.map(groupOf).filter(Boolean));
  for (const id of Object.keys(REST_CAJON)) assert.ok(groups.has(id), `${id} is not an El Cajon part`);
  assert.equal(REST_CAJON.driver_door[1], -REST_CAJON.passenger_door[1]);
  assert.equal(REST_CAJON.windshield[0], -REST_CAJON.tailgate[0]);   // front-facing and rear-facing lie opposite ways
  assert.deepEqual(restOfCajon('seat'), [0, 0]); assert.deepEqual(restOfCajon('nope'), [0, 0]);
});
