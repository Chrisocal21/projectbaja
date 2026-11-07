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

/** Each style returns an array of BufferGeometries (merged by mesh). */
export const RIM_STYLES = {
  steel: () => [barrelGeo(), disc(0.255, 0.025, 0.05), disc(0.075, 0.05, 0.075), ...ring(5, a => bolt(0.12, a, 0.075))],
  beadlock: () => [barrelGeo(), disc(0.255, 0.03, 0.0), disc(0.07, 0.07, 0.03), ...ring(20, a => bolt(0.272, a, 0.14, 0.012)), ...ring(20, a => bolt(0.272, a, -0.14, 0.012)), ...ring(6, a => bolt(0.12, a, 0.04))],
  fivespoke: () => [barrelGeo(), disc(0.085, 0.07, 0.07), ...ring(5, a => spoke(0.2, 0.07, 0.04, a, 0.06)), ...ring(5, a => bolt(0.045, a + 0.3, 0.1, 0.007))],
  mesh: () => [barrelGeo(), disc(0.07, 0.06, 0.07), ...ring(14, a => spoke(0.2, 0.018, 0.03, a, 0.06)), ...ring(14, a => spoke(0.2, 0.018, 0.03, a + 0.22, 0.045))],
  deepdish: () => [barrelGeo(1.0), disc(0.07, 0.08, -0.02), ...ring(8, a => spoke(0.2, 0.05, 0.035, a, -0.04)), disc(0.255, 0.02, -0.08)],
  turbine: () => [barrelGeo(), disc(0.07, 0.06, 0.08), ...ring(10, a => spoke(0.2, 0.05, 0.015, a, 0.06).rotateZ(0)), ...ring(10, a => spoke(0.2, 0.05, 0.015, a + 0.35, 0.02))],
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
