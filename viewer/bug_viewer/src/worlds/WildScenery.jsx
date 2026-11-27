import { bridgeGeometry, bridgeTimberMaterial } from './sceneryGeometry.js';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { game } from '../game/store.js';
import { height, wildTrees, wildCreeks, wildDecks } from './county.js';
import { valleyTrees } from './cover.js';
import { TRUNKS } from './biomes/trunks.js';

// The creeks, rivers and forests of the off-road features (offroadFeatures.js / wildFeatures.js): a water surface per creek and low-poly trees in chunks.
// Both are drawn only near you (the water only where the fine terrain shows the trench).
const WATER_SEEN = 430, TREE_SEEN = 620, CHUNK = 320;

const colored = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
/** windbreak shapes: 2 = a bushy salt-cedar kind, foliage nearly to the ground; 3 = a tall, narrow, open kind. Ragged on purpose. PROPOSAL look. */
function windbreakGeometry(type) {
  const tall = type === 3, parts = [];
  const trunk = new THREE.CylinderGeometry(0.1, 0.26, tall ? 5.2 : 2.2, 5); trunk.translate(0, tall ? 2.6 : 1.1, 0); parts.push(colored(trunk, tall ? '#8a7a66' : '#5b4a38'));
  let s = type * 911; const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tones = tall ? ['#6f8256', '#7d8e62', '#627548'] : ['#6a7a4c', '#788656', '#5c6b40'];
  for (let i = 0; i < (tall ? 11 : 13); i++) {
    const t = rand(), y = tall ? 3.4 + t * 5.2 : 1.1 + t * 3.4, wide = tall ? 1.1 * (1 - Math.abs(t - 0.4)) + 0.2 : 1.9 * (1 - t * 0.65), a = rand() * Math.PI * 2, d = rand() * wide;
    const blob = new THREE.IcosahedronGeometry((tall ? 0.55 : 0.7) + rand() * 0.55, 0);
    blob.scale(1, tall ? 1.35 : 0.9, 1); blob.rotateY(rand() * 6.28); blob.translate(Math.cos(a) * d, y, Math.sin(a) * d); parts.push(colored(blob, tones[i % 3]));
  }
  return mergeGeometries(parts.map(p => p.toNonIndexed()));
}
/** two cheap trees (about 130 triangles each): a pine (stacked cones) and a broadleaf (lumpy crown), trunk and leaves coloured by vertex */
function treeGeometry(type) {
  if (type >= 2) return windbreakGeometry(type);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, type ? 3.6 : 4.4, 6); trunk.translate(0, (type ? 3.6 : 4.4) / 2, 0); parts.push(colored(trunk, '#5b4630'));
  if (!type) for (let i = 0; i < 4; i++) { const c = new THREE.ConeGeometry(2.3 - i * 0.48, 3.2, 7); c.translate(0, 3.2 + i * 1.75, 0); parts.push(colored(c, i % 2 ? '#2f5a34' : '#386a3b')); }
  else for (const [x, y, z, r] of [[0, 5.4, 0, 2.2], [1.3, 4.7, 0.5, 1.5], [-1.1, 4.9, -0.8, 1.6], [0.2, 6.5, 0.2, 1.4]]) { const b = new THREE.IcosahedronGeometry(r, 0); b.translate(x, y, z); parts.push(colored(b, '#5f7f3a')); }
  return mergeGeometries(parts.map(p => p.toNonIndexed()));
}

