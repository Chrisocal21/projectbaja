import test from 'node:test';
import assert from 'node:assert/strict';
import { lightsCheck } from './lights.js';

const whole = { hidden: [], stripped: [] };
test('a whole Bug or El Cajon has working lights; the pickup always does', () => {
  assert.ok(lightsCheck('bug', whole).ok); assert.ok(lightsCheck('cajon', whole).ok); assert.ok(lightsCheck('pickup84', null).ok);
});
test('no battery or no headlights means no lights, and the message says which', () => {
  const a = lightsCheck('bug', { hidden: [], stripped: ['battery'] }); assert.ok(!a.ok); assert.match(a.why, /battery is missing/);
  const b = lightsCheck('cajon', { hidden: ['headlights'], stripped: [] }); assert.ok(!b.ok); assert.match(b.why, /headlights is missing/);
  const c = lightsCheck('bug', { hidden: ['headlights'], stripped: ['battery'] }); assert.match(c.why, /battery and headlights are missing/);
});

import { hasLightBar, modesFor, nextMode, headOn, barOn } from './lights.js';
test('L cycles off > headlights, and with a light bar: > both > bar only > off', () => {
  assert.deepEqual(modesFor(false), ['off', 'head']); assert.deepEqual(modesFor(true), ['off', 'head', 'both', 'bar']);
  assert.equal(nextMode('off', false), 'head'); assert.equal(nextMode('head', false), 'off');
  const seq = []; let m = 'off'; for (let i = 0; i < 4; i++) { m = nextMode(m, true); seq.push(m); } assert.deepEqual(seq, ['head', 'both', 'bar', 'off']);
  assert.equal(nextMode('bar', false), 'head');   // the bar came off while it was on
});
test('which lights each mode turns on, and the bar is detected from the build', () => {
  assert.ok(headOn('head') && headOn('both') && !headOn('bar') && !headOn('off')); assert.ok(barOn('bar') && barOn('both') && !barOn('head'));
  assert.ok(hasLightBar({ parts: { lightBar: 'ACC_LightBar' } })); assert.ok(!hasLightBar({ parts: {} })); assert.ok(!hasLightBar(null));
});
