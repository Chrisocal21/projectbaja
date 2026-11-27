import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meshIs, meshOnly, MAT_CLAIMED } from './meshMatch.js';

const lamp = { material: { name: 'B-taillight1' } }, skin = { material: { name: 'B-paint1' } }, F = 'B_Body_Fender_RL';
test('the tail lamps built into a rear fender belong to the Taillights', () => {
  assert.ok(meshIs(lamp, F, ['B_Tailights', 'mat:B-taillight1']), 'taillights off hides them');
  assert.ok(!meshIs(skin, F, ['B_Tailights', 'mat:B-taillight1']), 'and leaves the fender skin');
  assert.ok(meshIs(lamp, F, [F]), 'fender off hides them too');
  assert.ok(!meshOnly(lamp, F, [F]), 'a loose fender comes without lamps');
  assert.ok(meshOnly(skin, F, [F]));
  assert.ok(meshOnly(lamp, F, ['B_Tailights', 'mat:B-taillight1']));
});
test('every body with taillights claims them, ahead of the rear fenders', () => {
  for (const b of JSON.parse(readFileSync(new URL('./catalog/bodies.json', import.meta.url)))) {
    const ids = (b.pieces || []).map(p => p.id), t = (b.pieces || []).find(p => p.id === 'taillights'); if (!t) continue;
    for (const m of MAT_CLAIMED) assert.ok(t.match.includes('mat:' + m));
    assert.ok(ids.indexOf('taillights') < ids.indexOf('fenderRL'));
  }
});
