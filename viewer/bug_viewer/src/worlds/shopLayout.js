// What a barn, a junkyard and an off-road store look like and where you stand to shop (pure JS; same shape as stationLayout.js so the world, the walker
// and the map treat them the same). Frame: x across, y up, z toward the road. parts: [x, y, z, w, h, d, colour]; spots: [x, z] you press E at.
// Plain boxes on purpose: ChatGPT can swap in real models (docs/CHATGPT_HANDOFF.md).
const hash = (a, b, k = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
const pick = (list, h) => list[Math.min(list.length - 1, Math.floor(h * list.length))];
/** the sign colours per kind: [background, text, accent] */
export const SHOP_SIGN = { barn: ['#4e2a22', '#f0e4c4', '#c9a24a'], junk: ['#2a2c2d', '#ffd23f', '#d8641a'], offroad: ['#16181a', '#ff7a1a', '#f0f0ea'] };

function barn(h) {
  const parts = [], red = pick(['#8f2f26', '#7a2a22', '#9a3a2a', '#6f3a2c', '#7d7d70'], h(1)), trim = '#ece6d6', w = 11 + Math.floor(h(2) * 4), d = 9 + Math.floor(h(3) * 3), back = -9, front = back + d / 2;
  parts.push([0, 2.6, back, w, 5.2, d, red], [0, 5.5, back, w + 0.8, 0.5, d + 0.8, '#6b6e70'], [0, 6.4, back, w * 0.62, 0.9, d + 0.4, '#6b6e70'], [0, 7.0, back, w * 0.3, 0.5, d + 0.2, '#5d6062']);   // walls and a stepped (gambrel) roof
  parts.push([-1.05, 1.7, front + 0.04, 2.0, 3.4, 0.12, trim], [1.05, 1.7, front + 0.04, 2.0, 3.4, 0.12, trim], [0, 1.7, front + 0.1, 0.1, 3.4, 0.06, '#3a2a22'], [0, 3.45, front + 0.05, 4.3, 0.2, 0.14, trim]);   // the big double door
  parts.push([0, 5.4, front + 0.05, 1.8, 1.5, 0.12, trim], [0, 5.4, front + 0.1, 1.2, 1.0, 0.06, '#2c1f1a']);   // the hay loft door
  for (const sx of [-1, 1]) parts.push([sx * (w / 2 - 0.05), 2.6, front + 0.04, 0.3, 5.2, 0.12, trim]);
  if (h(4) < 0.6) parts.push([w / 2 + 2.6, 4.5, back - 1, 3, 9, 3, '#b8bcbc'], [w / 2 + 2.6, 9.2, back - 1, 3.4, 0.5, 3.4, '#8a8f90']);   // a silo
  parts.push([-w / 2 - 2.8, 1.4, back + 1, 5, 2.8, 6, '#7a5a3a'], [-w / 2 - 2.8, 3.0, back + 1, 5.6, 0.3, 6.6, '#5d6062']);   // a lean-to
  for (let i = 0; i < 6; i++) parts.push([w / 2 + 1.2 + (i % 3) * 1.7, 0.5 + Math.floor(i / 3) * 1.0, front - 0.5 + (i % 2) * 0.4, 1.6, 1, 1.2, '#c9a84a']);   // hay bales
  parts.push([-w / 2 + 1.5, 0.45, front + 1.6, 1.1, 0.9, 1.1, '#222'], [-w / 2 + 1.5, 1.35, front + 1.6, 1.1, 0.9, 1.1, '#222'], [-w / 2 + 3.0, 0.45, front + 1.8, 1.1, 0.9, 1.1, '#222']);   // stacked tires
  parts.push([w / 2 + 0.2, 0.9, front + 3.2, 3.6, 1.0, 1.7, pick(['#6a7f8a', '#8a6a4a', '#7b8660'], h(5))], [w / 2 + 0.1, 1.7, front + 3.2, 1.8, 0.7, 1.6, '#6c767a']);   // an old pickup, nose up to the barn
  parts.push([3.6, 0.5, front + 1.4, 3.2, 1.0, 0.9, '#5e432c'], [3.6, 1.05, front + 1.4, 3.4, 0.1, 1.0, '#c9a24a']);   // the counter, a plank table with its price board
  return { parts, spots: { pump: [], shop: [3.6, front + 2.5], sign: { x: 0, y: 4.55, z: front + 0.2, w: 5.4, h: 0.9 } }, brand: -1 };
}

function junkyard(h) {
  const parts = [], rust = ['#8a4a2a', '#7a7468', '#5e6a72', '#a07a3a', '#6f3a30', '#4a5a4a', '#b0a898'], fw = 18 + Math.floor(h(2) * 6), fd = 24;
  const fence = '#8c8f8a';
  parts.push([0, 1.6, -fd, fw * 2, 3.2, 0.2, fence], [-fw, 1.6, -fd / 2, 0.2, 3.2, fd, fence], [fw, 1.6, -fd / 2, 0.2, 3.2, fd, fence], [-(fw + 5) / 2 - 2, 1.6, 0, fw - 5, 3.2, 0.2, fence], [(fw + 5) / 2 + 2, 1.6, 0, fw - 5, 3.2, 0.2, fence]);   // corrugated fence with a gate gap
  for (const gx of [-2.5, 2.5]) parts.push([gx, 1.8, 0, 0.35, 3.6, 0.35, '#5a5e60']);
  parts.push([0, 3.6, 0, 5.4, 0.3, 0.3, '#5a5e60']);   // the gate frame
  parts.push([-fw + 6, 1.4, -4, 6, 2.8, 4.5, pick(['#7f8a8c', '#a89a7a', '#8a7a6a'], h(3))], [-fw + 6, 2.95, -4, 6.6, 0.3, 5.1, '#4a4f52'], [-fw + 6 + 1.6, 1.2, -1.7, 1.2, 2.2, 0.1, '#2b3338'], [-fw + 6 - 1.4, 1.5, -1.7, 2.0, 1.1, 0.1, '#4d7287']);   // the office shack
  for (let i = 0; i < 16; i++) {   // wrecks: rows of bodies, some stacked two high
    const x = -fw + 3 + (i % 5) * 7.2 + (hash(i, h(7)) - 0.5) * 1.5, z = -9 - Math.floor(i / 5) * 4.4, c = pick(rust, hash(i, h(8))), lvl = hash(i, h(9)) < 0.3 ? 1 : 0, yaw = hash(i, h(10));
    const len = 4.0 + yaw * 0.8; parts.push([x, 0.7 + lvl * 1.4, z, len, 1.2, 1.8, c], [x + 0.2, 1.65 + lvl * 1.4, z, len * 0.5, 0.8, 1.7, c], [x + 0.2, 1.65 + lvl * 1.4, z, len * 0.5 - 0.3, 0.55, 1.75, '#2a3236']);
  }
  for (let i = 0; i < 3; i++) parts.push([fw - 5 + (i % 2) * 1.0, 0.5 + i * 0.9, -5, 1.1, 0.9, 1.1, '#222'], [fw - 7, 0.5 + i * 0.9, -5.4, 1.1, 0.9, 1.1, '#222']);   // tire piles
  parts.push([fw - 7, 5.0, -16, 0.7, 10, 0.7, '#c9a21b'], [fw - 11, 10, -16, 9, 0.6, 0.6, '#c9a21b'], [fw - 15.5, 8.6, -16, 0.15, 3, 0.15, '#333'], [fw - 15.5, 7, -16, 1.4, 1.0, 1.4, '#777']);   // a yard crane with its magnet
  parts.push([-10, 0.4, 3, 1.6, 0.8, 1.2, '#aeb2b0'], [-8.2, 0.55, 3, 2.2, 1.1, 1.0, '#9a8f7a']);   // parts on pallets by the road
  return { parts, spots: { pump: [], shop: [-fw + 6 + 1.6, -0.9], sign: { x: 0, y: 4.35, z: 0.25, w: 5.2, h: 0.8 } }, brand: -1 };
}

function offroad(h) {
  const parts = [], wall = pick(['#c9ccce', '#d6cfbd', '#b7c0c4', '#cbb89a'], h(1)), w = 16 + Math.floor(h(2) * 6), back = -10, front = back + 4.5, brand = pick(['#e0661a', '#c9302a', '#2c6fa8', '#d1a31b', '#3f7d4a'], h(3));
  parts.push([0, 2.6, back, w, 5.2, 9, wall], [0, 5.35, back, w + 0.6, 0.3, 9.6, '#7a7e80'], [0, 4.6, front + 0.1, w + 0.4, 1.0, 0.3, brand], [0, 4.6, front + 0.28, w * 0.7, 0.14, 0.05, '#f0f0ea']);   // the building and its sign band
  for (const bx of [-w * 0.27, 0]) parts.push([bx - w * 0.04, 1.6, front + 0.06, w * 0.22, 3.0, 0.12, '#4a4f52'], [bx - w * 0.04, 3.1, front + 0.1, w * 0.22, 0.12, 0.08, '#d8dcdc']);   // roll-up service bay doors
  parts.push([w * 0.3, 1.5, front + 0.04, w * 0.28, 2.3, 0.1, '#4d7287'], [w * 0.38, 1.1, front + 0.1, 1.3, 2.2, 0.06, '#2b3338'], [w * 0.3, 1.5, front + 0.1, 0.1, 2.3, 0.06, '#d8dcdc']);   // glass shop front and door
  parts.push([w * 0.3, 3.2, front + 1.2, w * 0.26, 0.15, 2.2, brand], [w * 0.3 - w * 0.12, 1.6, front + 2.1, 0.14, 3.2, 0.14, '#d8dcdc'], [w * 0.3 + w * 0.12, 1.6, front + 2.1, 0.14, 3.2, 0.14, '#d8dcdc']);   // awning
  // the display lot: a lifted truck on a ramp, a tire wall and a light bar rack
  parts.push([-w * 0.22, 0.55, 8, 7, 1.1, 3, '#9a9a96'], [-w * 0.22, 2.0, 8, 5.2, 1.0, 2.2, pick(['#d24b1f', '#2e6a8a', '#e0b020', '#6a8a3a'], h(4))], [-w * 0.22 + 0.4, 2.9, 8, 2.4, 0.8, 2.0, '#2a3236']);
  for (const [dx, dz] of [[-1.9, -1.1], [1.9, -1.1], [-1.9, 1.1], [1.9, 1.1]]) parts.push([-w * 0.22 + dx, 1.45, 8 + dz, 1.5, 1.5, 0.7, '#1a1a1a']);   // big tires
  for (let i = 0; i < 8; i++) parts.push([w * 0.18 + (i % 4) * 1.3, 0.55 + Math.floor(i / 4) * 1.1, 6.5, 1.2, 1.1, 1.0, '#222'], [w * 0.18 + (i % 4) * 1.3, 0.55 + Math.floor(i / 4) * 1.1, 6.5, 0.7, 1.12, 1.02, '#444']);   // tire wall
  parts.push([w * 0.42, 1.2, 9, 0.2, 2.4, 0.2, '#5a5e60'], [w * 0.42 + 2.4, 1.2, 9, 0.2, 2.4, 0.2, '#5a5e60'], [w * 0.42 + 1.2, 2.5, 9, 2.8, 0.2, 0.3, '#1a1a1a'], [w * 0.42 + 1.2, 2.5, 9.18, 2.4, 0.1, 0.05, '#fff6c8']);   // light bar rack
  parts.push([w / 2 + 3, 5.5, 2, 0.25, 11, 0.25, '#8a8d90'], [w / 2 + 3, 10.4, 2, 3.2, 1.8, 0.3, '#16181a'], [w / 2 + 3, 10.4, 2.2, 2.8, 0.5, 0.05, brand]);   // pole sign
  return { parts, spots: { pump: [], shop: [w * 0.38, front + 1.7], sign: { x: 0, y: 4.6, z: front + 0.32, w: w * 0.6, h: 0.7 } }, brand: -1 };
}

/** the layout of one barn / junkyard / off-road store; `site` = { type, x, z } */
export function shopLayout(site) {
  const x = Math.round(site.x), z = Math.round(site.z), h = k => hash(x, z, k);
  return site.type === 'barn' ? barn(h) : site.type === 'junk' ? junkyard(h) : offroad(h);
}
