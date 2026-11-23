import test from 'node:test';
import assert from 'node:assert/strict';
import { speedShown, tempText } from './units.js';
test('speed shows in mph or km/h', () => { assert.deepEqual(speedShown(60), { n: 60, label: 'MPH' }); assert.deepEqual(speedShown(60, 'kph'), { n: 97, label: 'KM/H' }); });
test('temperature converts both ways', () => {
  assert.equal(tempText(88), '88°F'); assert.equal(tempText(212, 'F', 'C'), '100°C'); assert.equal(tempText(100, 'C', 'F'), '212°F'); assert.equal(tempText(100, 'C', 'C'), '100°C'); assert.equal(tempText(50, 'F', 'F', true), '50°');
});
