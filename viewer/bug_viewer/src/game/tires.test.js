import test from 'node:test';
import assert from 'node:assert/strict';
import { treadOf, treadLabel, withTread, tireSizeOf, wornTires, BALD } from './tires.js';
import { registerTireSizes, placeableIdFor, GAME_PLACEABLES, TIRE_SIZE, isTirePid } from '../placement/gameItems.js';

test('tread defaults to full and is clamped', () => {
  assert.equal(treadOf({}), 1); assert.equal(treadOf({ tread: 0.2 }), 0.2); assert.equal(treadOf({ tread: 5 }), 1); assert.equal(treadOf({ tread: -1 }), 0);
});
test('labels and names', () => {
  assert.equal(treadLabel(0.1), 'bald'); assert.equal(treadLabel(BALD), 'worn'); assert.equal(treadLabel(0.9), 'good tread');
  assert.equal(withTread('Stock wheel', {}), 'Stock wheel');
  assert.match(withTread('Stock wheel', { tread: 0.08 }), /bald, 8% tread/);
});
test('tire size from catalog data', () => {
  assert.deepEqual(tireSizeOf({ baseRadius: 0.4, halfWidth: 0.15 }), { dia: 0.8, width: 0.3 });
  assert.deepEqual(tireSizeOf({ mounts: { '*': { FL: { radius: 0.345717, halfWidth: 0.132 } } } }), { dia: 0.691, width: 0.264 });
  assert.equal(tireSizeOf({}), null); assert.equal(tireSizeOf(null), null);
});
test('worn tires are real fittable stock wheels', () => {
  const t = wornTires(() => 0.5); assert.equal(t.length, 4);
  for (const x of t) { assert.equal(x.kind, 'stock'); assert.equal(x.id, 'wheel'); assert.equal(x.set, 'stock'); assert.ok(x.tread > 0 && x.tread < 0.4); }
});
test('placeable size follows the wheel set, falls back to the old size', () => {
  const stock = { kind: 'stock', id: 'wheel', set: 'nope' };
  assert.equal(placeableIdFor(stock, 3), 'tire');
  registerTireSizes({ big: { dia: 0.9, width: 0.35 } });
  const big = { kind: 'wheel', id: 'big' };
  assert.equal(placeableIdFor(big, 4), 'tire:big'); assert.ok(isTirePid('tire:big'));
  assert.deepEqual(GAME_PLACEABLES['tire:big'].footprint, [0.9, 0.9]); assert.equal(GAME_PLACEABLES['tire:big'].height, 0.35);
  assert.equal(placeableIdFor({ kind: 'stock', id: 'wheel', set: 'big' }, 3), 'tire:big');
  assert.deepEqual(GAME_PLACEABLES.tire.footprint, [TIRE_SIZE.dia, TIRE_SIZE.dia]);
});
