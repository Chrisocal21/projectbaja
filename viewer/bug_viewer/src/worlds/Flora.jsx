import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { height, surface } from './county.js';
import { TREES, PLANTS, BLOCK, NB, DRY_TINT, grassAt, GRASS_CELL } from './flora.js';
import { coverAt, valleyTrees } from './cover.js';
import { clumpAt, CLUMP_CELL } from './groundCover.js';

const TREE_FILE = '/models/ENV_Trees.glb', PLANT_FILE = '/models/ENV_Plants.glb', GRASS_FILE = '/models/ENV_Grass.glb';
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
function writeInstance(mesh, i, part, x, z, s, ry, tint, y) {   // y: the ground height if already known (the grass remembers it)
  tmpO.position.set(x, (y ?? height(x, z)) - 0.05 * s, z); tmpO.rotation.set(0, ry, 0); tmpO.scale.setScalar(s); tmpO.updateMatrix();
  mesh.setMatrixAt(i, tmpM.multiplyMatrices(tmpO.matrix, part.local)); mesh.setColorAt(i, tmpC.set(tint || '#ffffff'));
}

/** a fixed set of instances (trees, shade plants); `items` = [[x, z, scale, ry, tint?], ...]
 *  Split into ~500 m chunks, each its own InstancedMesh with its own bounding sphere: one mesh for the whole map was never culled, so every tree
 *  (6,600 triangles each) was drawn, and drawn again into the shadow map, wherever you looked. */
const CHUNK = 500;
function Instances({ parts, items, shadows }) {
  const group = useRef();
  const chunks = useMemo(() => { const by = new Map(); for (const it of items) { const k = Math.floor(it[0] / CHUNK) + ',' + Math.floor(it[1] / CHUNK); if (!by.has(k)) by.set(k, []); by.get(k).push(it); } return [...by.values()]; }, [items]);
  const meshes = useMemo(() => chunks.flatMap(list => parts.map((p, k) => { const m = new THREE.InstancedMesh(p.geometry, p.material, list.length); m.castShadow = shadows; m.receiveShadow = true; m.userData = { list, k }; return m; })), [parts, chunks, shadows]);
  useEffect(() => {
    meshes.forEach(mesh => { const { list, k } = mesh.userData; list.forEach(([x, z, s, ry, tint], i) => writeInstance(mesh, i, parts[k], x, z, s, ry, tint)); mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); });
    const g = group.current; meshes.forEach(m => g.add(m));
    return () => meshes.forEach(m => { g.remove(m); m.dispose(); });
  }, [meshes]);
  return <group ref={group} />;
}

