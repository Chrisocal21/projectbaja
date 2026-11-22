import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { game } from '../game/store.js';
import { perfStart, perfEnd } from '../game/perfMetrics.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const RADIUS = 520, CELL = 34, MOVE = 65;
const hash = (x, z, seed) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function modelParts(scene, name) {
  const node = scene.getObjectByName(name);
  if (!node) return [];
  node.updateWorldMatrix(true, true);
  const inv = node.matrixWorld.clone().invert(), parts = [];
  node.traverse(o => { if (o.isMesh) parts.push({ geometry: o.geometry, material: o.material, local: inv.clone().multiply(o.matrixWorld) }); });
  return parts;
}

function cardonParts() {
  const cylinder = (top, bottom, length, x, y, angle = 0) => {
    const g = new THREE.CylinderGeometry(top, bottom, length, 9);
    g.rotateZ(angle); g.translate(x, y, 0); return g;
  };
  const pieces = [cylinder(0.3, 0.45, 6.4, 0, 3.2), cylinder(0.19, 0.27, 2.4, 1.05, 3.55, -0.65), cylinder(0.16, 0.23, 1.75, 1.67, 4.5), cylinder(0.18, 0.25, 1.9, -0.85, 2.7, 0.72), cylinder(0.15, 0.2, 1.4, -1.3, 3.55)];
  const geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  return [{ geometry, material: new THREE.MeshStandardMaterial({ color: '#667d4d', roughness: 1 }), local: new THREE.Matrix4() }];
}

function stemBetween(a, b, radius) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius * 0.58, radius, delta.length(), 6);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
  return geometry;
}

function boojumParts() {
  const pieces = [new THREE.CylinderGeometry(0.07, 0.3, 6.2, 7)];
  pieces[0].translate(0, 3.1, 0);
  for (let i = 0; i < 14; i++) {
    const y = 0.65 + i * 0.38, side = i % 2 ? -1 : 1, az = i * 2.4;
    pieces.push(stemBetween([0, y, 0], [Math.cos(az) * (0.38 + y * 0.025) * side, y + 0.34, Math.sin(az) * 0.45], 0.035));
  }
  const geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  return [{ geometry, material: new THREE.MeshStandardMaterial({ color: '#84745b', roughness: 1 }), local: new THREE.Matrix4() }];
}

function ocotilloParts() {
  const pieces = [];
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9, spread = 1.1 + (i % 3) * 0.32, height = 2.7 + (i % 4) * 0.3;
    const mid = [Math.cos(a) * spread * 0.42, height * 0.48, Math.sin(a) * spread * 0.42];
    const tip = [Math.cos(a) * spread, height, Math.sin(a) * spread];
    pieces.push(stemBetween([0, 0.12, 0], mid, 0.065), stemBetween(mid, tip, 0.038));
  }
  const geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  return [{ geometry, material: new THREE.MeshStandardMaterial({ color: '#6b7050', roughness: 1 }), local: new THREE.Matrix4() }];
}

