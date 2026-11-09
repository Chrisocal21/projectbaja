// Deterministic scatter of trees / bushes / rocks (pure). Same chunk -> same plants, always.
import { hash2, vnoise } from './noise.js';
import { smooth } from '../kit.js';

export const CHUNK = 160;   // metres; the renderer builds chunks near you and drops them when you leave

/**
 * Plants for one chunk of one biome: [{ kind, x, z, s, ry, tint, rule }].
 * ctx = { weight(def,x,z), height(x,z), onRoad(x,z), trailDist(x,z), riverDist(x,z), trailHalf, riverHalf }
 * Candidates per hectare come from rule.density; clustering noise and the rules then thin them out.
 */
export function scatterChunk(def, ix, iz, ctx) {
  const out = [], x0 = ix * CHUNK, z0 = iz * CHUNK, ha = CHUNK * CHUNK / 1e4;
  def.scatter.forEach((rule, ri) => {
    const n = Math.round(rule.density * ha), seed = ri * 101 + (def.region.seed | 0);
    for (let k = 0; k < n; k++) {
      const x = x0 + hash2(ix * 7919 + k, iz, seed) * CHUNK, z = z0 + hash2(ix, iz * 7919 + k, seed + 1) * CHUNK;
      if (ctx.weight(def, x, z) < (rule.minWeight ?? 0.2)) continue;
      if (rule.cluster && vnoise(x / rule.cluster.scale, z / rule.cluster.scale, rule.cluster.seed) < rule.cluster.above) continue;
      if (ctx.onRoad(x, z) || ctx.trailDist(x, z) < (ctx.trailHalf ?? 2.5) + 2 || ctx.riverDist(x, z) < (ctx.riverHalf ?? 6) + 2) continue;
      const h = ctx.height(x, z);
      if (rule.maxHeight != null && hash2(ix * 31 + k, iz, seed + 2) > 1 - smooth(rule.maxHeight - 30, rule.maxHeight, h)) continue;
      const slope = Math.abs(ctx.height(x + 2, z) - h) / 2 + Math.abs(ctx.height(x, z + 2) - h) / 2;
      if (slope > (rule.maxSlope ?? 1)) continue;
      const [a, b] = rule.scale;
      out.push({ kind: rule.kind, x, z, s: a + (b - a) * hash2(ix + k, iz * 3, seed + 3), ry: hash2(ix, iz + k * 5, seed + 4) * Math.PI * 2, tint: rule.tints[Math.floor(hash2(ix * 5 + k, iz, seed + 5) * rule.tints.length)], rule: ri });
    }
  });
  return out;
}
