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
  // a convenience store: flat roof with a parapet and a brand-colour band, a long glass front with a mullion grid, a framed door, an awning on posts, a sidewalk
  parts.push([sx, 2, back, sw, 4, sd, v.wall], [sx, 4.15, back, sw + 0.4, 0.3, sd + 0.4, '#8f9290']);
  parts.push([sx, 4.75, front + 0.05, sw + 0.4, 0.9, 0.3, b.bg], [sx, 4.75, front + 0.22, sw * 0.8, 0.12, 0.05, b.accent]);   // the sign band and its accent line
  parts.push([sx - sw * 0.12, 1.6, front + 0.04, sw * 0.5, 1.9, 0.1, '#4d7287'], [sx - sw * 0.12, 1.6, front + 0.1, 0.1, 1.9, 0.06, '#d8dcdc'], [sx - sw * 0.12 - sw * 0.17, 1.6, front + 0.1, 0.1, 1.9, 0.06, '#d8dcdc'], [sx - sw * 0.12 + sw * 0.17, 1.6, front + 0.1, 0.1, 1.9, 0.06, '#d8dcdc'], [sx - sw * 0.12, 0.75, front + 0.1, sw * 0.5, 0.1, 0.06, '#d8dcdc']);
  parts.push([sx + sw * 0.28, 1.2, front + 0.05, 1.3, 2.4, 0.12, '#2b3338'], [sx + sw * 0.28, 1.25, front + 0.12, 1.0, 2.1, 0.04, '#4d7287'], [sx + sw * 0.28, 2.5, front + 0.1, 1.5, 0.12, 0.1, '#d8dcdc']);
  parts.push([sx, 3.35, front + 1.0, sw * 0.85, 0.16, 2.0, b.accent], [sx - sw * 0.4, 1.7, front + 1.9, 0.14, 3.4, 0.14, '#d8dcdc'], [sx + sw * 0.4, 1.7, front + 1.9, 0.14, 3.4, 0.14, '#d8dcdc']);
  parts.push([sx, 0.1, front + 1.4, sw + 1, 0.2, 2.8, '#a8a8a3']);
  parts.push([sx + sw * 0.28 + 1.6, 1.0, front + 0.45, 0.9, 2, 0.8, '#d8dcdc'], [sx - sw / 2 - 0.2, 0.6, back + sd / 2 - 0.9, 0.5, 1.2, 0.9, '#2f6b94']);   // a vending/ATM kiosk by the door, an air machine at the corner
  parts.push([sx + sw / 2 - 0.3, 5.5, back - 0.5, 1.6, 0.7, 1.6, '#aab0b2'], [sx - sw / 2 + 2, 5.4, back + 0.5, 1.1, 0.5, 1.1, '#aab0b2']);   // roof units
  parts.push([sx + sw / 2 + 2.6, 0.9, back - sd / 2 + 0.6, 2.6, 1.8, 1.4, '#3f6b3a'], [sx + sw / 2 + 2.6, 1.85, back - sd / 2 + 0.6, 2.8, 0.12, 1.5, '#2c4a29']);   // the dumpster
  if (v.ice) parts.push([sx + sw / 2 - 1.4, 0.55, front + 0.9, 1.7, 1.1, 0.7, '#cfd8dc'], [sx + sw / 2 - 1.4, 1.15, front + 0.9, 1.8, 0.1, 0.8, b.accent]);
  if (v.tires) parts.push([sx - sw / 2 + 1.2, 0.7, front + 0.9, 1.2, 1.4, 1.1, '#222'], [sx - sw / 2 + 1.2, 1.5, front + 0.9, 1.3, 0.1, 1.2, '#b9302a']);
  // the service bays: a shed against the store's side with a roll-up door
  const bayW = 4.2 * v.bays, bayX = sx - sw / 2 - bayW / 2 - 0.2;
  parts.push([bayX, 1.8, back, bayW, 3.6, sd, '#aeb2b0'], [bayX, 3.7, back, bayW + 0.5, 0.3, sd + 0.5, b.bg], [bayX, 1.3, back + sd / 2 + 0.05, bayW - 1, 2.6, 0.1, '#4a4f52']);
  spots.fix = [bayX, back + sd / 2 + 2.6];
  spots.shop = [sx + sw * 0.28, front + 1.4];
  // the canopy over the pump islands
  const cw = 6 + v.islands * 4.5;
  parts.push([0, 5.3, 4, cw, 0.5, 8, '#dcdcd6'], [0, 5.05, 4.0, cw + 0.1, 0.55, 8.1, b.bg], [0, 4.7, 4.0, cw + 0.1, 0.1, 8.1, b.accent], [0, 4.95, 0, cw + 0.2, 0.5, 0.2, b.accent]);   // flat canopy roof with a brand-colour fascia
  parts.push([0, 4.5, 4, cw - 1, 0.08, 6.4, '#f4f1e2']);   // the light panel under it
  for (const cx of [-cw / 2 + 0.5, cw / 2 - 0.5]) for (const cz of [0.5, 7.5]) parts.push([cx, 2.3, cz, 0.45, 4.6, 0.45, '#e8e8e8'], [cx, 0.3, cz, 0.7, 0.6, 0.7, '#b9302a']);
  for (let i = 0; i < v.islands; i++) {
    const ix = (i - (v.islands - 1) / 2) * 4.5;
    parts.push([ix, 0.1, 4, 1.4, 0.2, 5, '#9a9a96'], [ix, 0.4, 1.7, 0.3, 0.8, 0.3, '#d9a21b'], [ix, 0.4, 6.3, 0.3, 0.8, 0.3, '#d9a21b']);   // the island and a bollard at each end
    for (const dz of [-1, 1]) { parts.push([ix, 0.9, 4 + dz * 0.2, 0.8, 1.7, 0.6, '#f0f0f0'], [ix, 1.5, 4 + dz * 0.52, 0.5, 0.5, 0.05, b.accent], [ix, 1.0, 4 + dz * 0.52, 0.5, 0.25, 0.05, '#1c2326'], [ix + 0.5, 1.0, 4 + dz * 0.2, 0.1, 0.5, 0.2, '#222'], [ix, 1.75, 4 + dz * 0.2, 0.84, 0.12, 0.64, b.bg]); }   // pump body, screen, nozzle holster, cap
    spots.pump.push([ix, 4]);
  }
  // the pole sign by the road, and the wash spot on the far side from the bays
  const px = v.signSide * (cw / 2 + 5);
  parts.push([px, v.signH / 2, 14, 0.4, v.signH, 0.4, '#8a8d90'], [px, v.signH + 1.1, 14, 3.4, 2.2, 0.25, b.bg], [px, v.signH - 1.0, 14, 3.0, 1.5, 0.22, '#1c2326'], [px, v.signH - 0.55, 14.12, 2.6, 0.18, 0.04, '#ffd23f'], [px, v.signH - 1.0, 14.12, 2.6, 0.18, 0.04, '#ffd23f'], [px, v.signH - 1.45, 14.12, 2.6, 0.18, 0.04, '#ffd23f']);   // brand sign over a price board
  const wx = (v.washLeft ? -1 : 1) * (cw / 2 + 5.5);
  parts.push([wx - 2.1, 1.6, -4, 0.4, 3.2, 5.5, '#bfc4c6'], [wx + 2.1, 1.6, -4, 0.4, 3.2, 5.5, '#bfc4c6'], [wx, 3.4, -4, 4.8, 0.4, 5.5, b.accent]);
  spots.wash = [wx, -1.4];
  spots.sign = { x: px, y: v.signH + 1.1, z: 14.15, w: 3.2, h: 2.0 };
  spots.storeSign = { x: sx, y: 4.75, z: front + 0.24, w: Math.min(7, sw * 0.72), h: 0.7 };
  return { parts, spots, brand: v.brand, v };
}

