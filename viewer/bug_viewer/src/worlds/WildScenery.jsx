import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { game } from '../game/store.js';
import { height, wildTrees, wildCreeks } from './county.js';

// The creeks, rivers and forests of the off-road features (offroadFeatures.js / wildFeatures.js): a water surface per creek and low-poly trees in chunks.
// Both are drawn only near you (the water only where the fine terrain shows the trench).
const WATER_SEEN = 430, TREE_SEEN = 620, CHUNK = 320;

const colored = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
/** two cheap trees (about 130 triangles each): a pine (stacked cones) and a broadleaf (lumpy crown), trunk and leaves coloured by vertex */
function treeGeometry(type) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, type ? 3.6 : 4.4, 6); trunk.translate(0, (type ? 3.6 : 4.4) / 2, 0); parts.push(colored(trunk, '#5b4630'));
  if (!type) for (let i = 0; i < 4; i++) { const c = new THREE.ConeGeometry(2.3 - i * 0.48, 3.2, 7); c.translate(0, 3.2 + i * 1.75, 0); parts.push(colored(c, i % 2 ? '#2f5a34' : '#386a3b')); }
  else for (const [x, y, z, r] of [[0, 5.4, 0, 2.2], [1.3, 4.7, 0.5, 1.5], [-1.1, 4.9, -0.8, 1.6], [0.2, 6.5, 0.2, 1.4]]) { const b = new THREE.IcosahedronGeometry(r, 0); b.translate(x, y, z); parts.push(colored(b, '#5f7f3a')); }
  return mergeGeometries(parts.map(p => p.toNonIndexed()));
}

function Trees() {
  const group = useRef(), { camera } = useThree(), tick = useRef(0);
  const chunks = useMemo(() => {
    const by = new Map();
    for (const t of wildTrees()) { const k = Math.floor(t[0] / CHUNK) + ',' + Math.floor(t[1] / CHUNK); if (!by.has(k)) by.set(k, []); by.get(k).push(t); }
    return [...by.values()].map(list => ({ list, cx: list.reduce((s, t) => s + t[0], 0) / list.length, cz: list.reduce((s, t) => s + t[1], 0) / list.length }));
  }, []);
  const geos = useMemo(() => [treeGeometry(0), treeGeometry(1)], []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), []);
  const meshes = useMemo(() => chunks.flatMap(ch => [0, 1].map(type => {
    const list = ch.list.filter(t => t[4] === type); if (!list.length) return null;
    const m = new THREE.InstancedMesh(geos[type], mat, list.length), o = new THREE.Object3D();
    list.forEach((t, i) => { o.position.set(t[0], height(t[0], t[1]) - 0.1, t[1]); o.rotation.set(0, t[3], 0); o.scale.setScalar(t[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.userData.ch = ch; m.visible = false; return m;
  }).filter(Boolean)), [chunks, geos, mat]);
  useEffect(() => { const g = group.current; meshes.forEach(m => g.add(m)); return () => { meshes.forEach(m => { g.remove(m); m.dispose(); }); geos.forEach(x => x.dispose()); mat.dispose(); }; }, [meshes, geos, mat]);
  useFrame((_, dt) => {
    if ((tick.current += dt) < 0.4) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    for (const m of meshes) { const c = m.userData.ch; m.visible = Math.hypot(c.cx - p.x, c.cz - p.z) < TREE_SEEN + CHUNK; }
  });
  return <group ref={group} />;
}

/** one translucent ribbon per creek, at the water level the creek's own points carry */
function Water() {
  const group = useRef(), { camera } = useThree(), tick = useRef(0);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d7f93', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide }), []);
  const meshes = useMemo(() => wildCreeks().map(c => {
    const pos = [], idx = [], n = c.pts.length, half = c.hw * 1.9;
    c.pts.forEach((q, i) => {
      const a = c.pts[Math.max(0, i - 1)], b = c.pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l;
      pos.push(q[0] + px * half, q[2] + 0.02, q[1] + pz * half, q[0] - px * half, q[2] + 0.02, q[1] - pz * half);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.renderOrder = 3; m.visible = false; m.userData.c = c.pts[Math.floor(n / 2)]; m.userData.r = g.boundingSphere.radius; return m;
  }), [mat]);
  useEffect(() => { const g = group.current; meshes.forEach(m => g.add(m)); return () => { meshes.forEach(m => { g.remove(m); m.geometry.dispose(); }); mat.dispose(); }; }, [meshes, mat]);
  useFrame((_, dt) => {
    if ((tick.current += dt) < 0.4) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    for (const m of meshes) { const c = m.userData.c; m.visible = Math.hypot(c[0] - p.x, c[1] - p.z) < WATER_SEEN + m.userData.r; }
  });
  return <group ref={group} />;
}

export default function WildScenery() { return <><Water /><Trees /></>; }
