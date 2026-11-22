import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Rings follow each stem through the elbow. Alternating radii model the ribs.
export function cardonGeometry() {
  const positions = [], colors = [], indices = [];
  const brown = new THREE.Color('#897858'), green = new THREE.Color('#738b77');
  const color = new THREE.Color(), sides = 24;
  function stem(rings, azimuth) {
    const first = positions.length / 3, cs = Math.cos(azimuth), sn = Math.sin(azimuth);
    rings.forEach(([out, y, r], j) => {
      const prev = rings[Math.max(0, j - 1)], next = rings[Math.min(rings.length - 1, j + 1)];
      const tilt = Math.atan2(next[0] - prev[0], next[1] - prev[1]);
      for (let i = 0; i < sides; i++) {
        const a = i * 2 * Math.PI / sides, rib = i % 2;
        const radius = r * (rib ? 1 : 0.86);
        const u = radius * Math.cos(a), v = radius * Math.sin(a), radial = out + u * Math.cos(tilt);
        positions.push(cs * radial - sn * v, y - u * Math.sin(tilt), sn * radial + cs * v);
        color.copy(brown).lerp(green, THREE.MathUtils.smoothstep(y, 0.1, 1.7)).multiplyScalar(rib ? 1.06 : 0.79);
        colors.push(color.r, color.g, color.b);
        if (j) {
          const lo = first + (j - 1) * sides + i, adjacent = first + (j - 1) * sides + (i + 1) % sides;
          indices.push(lo, lo + sides, adjacent, adjacent, lo + sides, adjacent + sides);
        }
      }
    });
  }
  stem([[0, -0.15, 0.43], [0, 1, 0.49], [0.06, 3.7, 0.44], [0.16, 5.8, 0.36], [0.16, 6.22, 0.29], [0.15, 6.42, 0.14], [0.15, 6.47, 0]], 0);
  stem([[0.23, 2.2, 0.28], [0.72, 2.42, 0.3], [1.09, 2.85, 0.29], [1.23, 3.43, 0.27], [1.19, 4.85, 0.23], [1.18, 5.05, 0.15], [1.18, 5.13, 0]], 0.36);
  stem([[0.24, 1.52, 0.25], [0.69, 1.74, 0.27], [1.05, 2.06, 0.24], [1.2, 2.57, 0.22], [1.25, 3.49, 0.19], [1.25, 3.63, 0.13], [1.25, 3.7, 0]], 3.42);
  return meshGeometry(positions, colors, indices);
}

// Each blade cups around a raised midrib, then uncurls toward a dark terminal spine.
export function agaveGeometry() {
  const positions = [], colors = [], indices = [];
  for (let i = 0; i < 24; i++) {
    const rank = i / 23, a = i * 2.39996, cs = Math.cos(a), sn = Math.sin(a);
    const reach = 1.28 - rank * 1.06, rise = 0.51 + rank * 0.88, first = positions.length / 3;
    const blade = new THREE.Color().lerpColors(new THREE.Color('#86948a'), new THREE.Color('#637e73'), rank);
    for (const [j, t] of [0, 0.32, 0.7, 0.94, 1].entries()) {
      const w = [0.075, 0.16, 0.12, 0.024, 0][j] * (1 - 0.42 * rank);
      const r = 0.04 + reach * t ** 1.5, y = 0.04 + rise * (1 - (1 - t) ** 1.45);
      for (const side of [-1, 0, 1]) {
        positions.push(cs * r - sn * w * side, y + (side === 0 ? w * 0.44 : 0), sn * r + cs * w * side);
        const color = j === 4 ? new THREE.Color('#503d32') : blade.clone().multiplyScalar((j ? 1 : 0.65) * (side ? 0.94 : 1.18));
        colors.push(color.r, color.g, color.b);
      }
      if (j) for (let k = 0; k < 2; k++) {
        const n = first + (j - 1) * 3 + k;
        indices.push(n, n + 1, n + 3, n + 1, n + 4, n + 3);
      }
    }
  }
  return meshGeometry(positions, colors, indices);
}

function meshGeometry(positions, colors, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// One repeating, monochrome grain map shared by all timber. UVs below run
// along each board, post or rail in metres, independent of its dimensions.
export function bridgeTimberMaterial() {
  const width = 256, rows = 96, pixels = new Uint8Array(width * rows * 4);
  for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
    const u = x * 2 * Math.PI / width, v = y * 2 * Math.PI / rows;
    const grain = Math.cos(17 * v + 1.5 * Math.sin(u + 2 * v) + 0.65 * Math.cos(2 * u - v));
    const pore = Math.max(0, grain) ** 6;
    const tone = 235 - 35 * pore + 9 * Math.cos(5 * v + Math.sin(u));
    const i = (y * width + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = tone;
    pixels[i + 3] = 255;
  }
  const map = new THREE.DataTexture(pixels, width, rows);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipMapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.96 });
}

// Build in deck coordinates. Sample within the dry deck so the running surface
// follows the same grade and crossfall as the vehicle, including at both ends.
export function bridgeGeometry(deck, height) {
  const parts = [], cs = Math.cos(deck.h), sn = Math.sin(deck.h);
  const origin = height(deck.x, deck.z), L = deck.L - 0.2, W = deck.W;
  const level = (x, z) => height(deck.x + x * cs + z * sn, deck.z - x * sn + z * cs) - origin;
  function timber(w, h, l, x, y, z, tone) {
    const g = new THREE.BoxGeometry(w, h, l), pos = g.attributes.position;
    const colors = [], color = new THREE.Color(tone);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + x, v = pos.getZ(i) + z;
      const vertical = h > w && h > l, across = w > l && !vertical;
      const along = vertical ? pos.getY(i) : across ? u : v;
      const cross = vertical ? u + v : (across ? v : u) + pos.getY(i);
      g.attributes.uv.setXY(i, along / 2.3 + z * 0.37, cross / 0.44 + z * 0.17);
      pos.setXYZ(i, u, pos.getY(i) + y + level(u, v), v);
      const light = g.attributes.normal.getY(i) > 0.5 ? 1.12 : 0.87;
      colors.push(color.r * light, color.g * light, color.b * light);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals(); parts.push(g);
  }
  const boards = Math.ceil(L / 0.32), pitch = L / boards;
  const tones = ['#897663', '#928473', '#817461', '#998a78', '#8a7d6e'];
  for (let i = 0; i < boards; i++) {
    const z = -L / 2 + (i + 0.5) * pitch;
    timber(W - 0.06, 0.16, pitch - 0.012, 0, -0.045, z, tones[(i * 7 + Math.floor(i / 3)) % tones.length]);
  }
  const bays = Math.ceil(L / 2.8), span = (L - 0.3) / bays;
  for (const side of [-1, 1]) {
    const edge = side * (W / 2 - 0.12);
    for (let i = 0; i <= bays; i++) {
      const z = -L / 2 + 0.15 + i * span;
      timber(0.16, 1.20, 0.18, edge, 0.47, z, '#716351');
      if (i === bays) continue;
      timber(0.16, 0.12, span, edge, 0.97, z + span / 2, '#9a8d79');
      timber(0.09, 0.14, span, edge - side * 0.045, 0.49, z + span / 2, '#80705e');
      timber(0.22, 0.38, span, edge, -0.25, z + span / 2, '#63584b');
    }
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(p => p.dispose());
  return geometry;
}
