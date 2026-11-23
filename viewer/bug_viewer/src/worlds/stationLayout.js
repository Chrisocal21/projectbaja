// What a highway gas station or rest stop looks like and where you stand to use it (pure JS: the world draws it, the walker reads the spots).
// Every station is different but they share one theme: a canopy over a few pump islands, a store behind them with a glass front, a service bay, a wash
// spot and a pole sign. The brands are knock-offs (worlds/brands.js), never a real company. Frame: x across the lot, y up, z toward the road.
// parts: [x, y, z, w, h, d, colour]; spots: [x, z] positions you press E at.
import { GAS_BRANDS } from './brands.js';

const hash = (a, b, k = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
const pick = (list, h) => list[Math.min(list.length - 1, Math.floor(h * list.length))];
const WALLS = ['#d8cfae', '#c9bfa6', '#e2d9c4', '#b9c3c2', '#d9b99a', '#c8c1b4', '#e6e0cf'];

/** the stable look of one site: brand, pumps, store, bays, which side the pole sign stands */
export function variantOf(site) {
  const x = Math.round(site.x), z = Math.round(site.z), h = k => hash(x, z, k);
  return {
    brand: Math.floor(h(1) * GAS_BRANDS.length),
    islands: 1 + Math.floor(h(2) * 3),            // pump islands under the canopy (2 pumps each)
    storeW: 9 + Math.floor(h(3) * 8),             // 9..16 m
    storeD: 5 + Math.floor(h(4) * 3),             // 5..7 m
    storeX: Math.round((h(5) - 0.5) * 8),
    bays: 1 + Math.floor(h(6) * 2),               // service bays
    wall: pick(WALLS, h(7)),
    signSide: h(8) < 0.5 ? -1 : 1,
    signH: 7 + Math.floor(h(9) * 5),
    washLeft: h(10) < 0.5,
    ice: h(11) < 0.6,
    tires: h(12) < 0.5,
  };
}

/** local (x, z) -> world, for a site facing the road along local +z */
export const siteToWorld = (s, lx, lz) => [s.x + lx * Math.cos(s.ry) + lz * Math.sin(s.ry), s.z - lx * Math.sin(s.ry) + lz * Math.cos(s.ry)];

export function stationLayout(site) {
  if (site.type === 'rest') return restLayout();
  const v = variantOf(site), b = GAS_BRANDS[v.brand], parts = [], spots = { pump: [] };
  const { storeW: sw, storeD: sd, storeX: sx } = v, back = -11, front = back + sd / 2;
  // the store: walls, roof, glass front with a door, an awning over the door
  parts.push([sx, 2, back, sw, 4, sd, v.wall], [sx, 4.2, back, sw + 0.8, 0.35, sd + 0.8, b.bg]);
  parts.push([sx - sw * 0.12, 1.5, front + 0.04, sw * 0.5, 1.8, 0.08, '#3b5668'], [sx + sw * 0.28, 1.2, front + 0.05, 1.3, 2.4, 0.1, '#2b3338']);
  parts.push([sx, 3.2, front + 0.9, sw * 0.8, 0.18, 1.8, b.accent]);
  if (v.ice) parts.push([sx + sw / 2 - 1.2, 0.5, front + 0.9, 1.7, 1, 0.7, '#cfd8dc']);
  if (v.tires) parts.push([sx - sw / 2 + 1.1, 0.7, front + 0.9, 1.1, 1.4, 1.1, '#222']);
  // the service bays: a shed against the store's side with a roll-up door
  const bayW = 4.2 * v.bays, bayX = sx - sw / 2 - bayW / 2 - 0.2;
  parts.push([bayX, 1.8, back, bayW, 3.6, sd, '#aeb2b0'], [bayX, 3.7, back, bayW + 0.5, 0.3, sd + 0.5, b.bg], [bayX, 1.3, back + sd / 2 + 0.05, bayW - 1, 2.6, 0.1, '#4a4f52']);
  spots.fix = [bayX, back + sd / 2 + 2.6];
  spots.shop = [sx + sw * 0.28, front + 1.4];
  // the canopy over the pump islands
  const cw = 6 + v.islands * 4.5;
  parts.push([0, 5, 4, cw, 0.6, 8, b.bg], [0, 4.55, 4, cw, 0.3, 8.1, b.accent]);
  for (const cx of [-cw / 2 + 0.5, cw / 2 - 0.5]) for (const cz of [0.5, 7.5]) parts.push([cx, 2.5, cz, 0.4, 5, 0.4, '#e8e8e8']);
  for (let i = 0; i < v.islands; i++) {
    const ix = (i - (v.islands - 1) / 2) * 4.5;
    parts.push([ix, 0.1, 4, 1.4, 0.2, 5, '#9a9a96']);
    for (const dz of [-1, 1]) { parts.push([ix, 0.9, 4 + dz * 0.2, 0.8, 1.7, 0.6, '#f0f0f0'], [ix, 1.5, 4 + dz * 0.52, 0.5, 0.5, 0.05, b.accent]); }
    spots.pump.push([ix, 4]);
  }
  // the pole sign by the road, and the wash spot on the far side from the bays
  const px = v.signSide * (cw / 2 + 5);
  parts.push([px, v.signH / 2, 14, 0.3, v.signH, 0.3, '#888'], [px, v.signH + 1.1, 14, 3.4, 2.2, 0.25, b.bg]);
  const wx = (v.washLeft ? -1 : 1) * (cw / 2 + 5.5);
  parts.push([wx - 2.1, 1.6, -4, 0.4, 3.2, 5.5, '#bfc4c6'], [wx + 2.1, 1.6, -4, 0.4, 3.2, 5.5, '#bfc4c6'], [wx, 3.4, -4, 4.8, 0.4, 5.5, b.accent]);
  spots.wash = [wx, -1.4];
  spots.sign = { x: px, y: v.signH + 1.1, z: 14.15, w: 3.2, h: 2.0 };
  spots.storeSign = { x: sx, y: 3.3, z: front + 0.16, w: Math.min(6, sw * 0.7), h: 1.2 };
  return { parts, spots, brand: v.brand, v };
}

function restLayout() {
  const parts = [[0, 1.6, -14, 7, 3.2, 4, '#c9bfa6'], [-6, 3.4, 2, 8, 0.3, 5, '#8a5a3a'],
    [-9.4, 1.6, 0.2, 0.3, 3.2, 0.3, '#6b4a30'], [-2.6, 1.6, 0.2, 0.3, 3.2, 0.3, '#6b4a30'], [-9.4, 1.6, 3.8, 0.3, 3.2, 0.3, '#6b4a30'], [-2.6, 1.6, 3.8, 0.3, 3.2, 0.3, '#6b4a30'],
    [5, 0.5, -2, 2.2, 0.9, 1.4, '#7a5530'], [5, 0.5, 4, 2.2, 0.9, 1.4, '#7a5530'], [10, 0.5, 1, 2.2, 0.9, 1.4, '#7a5530'],
    [0, 2, 19, 0.2, 4, 0.2, '#888'], [0, 4.2, 19, 3.2, 1.8, 0.15, '#1d4f91'],
    // a hose post (wash) and a tool and air stand (basic fixes)
    [-13, 0.6, -6, 0.5, 1.2, 0.5, '#2f7fb5'], [-13, 1.3, -6, 1.2, 0.2, 0.2, '#c8372d'],
    [13, 0.7, -6, 0.9, 1.4, 0.6, '#d9a21b'], [13, 1.5, -6, 0.5, 0.4, 0.5, '#2b3338']];
  return { parts, spots: { pump: [], wash: [-13, -4], fix: [13, -4] }, brand: -1, v: null };
}
