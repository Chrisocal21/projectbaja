// The real border slice as a drive scene (docs/WORLD_MAP.md step 3, PROPOSAL, dev only for now).
// 40 x 53 km is far too much to build at once, so terrain tiles are built only near the player (coarse out to the fog, fine close by)
// and thrown away again behind you. Water: the ocean at sea level and the Salton Sea at its own level, drawn only where the data says so.
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { border, SEA_Y } from './border.js';
import { terrainMaterial, LAYER_OF } from './terrainMaterial.js';
import { HM_SIZE } from './world.js';
import { game } from '../game/store.js';

const TILE = 400, LO = 10, HI = 40, R_LO = 5200, R_HI = 900, R_DROP = 6200;
const MOUNTAIN = new THREE.Color('#8a6a4e'), HIGH = new THREE.Color('#9c7c5e');

function tileGeometry(B, ix, iz, seg) {
  const x0 = ix * TILE, z0 = iz * TILE, step = TILE / seg, n = seg + 1, P = n + 2;
  const H = new Float32Array(P * P);
  for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) H[j * P + i] = B.heightAt(x0 + (i - 1) * step, z0 + (j - 1) * step);
  const count = n * n + 4 * n, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const w0 = new Float32Array(count * 4), w1 = new Float32Array(count * 4), misc = new Float32Array(count * 2), w = new Float32Array(8), c = new THREE.Color();
  const put = (k, i, j, drop) => {
    const x = x0 + i * step, z = z0 + j * step, h = H[(j + 1) * P + i + 1];
    const dx = (H[(j + 1) * P + i + 2] - H[(j + 1) * P + i]) / (2 * step), dz = (H[(j + 2) * P + i + 1] - H[j * P + i + 1]) / (2 * step), l = Math.hypot(dx, 1, dz);
    pos.set([x, h - drop, z], k * 3); nor.set([-dx / l, 1 / l, -dz / l], k * 3);
    const sf = B.surfaceAt(x, z), slope = Math.abs(dx) + Math.abs(dz);
    w.fill(0); w[LAYER_OF[sf.key] ?? 1] = 1;
    const rock = Math.min(0.9, Math.max(0, (slope - 0.35) / 0.5)); if (rock > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - rock; w[5] += rock; }
    w0.set([w[0], w[1], w[2], w[3]], k * 4); w1.set([w[4], w[5], w[6], w[7]], k * 4);
    misc.set([sf.key === 'playa' ? 1 : 0, 0], k * 2);   // no macro map here (it belongs to the old county)
    c.set(sf.color).multiplyScalar(1 - Math.min(0.3, slope * 0.25));
    if (h > 40 && sf.key !== 'water') c.lerp(h > 200 ? HIGH : MOUNTAIN, Math.min(0.55, (h - 40) / 160));
    c.offsetHSL(Math.sin(x * 0.011 + z * 0.007) * 0.01, Math.sin(x * 0.0017 - z * 0.0013) * 0.04, Math.sin(x * 0.041 + z * 0.036) * 0.03);
    col.set([c.r, c.g, c.b], k * 3);
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) put(j * n + i, i, j, 0);
  const edges = [[i => [i, 0]], [i => [i, seg]], [j => [0, j]], [j => [seg, j]]];   // skirts hide cracks between fine and coarse tiles
  edges.forEach(([f], e) => { for (let t = 0; t < n; t++) { const [i, j] = f(t); put(n * n + e * n + t, i, j, 6); } });
  const idx = [];
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * n + i, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e); }
  edges.forEach(([f], e) => { for (let t = 0; t < seg; t++) { const [i0, j0] = f(t), [i1, j1] = f(t + 1), a = j0 * n + i0, b = j1 * n + i1, sa = n * n + e * n + t, sb = sa + 1; idx.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aW0', new THREE.BufferAttribute(w0, 4)); g.setAttribute('aW1', new THREE.BufferAttribute(w1, 4)); g.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
  g.setIndex(idx); g.computeBoundingSphere(); return g;
}

/** where the player is (car or feet) */
const here = camera => (game.onFoot ? camera.position : game.pos);

function Terrain() {
  const B = border(), group = useRef(), { camera } = useThree(), tiles = useRef(new Map());
  const mat = useMemo(() => terrainMaterial({ size: HM_SIZE, half: HM_SIZE / 2 }), []);
  useEffect(() => () => { tiles.current.forEach(t => { t.lo?.geometry.dispose(); t.hi?.geometry.dispose(); }); tiles.current.clear(); }, []);
  useFrame(() => {
    const p = here(camera), g = group.current, map = tiles.current, cx = Math.floor(p.x / TILE), cz = Math.floor(p.z / TILE), R = Math.ceil(R_LO / TILE);
    let built = 0, hiBuilt = false;
    // nearest first, a few coarse tiles per frame (no long hitch), at most one fine tile
    for (let ring = 0; ring <= R && built < 8; ring++) for (let iz = cz - ring; iz <= cz + ring && built < 8; iz++) for (let ix = cx - ring; ix <= cx + ring && built < 8; ix++) {
      if (Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== ring) continue;
      const k = ix + ',' + iz, d = Math.hypot((ix + 0.5) * TILE - p.x, (iz + 0.5) * TILE - p.z);
      if (d > R_LO) continue;
      let t = map.get(k);
      if (!t) { const lo = new THREE.Mesh(tileGeometry(B, ix, iz, LO), mat); lo.receiveShadow = true; g.add(lo); map.set(k, t = { ix, iz, lo, hi: null }); built++; }
      if (!t.hi && !hiBuilt && d < R_HI) { const hi = new THREE.Mesh(tileGeometry(B, ix, iz, HI), mat); hi.receiveShadow = true; g.add(hi); t.hi = hi; t.lo.visible = false; hiBuilt = true; built += 4; }
    }
    if (built) return;
    for (const [k, t] of map) {   // drop what is far behind
      const d = Math.hypot((t.ix + 0.5) * TILE - p.x, (t.iz + 0.5) * TILE - p.z);
      if (t.hi && d > R_HI + 400) { g.remove(t.hi); t.hi.geometry.dispose(); t.hi = null; t.lo.visible = true; }
      if (d > R_DROP) { g.remove(t.lo); t.lo.geometry.dispose(); if (t.hi) { g.remove(t.hi); t.hi.geometry.dispose(); } map.delete(k); }
    }
  });
  return <group ref={group} />;
}

/** one water sheet that follows the player; the mask texture says where it is really there (bit 0 = ocean, bit 1 = Salton Sea) */
export function WaterSheet({ bit, y, color }) {
  const B = border(), ref = useRef(), { camera } = useThree();
  const mat = useMemo(() => {
    const { nx, nz, cell, x0, z0 } = B.meta, data = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) data[j * nx + i] = (B.maskAt(x0 + i * cell, z0 + j * cell) & bit) ? 255 : 0;
    const tex = new THREE.DataTexture(data, nx, nz, THREE.RedFormat, THREE.UnsignedByteType); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, roughness: 0.08, metalness: 0.15, depthWrite: false });
    m.onBeforeCompile = sh => {
      sh.uniforms.tMask = { value: tex }; sh.uniforms.uBox = { value: new THREE.Vector4(x0, z0, nx * cell, nz * cell) }; sh.uniforms.uCell = { value: cell };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWXZ = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tMask; uniform vec4 uBox; uniform float uCell; varying vec2 vWXZ;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          { vec2 uv = (vWXZ - uBox.xy + 0.5 * uCell) / uBox.zw; float m = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? ${bit === 1 ? '1.0' : '0.0'} : texture2D(tMask, uv).r; if (m < 0.5) discard; }`);
    };
    m.customProgramCacheKey = () => 'border-water-' + bit;
    return m;
  }, [B, bit, color]);
  useFrame(() => { const p = here(camera); if (ref.current) ref.current.position.set(Math.round(p.x / 50) * 50, y, Math.round(p.z / 50) * 50); });
  return <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={2}><planeGeometry args={[14000, 14000]} /></mesh>;
}

export default function BorderScene() {
  const B = border(); if (!B) return null;
  return <>
    <Terrain />
    <WaterSheet bit={1} y={SEA_Y} color="#2f7fa0" />
    <WaterSheet bit={2} y={B.lakeY} color="#4f8f9a" />
  </>;
}
