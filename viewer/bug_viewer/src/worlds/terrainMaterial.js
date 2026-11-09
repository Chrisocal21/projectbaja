import * as THREE from 'three';
import { noiseTexture } from './groundDetail.js';

// Real ground textures for the county terrain (public/textures/ground, baked by assets/pipeline/build_world_assets.py):
// 8 tileable photo layers in one texture array + their normal maps, blended per vertex. Each layer is divided by its own mean colour,
// so the surface's vertex colour stays in charge of the palette and the photo only adds detail (pebbles, cracks, grass blades).
// A macro map (the heightmap's own painted diffuse + AO) shades the far ground with its erosion: gullies dark, ridges catching light.

/** surface -> layer: 0 sand, 1 desert ground, 2 dirt, 3 red soil, 4 gravel, 5 rock, 6 grass, 7 paving */
export const LAYER_OF = { sand: 0, water: 0, playa: 0, scrub: 1, dirt: 2, looseDirt: 2, mud: 2, redDirt: 3, gravel: 4, rock: 5, grass: 6, meadow: 6, dryGrass: 6, forestFloor: 2, asphalt: 7, concrete: 7, curb: 7 };
const L = 8, TEX = 1024;

/** a 1x1 grey array until the real one loads (divided by its own "mean" it is neutral) */
function placeholder(color) {
  const t = new THREE.DataArrayTexture(new Uint8Array(4 * L).fill(255).map((v, i) => (i % 4 === 3 ? 255 : color)), 1, 1, L);
  t.needsUpdate = true; return t;
}
function arrayFromStrip(img, srgb) {
  const c = document.createElement('canvas'); c.width = TEX; c.height = TEX * L;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, TEX, TEX * L);
  const t = new THREE.DataArrayTexture(new Uint8Array(g.getImageData(0, 0, TEX, TEX * L).data.buffer), TEX, TEX, L);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true; return t;
}

let shared = null;
/** one material for every terrain tile; textures stream in (through three's loading manager, so the loading screen waits for them) */
export function terrainMaterial({ size, half }) {
  if (shared) return shared;
  const uniforms = {
    // albedo placeholder 55/255 = the default mean below: neutral until the photos arrive
    tAlb: { value: placeholder(55) }, tNor: { value: placeholder(128) }, tMacro: { value: new THREE.Texture() }, tDetail: { value: noiseTexture() },
    uRep: { value: new Array(L).fill(4) }, uMean: { value: Array.from({ length: L }, () => new THREE.Vector3(0.216, 0.216, 0.216)) },
    uSize: { value: size }, uHalf: { value: half }, uMacroOn: { value: 0 }, uNor: { value: 0 },
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aW0; attribute vec4 aW1; attribute vec2 aMisc;
        varying vec4 vW0; varying vec4 vW1; varying vec2 vMisc; varying vec2 vGXZ;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vW0 = aW0; vW1 = aW1; vMisc = aMisc; vGXZ = (modelMatrix * vec4(position, 1.0)).xz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform highp sampler2DArray tAlb; uniform highp sampler2DArray tNor; uniform sampler2D tMacro; uniform sampler2D tDetail;
        uniform float uRep[${L}]; uniform vec3 uMean[${L}]; uniform float uSize; uniform float uHalf; uniform float uMacroOn; uniform float uNor;
        varying vec4 vW0; varying vec4 vW1; varying vec2 vMisc; varying vec2 vGXZ;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gNor = vec2(0.0);
        {
          float ws[${L}] = float[${L}](vW0.x, vW0.y, vW0.z, vW0.w, vW1.x, vW1.y, vW1.z, vW1.w);
          vec4 nz = texture2D(tDetail, vGXZ * 0.006);
          vec2 off = vec2(0.37, 0.71) + nz.rg * 0.15;
          vec3 acc = vec3(0.0); float wt = 0.0;
          vec2 gx = dFdx(vGXZ), gy = dFdy(vGXZ);                                      // derivatives outside the loop: layers are skipped per pixel
          for (int i = 0; i < ${L}; i++) {
            float w = ws[i]; if (w < 0.015) continue;
            float k = 1.0 / uRep[i]; vec2 uv = vGXZ * k;
            vec3 a = textureGrad(tAlb, vec3(uv, float(i)), gx * k, gy * k).rgb;
            vec3 b = textureGrad(tAlb, vec3(uv * 0.27 + off, float(i)), gx * k * 0.27, gy * k * 0.27).rgb;   // a second, bigger repeat breaks up the tiling
            a = mix(a, b, 0.3 + 0.35 * nz.b);
            acc += a / uMean[i] * w;
            gNor += (textureGrad(tNor, vec3(uv, float(i)), gx * k, gy * k).xy * 2.0 - 1.0) * w;
            wt += w;
          }
          acc /= max(wt, 1e-3); gNor /= max(wt, 1e-3);
          diffuseColor.rgb *= clamp(acc, 0.0, 2.5);
          // dry lakebed / mud: polygon cracks from the noise's ridged channel
          vec4 d2 = texture2D(tDetail, vGXZ * 0.21);
          diffuseColor.rgb *= 1.0 - (1.0 - smoothstep(0.0, 0.06, d2.a)) * 0.35 * vMisc.x;
          // the heightmap's own erosion: fine light/dark detail + ambient occlusion in the gullies
          vec4 mc = texture2D(tMacro, vec2((vGXZ.x + uHalf) / uSize, 1.0 - (vGXZ.y + uHalf) / uSize));
          diffuseColor.rgb *= mix(1.0, (0.74 + 0.52 * mc.r) * (0.6 + 0.4 * mc.g), vMisc.y * uMacroOn);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 wn = normalize(normal * mat3(viewMatrix));                         // view -> world
          wn = normalize(wn + vec3(gNor.x, 0.0, -gNor.y) * uNor);                  // texture u = +x, image-up = -z
          normal = normalize(mat3(viewMatrix) * wn);
        }`);
  };
  mat.customProgramCacheKey = () => 'county-terrain-v1';

  const mgr = THREE.DefaultLoadingManager, img = new THREE.ImageLoader(mgr);
  new THREE.FileLoader(mgr).load('/textures/ground/ground.json', txt => {
    const meta = JSON.parse(txt);
    meta.layers.forEach((l, i) => { uniforms.uRep.value[i] = l.repeat; uniforms.uMean.value[i].set(...l.mean); });
    img.load('/textures/ground/albedo.jpg', im => { uniforms.tAlb.value = arrayFromStrip(im, true); });
    img.load('/textures/ground/normal.jpg', im => { uniforms.tNor.value = arrayFromStrip(im, false); uniforms.uNor.value = 0.9; });
  });
  new THREE.TextureLoader(mgr).load('/terrain/macro.jpg', t => { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; uniforms.tMacro.value = t; uniforms.uMacroOn.value = 1; });
  shared = mat;
  return mat;
}
