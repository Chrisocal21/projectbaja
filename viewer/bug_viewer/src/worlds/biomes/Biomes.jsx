// Draws the biome system: instanced procedural trees / bushes / rocks in chunks near the camera, brown trail ribbons, river water.
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BIO, height, isRoad } from '../county.js';
import { Ribbon, looseTex } from '../TestCenter.jsx';
import { scatterChunk, CHUNK } from './scatter.js';
import { ribbonStrip } from './pathmath.js';
import { TRUNKS, colliderOf } from './trunks.js';

const NEAR = { conifer: 520, broadleaf: 460, bush: 150, rock: 260 }, SHADOW_R = 110, REFRESH = 0.15;

/** a piece of low-poly geometry with one flat vertex colour, moved up by y */
function piece(geo, color, y = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo; g.scale(sx, sy, sz); g.translate(0, y, 0);
  const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); return g;
}
const merge = parts => mergeGeometries(parts.map(p => (p.attributes.normal ? p : (p.computeVertexNormals(), p))));
const GEO = {
  conifer: () => merge([piece(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 6), '#5a4026', 0.9), piece(new THREE.ConeGeometry(2.3, 3.6, 7), '#2f5a2b', 3.3), piece(new THREE.ConeGeometry(1.8, 3.2, 7), '#356431', 5.2), piece(new THREE.ConeGeometry(1.2, 2.8, 7), '#3c6f36', 7.0)]),
  broadleaf: () => merge([piece(new THREE.CylinderGeometry(0.25, 0.4, 3.2, 6), '#5d452c', 1.6), piece(new THREE.IcosahedronGeometry(2.5, 1), '#58853a', 4.6, 1, 0.85, 1), piece(new THREE.IcosahedronGeometry(1.6, 1), '#679a42', 6.2, 1, 0.9, 1)]),
  bush: () => merge([piece(new THREE.IcosahedronGeometry(0.9, 0), '#557a35', 0.45, 1.2, 0.7, 1.2)]),
  rock: () => merge([piece(new THREE.DodecahedronGeometry(0.9, 0), '#8b867b', 0.35, 1.2, 0.7, 1)]),
};
let shared = null;
const assets = () => shared || (shared = {
  geo: Object.fromEntries(Object.entries(GEO).map(([k, f]) => [k, f()])),
  mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
});

const ctx = {
  weight: (def, x, z) => BIO.weight(def, x, z), height, onRoad: isRoad,
  trailDist: (x, z) => BIO.trailDist(x, z), riverDist: (x, z) => BIO.riverDist(x, z), trailHalf: 2.2, riverHalf: 6,
};

/** plants in 160 m chunks around the camera; one chunk is built per refresh so there is never a long hitch */
function Plants() {
  const root = useRef(), { camera } = useThree(), chunks = useRef(new Map()), acc = useRef(10);
  const o = useMemo(() => new THREE.Object3D(), []), tint = useMemo(() => new THREE.Color(), []);
  function build(def, ix, iz) {
    const A = assets(), items = scatterChunk(def, ix, iz, ctx), g = new THREE.Group(), by = {};
    for (const it of items) (by[it.kind] ||= []).push(it);
    for (const [kind, list] of Object.entries(by)) {
      const m = new THREE.InstancedMesh(A.geo[kind], A.mat, list.length); m.userData.kind = kind;
      list.forEach((it, i) => {
        o.position.set(it.x, height(it.x, it.z) - 0.1 * it.s, it.z); o.rotation.set(0, it.ry, 0);
        kind === 'bush' || kind === 'rock' ? o.scale.set(it.s, it.s * (0.7 + 0.5 * ((it.ry * 7) % 1)), it.s * (0.9 + 0.4 * ((it.ry * 3) % 1))) : o.scale.setScalar(it.s);
        o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, tint.set(it.tint).multiplyScalar(0.8 + 0.3 * ((it.ry * 11) % 1)));
      });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); m.receiveShadow = true; g.add(m);
    }
    TRUNKS.set(ix + ',' + iz, items.map(it => colliderOf(it, height(it.x, it.z))).filter(Boolean));   // trunks and boulders block the car and the walker
    return { g, cx: (ix + 0.5) * CHUNK, cz: (iz + 0.5) * CHUNK, n: items.length };
  }
  useFrame((_, dt) => {
    if ((acc.current += dt) < REFRESH) return; acc.current = 0;
    const px = camera.position.x, pz = camera.position.z, far = Math.max(...Object.values(NEAR)) + CHUNK, group = root.current;
    for (const [k, c] of chunks.current) {
      const d = Math.hypot(c.cx - px, c.cz - pz);
      if (d > far + 160) { group.remove(c.g); c.g.children.forEach(m => m.dispose()); chunks.current.delete(k); TRUNKS.remove(k); continue; }
      c.g.children.forEach(m => { const lim = NEAR[m.userData.kind] + CHUNK * 0.5; m.visible = d < lim; m.castShadow = m.userData.kind === 'conifer' || m.userData.kind === 'broadleaf' ? d < SHADOW_R : false; });
    }
    const want = [], i0 = Math.floor((px - far) / CHUNK), i1 = Math.floor((px + far) / CHUNK), j0 = Math.floor((pz - far) / CHUNK), j1 = Math.floor((pz + far) / CHUNK);
    for (let ix = i0; ix <= i1; ix++) for (let iz = j0; iz <= j1; iz++) {
      if (chunks.current.has(ix + ',' + iz)) continue;
      const cx = (ix + 0.5) * CHUNK, cz = (iz + 0.5) * CHUNK, d = Math.hypot(cx - px, cz - pz); if (d <= far) want.push([d, ix, iz, cx, cz]);
    }
    want.sort((a, b) => a[0] - b[0]);   // nearest first
    for (const [, ix, iz, cx, cz] of want.slice(0, 4)) {
      const def = BIO.dominant(cx, cz)?.def || BIO.list.find(b => Math.hypot(cx - b.def.region.cx, cz - b.def.region.cz) < b.def.region.r + CHUNK)?.def;
      const c = def ? build(def, ix, iz) : { g: new THREE.Group(), cx, cz, n: 0 };
      chunks.current.set(ix + ',' + iz, c); group.add(c.g);
    }
  });
  useEffect(() => () => { chunks.current.forEach((c, k) => { c.g.children.forEach(m => m.dispose()); TRUNKS.remove(k); }); chunks.current.clear(); }, []);
  return <group ref={root} />;
}

