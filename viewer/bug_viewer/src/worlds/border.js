// The real border slice (docs/WORLD_MAP.md, PROPOSAL): heights and water from public/terrain/border.png, made by
// assets/pipeline/west_dem.py from public elevation data. Game metres, origin = Walt's Garage (Imperial Valley), north = -z.
// makeBorder() is pure (testable in node); loadBorder() fetches the file once in the browser.
import { SURFACES } from './kit.js';

export const SEA_Y = 0;   // the ocean surface
const SEA_FLOOR = -30;    // outside the data box: open sea

/** meta = border.json, H = Float32Array heights (m), M = Uint8Array mask (bit0 sea, bit1 Salton Sea) */
export function makeBorder(meta, H, M) {
  const { nx, nz, cell, x0, z0 } = meta, lakeY = meta.lakeLevel;
  for (let k = 0; k < M.length; k++) if (M[k] & 2) H[k] = Math.min(H[k], lakeY - 1.5);   // the data's Salton Sea is flat at its own surface: sink the bed so it is really under water
  const x1 = x0 + (nx - 1) * cell, z1 = z0 + (nz - 1) * cell;
  const at = (i, j) => H[j * nx + i];
  /** ground height, bilinear between the data cells */
  function heightAt(x, z) {
    const fx = (x - x0) / cell, fz = (z - z0) / cell;
    if (fx < 0 || fz < 0 || fx > nx - 1 || fz > nz - 1) return SEA_FLOOR;
    const i = Math.min(nx - 2, fx | 0), j = Math.min(nz - 2, fz | 0), tx = fx - i, tz = fz - j;
    return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - tz) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * tz;
  }
  /** mask bits at the nearest cell (outside the box: sea) */
  function maskAt(x, z) {
    const i = Math.round((x - x0) / cell), j = Math.round((z - z0) / cell);
    if (i < 0 || j < 0 || i >= nx || j >= nz) return 1;
    return M[j * nx + i];
  }
  /** the water surface over (x, z), or null: the ocean at SEA_Y, the Salton Sea at its own level (below sea level) */
  function waterAt(x, z) {
    const m = maskAt(x, z), h = heightAt(x, z);
    if ((m & 1) && h < SEA_Y) return SEA_Y;
    if ((m & 2) && h < lakeY + 0.3) return lakeY;
    return null;
  }
  /** Sand carried inland from a mapped shoreline, fading with distance and elevation. */
  function shoreAt(x, z) {
    const h = heightAt(x, z);
    if (h > 12) return 0;
    const around = [[0, 0], [80, 0], [-80, 0], [0, 80], [0, -80]]
      .map(([dx, dz]) => maskAt(x + dx, z + dz));
    const lakeNearby = around.some(mask => mask & 2);
    const bit = lakeNearby ? 2 : 1;
    if (!around.some(mask => mask & bit)) return 0;
    const level = bit === 2 ? lakeY : SEA_Y;
    if (h > level + 12 || h < level - 3) return 0;
    let proximity = 0;
    for (const radius of [20, 40, 80]) {
      const near = [[radius, 0], [-radius, 0], [0, radius], [0, -radius]]
        .some(([dx, dz]) => maskAt(x + dx, z + dz) & bit);
      if (near) { proximity = 1 - radius / 120; break; }
    }
    if (maskAt(x, z) & bit) proximity = 1;
    const rise = Math.max(0, Math.min(1, (level + 12 - h) / 10));
    return proximity * rise;
  }
  /** Broad, feathered ground regions derived from the real map's geography and relief. */
  function regionAt(x, z) {
    const h = heightAt(x, z);
    const south = Math.max(0, Math.min(1, (z - 4500) / 7000));
    const basin = Math.max(0, Math.min(1, (95 - h) / 95));
    return { south, basin: basin * (1 - south * 0.35), coast: shoreAt(x, z) };
  }
  /** PROPOSAL ground rules until real biomes come in (step 6): water, beach sand, rock on steep ground, high-country dirt, desert scrub */
  function surfaceAt(x, z) {
    const h = heightAt(x, z), w = waterAt(x, z);
    if (w != null && h < w - 0.4) return SURFACES.water;
    const slope = (Math.abs(heightAt(x + 4, z) - heightAt(x - 4, z)) + Math.abs(heightAt(x, z + 4) - heightAt(x, z - 4))) / 8;
    if (slope > 0.55) return SURFACES.rock;
    if (w != null || shoreAt(x, z) > 0.35) return SURFACES.sand;
    if (h > 180) return slope > 0.3 ? SURFACES.rock : SURFACES.dirt;
    return SURFACES.scrub;
  }
  return { meta, bounds: { x0, x1, z0, z1 }, heightAt, maskAt, waterAt, shoreAt, regionAt, surfaceAt, lakeY };
}

let data = null, pending = null;
/** fetch + decode border.png once; resolves to the makeBorder() object (browser only) */
export function loadBorder() {
  if (data) return Promise.resolve(data);
  return pending || (pending = (async () => {
    const meta = await (await fetch('/terrain/border.json')).json();
    const blob = await (await fetch('/terrain/' + meta.file)).blob();
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const px = g.getImageData(0, 0, bmp.width, bmp.height).data, n = meta.nx * meta.nz, H = new Float32Array(n), M = new Uint8Array(n);
    for (let k = 0; k < n; k++) { H[k] = (px[k * 4] * 256 + px[k * 4 + 1] - 32768) / 10; M[k] = Math.round(px[k * 4 + 2] / 100); }
    data = makeBorder(meta, H, M); return data;
  })());
}
/** the loaded world, or null while it is still loading */
export const border = () => data;
