import test from 'node:test';
import assert from 'node:assert/strict';
import { tempF, feel, skyWord, forecast, LOW_F, HIGH_F } from './weatherlogic.js';

test('temperature is coolest before dawn and hottest in the afternoon', () => {
  assert.equal(tempF(5), LOW_F); assert.equal(tempF(17), HIGH_F);
  for (let h = 0; h < 24; h += 0.5) { const t = tempF(h); assert.ok(t >= LOW_F && t <= HIGH_F); }
  assert.ok(tempF(15) > tempF(9) && tempF(9) > tempF(5));
});
test('labels and forecast', () => {
  assert.equal(feel(100), 'Hot'); assert.equal(feel(60), 'Cool');
  assert.equal(skyWord(2), 'Clear night'); assert.equal(skyWord(12), 'Clear and sunny');
  const f = forecast(22.5, 4); assert.equal(f.length, 4); assert.deepEqual(f.map(x => x.hour), [23, 0, 1, 2]);
});
