// Where the ground is soft enough to swallow a car (PURE, deterministic). Silt beds lie on the open flats and in a ring round the dry lakebeds; soft
// sand fills the bottoms of the deep washes and the hearts of the dunes. Roads, trails, towns and Walt's place are never soft. bogDown.js says what
// they do to a car. PROPOSAL: sizes and how common they are, tune by playing.

const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const fade = t => t * t * (3 - 2 * t);
/** smooth value noise 0..1 on a grid of `cell` metres */
function vnoise(x, z, cell, seed) {
  const gx = x / cell, gz = z / cell, i = Math.floor(gx), j = Math.floor(gz), fx = fade(gx - i), fz = fade(gz - j);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
/** 0..1 patchiness: big blobs with ragged edges */
export const patchAt = (x, z, seed = 11) => 0.7 * vnoise(x, z, SOFT_GROUND.cell, seed) + 0.3 * vnoise(x, z, SOFT_GROUND.cell / 3, seed + 7);

/** silt: the patch noise above this (open flats); lower near a dry lakebed's edge. washDeep / dunesDeep: how deep in a wash or dune field soft sand starts.
 *  awayFromHome: no soft ground this close to Walt's garage (m). */
export const SOFT_GROUND = { cell: 110, silt: 0.76, lakeSilt: 0.5, washDeep: 0.72, dunesDeep: 0.55, dunesPatch: 0.55, awayFromHome: 300 };

/** g: { x, z, wash 0..1, dunes 0..1, lake 0..1 (1 = on the lakebed), built (a town, a site, a farm...), home (m from Walt's) } -> 'silt' | 'softSand' | null */
export function softKind(g) {
  if (g.built || g.home < SOFT_GROUND.awayFromHome) return null;
  if (g.wash > SOFT_GROUND.washDeep) return 'softSand';
  const p = patchAt(g.x, g.z);
  if (g.dunes > SOFT_GROUND.dunesDeep && p > SOFT_GROUND.dunesPatch) return 'softSand';
  if (g.lake > 0.3 && g.lake <= 0.55 && p > SOFT_GROUND.lakeSilt) return 'silt';   // the powdery ring round a dry lake
  if (g.dunes < 0.2 && p > SOFT_GROUND.silt) return 'silt';
  return null;
}
