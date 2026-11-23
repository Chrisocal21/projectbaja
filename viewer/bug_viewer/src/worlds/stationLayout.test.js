import test from 'node:test';
import assert from 'node:assert/strict';
import { stationLayout, variantOf, siteToWorld } from './stationLayout.js';
import { GAS_BRANDS } from './brands.js';

const site = (i, type = 'gas') => ({ type, x: 1000 + i * 733, z: -2000 + i * 411, ry: 0.3 });
test('every gas station has pumps, a shop spot, a service bay, a wash and signs; every rest stop has a wash and a fix', () => {
  for (let i = 0; i < 40; i++) {
    const l = stationLayout(site(i));
    assert.ok(l.spots.pump.length >= 1 && l.spots.shop && l.spots.fix && l.spots.wash && l.spots.sign && l.spots.storeSign);
    assert.ok(l.brand >= 0 && l.brand < GAS_BRANDS.length); assert.ok(l.parts.length > 20);
  }
  const r = stationLayout(site(1, 'rest'));
  assert.ok(r.spots.wash && r.spots.fix); assert.equal(r.spots.pump.length, 0);
});
test('stations differ from each other but a station never changes', () => {
  const look = s => JSON.stringify(variantOf(s));
  assert.equal(look(site(3)), look(site(3)));
  assert.ok(new Set(Array.from({ length: 40 }, (_, i) => look(site(i)))).size > 25);
  assert.ok(new Set(Array.from({ length: 40 }, (_, i) => variantOf(site(i)).brand)).size >= 4);
});
test('local spots map into the world facing the road', () => {
  const s = { x: 100, z: 200, ry: 0 }; assert.deepEqual(siteToWorld(s, 3, 5), [103, 205]);
  const q = { x: 0, z: 0, ry: Math.PI / 2 }; const [x, z] = siteToWorld(q, 0, 10); assert.ok(Math.abs(x - 10) < 1e-9 && Math.abs(z) < 1e-9);
});
