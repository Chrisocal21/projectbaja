import test from 'node:test';
import assert from 'node:assert/strict';
import { storedOf, refundOf, seededV, storeMove, unstoreMove } from './stash.js';

const props = () => [{ uid: 1, id: 'shelfTires', x: 0, z: 0, ry: 0, starter: true }, { uid: 2, id: 'compressor', x: 3, z: 1, ry: 0, starter: true, free: true }];

test('selling a starter fixture refunds 100% (no starter refusal); free props refund 0', () => {
  assert.equal(refundOf(props()[0], 140), 140);
  assert.equal(refundOf(props()[1], 140), 0);
});
test('sold starter fixtures are not re-seeded: fixturesV stays at 2, old saves are classified correctly', () => {
  assert.equal(seededV({ fixturesV: 2 }), 2); assert.equal(seededV({ fixtures: true }), 1); assert.equal(seededV({}), 0);
});
test('store / unstore round trip keeps uid, free and starter flags', () => {
  const a = storeMove(props(), [], 2);
  assert.equal(a.props.length, 1); assert.equal(a.stored.length, 1); assert.equal(a.stored[0].uid, 2);
  const b = unstoreMove(a.props, a.stored, 2, 9, 8, 1.5);
  assert.equal(b.stored.length, 0); const c = b.props.find(p => p.id === 'compressor');
  assert.deepEqual([c.uid, c.x, c.z, c.ry, c.free, c.starter], [2, 9, 8, 1.5, true, true]);
  assert.equal(storeMove(props(), [], 99), null); assert.equal(unstoreMove(props(), [], 2, 0, 0, 0), null);
});
test('unstore never collides with an existing uid', () => {
  const r = unstoreMove([{ uid: 2, id: 'x' }], [{ uid: 2, id: 'compressor' }], 2, 0, 0, 0);
  assert.equal(new Set(r.props.map(p => p.uid)).size, 2);
});
test('old save without home.stored reads as empty', () => {
  assert.deepEqual(storedOf({ cleared: [] }), []); assert.deepEqual(storedOf(undefined), []);
});
