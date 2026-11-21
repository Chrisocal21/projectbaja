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
