// Ground cover on the live map: binds the pure rules in groundCover.js to the county (heights, surfaces, roads, built places).
// Used by the terrain colours (County.jsx), the grass layer and windbreak trees (Flora.jsx) and the desert scatter (it stays out of the fields).
import { REAL } from './world.js';
import { border } from './border.js';
import { height, surface, onCore, SITES, biomeMasks, washAt } from './county.js';
import { makeValley, coverFrom, windbreaks, EMPTY, smooth } from './groundCover.js';

const VALLEY = REAL && border() ? makeValley(border().meta) : null;
const G = SITES.garage;

/** 0..1: how much of (x, z) is farmland. Built and wild places of the home county keep their own ground, and the garage keeps a
 *  dirt yard with desert round it before the first field (PROPOSAL: fields start about 60 m out). */
export function valleyAt(x, z) {
  if (!VALLEY) return 0;
  let v = VALLEY(x, z); if (!v) return 0;
  const m = biomeMasks(x, z);
  v *= 1 - Math.min(1, Math.max(m.town, m.pg, m.lake, m.canyon, m.dunes, m.bio) * 1.6);
  v *= smooth(45, 80, Math.hypot(x - G.x, z - G.z));
  return v > 0.02 ? v : 0;
}

/** the built places' own ground: nothing grows on the pads, the customer lot or the garage yard's middle */
export function builtAt(x, z) {
  if (Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r * (s.id === 'garage' ? 0.45 : 1))) return true;
  const dx = x - G.x, dz = z - G.z; return Math.abs(dx) < 19 && dz > -8 && dz < 46;   // the customer lot stays bare (garage faces +z)
}

const slopeAt = (x, z) => (Math.abs(height(x + 2, z) - height(x - 2, z)) + Math.abs(height(x, z + 2) - height(x, z - 2))) / 4;
/** 0..1: beside a road (its ditch), from a few samples either side */
function shoulderAt(x, z) {
  for (const [d, w] of [[4.5, 1], [8, 0.55]]) if (onCore(x + d, z) || onCore(x - d, z) || onCore(x, z + d) || onCore(x, z - d)) return w;
  return 0;
}

/** full cover at (x, z) for the grass layer. tree = 0..1 shade of a nearby tree (the caller knows the trees). */
export function coverAt(x, z, tree = 0) {
  if (onCore(x, z) || builtAt(x, z)) return EMPTY;
  const dg = Math.hypot(x - G.x, z - G.z);
  return coverFrom(x, z, { surface: surface(x, z).key, slope: slopeAt(x, z), valley: valleyAt(x, z), wash: washAt(x, z), shoulder: shoulderAt(x, z), tree, yard: dg < 60 ? smooth(60, 25, dg) : 0 });
}
/** cheap cover for the terrain colours (no road-ditch samples): the caller already has the surface, slope and core flag */
export function coverLite(x, z, sfKey, slope, core) {
  if (core) return EMPTY;
  return coverFrom(x, z, { surface: sfKey, slope, valley: valleyAt(x, z), wash: sfKey === 'scrub' || sfKey === 'dirt' ? washAt(x, z) : 0 });
}

const clearForTree = (x, z) => !onCore(x, z) && !onCore(x + 4, z) && !onCore(x - 4, z) && !onCore(x, z + 4) && !onCore(x, z - 4) && !builtAt(x, z) && !Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r + 8);
let WB = null;
/** windbreak trees along field edges: [[x, z, scale, ry, type], ...] (worked out once) */
export const valleyTrees = () => (WB ??= VALLEY ? windbreaks(Object.assign((x, z) => valleyAt(x, z), { bounds: VALLEY.bounds }), clearForTree).map(t => (t.push(height(t[0], t[1])), t)) : []);
