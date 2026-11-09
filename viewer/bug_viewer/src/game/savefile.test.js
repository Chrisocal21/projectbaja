import test from 'node:test';
import assert from 'node:assert/strict';
import { exportFilename, compareVersion, validateImport, parseVersionFile, isNewRelease } from './savefile.js';
import { wrap, CURRENT } from './saveFormat.js';

test('export filename', () => assert.equal(exportFilename(new Date(2026, 10, 8)), 'projectbaja-main-2026-11-08.baja-save.json'));
test('compareVersion', () => { assert.equal(compareVersion(0), -1); assert.equal(compareVersion(CURRENT), 0); assert.equal(compareVersion(CURRENT + 1), 1); });
test('import accepts a current envelope', () => { const r = validateImport(JSON.stringify(wrap({ cash: 5 }))); assert.equal(r.ok, true); });
test('import refuses junk, bare blobs, newer and corrupt', () => {
  assert.equal(validateImport('').ok, false);
  assert.equal(validateImport('not json').ok, false);
  assert.equal(validateImport('{"cash":5}').ok, false);
  assert.equal(validateImport(JSON.stringify({ ...wrap({}), version: CURRENT + 1 })).ok, false);
  assert.equal(validateImport(JSON.stringify({ format: 'baja-save', version: 'x', data: {} })).ok, false);
});
test('version file + release check', () => {
  assert.equal(parseVersionFile('{"id":"abc"}'), 'abc'); assert.equal(parseVersionFile('<html>'), null);
  assert.equal(isNewRelease('a', 'b'), true); assert.equal(isNewRelease('a', 'a'), false);
  assert.equal(isNewRelease('dev', 'b'), false); assert.equal(isNewRelease('a', null), false);
});
