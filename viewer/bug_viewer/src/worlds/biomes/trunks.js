// Trunk colliders for biome trees and big rocks (pure). Chunks of plants register their colliders when built and drop them when
// unloaded; queries use a spatial hash so a frame only looks at the few trunks round the car or walker.
// A collider is [x, z, r, top] (the same shape as siteData obstacles: x, z, radius, height above which it no longer blocks).

/** radius of the trunk (or boulder) of a plant, or 0 when it is too small to block you (bushes, small rocks) */
export function trunkRadius(it) {
  if (it.kind === 'conifer') return 0.34 * it.s;
  if (it.kind === 'broadleaf') return 0.4 * it.s;
  if (it.kind === 'rock') return it.s >= 1.2 ? 0.95 * it.s : 0;
  return 0;
}
/** collider for one scatter item standing on ground height gy, or null. Trees block at any height (99); a rock is only as tall as it is. */
export function colliderOf(it, gy) {
  const r = trunkRadius(it); if (!r) return null;
  return [it.x, it.z, r, it.kind === 'rock' ? gy + 0.8 * it.s : 99];
}

export function createTrunkGrid(cell = 16) {
  const chunks = new Map(), cells = new Map();   // chunk key -> [colliders]; cell key -> [colliders]
  let version = 0, cache = { cx: NaN, cz: NaN, version: -1, list: [] };
  const key = (a, b) => a * 73856093 ^ b * 19349663;
  const cellOf = v => Math.floor(v / cell);
  function remove(id) {
    const old = chunks.get(id); if (!old) return;
    for (const c of old) { const k = key(cellOf(c[0]), cellOf(c[1])), l = cells.get(k); if (!l) continue; const i = l.indexOf(c); if (i >= 0) l.splice(i, 1); if (!l.length) cells.delete(k); }
    chunks.delete(id); version++;
  }
  /** replace everything a chunk owns */
  function set(id, list) {
    remove(id); if (!list.length) return;
    chunks.set(id, list);
    for (const c of list) { const k = key(cellOf(c[0]), cellOf(c[1])); (cells.get(k) || cells.set(k, []).get(k)).push(c); }
    version++;
  }
  /** colliders within `reach` metres (default 10) of (x, z), cached while you stay in the same cell and nothing changed. Do not mutate the result. */
  function near(x, z, reach = 10) {
    const cx = cellOf(x), cz = cellOf(z);
    if (cache.cx === cx && cache.cz === cz && cache.version === version && cache.reach === reach) return cache.list;
    const R = Math.ceil((reach + cell) / cell), list = [];
    for (let a = cx - R; a <= cx + R; a++) for (let b = cz - R; b <= cz + R; b++) { const l = cells.get(key(a, b)); if (l) for (const c of l) list.push(c); }
    cache = { cx, cz, version, reach, list }; return list;
  }
  return { set, remove, near, size: () => { let n = 0; for (const l of chunks.values()) n += l.length; return n; } };
}
/** the one shared grid the renderer fills and the vehicle / walker query */
export const TRUNKS = createTrunkGrid();
