import * as THREE from 'three';

/** Tileable multi-octave value noise packed into RGBA: R = broad patches, G = medium mottling, B = fine grain, A = ridged cracks. */
let NOISE = null;
export function noiseTexture() {
  if (NOISE) return NOISE;
  const N = 512, data = new Uint8Array(N * N * 4);
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lat = n => Float32Array.from({ length: n * n }, rnd);
  const sample = (a, n, u, v) => {   // wraps, so the texture tiles without seams
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const xa = x0 % n, ya = y0 % n, xb = (x0 + 1) % n, yb = (y0 + 1) % n;
    const t = a[ya * n + xa] + (a[ya * n + xb] - a[ya * n + xa]) * sx, b = a[yb * n + xa] + (a[yb * n + xb] - a[yb * n + xa]) * sx;
    return t + (b - t) * sy;
  };
  const oct = (ns, ws) => { const L = ns.map(lat); return (x, y) => { let s = 0; ns.forEach((n, i) => (s += ws[i] * sample(L[i], n, (x / N) * n, (y / N) * n))); return s; }; };
  const R = oct([3, 6, 12], [0.5, 0.3, 0.2]), G = oct([12, 24, 48], [0.5, 0.3, 0.2]), B = oct([64, 128, 256], [0.4, 0.3, 0.3]), A = oct([8, 16, 32], [0.5, 0.3, 0.2]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, gr = 0.7 * B(x, y) + 0.3 * rnd();
    data[i] = R(x, y) * 255; data[i + 1] = G(x, y) * 255; data[i + 2] = gr * 255; data[i + 3] = (1 - Math.abs(2 * A(x, y) - 1)) * 255;
  }
  NOISE = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping;
  NOISE.minFilter = THREE.LinearMipmapLinearFilter; NOISE.magFilter = THREE.LinearFilter; NOISE.generateMipmaps = true; NOISE.anisotropy = 8; NOISE.needsUpdate = true;
  return NOISE;
}

/** Per-surface detail strength: [grain, bump] multipliers. */
const KIND = { asphalt: [0.45, 0.35], concrete: [0.4, 0.3], curb: [0.5, 0.4], grass: [1.2, 0.9], gravel: [1.8, 1.8], dirt: [1, 1], looseDirt: [1.2, 1.3], rock: [1.5, 2.2], mud: [0.55, 0.5], sand: [0.6, 0.45] };
export const kindOf = s => KIND[s?.key] || KIND[s?.name?.toLowerCase?.().replace(/ (\w)/g, (_, c) => c.toUpperCase())] || [1, 1];

/**
 * World-space ground detail injected into a MeshStandardMaterial: three noise scales modulate the albedo (so there is grain at 5 cm, patches at 5 m and
 * broad variation at 100 m) and perturb the normal so sun glancing across the ground shows relief. With `perVertex` the geometry supplies `aGround`
 * (grain, bump) per vertex so each surface type gets its own look.
 */
export function applyGroundDetail(mat, { grain = 0.3, bump = 0.6, macro = 0.22, perVertex = false } = {}) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.tDetail = { value: noiseTexture() };
    sh.uniforms.uDetail = { value: new THREE.Vector3(grain, bump, macro) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vGXZ;\n${perVertex ? 'attribute vec2 aGround;\nvarying vec2 vGround;\n' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGXZ = (modelMatrix * vec4(position, 1.0)).xz;\n${perVertex ? 'vGround = aGround;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D tDetail;\nuniform vec3 uDetail;\nvarying vec2 vGXZ;\n${perVertex ? 'varying vec2 vGround;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gm = ${perVertex ? 'vGround' : 'vec2(1.0)'};
        vec4 d1 = texture2D(tDetail, vGXZ * 0.0085);
        vec4 d2 = texture2D(tDetail, vGXZ * 0.17);
        vec4 d3 = texture2D(tDetail, vGXZ * 1.7);
        float gShade = (d1.r - 0.5) * uDetail.z * 1.6 + (d2.g - 0.5) * uDetail.x * gm.x * 1.3 + (d3.b - 0.5) * uDetail.x * gm.x * 1.8 - (1.0 - smoothstep(0.0, 0.07, d2.a)) * 0.10 * gm.y;
        diffuseColor.rgb *= 1.0 + gShade;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float e = 0.0035; vec2 p = vGXZ * 1.7;
          vec2 g3 = vec2(texture2D(tDetail, p + vec2(e, 0.0)).b - texture2D(tDetail, p - vec2(e, 0.0)).b, texture2D(tDetail, p + vec2(0.0, e)).b - texture2D(tDetail, p - vec2(0.0, e)).b);
          vec2 q = vGXZ * 0.17;
          vec2 g2 = vec2(texture2D(tDetail, q + vec2(e, 0.0)).g - texture2D(tDetail, q - vec2(e, 0.0)).g, texture2D(tDetail, q + vec2(0.0, e)).g - texture2D(tDetail, q - vec2(0.0, e)).g);
          vec3 wn = normalize(normal * mat3(viewMatrix));
          wn.xz -= (g3 * 0.5 + g2 * 0.35) * uDetail.y * gm.y * 0.55;
          normal = normalize(mat3(viewMatrix) * normalize(wn));
        }`);
  };
  mat.customProgramCacheKey = () => `ground-${perVertex}`;
  return mat;
}
