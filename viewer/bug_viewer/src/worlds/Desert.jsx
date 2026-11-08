import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { height, biomeMasks } from './county.js';
import { BOULDERS } from './siteData.js';
import { DEAD_TREES, SHRUBS, DRY_TINT } from './flora.js';

// The desert scenery from public/models/ENV_Desert.glb (assets/pipeline/export_desert.py): real rock models for the boulders the car
// and the walker collide with (siteData BOULDERS), sun-killed trees and shrubs (flora.js). Thousands of instances of ~20 models, so
// each material is one BatchedMesh (one draw call, culled per instance); far instances are switched off by distance.
const FILE = '/models/ENV_Desert.glb';
const ROCK_MODELS = ['ROCK_1', 'ROCK_2', 'ROCK_3', 'BOULDER_1', 'BOULDER_2', 'BOULDER_3', 'BOULDER_4', 'BOULDER_5', 'BOULDER_6', 'BOULDER_7', 'BOULDER_8', 'BOULDER_9'];
const ATTRS = ['position', 'normal', 'uv'];

/** a model's meshes, each with its transform relative to the model's own origin */
function partsOf(scene, name) {
  const node = scene.getObjectByName(name); if (!node) return [];
  node.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert(), out = [];
  node.traverse(o => { if (o.isMesh) out.push({ geometry: o.geometry, material: o.material, local: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) }); });
  return out;
}
/** BatchedMesh needs every geometry to carry the same attributes */
function clean(g) {
  const out = new THREE.BufferGeometry();
  for (const a of ATTRS) out.setAttribute(a, g.attributes[a] || new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * (a === 'uv' ? 2 : 3)), a === 'uv' ? 2 : 3));
  out.setIndex(g.index); return out;
}

/**
 * Build one BatchedMesh per material from `entries` = [{ model, matrix, color, far }].
 * Returns [{ mesh, ids: [{ id, x, z, far }] }].
 */
function buildBatches(scene, entries, tweak, opts = {}) {
  const byMat = new Map();
  const models = new Map();
  for (const e of entries) if (!models.has(e.model)) models.set(e.model, partsOf(scene, e.model));
  for (const [model, parts] of models) for (const p of parts) {
    const key = p.material.name || p.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { material: p.material, geos: new Map(), items: [] });
    const b = byMat.get(key); if (!b.geos.has(p.geometry)) b.geos.set(p.geometry, { g: clean(p.geometry), id: -1 });
  }
  for (const e of entries) for (const p of models.get(e.model)) byMat.get(p.material.name || p.material.uuid).items.push({ e, p });
  const out = [], m = new THREE.Matrix4();
  for (const [, b] of byMat) {
    let verts = 0, idx = 0; for (const { g } of b.geos.values()) { verts += g.attributes.position.count; idx += g.index.count; }
    const mat = b.material.clone(); tweak?.(mat);
    const mesh = new THREE.BatchedMesh(b.items.length, verts, idx, mat);
    for (const v of b.geos.values()) v.id = mesh.addGeometry(v.g);
    const ids = [];
    for (const { e, p } of b.items) {
      const id = mesh.addInstance(b.geos.get(p.geometry).id);
      mesh.setMatrixAt(id, m.multiplyMatrices(e.matrix, p.local));
      if (e.color) mesh.setColorAt(id, e.color);
      ids.push({ id, x: e.x, z: e.z, far: e.far });
    }
    mesh.castShadow = !opts.noShadow; mesh.receiveShadow = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    out.push({ mesh, ids });
  }
  return out;
}

const o3 = new THREE.Object3D();
const place = (x, y, z, s, ry, tilt = 0, sy = 1) => { o3.position.set(x, y, z); o3.rotation.set(tilt * Math.sin(ry * 3), ry, tilt * Math.cos(ry * 5)); o3.scale.set(s, s * sy, s); o3.updateMatrix(); return o3.matrix.clone(); };

export default function Desert() {
  const { scene } = useGLTF(FILE), { camera } = useThree(), group = useRef();
  const batches = useMemo(() => {
    const canyonRed = new THREE.Color('#e3a27a'), c = new THREE.Color();
    const rocks = BOULDERS.map(b => {
      const m = biomeMasks(b.x, b.z);
      c.setHSL(0.08, 0.1, 0.78 + b.k * 0.3).lerp(canyonRed, Math.min(1, m.canyon * 1.4));
      return { model: ROCK_MODELS[b.m ?? Math.floor(b.k * 12)], x: b.x, z: b.z, far: b.s > 2 ? 2400 : 1300, color: c.clone(),
        matrix: place(b.x, height(b.x, b.z) - 0.1 * b.s, b.z, b.s, b.ry, 0.18, 0.75 + b.k * 0.4) };
    });
    const bleached = new THREE.Color('#e4dbcd');
    const trees = DEAD_TREES.map(([x, z, k, s, ry]) => ({ model: `DEAD_TREE_${k}`, x, z, far: 2400, color: bleached, matrix: place(x, height(x, z) - 0.15, z, s, ry, 0.06) }));
    const dry = new THREE.Color(DRY_TINT);
    const shrubs = SHRUBS.map(([x, z, s, ry]) => ({ model: 'SHRUB', x, z, far: 480, color: dry, matrix: place(x, height(x, z) - 0.05, z, s, ry) }));
    return [
      ...buildBatches(scene, rocks),
      ...buildBatches(scene, trees),
      ...buildBatches(scene, shrubs, m => { m.alphaTest = 0.45; m.transparent = false; m.side = THREE.DoubleSide; m.depthWrite = true; }, { noShadow: true }),
    ];
  }, [scene]);
  useEffect(() => { const g = group.current; batches.forEach(b => g.add(b.mesh)); return () => batches.forEach(b => { g.remove(b.mesh); b.mesh.dispose(); }); }, [batches]);
  // switch far instances off (fog hides them anyway); a few thousand distance checks every 0.4 s
  const t = useRef(1);
  useFrame((_, dt) => {
    if ((t.current += dt) < 0.4) return; t.current = 0;
    const px = camera.position.x, pz = camera.position.z;
    for (const { mesh, ids } of batches) for (const { id, x, z, far } of ids) { const dx = x - px, dz = z - pz; mesh.setVisibleAt(id, dx * dx + dz * dz < far * far); }
  });
  return <group ref={group} />;
}
useGLTF.preload(FILE);
