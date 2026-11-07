import * as THREE from 'three';
import { noiseTexture } from './worlds/groundDetail.js';

/** 0 = showroom fresh, 1 = a rusty old banger. Shared by every weathered material so one slider ages the whole car. */
export const WEAR = { value: 0.85 };

export const kindForMaterial = name =>
  /paint|FadedBlue|Fiberglass|interior1/i.test(name) ? 'paint'
  : /seat|dash|door1|interior2|peddle|steerwheel|speedometer|license/i.test(name) ? 'interior'
  : /chrome|knob|vase1|headlight2/i.test(name) ? 'chrome'
  : /trim|tire/i.test(name) ? 'rubber' : null;

const BODY = {
  paint: `
    float luma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    vec3 chalk = mix(diffuseColor.rgb, vec3(luma * 1.25 + 0.12), 0.55);
    diffuseColor.rgb = mix(diffuseColor.rgb, chalk, W * (0.12 + 0.3 * up) * (0.2 + wBig * 0.9));
    diffuseColor.rgb *= 0.82 + 0.34 * wMid;
    float rustM = smoothstep(0.55, 0.8, wMid * 0.5 + low * 0.75 + wFine * 0.25 - 0.2) * smoothstep(0.3, 0.62, wFine + wMid * 0.45) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.24, 0.1, 0.05), vec3(0.4, 0.2, 0.09), wFine), rustM * 0.85);
    float chip = smoothstep(0.9, 0.97, wCrk) * W;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.37, 0.35), chip * 0.8);
    float dirt = (1.0 - smoothstep(0.25, 1.0, wp.y)) * W * (0.35 + 0.5 * wFine);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.15, 0.1), dirt * 0.75);
    diffuseColor.rgb *= 1.0 + (wFine - 0.5) * 0.25 * W;
    wRough = 0.95;`,
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
