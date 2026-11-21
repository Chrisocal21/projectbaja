import test from 'node:test';
import assert from 'node:assert/strict';
import { makePavedCover } from './roadCover.js';

test('local paved cover includes crossing pavement and excludes dirt', () => {
  const path = pts => ({ pts: pts.map(([x, z]) => ({ x, z })) });
  const paved = makePavedCover([
    { kind: 'street', path: path([[-100, 0], [100, 0]]) },
    { kind: 'dirt', path: path([[0, -100], [0, 100]]) },
  ]);
  assert.equal(paved(0, 0), true);
  assert.equal(paved(0, 50), false);
  assert.equal(paved(0, 9, 5), true);
});
