import * as THREE from 'three';
import { noiseTexture } from './worlds/groundDetail.js';

/** 0 = showroom fresh, 1 = a rusty old banger. Shared by every weathered material so one slider ages the whole car. */
export const WEAR = { value: 0.85 };

export const kindForMaterial = name =>
  /fiberglass/i.test(name) ? 'fiberglass'
  : /Stage2_.*Steel/i.test(name) ? 'steel'
  : /paint|FadedBlue|interior1/i.test(name) ? 'paint'
  : /window/i.test(name) ? 'glass'
  : /headlight|taillight|signallight/i.test(name) ? 'lens'
  : /seat|door1|interior2/i.test(name) ? 'leather'
  : /dash|peddle|steerwheel|speedometer|license/i.test(name) ? 'interior'
  : /chrome|knob|vase1|headlight2/i.test(name) ? 'chrome'
  : /trim|tire/i.test(name) ? 'rubber' : null;

const BODY = {
  fiberglass: `
    float fade = W * (0.12 + 0.22 * up) * (0.45 + wBig);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.67, 0.64, 0.57), fade);
    diffuseColor.rgb *= 0.92 + 0.15 * wFine;
    float scuff = smoothstep(0.67, 0.82, wCrk) * W * 0.28;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.38, 0.34), scuff);
    wRough = 0.82;`,
  steel: `
    float oxidation = smoothstep(0.5, 0.7, wBig * 0.55 + wMid * 0.45) * W;
    float edgeWear = smoothstep(0.68, 0.84, wCrk) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.31, 0.17, 0.09) * (0.82 + 0.35 * wFine), oxidation * 0.36);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.42, 0.39), edgeWear * 0.2);
    wRough = 0.7 + 0.17 * oxidation;`,
  glass: `
    float dust = W * (0.08 + 0.19 * wBig + 0.08 * wFine);
    float edgeGrime = W * low * (0.04 + 0.1 * wMid);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.48, 0.43, 0.34), clamp(dust + edgeGrime, 0.0, 0.32));
    wRough = 0.34 + 0.12 * wMid;`,
  lens: `
    float haze = W * (0.08 + 0.15 * wBig + 0.07 * wFine);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.54, 0.48, 0.39), haze);
    wRough = 0.48 + 0.15 * wMid;`,
  paint: `
    float luma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    vec3 chalk = mix(diffuseColor.rgb, vec3(luma * 1.25 + 0.12), 0.55);
    diffuseColor.rgb = mix(diffuseColor.rgb, chalk, W * (0.14 + 0.28 * up) * (0.35 + wBig * 0.7));
    diffuseColor.rgb *= 0.91 + 0.17 * wMid;
    float sill = 1.0 - smoothstep(0.35, 0.9, wp.y);
    float seam = smoothstep(0.57, 0.72, wCrk) * (0.3 + 0.7 * wMid);
    float rustPatch = smoothstep(0.47, 0.64, wBig * 0.56 + wMid * 0.44 + sill * 0.25);
    float rustM = clamp(rustPatch * (0.18 + 0.78 * sill) + seam * sill * 0.32, 0.0, 0.82) * W;
    vec3 rust = mix(vec3(0.18, 0.075, 0.035), vec3(0.49, 0.22, 0.085), wFine);
    rust *= 0.8 + 0.35 * wMid;
    diffuseColor.rgb = mix(diffuseColor.rgb, rust, rustM);
    float chip = smoothstep(0.91, 0.97, wCrk) * W * (0.35 + 0.5 * sill);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.31, 0.29), chip * (1.0 - rustM));
    float dirt = (1.0 - smoothstep(0.2, 0.8, wp.y)) * W * (0.18 + 0.28 * wFine);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.19, 0.11), dirt);
    wRough = mix(0.79, 0.97, rustM);`,
  leather: `
    float grain = texture2D(tDetail, wp.xy * 28.0 + wp.zz * 7.0).b;
    float creases = 1.0 - smoothstep(0.44, 0.55, wCrk);
    float worn = smoothstep(0.43, 0.73, wBig * 0.55 + wMid * 0.45) * W;
    vec3 aged = mix(diffuseColor.rgb, vec3(0.34, 0.22, 0.13), 0.45 * W);
    aged *= 0.88 + 0.24 * grain;
    aged = mix(aged, vec3(0.52, 0.37, 0.23), worn * 0.34);
    aged = mix(aged, vec3(0.12, 0.085, 0.055), creases * W * 0.18);
    diffuseColor.rgb = aged;
    wRough = clamp(0.73 + (grain - 0.5) * 0.16 + worn * 0.14, 0.65, 0.96);`,
  interior: `
    float luma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(luma) * vec3(1.05, 0.98, 0.85), W * 0.35);
    float stain = smoothstep(0.55, 0.8, wMid * 0.7 + wBig * 0.4) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.12, 0.08), stain * 0.55);
    float tear = smoothstep(0.92, 0.98, wCrk) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.04, 0.035), tear);
    diffuseColor.rgb *= 1.0 + (wFine - 0.5) * 0.35 * W;
    wRough = 0.92;`,
  chrome: `
    float pit = smoothstep(0.55, 0.8, wMid * 0.6 + wFine * 0.5) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.3 * W), vec3(0.35, 0.2, 0.1), pit * 0.6);
    wRough = 0.7;`,
  rubber: `
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28), W * 0.35 * (0.4 + wBig));
    wRough = 0.95;`,
};

/** Object-space grime, sun fade, rust, chips and stains on a material; strength follows WEAR. */
export function applyWeathering(mat, kind, mesh, root) {
  if (!kind || mat.userData.weathered === kind) return;
  mat.userData.weathered = kind;
  // positions are taken relative to the car's own root, so the pattern stays glued to the car as it moves, and height means height above the ground
  const rootInv = new THREE.Matrix4();
  const prev = mesh.onBeforeRender;
  mesh.onBeforeRender = function (...a) { root.updateWorldMatrix(true, false); rootInv.copy(root.matrixWorld).invert(); prev?.apply(this, a); };
  mat.onBeforeCompile = sh => {
    sh.uniforms.tDetail = { value: noiseTexture() }; sh.uniforms.uWear = WEAR; sh.uniforms.uRootInv = { value: rootInv };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uRootInv;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nmat4 wRel = uRootInv * modelMatrix; vWP = (wRel * vec4(position, 1.0)).xyz; vWN = normalize(mat3(wRel) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tDetail;\nuniform float uWear;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 wp = vWP;
        float wBig = texture2D(tDetail, wp.xz * 0.35 + wp.yy * 0.17).r;
        float wMid = texture2D(tDetail, wp.zy * 1.7 + wp.xx * 0.4).g;
        float wFine = texture2D(tDetail, wp.xy * 11.0 + wp.zz * 3.0).b;
        float wCrk = texture2D(tDetail, wp.xz * 1.1 + wp.yy * 0.8).a;
        float low = 1.0 - smoothstep(0.35, 1.1, wp.y);
        float up = clamp(vWN.y, 0.0, 1.0);
        float W = uWear;
        float wRough = 0.5;
        ${BODY[kind]}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, wRough, W * 0.85);');
  };
  mat.customProgramCacheKey = () => `wear-${kind}`;
  mat.needsUpdate = true;
}
if (typeof window !== 'undefined') window.__WEAR = WEAR;
