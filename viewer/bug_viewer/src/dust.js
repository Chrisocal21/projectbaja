// Dust and dirt thrown up by the tires: one THREE.Points draw call for the whole pool. Soft round puffs that grow, drift and fade, tinted to the ground.
import * as THREE from 'three';

const VERT = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor; uniform float uScale;
void main() { vAlpha = aAlpha; vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aAlpha > 0.003 ? clamp(aSize * uScale / max(0.5, -mv.z), 1.0, 360.0) : 0.0; }`;
const FRAG = `
varying float vAlpha; varying vec3 vColor;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.15, d) * vAlpha; if (a < 0.004) discard; gl_FragColor = vec4(vColor, a); }`;

export function createDust(N = 480) {
  const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3), age = new Float32Array(N).fill(1e9), life = new Float32Array(N).fill(1), s0 = new Float32Array(N), s1 = new Float32Array(N), a0 = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);   // positions are anywhere in the world: never cull it
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.renderOrder = 5;
  points.onBeforeRender = (renderer, scene, camera) => { const h = renderer.getDrawingBufferSize(new THREE.Vector2()).y; mat.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); };
  let next = 0;
  /** one puff at (x, y, z) moving (vx, vy, vz), growing from size0 to size1 metres, starting at opacity a, lasting `lifeS` seconds */
  function emit(x, y, z, vx, vy, vz, c, size0, size1, a, lifeS) {
    const i = next; next = (next + 1) % N;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; age[i] = 0; life[i] = lifeS; s0[i] = size0; s1[i] = size1; a0[i] = a;
  }
  function update(dt) {
    for (let i = 0; i < N; i++) {
      if (age[i] >= life[i]) { alpha[i] = 0; continue; }
      age[i] += dt; const t = Math.min(1, age[i] / life[i]);
      const drag = Math.max(0, 1 - 1.6 * dt); vel[i * 3] *= drag; vel[i * 3 + 1] = vel[i * 3 + 1] * drag + 0.15 * dt; vel[i * 3 + 2] *= drag;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      size[i] = s0[i] + (s1[i] - s0[i]) * Math.sqrt(t); alpha[i] = a0[i] * (1 - t) * Math.min(1, t * 12 + 0.25);
    }
    g.attributes.position.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = g.attributes.aColor.needsUpdate = true;
  }
  return { points, emit, update, dispose: () => { g.dispose(); mat.dispose(); } };
}

/** how dusty a surface is (0 = none): paved and wet ground throws nothing */
export const dustiness = key => (({ asphalt: 0, concrete: 0, curb: 0, water: 0, mud: 0, rock: 0.35, grass: 0.25, meadow: 0.25, forestFloor: 0.3, sand: 1.2, looseDirt: 1.1, playa: 1.3, dunes: 1.2 })[key] ?? 0.85);
