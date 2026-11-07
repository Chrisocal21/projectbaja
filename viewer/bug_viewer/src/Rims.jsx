import * as THREE from 'three';

/** Procedural rims. Axle along Z, face towards +Z, sized for the 0.475 m-radius tire meshes (tire bead sits at r = 0.25). */
const BARREL = [[0.2, -0.15], [0.285, -0.15], [0.285, -0.125], [0.258, -0.1], [0.258, 0.1], [0.285, 0.125], [0.285, 0.15], [0.2, 0.15]];

function barrelGeo(w = 1) {
  const g = new THREE.LatheGeometry(BARREL.map(([r, y]) => new THREE.Vector2(r, y * w)), 40);
  g.rotateX(Math.PI / 2); return g;
}
const disc = (r, thick, z) => { const g = new THREE.CylinderGeometry(r, r, thick, 40); g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; };
const spoke = (len, w, thick, ang, z, r0 = 0.04) => {
  const g = new THREE.BoxGeometry(len, w, thick); g.translate(r0 + len / 2, 0, 0); g.rotateZ(ang); g.translate(0, 0, z); return g;
};
const bolt = (r, ang, z, rad = 0.011) => { const g = new THREE.CylinderGeometry(rad, rad, 0.03, 8); g.rotateX(Math.PI / 2); g.translate(Math.cos(ang) * r, Math.sin(ang) * r, z); return g; };
const ring = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2, i));

const hexDisc = (r, thick, z) => { const g = new THREE.CylinderGeometry(r, r, thick, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; };
const lipRing = (z, r = 0.285, t = 0.012) => { const g = new THREE.TorusGeometry(r, t, 6, 40); g.translate(0, 0, z); return g; };
const lugs = (n = 5, r = 0.058, z = 0.1) => ring(n, a => bolt(r, a, z, 0.009));
const hub = (r = 0.075, z = 0.07) => [disc(r, 0.06, z), ...lugs()];

/** Each style returns an array of BufferGeometries (merged by mesh). */
export const RIM_STYLES = {
  steel: () => [barrelGeo(), disc(0.255, 0.025, 0.05), disc(0.1, 0.04, 0.07), ...hub(0.04, 0.09), ...ring(8, a => spoke(0.12, 0.03, 0.012, a, 0.066, 0.1))],
  beadlock: () => [barrelGeo(), lipRing(0.15, 0.272, 0.014), lipRing(-0.15, 0.272, 0.014), ...ring(8, a => spoke(0.2, 0.075, 0.04, a, 0.04)), ...hub(0.08, 0.06), ...ring(24, a => bolt(0.272, a, 0.15, 0.012))],
  crawler: () => [barrelGeo(), disc(0.255, 0.03, 0.02), lipRing(0.15, 0.272, 0.016), lipRing(-0.15, 0.272, 0.016), ...ring(32, a => bolt(0.272, a, 0.162, 0.013)), ...ring(8, a => bolt(0.14, a, 0.04, 0.02)), disc(0.06, 0.07, 0.05)],
  fivespoke: () => [barrelGeo(), ...hub(0.085, 0.07), ...ring(5, a => spoke(0.2, 0.07, 0.04, a, 0.06))],
  sixspoke: () => [barrelGeo(), ...hub(0.09, 0.07), ...ring(6, a => spoke(0.2, 0.06, 0.04, a, 0.06))],
  tenspoke: () => [barrelGeo(), ...hub(0.07, 0.07), ...ring(10, a => spoke(0.2, 0.026, 0.03, a, 0.06))],
  twinspoke: () => [barrelGeo(), ...hub(0.08, 0.07), ...ring(5, a => spoke(0.2, 0.028, 0.035, a - 0.1, 0.06, 0.06)), ...ring(5, a => spoke(0.2, 0.028, 0.035, a + 0.1, 0.06, 0.06))],
  sevenstar: () => [barrelGeo(), ...hub(0.07, 0.075), ...ring(7, a => spoke(0.2, 0.045, 0.03, a, 0.065)), ...ring(7, a => spoke(0.1, 0.02, 0.02, a + Math.PI / 7, 0.05, 0.14))],
  split: () => [barrelGeo(), ...hub(0.08, 0.07), ...ring(5, a => spoke(0.1, 0.055, 0.04, a, 0.06, 0.05)), ...ring(5, a => spoke(0.12, 0.03, 0.035, a + 0.16, 0.06, 0.14).rotateZ(0)), ...ring(5, a => spoke(0.12, 0.03, 0.035, a - 0.16, 0.06, 0.14))],
  trophy: () => [barrelGeo(), lipRing(0.15, 0.272, 0.012), ...hub(0.1, 0.06), ...ring(3, a => spoke(0.2, 0.13, 0.045, a, 0.045))],
  hex: () => [barrelGeo(), hexDisc(0.1, 0.07, 0.07), ...lugs(6, 0.07, 0.11), ...ring(6, a => spoke(0.2, 0.05, 0.035, a, 0.06)), ...ring(6, a => spoke(0.07, 0.04, 0.02, a + Math.PI / 6, 0.05, 0.19))],
  mesh: () => [barrelGeo(), ...hub(0.07, 0.07), ...ring(14, a => spoke(0.2, 0.018, 0.03, a, 0.06)), ...ring(14, a => spoke(0.2, 0.018, 0.03, a + 0.22, 0.045))],
  sunburst: () => [barrelGeo(), ...hub(0.085, 0.07), ...ring(18, a => spoke(0.2, 0.014, 0.03, a, 0.06, 0.07)), ...ring(18, a => spoke(0.2, 0.014, 0.03, a + 0.18, 0.04, 0.07))],
  deepdish: () => [barrelGeo(1.0), disc(0.07, 0.08, -0.02), ...ring(8, a => spoke(0.2, 0.05, 0.035, a, -0.04)), disc(0.255, 0.02, -0.08), lipRing(0.15, 0.285, 0.014)],
  turbine: () => [barrelGeo(), ...hub(0.07, 0.08), ...ring(10, a => spoke(0.2, 0.05, 0.015, a, 0.06)), ...ring(10, a => spoke(0.2, 0.05, 0.015, a + 0.35, 0.02))],
  retro: () => [barrelGeo(), disc(0.14, 0.05, 0.07), ...lugs(5, 0.1, 0.1), ...ring(5, a => spoke(0.2, 0.1, 0.035, a, 0.055, 0.1)), ...ring(5, a => spoke(0.1, 0.03, 0.02, a + Math.PI / 5, 0.045, 0.16))],
  slotted: () => [barrelGeo(), disc(0.255, 0.02, 0.04), ...ring(12, a => spoke(0.15, 0.035, 0.02, a, 0.062, 0.1)), ...hub(0.09, 0.075)],
  aero: () => [barrelGeo(), disc(0.255, 0.02, 0.1), disc(0.2, 0.02, 0.115), disc(0.07, 0.03, 0.13), lipRing(0.15, 0.285, 0.014)],
};

const cache = {};
export function rimGeometry(style) {
  if (cache[style]) return cache[style];
  const parts = (RIM_STYLES[style] || RIM_STYLES.steel)().map(g => (g.index ? g.toNonIndexed() : g));
  for (const g of parts) { g.deleteAttribute('uv'); }
  let total = 0; parts.forEach(g => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return (cache[style] = out);
}
