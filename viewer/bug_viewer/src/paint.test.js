import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { partMaterial } from './paint.js';

const parts = JSON.parse(fs.readFileSync(new URL('./catalog/parts.json', import.meta.url), 'utf8'));
const glass = parts.find(p => p.material?.unpainted);

test('there is bare fiberglass in the catalogue', () => assert.ok(glass));

test('bare fiberglass stays flat white until the player paints the body', () => {
  const m = partMaterial(glass, { colors: {} });
  assert.equal(m.color, '#f3f3f0');
  assert.equal(m.roughness, 0.92);
});

test('painting the body paints the fiberglass, glossier than bare', () => {
  const m = partMaterial(glass, { colors: { paint: '#c0392b' } });
  assert.equal(m.color, '#c0392b');
  assert.ok(m.roughness < 0.6 && m.unpainted);
});

test('every fiberglass panel follows the same paint', () => {
  for (const p of parts.filter(x => x.material?.unpainted)) assert.equal(partMaterial(p, { colors: { paint: '#123456' } }).color, '#123456');
});

test('parts that are not bare fiberglass are untouched', () => {
  const other = parts.find(p => !p.material?.unpainted);
  assert.equal(partMaterial(other, { colors: { paint: '#c0392b' } }), other.material);
});

test('the same paint gives the same material object (stable for React)', () => {
  const b = { colors: { paint: '#c0392b' } };
  assert.equal(partMaterial(glass, b), partMaterial(glass, b));
});
