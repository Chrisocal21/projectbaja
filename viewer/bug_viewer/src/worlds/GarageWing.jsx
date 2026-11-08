import React, { useMemo } from 'react';
import * as THREE from 'three';
import { OFFICE, STAIRS, LOFT } from './office.js';
import { signTex } from '../lot/CarLot.jsx';

const Box = ({ p, s, map, color = '#b7a58a', rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial map={map} color={color} roughness={0.88} /></mesh>;
function Label({ text, p, w = 1.8 }) {
  const map = useMemo(() => signTex([[text, 54, '#4d3023']], '#d7c6a1', '#6f5034', '#826343'), [text]);
  return <Box p={p} s={[w, 0.32, 0.035]} map={map} color="#fff" />;
}
export default function GarageWing({ wall, timber, roof, floor, power }) {
  const { x0, x1, z0, z1, H, entry } = OFFICE;
  return <group>
    <Box p={[-10.1, 0.06, 0]} s={[6.8, 0.12, 12.6]} map={floor} color="#fff" />
    <Box p={[x0, H / 2, 0]} s={[0.2, H, 12]} map={wall} color="#fff" />
    <Box p={[-10.1, H / 2, z0]} s={[6.2, H, 0.2]} map={wall} color="#fff" />
    <Box p={[(x0 + entry.x0) / 2, H / 2, z1]} s={[entry.x0 - x0, H, 0.2]} map={wall} color="#fff" />
    <Box p={[(x1 + entry.x1) / 2, H / 2, z1]} s={[x1 - entry.x1, H, 0.2]} map={wall} color="#fff" />
    <Box p={[-11, 3.9, z1]} s={[1.6, 3.4, 0.2]} map={wall} color="#fff" />
    <Box p={[-10.1, H + 0.35, 0]} s={[6.8, 0.18, 12.8]} map={roof} color="#fff" rot={[0, 0, 0.08]} />
    <Box p={[-7, 5.36, 0]} s={[0.2, 1.52, 12]} map={wall} color="#fff" />
    {[-6, 6].map(z => <mesh key={z} position={[0, H, z]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array([x0, 0, 0, x1, 0, 0, x1, 0.51, 0, x0, 0, 0, x1, 0.51, 0, x0, 0.015, 0]), 3]} />
        <bufferAttribute attach="attributes-normal" args={[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3]} />
      </bufferGeometry><meshStandardMaterial color="#817d68" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>)}
    <Box p={[-10.2, 2.75, 6.8]} s={[6.5, 0.15, 1.8]} map={roof} color="#fff" rot={[0.12, 0, 0]} />
    {[-13, -7.5].map(x => <Box key={x} p={[x, 1.35, 7.5]} s={[0.15, 2.7, 0.15]} map={timber} />)}
    <Label text="OFFICE · RECEPTION" p={[-10.2, 3.1, 6.15]} w={4.5} />
    {[-12.4, -8.7].map(x => <group key={x}>
      <Box p={[x, 4.35, 6.12]} s={[1.05, 1.2, 0.05]} color="#394848" />
      {[-0.57, 0, 0.57].map(dx => <Box key={dx} p={[x + dx, 4.35, 6.17]} s={[0.06, 1.3, 0.08]} map={timber} />)}
      {[-0.65, 0, 0.65].map(dy => <Box key={dy} p={[x, 4.35 + dy, 6.17]} s={[1.2, 0.06, 0.08]} map={timber} />)}
    </group>)}
    {/* Reception counter leaves both entrances and the stair foot clear. */}
    <Box p={[-11.8, 0.6, 1.7]} s={[1.7, 1, 1]} map={timber} />
    <Box p={[-11.8, 1.15, 1.7]} s={[1.9, 0.12, 1.2]} map={timber} color="#76583c" />
    <Box p={[-11.5, 1.25, 1.7]} s={[0.35, 0.08, 0.25]} color="#34332b" />
    <Label text="WALT'S · REPAIRS" p={[-11.8, 0.8, 2.22]} w={1.5} />
    {/* Bathroom doorway faces the reception; storage shares the rear service area. */}
    <Box p={[-12.6, 1.4, -2]} s={[1.2, 2.6, 0.12]} map={timber} />
    <Box p={[-10.55, 1.4, -2]} s={[0.3, 2.6, 0.12]} map={timber} />
    <Box p={[-11.3, 2.55, -2]} s={[1.4, 0.3, 0.12]} map={timber} />
    <Box p={[-10.4, 1.4, -4]} s={[0.12, 2.6, 4]} map={timber} />
    <Label text="BATH / SHOWER" p={[-11.3, 2.55, -1.92]} />
    <Box p={[-12.35, 0.35, -4.9]} s={[0.55, 0.48, 0.8]} color="#e1dcc8" />
    <Box p={[-12.35, 0.8, -5.35]} s={[0.6, 0.65, 0.25]} color="#e1dcc8" />
    <mesh position={[-12.35, 0.62, -4.8]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.055, 8, 20]} /><meshStandardMaterial color="#f4ead5" /></mesh>
    <Box p={[-11.1, 0.2, -4.9]} s={[1, 0.16, 1.5]} color="#c7c5b5" />
    <Box p={[-11.1, 1.5, -5.65]} s={[0.045, 2.3, 0.045]} color="#646d65" />
    <Box p={[-11.1, 2.6, -5.4]} s={[0.25, 0.05, 0.4]} color="#8b9288" />
    <Box p={[-12.7, 0.95, -3]} s={[0.7, 0.18, 0.7]} color="#ded9c8" />
    <Box p={[-13.06, 1.65, -3]} s={[0.025, 0.7, 0.65]} color="#9cafaf" />
    {[0.7, 1.5, 2.3].map(y => <Box key={y} p={[-8.1, y, -5.2]} s={[1.6, 0.08, 0.6]} map={timber} />)}
    <Label text="PARTS STORAGE" p={[-8.1, 2.65, -5]} w={1.6} />
    {[0, 1, 2].map(i => <Box key={i} p={[-8.5 + i * 0.45, 0.98, -5.2]} s={[0.38, 0.5, 0.45]} color={['#8d5b39', '#76694f', '#594f3c'][i]} />)}
    <Box p={[-10.1, LOFT.y - 0.1, -3.9]} s={[5.8, 0.2, 3.8]} map={timber} />
    {Array.from({ length: STAIRS.count }, (_, i) => <Box key={i} p={[-8.3, 0.12 + (i + 1) / 6 - 0.06, 4 - (i + 0.5) / 3]} s={[1.6, 0.12, 1 / 3]} map={timber} />)}
    {[-9.15, -7.45].map(x => <group key={x}>
      <Box p={[x, 2.62, 1]} s={[0.06, 0.06, 6.8]} color="#514536" rot={[Math.atan(0.5), 0, 0]} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => <Box key={i} p={[x, 0.62 + i * 0.5, 4 - i]} s={[0.06, 1, 0.06]} color="#514536" />)}
    </group>)}
    <Box p={[-11.15, 4.12, -1.95]} s={[3.7, 0.08, 0.08]} color="#514536" />
    {[-12.9, -12, -11, -10, -9.4].map(x => <Box key={x} p={[x, 3.62, -1.95]} s={[0.06, 1, 0.06]} color="#514536" />)}
    <Box p={[-11.8, 3.55, -4.9]} s={[1.4, 0.65, 1.6]} map={timber} />
    <Label text="LOFT · ARCHIVE" p={[-11, 4.5, -5.85]} w={2.5} />
    {[[-11, 2.5, 2], [-11, 5.25, -4]].map((p, i) => <pointLight key={i} position={p} color="#ffca81" intensity={power ? 13 : 0} distance={8} decay={2} />)}
  </group>;
}
