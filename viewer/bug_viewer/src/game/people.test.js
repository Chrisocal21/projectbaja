import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CAST, MISC, personFor, clipFor } from './people.js';

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

test('every rigged model carries the clips the game plays', () => {
  for (const f of [...Object.values(CAST), ...MISC]) {
    const b = readFileSync(new URL(`../../public/models/${f}.glb`, import.meta.url));
    const names = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12))).animations.map(a => a.name);
    for (const d of [0, 100]) assert.ok(names.includes(clipFor(d)), `${f} ${clipFor(d)}`);
  }
  assert.equal(clipFor(1), 'talk'); assert.equal(clipFor(6), 'idle');
});
