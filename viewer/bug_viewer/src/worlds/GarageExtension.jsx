// The garage grown backward (worlds/garageLevels.js): floor, three walls, roof, light rows, bay lines, and at level 3 whole-car wall racks.
// Basic boxes on purpose (ChatGPT polishes the look later, see docs/EXPANSION_PLAN.md). Garage-local metres; drawn inside Sites.jsx Garage().
import React from 'react';
import { extension, baysAt, levelData, BAY, EXT_H } from './garageLevels.js';

const Box = ({ p, s, color = '#fff', map, metal = 0, rough = 0.9, emissive, cast = true }) => <mesh position={p} castShadow={cast} receiveShadow>
  <boxGeometry args={s} /><meshStandardMaterial color={color} map={map} metalness={metal} roughness={rough} emissive={emissive} emissiveIntensity={emissive ? 2.2 : 0} /></mesh>;

export default function GarageExtension({ level, wallSide, wallBack, roof, floor }) {
  const e = extension(level); if (!e) return null;
  const d = levelData(level), W = e.x1 - e.x0, D = e.z1 - e.z0, cx = (e.x0 + e.x1) / 2, cz = (e.z0 + e.z1) / 2, H = EXT_H, epoxy = d.floor === 'epoxy';
  const bays = baysAt(level).filter(b => b.z < e.z1 - BAY.d / 2 + 0.5);
  const lights = level >= 3 ? [-11, -7, -3, 1, 5] : level >= 2 ? [-9, -4, 1, 5] : [-6, 0];
  return <group>
    {epoxy
      ? <group><Box p={[cx, 0.06, cz]} s={[W, 0.12, D]} color="#b8bec3" cast={false} />
        <mesh position={[cx, 0.124, cz]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><meshStandardMaterial color="#aeb5ba" metalness={0.1} roughness={0.14} polygonOffset polygonOffsetFactor={-2} /></mesh></group>
      : <Box p={[cx, 0.06, cz]} s={[W, 0.12, D]} color="#fff" map={floor} rough={0.95} cast={false} />}
    <Box p={[e.x0, H / 2, cz]} s={[0.2, H, D]} map={wallSide} />
    <Box p={[e.x1, H / 2, cz]} s={[0.2, H, D]} map={wallSide} />
    <Box p={[cx, H / 2, e.z0]} s={[W, H, 0.2]} map={wallBack} />
    <Box p={[cx, H + 0.1, cz]} s={[W + 0.4, 0.18, D + 0.2]} map={roof} metal={0.3} rough={0.7} />
    {lights.map(x => <Box key={x} p={[x, H - 0.15, cz]} s={[0.25, 0.08, D - 1.5]} color="#f4f1e4" emissive="#fff7df" cast={false} />)}
    {bays.flatMap(b => [-1, 1].map(side => <mesh key={`${b.id}${side}`} position={[b.x + side * BAY.w / 2, 0.13, b.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.1, BAY.d]} /><meshStandardMaterial color="#d9b23a" roughness={0.8} polygonOffset polygonOffsetFactor={-4} /></mesh>))}
    {d.racks.flatMap(r => [-12.0, -9.4, -6.8].map(x => <group key={`${r.id}${x}`}>
      {[[-1.1, -3.4], [1.1, -3.4], [-1.1, 3.4], [1.1, 3.4]].map(([dx, dz]) => <Box key={`${dx}${dz}`} p={[x + dx, 2.1, (r.z0 + r.z1) / 2 + dz]} s={[0.12, 4.2, 0.12]} color="#c4552b" metal={0.4} rough={0.5} />)}
      {[1.2, 2.4, 3.6].map(y => <Box key={y} p={[x, y, (r.z0 + r.z1) / 2]} s={[2.4, 0.1, 7]} color="#4a5560" metal={0.5} rough={0.55} />)}
    </group>))}
  </group>;
}
