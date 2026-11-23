import test from 'node:test';
import assert from 'node:assert/strict';
import { planStreetLights, SPACING } from './streetLights.js';

const road = { kind: 'major', pts: Array.from({ length: 101 }, (_, i) => ({ x: i * 100, z: 0 })) };
test('lights stand only inside lit circles, spaced out, alternating sides, facing the road', () => {
  const lights = planStreetLights([road], [{ x: 5000, z: 0, r: 300 }]);
  assert.ok(lights.length >= 10 && lights.length <= 20, String(lights.length));
  assert.ok(lights.every(l => Math.abs(l.x - 5000) <= 301));
  assert.ok(lights.every(l => Math.abs(Math.abs(l.z) - 10.5) < 0.01));
  for (let i = 1; i < lights.length; i++) assert.ok(Math.sign(lights[i].z) !== Math.sign(lights[i - 1].z));
  for (const l of lights) { const toRoadZ = Math.cos(l.ry); assert.ok(toRoadZ * -Math.sign(l.z) > 0.99); }   // local +z points back at z = 0
  const xs = lights.map(l => l.x).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] > SPACING * 0.9);
});
test('open road with nothing to light stays dark; dirt and ramps never get lights; the cap holds', () => {
  assert.equal(planStreetLights([road], []).length, 0);
  assert.equal(planStreetLights([{ ...road, kind: 'dirt' }, { ...road, kind: 'ramp' }], [{ x: 5000, z: 0, r: 5000 }]).length, 0);
  assert.equal(planStreetLights([road], [{ x: 5000, z: 0, r: 9000 }], { max: 25 }).length, 25);
});
