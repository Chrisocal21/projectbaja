// Where the trees and plants grow in Baja County (pure data, deterministic). Models: public/models/ENV_Trees.glb + ENV_Plants.glb
// (assets/pipeline/export_plants.py). Trees: shade around the farm, grandpa's yard, Dry Wells, a canyon spring and the low washes.
// Plants: dead grass + grass bushes over the scrub, ferns and nettles in the shade of the farm and the canyon spring.
import { SITES, toWorld, onCore, baseHeight, biomeMasks, HALF } from './county.js';

const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const clearOf = (x, z, pad) => !onCore(x, z) && !onCore(x + 2, z) && !onCore(x - 2, z) && !onCore(x, z + 2) && !onCore(x, z - 2) && !Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r + pad);

// ---------------- trees: [x, z, model, scale, ry] ----------------
export const TREES = [];
const r = rnd(2024), T = (x, z, s = 1, kind) => TREES.push([x, z, kind || (r() < 0.5 ? 'TREE_A' : 'TREE_B'), s * (0.85 + r() * 0.4), r() * 6.28]);
// grandpa's yard: a big old cottonwood behind the trailer + two by the fence line
for (const [lx, lz, s] of [[-34, -12, 1.9], [-18, -30, 1.6], [34, 6, 1.7]]) { const [x, z] = toWorld(SITES.garage, lx, lz); T(x, z, s, 'TREE_A'); }
// Hollis farm: a windbreak row along the lane and a grove round the barn
for (let x = -430; x < -20; x += 26) T(x + (r() - 0.5) * 4, 512 + (r() - 0.5) * 3, 1.5);
for (const [lx, lz] of [[-25, -6], [-26, 7], [-22, 18], [24, -14], [25, 13], [-6, -27], [9, -28], [-17, -24]]) { const [x, z] = toWorld(SITES.barn, lx, lz); T(x, z, 1.7); }
// Dry Wells: street trees along main street
for (let x = 470; x <= 880; x += 34) for (const z of [289, 312]) if (clearOf(x, z, 4) && r() < 0.8) T(x, z, 1.3);
// a spring in Red Rock Canyon, by the old shack
for (let i = 0; i < 9; i++) { const a = i * 0.7, d = 14 + r() * 16; T(SITES.shack1.x + Math.cos(a) * d, SITES.shack1.z + Math.sin(a) * d, 1.5); }
// lone trees in the low washes of the scrub
for (let t = 0, n = 0; n < 45 && t < 20000; t++) {
  const x = (r() - 0.5) * 2600, z = (r() - 0.5) * 2600, m = biomeMasks(x, z);
  if (baseHeight(x, z) > -3.5 || m.lake > 0.1 || m.dunes > 0.2 || m.pg > 0.3 || !clearOf(x, z, 12)) continue;
  T(x, z, 1.4); n++;
}
for (let i = TREES.length - 1; i >= 0; i--) if (!clearOf(TREES[i][0], TREES[i][1], 1)) TREES.splice(i, 1);
/** trunk colliders [x, z, r, top] */
export const TREE_COLLIDERS = TREES.map(([x, z, , s]) => [x, z, 0.35 * s, 99]);

// ---------------- plants, grouped into 250 m blocks so far ones can be skipped ----------------
export const BLOCK = 250, NB = Math.ceil((HALF * 2) / BLOCK);
export const blockOf = (x, z) => Math.min(NB - 1, Math.max(0, Math.floor((x + HALF) / BLOCK))) * NB + Math.min(NB - 1, Math.max(0, Math.floor((z + HALF) / BLOCK)));
/** { model: [[x, z, scale, ry, block], ...] }; `dry` models are tinted to sun-bleached khaki in the desert */
export const PLANTS = { GRASS_DEAD_1: [], GRASS_DEAD_2: [], BUSH_GRASS_1: [], BUSH_GRASS_2: [], BUSH_GRASS_3: [], FERN_1: [], FERN_2: [], FERN_3: [], NETTLE_1: [], NETTLE_2: [] };
const p = rnd(77), put = (k, x, z, s) => PLANTS[k].push([x, z, s * (0.7 + p() * 0.6), p() * 6.28, blockOf(x, z)]);
const pick = a => a[Math.floor(p() * a.length)];
// (grass and grass bushes are not stored: Flora.jsx grows them in a field that follows you, see grassAt below)
// shade plants: under every tree, plus the canyon spring
for (const [x, z, , s] of TREES) for (let k = 0; k < 4; k++) { const a = p() * 6.28, d = 1 + p() * 2.5 * s, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (clearOf(px, pz, 1)) put(pick(['FERN_1', 'FERN_2', 'FERN_3', 'NETTLE_1', 'NETTLE_2']), px, pz, 1); }
/** desert plants are bleached; farm / shade plants keep their green */
export const DRY_TINT = '#d9c48f';
export const isDry = (x, z) => { const m = biomeMasks(x, z); return m.farm < 0.4; };

const hash = (ix, iz, k) => { let h = (ix * 374761393 + iz * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** the grass growing in one 3.5 m cell (or null): deterministic, so it is always the same clump in the same place */
export const GRASS_CELL = 3.5;
export function grassAt(ix, iz, surfaceAt) {
  const x0 = (ix + hash(ix, iz, 1)) * GRASS_CELL, z0 = (iz + hash(ix, iz, 2)) * GRASS_CELL;
  if (onCore(x0, z0)) return null;
  const sf = surfaceAt(x0, z0).key, m = biomeMasks(x0, z0);
  const chance = { scrub: 0.5, dirt: 0.28, redDirt: 0.3, grass: 0.65, sand: m.dunes > 0.4 ? 0.04 : 0.16, looseDirt: 0.12, rock: 0.06 }[sf] || 0;
  if (hash(ix, iz, 3) > chance || baseHeight(x0, z0) > 38) return null;
  if (Object.values(SITES).some(s => Math.hypot(x0 - s.x, z0 - s.z) < s.r * (s.id === 'garage' ? 0.45 : 1))) return null;
  const r = hash(ix, iz, 4), bush = sf === 'grass' ? r < 0.6 : r < 0.62;
  const model = bush ? ['BUSH_GRASS_1', 'BUSH_GRASS_2', 'BUSH_GRASS_3'][Math.floor(hash(ix, iz, 5) * 3)] : ['GRASS_DEAD_1', 'GRASS_DEAD_2'][Math.floor(hash(ix, iz, 5) * 2)];
  return { model, x: x0, z: z0, s: (bush ? 0.55 : 1.3) + hash(ix, iz, 6) * (bush ? 0.6 : 0.9), ry: hash(ix, iz, 7) * 6.28, dry: m.farm < 0.4 };
}
