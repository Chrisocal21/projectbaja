// Where things are found: furniture, containers (toolboxes, drawers, boxes, crates) and loose-part spots
// inside the garage, barn, warehouse, shacks and gas station. Pure data + the new-game shuffle.
import { SITES, toWorld } from '../worlds/county.js';

const BENCH_TOP = 0.98;   // grandpa's letter lies on the bench at local x -2.6 (see siteData TARGETS)
// furniture: bench = workbench (2.4 m), rack = pallet rack (len m, 2 shelves)
const F = (site, type, lx, lz, ry = 0, len = 2.4) => ({ site, type, lx, lz, ry, len });
export const FURNITURE = [
  F('barn', 'bench', 7.3, 0.5, Math.PI / 2),
  F('warehouse', 'rack', -5, -7, 0, 9), F('warehouse', 'rack', 5.5, -7, 0, 9), F('warehouse', 'bench', -11.2, 0, Math.PI / 2, 3),
  F('shack1', 'bench', 0, -1.6, 0, 2.2), F('shack2', 'bench', 0, -1.6, 0, 2.2), F('shack3', 'bench', 0, -1.6, 0, 2.2),
  F('proving', 'rack', 0, -12.8, 0, 6),
];
// containers: toolbox (small parts + cash), drawer (tool chest), box (cardboard), crate (wooden)
const C = (id, site, type, lx, lz, ly = 0, ry = 0) => ({ id, site, type, lx, lz, ly, ry });
export const CONTAINERS = [
  C('g-toolbox', 'garage', 'toolbox', -1.2, -5.2, BENCH_TOP), C('g-chest', 'garage', 'drawer', 6.2, 4.2, 0, -Math.PI / 2),
  C('b-crate1', 'barn', 'crate', 2.6, -10.0), C('b-crate2', 'barn', 'crate', -5.7, 1.6, 0, 0.3), C('b-box', 'barn', 'box', -6.9, 3.4, 0, 0.2), C('b-toolbox', 'barn', 'toolbox', 7.3, 1.3, BENCH_TOP, Math.PI / 2),
  C('w-crate1', 'warehouse', 'crate', 6, -2, 0, 0.2), C('w-crate2', 'warehouse', 'crate', 9, 2), C('w-crate3', 'warehouse', 'crate', 7.6, 4.6, 0, -0.3),
  C('w-box1', 'warehouse', 'box', 10.8, -3.5), C('w-box2', 'warehouse', 'box', -6, 4.5, 0, 0.5), C('w-toolbox', 'warehouse', 'toolbox', -11.2, 1.1, BENCH_TOP, Math.PI / 2),
  C('w-chest', 'warehouse', 'drawer', -11.3, 5, 0, Math.PI / 2),
  C('s1-toolbox', 'shack1', 'toolbox', 0.6, -1.6, BENCH_TOP), C('s1-box', 'shack1', 'box', -1.9, 0.9), C('s1-chest', 'shack1', 'drawer', 2.2, 0.6, 0, -Math.PI / 2),
  C('s2-toolbox', 'shack2', 'toolbox', 0.6, -1.6, BENCH_TOP), C('s2-crate', 'shack2', 'crate', -1.8, 0.6),
  C('gas-box', 'gas', 'box', -11, -6.2, 0, 0.4),
  C('s3-toolbox', 'shack3', 'toolbox', 0.6, -1.6, BENCH_TOP), C('s3-crate', 'shack3', 'crate', -1.8, 0.6),
  C('pg-chest', 'proving', 'drawer', 4.6, -11.5, 0, -Math.PI / 2), C('pg-crate', 'proving', 'crate', -4.4, -8, 0, 0.2),
];
// loose parts: lying on benches, shelves and floors. max = biggest size that fits there
const S = (site, lx, lz, ly, max) => ({ site, lx, lz, ly, max });
export const SPOTS = [
  S('barn', 7.3, -0.4, BENCH_TOP, 2), S('barn', -2.5, -7, 0, 4), S('barn', 2, 3.5, 0, 3), S('barn', -4, -1, 0, 2),
  S('warehouse', -8, -7, 1.62, 2), S('warehouse', -2.5, -7, 0.17, 3), S('warehouse', 3.5, -7, 1.62, 2), S('warehouse', 8, -7, 0.17, 3),
  S('warehouse', -11.2, -1, BENCH_TOP, 2), S('warehouse', 0, -3, 0, 4), S('warehouse', -4, 1, 0, 3), S('warehouse', 3.5, 2.5, 0, 2),
  S('shack1', -0.5, -1.6, BENCH_TOP, 2), S('shack2', -0.5, -1.6, BENCH_TOP, 2), S('shack2', 1.6, 0.8, 0, 3), S('shack3', -0.5, -1.6, BENCH_TOP, 2),
  S('proving', -2, -12.8, 1.62, 2), S('proving', 2, -12.8, 0.17, 3), S('proving', 0, -9, 0, 4),
];
export const CONTAINER_RULES = {
  toolbox: { max: 1, n: [1, 2], cash: [10, 60], label: 'toolbox', r: 0.35 },
  drawer: { max: 1, n: [0, 2], cash: [5, 45], label: 'tool chest', r: 0.5 },
  box: { max: 2, n: [1, 1], cash: [0, 0], label: 'cardboard box', r: 0.4 },
  crate: { max: 3, n: [1, 1], cash: [0, 25], label: 'wooden crate', r: 0.6 },
};

const place = o => { const s = SITES[o.site], [x, z] = toWorld(s, o.lx, o.lz); return { ...o, x, z, y: s.y + (o.ly || 0), wry: s.rot + (o.ry || 0) }; };
export const containers = CONTAINERS.map(place), spots = SPOTS.map(place), furniture = FURNITURE.map(place);
export const containerById = Object.fromEntries(containers.map(c => [c.id, c]));

/** circles the walker / car bump into */
export const LOOT_COLLIDERS = (() => {
  const out = [];
  for (const f of furniture) { const s = SITES[f.site], n = Math.max(2, Math.round(f.len / 1.1)); for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5) * (f.len - 0.6); const [x, z] = toWorld(s, f.lx + Math.cos(f.ry) * t, f.lz - Math.sin(f.ry) * t); out.push([x, z, f.type === 'rack' ? 0.65 : 0.5, 99]); } }
  for (const c of containers) if (!c.ly) out.push([c.x, c.z, CONTAINER_RULES[c.type].r, 99]);
  return out;
})();

/** the garage's starting stock is fixed; everything else is shuffled per new game */
export const STARTER = { 'g-toolbox': { items: [['part', 'LIGHT_BumperPods']], cash: 40 }, garageBench: ['part', 'ACC_LightBar', -3.9, -5.2, BENCH_TOP], garageFloor: ['part', 'GUARD_MudFlaps', 4.2, 0.6, 0] };
