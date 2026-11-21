import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Wrap something that never changes shape (a shelf, a tool, a fence) and its many little boxes and cylinders are baked into ONE mesh per material:
 * a 160-part shelf goes from 160 draw calls (and 160 more in the shadow pass) to a handful. The original meshes stay in the tree, hidden, so nothing
 * else about the scene changes; unmounting puts everything back. Meshes that glow, are see-through, or carry `userData.keep` are left alone.
 */
export default function MergedStatic({ children }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const root = ref.current; if (!root) return;
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4(), buckets = new Map(), olds = [];
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.keep) return;
      const m = o.material;
      if (!m || Array.isArray(m) || m.transparent || (m.emissive && m.emissive.getHex() && m.emissiveIntensity > 0)) return;
      for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return;
      const key = [m.type, m.color?.getHex(), m.roughness, m.metalness, m.map?.uuid || '', m.side, o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0].join('|');
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv') g.deleteAttribute(n);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      rel.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(rel);
      if (rel.determinant() < 0) { const idx = []; const pos = g.attributes.position.count; for (let i = 0; i < pos; i += 3) idx.push(i, i + 2, i + 1); g.setIndex(idx); }   // a mirrored part would be inside out
      let b = buckets.get(key); if (!b) buckets.set(key, b = { material: m, cast: o.castShadow, receive: o.receiveShadow, list: [] });
      b.list.push(g); olds.push(o);
    });
    const made = [];
    for (const b of buckets.values()) {
      const merged = mergeGeometries(b.list.map(g => (g.index ? g.toNonIndexed() : g)));
      b.list.forEach(g => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.material); mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; mesh.matrixAutoUpdate = false; mesh.userData.merged = true;
      root.add(mesh); made.push(mesh);
    }
    olds.forEach(o => { o.visible = false; });
    return () => { olds.forEach(o => { o.visible = true; }); made.forEach(m => { root.remove(m); m.geometry.dispose(); }); };
  }, []);
  return <group ref={ref}>{children}</group>;
}
