import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICE, CAMPER, STAIRS, LOFT, walkingLevel, inOffice } from './office.js';

test('office is attached left, camper and door are right, forecourt stays clear', () => {
  assert.equal(OFFICE.x1, -7);
  assert.ok(CAMPER.x > 18 && CAMPER.doorX < CAMPER.x);
  assert.ok(inOffice(-11, 0));
  assert.ok(!inOffice(0, 15));
  assert.ok(!inOffice(11, 0));
});
test('stairs rise in walkable increments and meet the loft without a gap', () => {
  let previous = STAIRS.bottom;
  for (let i = 0; i <= 180; i++) {
    const level = walkingLevel(-8.3, 4 - i / 30, previous);
    assert.ok(level >= previous - 1e-8);
    assert.ok(level - previous <= 1 / 6 + 1e-8);
    previous = level;
  }
  assert.equal(previous, LOFT.y);
  assert.equal(walkingLevel(-8.3, -2.05, previous), LOFT.y);
  assert.equal(walkingLevel(-11, -4, previous), LOFT.y);
});
test('bathroom underneath loft remains at ground level; stairs descend to reception', () => {
  assert.equal(walkingLevel(-11, -4, 0.12), 0.12);
  let previous = LOFT.y;
  for (let i = 0; i <= 180; i++) {
    const level = walkingLevel(-8.3, -2 + i / 30, previous);
    assert.ok(level <= previous + 1e-8);
    assert.ok(previous - level <= 1 / 6 + 1e-8);
    previous = level;
  }
  assert.equal(previous, 0.12);
});
