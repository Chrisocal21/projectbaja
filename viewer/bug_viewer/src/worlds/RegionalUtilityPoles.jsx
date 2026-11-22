import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { highways, groundHeight } from './county.js';
import { border } from './border.js';
import { regionalUtilityPoles, utilityWireSpan } from './regionalUtilities.js';

export default function RegionalUtilityPoles() {
  const poles = useRef(), arms = useRef(), insulators = useRef();
  const sites = useMemo(() => regionalUtilityPoles(highways(), (x, z) => border().waterAt(x, z)), []);
  const wires = useMemo(() => {
    const vertices = [];
    const add = (a, b, side) => {
      const points = utilityWireSpan(a, b, side, groundHeight);
      for (let i = 1; i < points.length; i++) vertices.push(...points[i - 1], ...points[i]);
    };
    for (let i = 1; i < sites.length; i++) {
      const a = sites[i - 1], b = sites[i];
      if (a.road !== b.road || Math.hypot(a.x - b.x, a.z - b.z) > 280) continue;
      add(a, b, -1.05); add(a, b, 1.05);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); return g;
  }, [sites]);
  useEffect(() => {
    if (!sites.length) return;
    const o = new THREE.Object3D(); let k = 0;
    for (const p of sites) {
      const y = groundHeight(p.x, p.z);
      o.position.set(p.x, y + 4.5, p.z); o.rotation.set(0, p.h, 0); o.scale.set(1, 1, 1); o.updateMatrix(); poles.current.setMatrixAt(k, o.matrix);
      o.position.set(p.x, y + 8.35, p.z); o.updateMatrix(); arms.current.setMatrixAt(k, o.matrix);
      for (const side of [-1, 1]) {
        o.position.set(p.x + Math.cos(p.h) * side * 1.05, y + 8.68, p.z - Math.sin(p.h) * side * 1.05);
        o.rotation.set(0, p.h, 0); o.updateMatrix(); insulators.current.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), o.matrix);
      }
      k++;
    }
    for (const ref of [poles, arms, insulators]) ref.current.instanceMatrix.needsUpdate = true;
  }, [sites]);
  useEffect(() => () => wires.dispose(), [wires]);
  if (!sites.length) return null;
  return <>
    <instancedMesh ref={poles} args={[null, null, sites.length]} castShadow frustumCulled={false}><cylinderGeometry args={[0.11, 0.17, 9, 7]} /><meshStandardMaterial color="#80684d" roughness={1} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, sites.length]} castShadow frustumCulled={false}><boxGeometry args={[2.8, 0.18, 0.18]} /><meshStandardMaterial color="#6c5238" roughness={1} /></instancedMesh>
    <instancedMesh ref={insulators} args={[null, null, sites.length * 2]} frustumCulled={false}><cylinderGeometry args={[0.12, 0.16, 0.34, 8]} /><meshStandardMaterial color="#d5c8ad" roughness={0.4} /></instancedMesh>
    <lineSegments geometry={wires}><lineBasicMaterial color="#3d3530" transparent opacity={0.7} /></lineSegments>
  </>;
}
