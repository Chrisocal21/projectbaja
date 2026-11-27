import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSIFIED_CARS } from './classifiedCars.js';
import { classifieds, openListings } from './web.js';

const glb = file => { const b = readFileSync(new URL(`../../public/models/${file}.glb`, import.meta.url)), n = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + n).toString()); };
const cars = Object.values(CLASSIFIED_CARS);

test('each Classifieds truck has its own four wheel nodes, and the sim hubs are the model hubs (moved sideways so they straddle x = 0)', () => {
  assert.equal(cars.length, 4);
  for (const t of cars) {
    const nodes = glb(t.file).nodes, m = Object.fromEntries(t.dims.mounts.map(x => [x.name, x]));
    for (const w of ['FL', 'FR', 'RL', 'RR']) {
      const n = nodes.find(x => x.name === 'Wheel_' + w); assert.ok(n, `${t.file} Wheel_${w}`);
      const [x, y, z] = n.translation; assert.ok(Math.abs(x + t.shiftX - m[w].center[0]) < 1e-6 && Math.abs(z - m[w].center[2]) < 1e-6 && Math.abs(y - m[w].radius) < 0.01, `${t.id} ${w}`);
    }
    assert.ok(Math.abs(m.FL.center[0] + m.FR.center[0]) < 0.02, `${t.id} centred`);
    assert.ok(t.dims.wheelbase > 2.8 && t.dims.track > 1.5 && t.price > 0 && t.kind === 'truck');
  }
});

test('the board posts 0-2 trucks a day from the ones offered, never the same one twice, and nothing when none are offered', () => {
  const offer = cars.map(c => ({ id: c.id, name: c.name, price: c.price, pitch: c.pitch }));
  let days = 0, withCars = 0;
  for (let d = 0; d < 60; d++) {
    const posted = classifieds(d, [], 3, offer).filter(l => l.type === 'car'); days++;
    if (posted.length) withCars++;
    assert.ok(posted.length <= 2); assert.equal(new Set(posted.map(l => l.carId)).size, posted.length);
    for (const l of posted) { const c = CLASSIFIED_CARS[l.carId]; assert.ok(l.price >= c.price * 0.85 && l.price <= c.price * 1.15, l.id); }
    assert.equal(classifieds(d, [], 3, []).filter(l => l.type === 'car').length, 0);
  }
  assert.ok(withCars > days * 0.4 && withCars < days, `${withCars} of ${days} days have trucks`);
  const one = classifieds(5, [], 3, offer.slice(0, 1)).filter(l => l.type === 'car');
  if (one.length) assert.equal(openListings(one, { [one[0].id]: true }).length, 0);
});
