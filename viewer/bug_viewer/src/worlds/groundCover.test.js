import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeValley, fieldAt, coverFrom, clumpAt, windbreaks, FIELD, CROPS, CLUMP_CELL, vnoise, EMPTY } from './groundCover.js';
import { projectPlace } from '../game/realPlaces.js';

const meta = JSON.parse(readFileSync(new URL('../../public/terrain/border.json', import.meta.url)));
const valley = makeValley(meta), at = (lat, lon) => { const p = projectPlace(lat, lon, meta); return valley(p.x, p.z); };

test('the farmland covers the real valley towns, not the desert round it', () => {
  for (const [lat, lon] of [[32.95, -115.55], [32.792, -115.563], [32.979, -115.53], [32.811, -115.38], [32.628, -115.454], [33.037, -115.621]]) assert.ok(at(lat, lon) > 0.9, `${lat},${lon}`);
  for (const [lat, lon] of [[32.77, -116.0], [32.95, -115.1], [33.4, -115.85], [32.4, -115.6], [34.0, -117.0]]) assert.equal(at(lat, lon), 0, `${lat},${lon}`);
});

test('fields tile a north-south grid; every field has a known crop and a ditch bank', () => {
  const f = fieldAt(10, 10); assert.ok(CROPS[f.crop]); assert.equal(f.edge, 10);
  assert.deepEqual([fieldAt(FIELD.w + 1, 1).fx, fieldAt(-1, -1).fz], [1, -1]);
  const crops = new Set(); for (let i = 0; i < 60; i++) crops.add(fieldAt(i * FIELD.w + 5, 7).crop);
  assert.ok(crops.size >= 4);
});

test('cover: bare on rock and paving, thin on open desert, greener in washes and ditches, crops in the valley', () => {
  assert.equal(coverFrom(0, 0, { surface: 'asphalt' }), EMPTY);
  assert.equal(coverFrom(0, 0, { surface: 'scrub', excluded: true }), EMPTY);
  const open = coverFrom(5, 5, { surface: 'scrub', slope: 0 }), wash = coverFrom(5, 5, { surface: 'scrub', slope: 0, wash: 1 }), ditch = coverFrom(5, 5, { surface: 'scrub', slope: 0, shoulder: 1 });
  assert.ok(open.dry > 0.2 && open.green < 0.05);
  assert.ok(wash.green > open.green + 0.3 && ditch.dry > open.dry);
  assert.ok(coverFrom(5, 5, { surface: 'scrub', slope: 0.6 }).dry < 0.05);   // steep: almost nothing
  let x = 10; while (fieldAt(x, 20).crop !== 'alfalfa') x += FIELD.w;
  const field = coverFrom(x, 20, { surface: 'scrub', slope: 0, valley: 1 });
  assert.equal(field.crop, 'alfalfa'); assert.ok(field.green > 0.8);
  const bank = coverFrom(x, 1, { surface: 'scrub', slope: 0, valley: 1 });
  assert.ok(bank.edge && !bank.crop && bank.dry > 0.5);
});

test('clumps are deterministic, sit in their cell (or on a crop row) and only where cover allows', () => {
  const cover = () => ({ dry: 0.6, green: 0.3, crop: null, edge: false });
  let n = 0;
  for (let ix = 0; ix < 40; ix++) for (let iz = 0; iz < 40; iz++) {
    const c = clumpAt(ix, iz, cover); if (!c) continue; n++;
    assert.deepEqual(c, clumpAt(ix, iz, cover));
    assert.ok(c.x >= ix * CLUMP_CELL && c.x <= (ix + 1) * CLUMP_CELL && c.s > 0.5);
  }
  assert.ok(n > 300 && n < 1600, String(n));
  assert.equal(clumpAt(3, 3, () => EMPTY), null);
  const row = clumpAt(5, 9, () => ({ dry: 0, green: 0.9, crop: 'alfalfa' })) || clumpAt(6, 9, () => ({ dry: 0, green: 0.9, crop: 'alfalfa' }));
  const f = fieldAt(row.x, row.z), across = f.rowsAlongX ? row.z : row.x;
  assert.ok(Math.abs(across / 1.6 - Math.round(across / 1.6)) < 1e-6);
});

test('value noise is smooth and in 0..1', () => {
  for (let i = 0; i < 200; i++) { const v = vnoise(i * 3.7, i * -2.1, 14, 7); assert.ok(v >= 0 && v <= 1); }
  assert.ok(Math.abs(vnoise(100, 100, 14, 7) - vnoise(100.2, 100, 14, 7)) < 0.05);
});

test('windbreaks: rows of trees inside the valley, never where it is not clear', () => {
  const trees = windbreaks(valley, (x, z) => x > 0);
  assert.ok(trees.length > 200, String(trees.length));
  for (const [x, z, s, , type] of trees) { assert.ok(x > 0 && valley(x, z) >= 0.6 && s >= 0.65 && (type === 2 || type === 3)); }
});
