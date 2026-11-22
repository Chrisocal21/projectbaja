import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOf, tripWhy, noPowerWhy, PANEL_AMPS } from './powerRules.js';
test('two machines are fine, three at once trip the breaker and the message names them', () => {
  assert.equal(tripWhy({ batteryCharger: 1, partsWasher: 1 }), '');
  const w = tripWhy({ batteryCharger: 1, partsWasher: 1, tireChanger: 1 });
  assert.match(w, /breaker trips/); assert.match(w, /battery charger/); assert.match(w, /tire machine/); assert.match(w, /30 amps/);
});
test('two chargers count twice, and idle machines draw nothing', () => {
  assert.equal(loadOf({ batteryCharger: 2 }), 16); assert.equal(loadOf({ batteryCharger: 0, partsWasher: 0 }), 0);
  assert.ok(tripWhy({ batteryCharger: 4 }) !== ''); assert.ok(PANEL_AMPS >= 18);
});
test('a machine with no power says why', () => { assert.match(noPowerWhy(false, 'parts washer'), /main breaker/); assert.equal(noPowerWhy(true, 'x'), ''); });
