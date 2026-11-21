import test from 'node:test';
import assert from 'node:assert/strict';
import { REAL_PLACES, projectPlace } from './realPlaces.js';
import meta from '../../public/terrain/border.json' with { type: 'json' };

test('real place projection uses the same origin and bounds as the terrain', () => {
  const home = projectPlace(meta.home[0], meta.home[1], meta);
  assert.ok(Math.abs(home.x) < 1e-9 && Math.abs(home.z) < 1e-9);
  for (const place of REAL_PLACES) {
    const { x, z } = projectPlace(place.lat, place.lon, meta);
    assert.ok(x >= meta.x0 && x <= meta.x0 + (meta.nx - 1) * meta.cell, place.name);
    assert.ok(z >= meta.z0 && z <= meta.z0 + (meta.nz - 1) * meta.cell, place.name);
  }
});
