import test from 'node:test';
import assert from 'node:assert/strict';
import { stackCargo } from './cargoStack.js';

test('a big load stays within the row length and stacks upward', () => {
  const out = stackCargo(Array.from({ length: 20 }, () => ({ d: 0.4 })), 1.5, 0.05);
  assert.ok(out.every(p => p.along + p.d / 2 <= 1.5));
  assert.ok(Math.max(...out.map(p => p.layer)) > 0);
  assert.equal(new Set(out.map(p => [p.side, p.layer, p.along.toFixed(2)].join())).size, 20);   // no two in the same place
});
