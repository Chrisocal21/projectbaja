import React, { useEffect, useMemo } from 'react';
import { rackTireGeometry } from './rackTireGeometry.js';

/** Drop-in art for placement/Preview's TireModel; same base, dimensions, pose and hit data. */
export default function RackTire({ dia, width, color = '#30302b', ud = {}, cast = true, upright = false }) {
  const geo = useMemo(() => rackTireGeometry(dia, width), [dia, width]);
  useEffect(() => () => Object.values(geo).forEach(g => g.dispose()), [geo]);
  return <group position={[0, upright ? dia / 2 : width / 2, 0]} rotation={[0, 0, upright ? Math.PI / 2 : 0]}>
    <mesh geometry={geo.casing} userData={ud} castShadow={cast} receiveShadow><meshStandardMaterial color={color} roughness={0.86} /></mesh>
    <mesh geometry={geo.tread} userData={ud} castShadow={cast} receiveShadow><meshStandardMaterial color="#39382f" roughness={0.94} /></mesh>
    <mesh geometry={geo.hub} userData={ud} castShadow={cast} receiveShadow><meshStandardMaterial color="#a39e8c" roughness={0.67} metalness={0.55} /></mesh>
  </group>;
}