/** Sparse, deterministic land cover across the real elevation map. Only the nearby field is instanced. */
export default function RealScenery({ heightAt, surfaceAt, regionAt = () => ({ south: 0 }), avoid = () => false }) {
  const rocks = useGLTF('/models/ENV_Desert.glb').scene;
  const trees = useGLTF('/models/ENV_Trees.glb').scene;
  const { camera } = useThree(), root = useRef(), last = useRef({ x: Infinity, z: Infinity }), pending = useRef(null);
  const entries = useMemo(() => [
    { name: 'ROCK_1', parts: modelParts(rocks, 'ROCK_1'), cap: 850 },
    { name: 'ROCK_2', parts: modelParts(rocks, 'ROCK_2'), cap: 850 },
    { name: 'BOULDER_1', parts: modelParts(rocks, 'BOULDER_1'), cap: 850 },
    { name: 'TREE_A', parts: modelParts(trees, 'TREE_A'), cap: 850 },
    { name: 'TREE_B', parts: modelParts(trees, 'TREE_B'), cap: 850 },
    { name: 'SHRUB', parts: modelParts(rocks, 'SHRUB'), cap: 850 },
    { name: 'CARDON', parts: cardonParts(), cap: 850 },
    { name: 'BOOJUM', parts: boojumParts(), cap: 850 },
    { name: 'OCOTILLO', parts: ocotilloParts(), cap: 850 },
  ], [rocks, trees]);
  const meshes = useMemo(() => entries.map(e => e.parts.map(p => {
    const mat = p.material.clone(); mat.side = THREE.DoubleSide; mat.alphaTest = 0.4; mat.transparent = false;
    const mesh = new THREE.InstancedMesh(p.geometry, mat, e.cap);
    mesh.count = 0; mesh.frustumCulled = false; mesh.receiveShadow = true;
    return mesh;
  })), [entries]);
  useEffect(() => {
    const group = root.current;
    meshes.flat().forEach(m => group.add(m));
    return () => {
      meshes.flat().forEach(m => { group.remove(m); m.material.dispose(); m.dispose(); });
      entries.filter(e => ['CARDON', 'BOOJUM', 'OCOTILLO'].includes(e.name)).forEach(e => e.parts.forEach(p => { p.geometry.dispose(); p.material.dispose(); }));
    };
  }, [meshes, entries]);
  const obj = useMemo(() => new THREE.Object3D(), []), matrix = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const p = game.onFoot ? camera.position : game.pos;
    if (!pending.current) {
      if (Math.hypot(p.x - last.current.x, p.z - last.current.z) < MOVE) return;
      last.current = { x: p.x, z: p.z };
      pending.current = { x: p.x, z: p.z, ix0: Math.floor((p.x - RADIUS) / CELL), ix1: Math.ceil((p.x + RADIUS) / CELL),
        iz: Math.floor((p.z - RADIUS) / CELL), iz1: Math.ceil((p.z + RADIUS) / CELL), counts: entries.map(() => 0) };
      pending.current.ix = pending.current.ix0;
    }
    const job = pending.current, counts = job.counts;
    const started = perfStart();
    // Keep the old instances visible until a complete new field is ready.
    // Spreading the expensive height/surface/road queries avoids a movement hitch.
    for (let processed = 0; processed < 160 && job.iz <= job.iz1; processed++) {
      const ix = job.ix, iz = job.iz;
      if (++job.ix > job.ix1) { job.ix = job.ix0; job.iz++; }
      const x = (ix + 0.15 + 0.7 * hash(ix, iz, 11)) * CELL;
      const z = (iz + 0.15 + 0.7 * hash(ix, iz, 23)) * CELL;
      const distance = Math.hypot(x - job.x, z - job.z);
      if (distance > RADIUS || avoid(x, z)) continue;
      const surface = surfaceAt(x, z).key;
      if (['water', 'sand', 'playa', 'asphalt', 'concrete', 'curb'].includes(surface)) continue;
      const dx = (heightAt(x + 8, z) - heightAt(x - 8, z)) / 16;
      const dz = (heightAt(x, z + 8) - heightAt(x, z - 8)) / 16;
      const slope = Math.hypot(dx, dz), h = heightAt(x, z), r = hash(ix, iz, 47), south = regionAt(x, z).south;
      let kind = -1;
      if (slope > 0.32 || surface === 'rock') { if (r < 0.65) kind = r < 0.4 ? 0 : 2; }
      else if (r < 0.16) kind = r < 0.1 ? 0 : 1;
      else if (r < 0.37 && h < 200 && surface !== 'rock') kind = 5;
      else if (south > 0.25 && x < 3000 + z * 0.48 && h < 240 && slope < 0.18 && r > 0.88 && surface !== 'gravel') kind = r > 0.975 ? 8 : r > 0.94 ? 7 : 6;
      else if (south < 0.45 && h < 110 && slope < 0.16 && r > 0.965 && surface !== 'gravel') kind = r > 0.985 ? 3 : 4;
      if (kind < 0 || counts[kind] >= entries[kind].cap) continue;
      const naturalScale = kind >= 6 ? 0.65 + hash(ix, iz, 59) * 0.65 : kind === 3 || kind === 4 ? 0.75 + hash(ix, iz, 59) * 0.65 : kind === 5 ? 0.65 + hash(ix, iz, 59) * 0.7 : 0.6 + hash(ix, iz, 61) * (kind === 2 ? 1.4 : 1.2);
      const scale = naturalScale * Math.min(1, Math.max(0.01, (RADIUS - distance) / 130));
      obj.position.set(x, h - (kind >= 3 ? 0.1 : 0.16) * scale, z);
      obj.rotation.set(kind >= 3 ? 0 : dz * 0.12, hash(ix, iz, 71) * Math.PI * 2, kind >= 3 ? 0 : -dx * 0.12);
      obj.scale.set(scale, scale * (0.8 + 0.4 * hash(ix, iz, 73)), scale);
      obj.updateMatrix();
      entries[kind].parts.forEach((part, n) => meshes[kind][n].setMatrixAt(counts[kind], matrix.multiplyMatrices(obj.matrix, part.local)));
      counts[kind]++;
    }
    if (job.iz > job.iz1) {
      meshes.forEach((group, kind) => group.forEach(mesh => { mesh.count = counts[kind]; mesh.instanceMatrix.needsUpdate = true; }));
      pending.current = null;
    }
    perfEnd('scenery batch', started);
  });
  return <group ref={root} />;
}
