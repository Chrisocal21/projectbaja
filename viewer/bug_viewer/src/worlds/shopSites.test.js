import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShops, shopName, shopKey, isShop, SHOP_SPEC } from './shopSites.js';
import { shopLayout } from './shopLayout.js';

const straight = (kind, len = 60000) => ({ name: 'R', kind, pts: Array.from({ length: Math.floor(len / 100) + 1 }, (_, i) => [i * 100, 0]) });
const bounds = { x0: -5000, x1: 100000, z0: -50000, z1: 50000 };

test('shops appear along roads, far apart, and the same every time', () => {
  const roads = [straight('dirt'), straight('secondary'), straight('major')];
  const a = buildShops(roads, [], { bounds }), b = buildShops(roads, [], { bounds });
  assert.deepEqual(a, b);
  for (const t of ['barn', 'junk', 'offroad']) {
    const s = a.filter(q => q.type === t); assert.ok(s.length >= 1, t);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) assert.ok(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z) >= SHOP_SPEC[t].apart - 1, t + ' too close');
  }
});
test('a barn does not go up on a major road, nor next to a gas station', () => {
  assert.equal(buildShops([straight('major')], [], { bounds }).filter(q => q.type === 'barn').length, 0);
  const gas = [{ type: 'gas', x: 3000, z: 0 }], s = buildShops([straight('secondary')], gas, { bounds });
  for (const q of s) assert.ok(Math.hypot(q.x - 3000, q.z) >= 900);
});
test('shops stay off steep ground and inside the map', () => {
  assert.equal(buildShops([straight('secondary')], [], { bounds, ground: (x, z) => z * 0.5 }).length, 0);
  assert.equal(buildShops([straight('secondary')], [], { bounds: { x0: 0, x1: 500, z0: 0, z1: 500 } }).length, 0);
});
test('names are stable, made of two parts, and not all the same', () => {
  const sites = buildShops([straight('dirt', 120000)], [], { bounds: { ...bounds, x1: 200000 } });
  assert.ok(sites.length > 5);
  assert.equal(shopName(sites[0]), shopName({ ...sites[0] }));
  assert.ok(shopName(sites[0]).includes(' '));
  assert.ok(new Set(sites.map(shopName)).size > 3);
  assert.ok(isShop(sites[0]) && !isShop({ type: 'gas' }) && shopKey(sites[0]).startsWith('barn:'));
});
test('every kind of shop has a layout with a counter to stand at and a sign', () => {
  for (const type of ['barn', 'junk', 'offroad']) for (const x of [10, 733, 5120]) {
    const L = shopLayout({ type, x, z: x * 3 });
    assert.ok(L.parts.length > 20, type); assert.equal(L.spots.shop.length, 2); assert.ok(L.spots.sign.w > 0); assert.deepEqual(L.spots.pump, []); assert.equal(L.brand, -1);
    for (const p of L.parts) { assert.equal(p.length, 7); assert.ok(p.slice(0, 6).every(Number.isFinite)); }
  }
});
