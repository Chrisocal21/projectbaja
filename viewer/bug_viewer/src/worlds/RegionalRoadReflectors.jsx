import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { highways, groundHeight } from './county.js';
import { border } from './border.js';
import { roadsideReflectors } from './regionalUtilities.js';

export default function RegionalRoadReflectors() {
  const posts = useRef(), bands = useRef();
  const sites = useMemo(() => roadsideReflectors(highways(), border().waterAt, groundHeight), []);
  useEffect(() => {
    if (!sites.length) return;
    const o = new THREE.Object3D();
    sites.forEach((p, i) => {
      o.position.set(p.x, p.y + 0.55, p.z); o.rotation.set(0, p.h, 0);
      o.scale.set(1, 1, 1); o.updateMatrix(); posts.current.setMatrixAt(i, o.matrix);
      o.position.y = p.y + 0.84; o.updateMatrix(); bands.current.setMatrixAt(i, o.matrix);
    });
    posts.current.instanceMatrix.needsUpdate = true;
    bands.current.instanceMatrix.needsUpdate = true;
  }, [sites]);
  if (!sites.length) return null;
  return <>
    <instancedMesh ref={posts} args={[null, null, sites.length]} castShadow frustumCulled={false}><boxGeometry args={[0.16, 1.1, 0.12]} /><meshStandardMaterial color="#d9d2bd" roughness={0.95} /></instancedMesh>
    <instancedMesh ref={bands} args={[null, null, sites.length]} frustumCulled={false}><boxGeometry args={[0.18, 0.14, 0.14]} /><meshStandardMaterial color="#b46a34" roughness={0.55} metalness={0.08} /></instancedMesh>
  </>;
}