function restLayout() {
  const parts = [[0, 1.6, -14, 7, 3.2, 4, '#c9bfa6'], [0, 3.35, -14, 7.6, 0.3, 4.6, '#7d7a70'], [-1.6, 1.1, -11.9, 1.1, 2.2, 0.1, '#3f5560'], [1.6, 1.1, -11.9, 1.1, 2.2, 0.1, '#3f5560'], [0, 2.7, -11.9, 3.6, 0.5, 0.08, '#1d4f91'],   // the restroom block with two doors and a sign
    [-6, 3.4, 2, 8, 0.3, 5, '#8a5a3a'], [8, 0.5, -9, 0.9, 1.0, 0.9, '#2f4a3a'], [10, 0.5, -9, 0.9, 1.0, 0.9, '#2f4a3a'], [-12, 1.0, 10, 0.25, 2.0, 0.25, '#aaa'], [-12, 2.1, 10, 1.6, 0.9, 0.12, '#f4f1e2'],   // shade roof, trash bins, a map board
    [-9.4, 1.6, 0.2, 0.3, 3.2, 0.3, '#6b4a30'], [-2.6, 1.6, 0.2, 0.3, 3.2, 0.3, '#6b4a30'], [-9.4, 1.6, 3.8, 0.3, 3.2, 0.3, '#6b4a30'], [-2.6, 1.6, 3.8, 0.3, 3.2, 0.3, '#6b4a30'],
    [5, 0.5, -2, 2.2, 0.9, 1.4, '#7a5530'], [5, 0.5, 4, 2.2, 0.9, 1.4, '#7a5530'], [10, 0.5, 1, 2.2, 0.9, 1.4, '#7a5530'],
    [0, 2, 19, 0.2, 4, 0.2, '#888'], [0, 4.2, 19, 3.2, 1.8, 0.15, '#1d4f91'],
    // a hose post (wash) and a tool and air stand (basic fixes)
    [-13, 0.6, -6, 0.5, 1.2, 0.5, '#2f7fb5'], [-13, 1.3, -6, 1.2, 0.2, 0.2, '#c8372d'],
    [13, 0.7, -6, 0.9, 1.4, 0.6, '#d9a21b'], [13, 1.5, -6, 0.5, 0.4, 0.5, '#2b3338']];
  return { parts, spots: { pump: [], wash: [-13, -4], fix: [13, -4] }, brand: -1, v: null };
}
