import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CAST, MISC, personFor } from './people.js';

test('every person has a model file, and cast faces are never used for strangers', () => {
  for (const f of [...Object.values(CAST), ...MISC]) assert.ok(existsSync(new URL(`../../public/models/${f}.glb`, import.meta.url)), f);
  assert.equal(new Set(Object.values(CAST)).size, Object.keys(CAST).length);
  assert.ok(MISC.every(f => !Object.values(CAST).includes(f)));
});

test('named customers look like themselves; those without a model keep the stand-in', () => {
  assert.equal(personFor({ id: 'belt' }), CAST.dusty);
  assert.equal(personFor({ id: 'battery' }), CAST.rosa);
  assert.ok(MISC.includes(personFor({ id: 'tire' })) && MISC.includes(personFor({ id: 'flatwheel' })));
  assert.equal(personFor({ id: 'oil' }), null);
});