function Water({ river }) {
  const geo = useMemo(() => {
    const { pos, uv, idx } = ribbonStrip(river.path.pts, river.width / 2 + 5, p => p.wl - 0.02, 2, 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }, [river]);
  return <mesh geometry={geo} renderOrder={2}><meshStandardMaterial color="#3a7d96" transparent opacity={0.72} roughness={0.12} metalness={0.1} depthWrite={false} side={THREE.DoubleSide} /></mesh>;
}

/** summit viewpoint (PROPOSAL, no structures): a few boulders and a low plain rail along the edge facing c.lookout.face. Boulders are solid. */
const LOOK_ROCKS = [[-6, 0.3, 1.9], [-2.5, -0.4, 1.4], [1.5, 0.2, 2.2], [5.5, -0.2, 1.6]];
function Lookout({ c }) {
  const { face } = c.lookout, fx = Math.sin(face), fz = Math.cos(face), rx = fz, rz = -fx, e = c.r * 0.8;
  const at = (a, b) => [c.x + fx * e + rx * a + fx * b, c.z + fz * e + rz * a + fz * b];
  const rocks = useMemo(() => LOOK_ROCKS.map(([a, b, s]) => { const [x, z] = at(a, b); return { x, z, s }; }), [c]);
  useEffect(() => { TRUNKS.set('lookout-' + c.id, rocks.map(r => [r.x, r.z, 0.95 * r.s, height(r.x, r.z) + 0.8 * r.s])); return () => TRUNKS.remove('lookout-' + c.id); }, [rocks]);
  const A = assets(), posts = [-3.8, -1.2, 1.2, 3.8].map(a => at(a, -0.6));
  return <group>
    {rocks.map((r, i) => <mesh key={i} geometry={A.geo.rock} material={A.mat} position={[r.x, height(r.x, r.z) - 0.1 * r.s, r.z]} rotation={[0, i * 1.7, 0]} scale={[r.s, r.s * 1.1, r.s]} castShadow receiveShadow />)}
    {posts.map(([x, z], i) => <mesh key={i} position={[x, height(x, z) + 0.55, z]} castShadow><boxGeometry args={[0.14, 1.1, 0.14]} /><meshStandardMaterial color="#6b5236" roughness={1} /></mesh>)}
    {[0.45, 0.85].map(y => { const [x, z] = at(0, -0.6); return <mesh key={y} position={[x, height(x, z) + y, z]} rotation={[0, face + Math.PI / 2, 0]}><boxGeometry args={[7.8, 0.1, 0.1]} /><meshStandardMaterial color="#7a5e3e" roughness={1} /></mesh>; })}
  </group>;
}

export default function BiomeScene() {
  return <>
    {BIO.trails.map(t => <Ribbon key={t.id} path={t.path} half={t.width / 2 + 0.6} tile={22} makeTexture={looseTex} feather detail={{ grain: 0.5, bump: 1, macro: 0.15 }} lift={0.03} segs={4} heightFn={height} />)}
    {BIO.rivers.map(r => <Water key={r.id} river={r} />)}
    <Plants />
    {BIO.clearings.map(c => c.lookout && <Lookout key={c.id} c={c} />)}
  </>;
}
