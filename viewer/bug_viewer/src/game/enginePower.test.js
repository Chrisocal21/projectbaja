import test from 'node:test';
import assert from 'node:assert/strict';
import { freshParts, piecePower, pieceClue, MIN_POWER } from './engineRules.js';

const all = c => freshParts(() => 0.5, c);   // every piece at condition c
test('a good engine has full power; a complete old-save engine too', () => {
  assert.equal(piecePower(all(80)), 1); assert.equal(piecePower(undefined), 1); assert.equal(pieceClue(all(80)), '');
});
test('worn pieces cost power, the worst one is named, and it never drops below the floor', () => {
  const p = all(80); p.carb = { c: 20, g: 0 };
  assert.ok(piecePower(p) < 0.85 && piecePower(p) > 0.75); assert.match(pieceClue(p), /carburetor/);
  assert.equal(piecePower(all(16)), MIN_POWER);
  const q = all(80); delete q.exhaust; assert.ok(piecePower(q) < 1); assert.match(pieceClue(q), /exhaust/);
});
