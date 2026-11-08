import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { height, surface } from './county.js';
import { TREES, PLANTS, BLOCK, NB, DRY_TINT, grassAt, GRASS_CELL } from './flora.js';

const TREE_FILE = '/models/ENV_Trees.glb', PLANT_FILE = '/models/ENV_Plants.glb';
const SHADE_NEAR = 330, GRASS_R = 75, GRASS_MOVE = 6;
const GRASS_MODELS = ['GRASS_DEAD_1', 'GRASS_DEAD_2', 'BUSH_GRASS_1', 'BUSH_GRASS_2', 'BUSH_GRASS_3'];

/** the meshes that make up one named model in a GLB (a multi-material node is a group of meshes) */
function partsOf(scene, name, bright = 1) {
  const node = scene.getObjectByName(name); if (!node) return [];
  const out = []; node.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
  node.traverse(o => { if (o.isMesh) {
    const m = o.material.clone(); m.alphaTest = 0.4; m.transparent = false; m.side = THREE.DoubleSide; m.depthWrite = true; m.normalMap = null;
    if (bright !== 1) m.color.multiplyScalar(bright);
    out.push({ geometry: o.geometry, material: m, local: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) });
  } });
  return out;
}
const tmpO = new THREE.Object3D(), tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
function writeInstance(mesh, i, part, x, z, s, ry, tint) {
  tmpO.position.set(x, height(x, z) - 0.05 * s, z); tmpO.rotation.set(0, ry, 0); tmpO.scale.setScalar(s); tmpO.updateMatrix();
  mesh.setMatrixAt(i, tmpM.multiplyMatrices(tmpO.matrix, part.local)); mesh.setColorAt(i, tmpC.set(tint || '#ffffff'));
}

/** a fixed set of instances (trees, shade plants); `items` = [[x, z, scale, ry, tint?], ...] */
function Instances({ parts, items, shadows }) {
  const group = useRef();
  const meshes = useMemo(() => parts.map(p => { const m = new THREE.InstancedMesh(p.geometry, p.material, items.length); m.castShadow = shadows; m.receiveShadow = true; return m; }), [parts, items]);
  useEffect(() => {
    meshes.forEach((mesh, k) => { items.forEach(([x, z, s, ry, tint], i) => writeInstance(mesh, i, parts[k], x, z, s, ry, tint)); mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); });
    const g = group.current; meshes.forEach(m => g.add(m));
    return () => meshes.forEach(m => { g.remove(m); m.dispose(); });
  }, [meshes]);
  return <group ref={group} />;
}

/** dead grass + grass bushes in a ~75 m field around you, re-grown (deterministically) every few metres you move */
function GrassField({ scene }) {
  const group = useRef(), { camera } = useThree(), last = useRef({ x: 1e9, z: 1e9 });
  const cap = Math.ceil((2 * GRASS_R / GRASS_CELL) ** 2);
  const sets = useMemo(() => Object.fromEntries(GRASS_MODELS.map(k => [k, partsOf(scene, k, 1.25).map(p => { const m = new THREE.InstancedMesh(p.geometry, p.material, cap); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; return { m, p }; })])), [scene]);
  useEffect(() => { const g = group.current; Object.values(sets).flat().forEach(({ m }) => g.add(m)); return () => Object.values(sets).flat().forEach(({ m }) => { g.remove(m); m.dispose(); }); }, [sets]);
  useFrame(() => {
    const px = camera.position.x, pz = camera.position.z;
    if (Math.hypot(px - last.current.x, pz - last.current.z) < GRASS_MOVE) return;
    last.current = { x: px, z: pz };
    const n = Object.fromEntries(GRASS_MODELS.map(k => [k, 0])), c0 = Math.floor((px - GRASS_R) / GRASS_CELL), c1 = Math.floor((px + GRASS_R) / GRASS_CELL), r0 = Math.floor((pz - GRASS_R) / GRASS_CELL), r1 = Math.floor((pz + GRASS_R) / GRASS_CELL);
    for (let ix = c0; ix <= c1; ix++) for (let iz = r0; iz <= r1; iz++) {
      const g = grassAt(ix, iz, surface); if (!g || Math.hypot(g.x - px, g.z - pz) > GRASS_R) continue;
      const tint = g.dry && g.model.startsWith('BUSH') ? DRY_TINT : null;
      for (const { m, p } of sets[g.model]) writeInstance(m, n[g.model], p, g.x, g.z, g.s, g.ry, tint);
      n[g.model]++;
    }
    for (const k of GRASS_MODELS) for (const { m } of sets[k]) { m.count = n[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  });
  return <group ref={group} />;
}

/** trees (few, seen from far away), shade plants in 250 m blocks near you, and the grass field */
export default function Flora() {
  const trees = useGLTF(TREE_FILE).scene, plants = useGLTF(PLANT_FILE).scene, { camera } = useThree();
  const blockGroups = useRef([]);
  const treeSets = useMemo(() => ['TREE_A', 'TREE_B'].map(k => ({ parts: partsOf(trees, k), items: TREES.filter(t => t[2] === k).map(([x, z, , s, ry]) => [x, z, s, ry]) })), [trees]);
  const blocks = useMemo(() => {
    const out = Array.from({ length: NB * NB }, (_, b) => ({ b, cx: -NB * BLOCK / 2 + (Math.floor(b / NB) + 0.5) * BLOCK, cz: -NB * BLOCK / 2 + ((b % NB) + 0.5) * BLOCK, sets: [] }));
    for (const [k, list] of Object.entries(PLANTS)) {
      if (!list.length) continue;
      const parts = partsOf(plants, k), byBlock = new Map();
      for (const [x, z, s, ry, b] of list) { if (!byBlock.has(b)) byBlock.set(b, []); byBlock.get(b).push([x, z, s, ry, null]); }
      for (const [b, items] of byBlock) out[b].sets.push({ k, parts, items });
    }
    return out.filter(bl => bl.sets.length);
  }, [plants]);
  const tick = useRef(0);
  useFrame((_, dt) => {
    if ((tick.current += dt) < 0.25) return; tick.current = 0;
    blocks.forEach((bl, i) => { const g = blockGroups.current[i]; if (g) g.visible = Math.hypot(camera.position.x - bl.cx, camera.position.z - bl.cz) < SHADE_NEAR + BLOCK * 0.7; });
  });
  return <>
    {treeSets.map((t, i) => <Instances key={i} parts={t.parts} items={t.items} shadows />)}
    {blocks.map((bl, i) => <group key={bl.b} ref={el => (blockGroups.current[i] = el)} visible={false}>{bl.sets.map(s => <Instances key={s.k} parts={s.parts} items={s.items} shadows={false} />)}</group>)}
    <GrassField scene={plants} />
  </>;
}
useGLTF.preload(TREE_FILE); useGLTF.preload(PLANT_FILE);
