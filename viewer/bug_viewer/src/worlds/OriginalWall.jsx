// One of an original wall's runs, with any doorways cut through it (worlds/openings.js WALLS). Shared by Sites.jsx
// (the garage's right/back walls) and GarageWing.jsx (the office wing's west wall, "Office expansion" upgrade) — its
// own file so the two don't import each other. Local +z (or the along-axis direction) is where a doorway would be.
import React from 'react';
import { wallRuns, WALL_H as WALL_TOP, OPEN_H } from './openings.js';

const Box = ({ p, s, color = '#fff', map, cast = true }) => <mesh position={p} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} map={map} roughness={0.9} /></mesh>;

export default function OriginalWall({ which, map, lining, open, height = WALL_TOP }) {
  const { w, solid, cut } = wallRuns(which, open), t = 0.2, H = height, along = w.axis;   // `w` shadows nothing here: it is the wall record
  const pos = (u, y) => (along === 'z' ? [w.at, y, u] : [u, y, w.at]), size = (len, h, th) => (along === 'z' ? [th, h, len] : [len, h, th]);
  const lin = (u0, u1, th = 0.03) => { const len = u1 - u0 - 0.3; if (len <= 0.05) return null; const p = pos((u0 + u1) / 2, 0.77); p[along === 'z' ? 0 : 2] += w.inside * 0.12; return <Box key={`l${u0}`} p={p} s={size(len, 1.3, th)} color="#fff" map={lining} cast={false} />; };
  return <group>
    {solid.map(([u0, u1]) => <Box key={`s${u0}`} p={pos((u0 + u1) / 2, H / 2)} s={size(u1 - u0, H, t)} color="#fff" map={map} />)}
    {solid.map(([u0, u1]) => lin(u0, u1))}
    {cut.map(([u0, u1]) => <group key={`c${u0}`}>
      <Box p={pos((u0 + u1) / 2, (OPEN_H + H) / 2)} s={size(u1 - u0, H - OPEN_H, t)} color="#fff" map={map} />
      <Box p={pos((u0 + u1) / 2, OPEN_H - 0.04)} s={size(u1 - u0, 0.08, t + 0.06)} color="#6b4a2f" cast={false} />
      {[u0 + 0.04, u1 - 0.04].map(u => <Box key={u} p={pos(u, OPEN_H / 2)} s={size(0.08, OPEN_H, t + 0.06)} color="#6b4a2f" cast={false} />)}
    </group>)}
  </group>;
}