/** dead grass + grass bushes in a ~75 m field around you, re-grown (deterministically) every few metres you move */
function GrassField({ scene }) {
  const group = useRef(), { camera } = useThree(), last = useRef({ x: 1e9, z: 1e9 }), cache = useRef(new Map());   // cache: each 3.5 m cell is worked out once (it is deterministic), so moving only costs the new strip at the edge
  const cap = Math.ceil((2 * GRASS_R / GRASS_CELL) ** 2);
  const sets = useMemo(() => Object.fromEntries(GRASS_MODELS.map(k => [k, partsOf(scene, k, 1.25).map(p => { const m = new THREE.InstancedMesh(p.geometry, p.material, cap); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; return { m, p }; })])), [scene]);
  useEffect(() => { const g = group.current; Object.values(sets).flat().forEach(({ m }) => g.add(m)); return () => Object.values(sets).flat().forEach(({ m }) => { g.remove(m); m.dispose(); }); }, [sets]);
  useFrame(() => {
    const px = camera.position.x, pz = camera.position.z;
    if (Math.hypot(px - last.current.x, pz - last.current.z) < GRASS_MOVE) return;
    last.current = { x: px, z: pz };
    if (cache.current.size > 30000) cache.current.clear();
    const n = Object.fromEntries(GRASS_MODELS.map(k => [k, 0])), c0 = Math.floor((px - GRASS_R) / GRASS_CELL), c1 = Math.floor((px + GRASS_R) / GRASS_CELL), r0 = Math.floor((pz - GRASS_R) / GRASS_CELL), r1 = Math.floor((pz + GRASS_R) / GRASS_CELL);
    for (let ix = c0; ix <= c1; ix++) for (let iz = r0; iz <= r1; iz++) {
      const ck = ix * 100000 + iz; let g = cache.current.get(ck);
      if (g === undefined) { g = grassAt(ix, iz, surface); if (g) g.y = height(g.x, g.z); cache.current.set(ck, g); }
      if (!g || Math.hypot(g.x - px, g.z - pz) > GRASS_R) continue;
      const tint = g.dry && g.model.startsWith('BUSH') ? DRY_TINT : null;
      for (const { m, p } of sets[g.model]) writeInstance(m, n[g.model], p, g.x, g.z, g.s, g.ry, tint, g.y);
      n[g.model]++;
    }
    for (const k of GRASS_MODELS) for (const { m } of sets[k]) { m.count = n[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  });
  return <group ref={group} />;
}

/** Chris's grass clumps (ENV_Grass.glb) in a ~48 m field round you: crops in rows, weeds on the ditch banks, bunchgrass on the desert,
 *  green where water gathers (worlds/groundCover.js decides). Clumps near the edge of the field shrink in, so nothing pops. */
const COVER_R = 48, COVER_MOVE = 4;
const COVER_MODELS = ['G_DRY_TALL', 'G_DRY_LOW', 'G_DRY_MAT', 'G_GREEN_1', 'G_GREEN_2', 'G_GREEN_3', 'G_WEED'];
function CoverField() {
  const scene = useGLTF(GRASS_FILE).scene, group = useRef(), { camera } = useThree(), last = useRef({ x: 1e9, z: 1e9 }), cache = useRef(new Map());
  const cap = Math.ceil((2 * COVER_R / CLUMP_CELL) ** 2 * 0.8);
  const sets = useMemo(() => Object.fromEntries(COVER_MODELS.map(k => [k, partsOf(scene, k).map(p => { p.material.alphaTest = 0; const m = new THREE.InstancedMesh(p.geometry, p.material, cap); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; return { m, p }; })])), [scene, cap]);
  // tree shade: a coarse grid of every tree trunk, so the grass under trees grows green
  const shade = useMemo(() => { const g = new Map(); for (const [x, z] of [...TREES, ...valleyTrees()]) { const k = Math.floor(x / 8) + ',' + Math.floor(z / 8); (g.get(k) || g.set(k, []).get(k)).push([x, z]); } return g; }, []);
  const treeAt = (x, z) => { let best = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [tx, tz] of shade.get((Math.floor(x / 8) + a) + ',' + (Math.floor(z / 8) + b)) || []) best = Math.max(best, 1 - Math.hypot(x - tx, z - tz) / 6); return best; };
  const cover = (x, z) => coverAt(x, z, treeAt(x, z));
  useEffect(() => { const g = group.current; Object.values(sets).flat().forEach(({ m }) => g.add(m)); return () => Object.values(sets).flat().forEach(({ m }) => { g.remove(m); m.dispose(); }); }, [sets]);
  useFrame(() => {
    const px = camera.position.x, pz = camera.position.z;
    if (Math.hypot(px - last.current.x, pz - last.current.z) < COVER_MOVE) return;
    last.current = { x: px, z: pz };
    if (cache.current.size > 60000) cache.current.clear();
    const n = Object.fromEntries(COVER_MODELS.map(k => [k, 0])), c0 = Math.floor((px - COVER_R) / CLUMP_CELL), c1 = Math.floor((px + COVER_R) / CLUMP_CELL), r0 = Math.floor((pz - COVER_R) / CLUMP_CELL), r1 = Math.floor((pz + COVER_R) / CLUMP_CELL);
    for (let ix = c0; ix <= c1; ix++) for (let iz = r0; iz <= r1; iz++) {
      const ck = ix * 131072 + iz; let g = cache.current.get(ck);
      if (g === undefined) { g = clumpAt(ix, iz, cover); if (g) g.y = height(g.x, g.z); cache.current.set(ck, g); }
      if (!g) continue;
      const d = Math.hypot(g.x - px, g.z - pz); if (d > COVER_R || n[g.model] >= cap) continue;
      const s = g.s * Math.min(1, (COVER_R - d) / 10);
      for (const { m, p } of sets[g.model]) writeInstance(m, n[g.model], p, g.x, g.z, s, g.ry, g.tint, g.y);
      n[g.model]++;
    }
    for (const k of COVER_MODELS) for (const { m } of sets[k]) { m.count = n[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
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
    <React.Suspense fallback={null}><CoverField /></React.Suspense>
  </>;
}
useGLTF.preload(TREE_FILE); useGLTF.preload(PLANT_FILE); useGLTF.preload(GRASS_FILE);