function Trees({ list: source = wildTrees, tint = null }) {
  const group = useRef(), { camera } = useThree(), tick = useRef(0);
  const chunks = useMemo(() => {
    const by = new Map();
    for (const t of source()) { const k = Math.floor(t[0] / CHUNK) + ',' + Math.floor(t[1] / CHUNK); if (!by.has(k)) by.set(k, []); by.get(k).push(t); }
    return [...by.values()].map(list => ({ list, cx: list.reduce((s, t) => s + t[0], 0) / list.length, cz: list.reduce((s, t) => s + t[1], 0) / list.length }));
  }, []);
  const geos = useMemo(() => [0, 1, 2, 3].map(treeGeometry), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, ...(tint ? { color: tint } : {}) }), [tint]);
  const meshes = useMemo(() => chunks.flatMap(ch => [0, 1, 2, 3].map(type => {
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
  const uTime = useRef({ value: 0 });
  const mat = useMemo(() => {   // flowing water: moving ripple streaks along the creek, foam at the banks (all in the shader; the geometry carries across / along coordinates)
    const m = new THREE.MeshStandardMaterial({ color: '#65776a', roughness: 0.46, metalness: 0.02, transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = uTime.current;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', 'attribute vec2 aFlow;\nvarying vec2 vFlow;\n#include <common>').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = aFlow;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', 'uniform float uTime;\nvarying vec2 vFlow;\n#include <common>').replace('#include <color_fragment>', `#include <color_fragment>
        float xa = vFlow.x * 6.0, ya = vFlow.y;
        float r1 = sin(ya * 0.9 - uTime * 2.4 + sin(xa * 1.7 + uTime * 0.7) * 1.4) * 0.5 + 0.5;
        float r2 = sin(ya * 2.3 - uTime * 3.6 + xa * 2.9) * 0.5 + 0.5;
        float streak = smoothstep(0.62, 0.9, r1 * r2);
        float foam = smoothstep(0.78, 0.98, abs(vFlow.x)) * (0.55 + 0.45 * sin(ya * 1.3 - uTime * 2.0));
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.92, vec3(0.82, 0.93, 0.98), clamp(streak * 0.035 + foam * 0.015, 0.0, 0.85));
        diffuseColor.a = diffuseColor.a * (1.0 - smoothstep(0.62, 1.0, abs(vFlow.x)));`);
    };
    return m;
  }, []);
  const meshes = useMemo(() => wildCreeks().map(c => {
    const pos = [], idx = [], flow = [], n = c.pts.length, half = c.hw * 1.9; let along = 0;
    const rows = [c.pts[0]];
    for (let i = 1; i < n; i++) {
      const a = c.pts[i-1], b = c.pts[i], steps = Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 5);
      for (let j = 1; j <= steps; j++) rows.push(a.map((v,k) => v + (b[k]-v)*j/steps));
    }
    rows.forEach((q, i) => {
      const a = rows[Math.max(0, i - 1)], b = rows[Math.min(rows.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l;
      if (i) along += Math.hypot(q[0] - rows[i - 1][0], q[1] - rows[i - 1][1]);
      const tip = Math.min(1, i / 3, (rows.length - 1 - i) / 3);
      for (let j = 0; j <= 6; j++) {
        const t = j / 3 - 1, offset = half * t * Math.sqrt(tip);
        pos.push(q[0] + px * offset, q[2] + 0.02, q[1] + pz * offset);
        flow.push(t, along);
        if (i && j) { const d = i * 7 + j; idx.push(d-8, d-7, d-1, d-1, d-7, d); }
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.renderOrder = 3; m.visible = false; m.userData.c = c.pts[Math.floor(n / 2)]; m.userData.r = g.boundingSphere.radius; return m;
  }), [mat]);
  useEffect(() => { const g = group.current; meshes.forEach(m => g.add(m)); return () => { meshes.forEach(m => { g.remove(m); m.geometry.dispose(); }); mat.dispose(); }; }, [meshes, mat]);
  useFrame((_, dt) => {
    uTime.current.value += dt;
    if ((tick.current += dt) < 0.4) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    for (const m of meshes) { const c = m.userData.c; m.visible = Math.hypot(c[0] - p.x, c[1] - p.z) < WATER_SEEN + m.userData.r; }
  });
  return <group ref={group} />;
}

/** plank bridges over the creek crossings: the ground is flush across them (the creek bed under the deck does not count), so these are the planks and rails you see */
function Bridges() {
  const group = useRef(), { camera } = useThree(), tick = useRef(0);
  const mat = useMemo(bridgeTimberMaterial, []);
  const meshes = useMemo(() => wildDecks().map(d => {
    const m = new THREE.Mesh(bridgeGeometry(d, height), mat);
    m.receiveShadow = true;
    m.position.set(d.x, height(d.x, d.z), d.z); m.rotation.y = d.h; m.visible = false; m.userData.d = d; return m;
  }), [mat]);
  useEffect(() => { const g = group.current; meshes.forEach(m => g.add(m)); return () => { meshes.forEach(m => { g.remove(m); m.geometry.dispose(); }); mat.map.dispose(); mat.dispose(); }; }, [meshes, mat]);
  useFrame((_, dt) => {
    if ((tick.current += dt) < 0.5) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    for (const m of meshes) { const d = m.userData.d; m.visible = Math.hypot(d.x - p.x, d.z - p.z) < 420; }
  });
  return <group ref={group} />;
}

/** windbreak rows along the valley's field edges (worlds/cover.js); their trunks join the shared collider grid */
export function ValleyTrees() {
  useEffect(() => { TRUNKS.set('valley-windbreaks', valleyTrees().map(([x, z, s]) => [x, z, 0.32 * s, 99])); return () => TRUNKS.remove('valley-windbreaks'); }, []);
  return <Trees list={valleyTrees} />;
}

export default function WildScenery() { return <><Water /><Trees /><Bridges /></>; }
