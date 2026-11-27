import React from 'react';
import { RoundedBox } from '@react-three/drei';
import Pickup from '../Pickup.jsx';

// Scratch customer vehicles (stand-ins until real models): sedan, van, dirt bike, street motorcycle.
// Same rules as Pickup.jsx: +z forward, ground at y = 0, sizes from game/custRides.js. Shapes and sizes are PROPOSALs.
const P = ({ c, m = 0.15, r = 0.75 }) => <meshStandardMaterial color={c} metalness={m} roughness={r} />;
const Box = ({ p, s, c, m, r, rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><P c={c} m={m} r={r} /></mesh>;
const Round = ({ p, s, c, rad = 0.08, m, r, rot }) => <RoundedBox args={s} radius={rad} smoothness={3} position={p} rotation={rot} castShadow receiveShadow><P c={c} m={m} r={r} /></RoundedBox>;
const Cyl = ({ p, rt, rb = rt, h, c, m, r, rot }) => <mesh position={p} rotation={rot} castShadow><cylinderGeometry args={[rt, rb, h, 16]} /><P c={c} m={m} r={r} /></mesh>;
const CHROME = '#cfd3d6', GLASS = '#1b2a30', RUBBER = '#2a2724', DARK = '#202224';

/** a wheel on an axle along x: tyre + rim (+ hub). r radius, w width */
function Wheel({ p, r, w, rim = '#9a9488', spokes = false }) {
  return <group position={p} rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[r, r, w, 28]} /><P c={RUBBER} r={0.97} m={0} /></mesh>
    <mesh><cylinderGeometry args={[r * 0.62, r * 0.62, w + 0.01, 20]} /><P c={rim} m={0.55} r={0.5} /></mesh>
    <mesh><cylinderGeometry args={[r * 0.18, r * 0.18, w + 0.04, 12]} /><P c={DARK} m={0.5} r={0.6} /></mesh>
    {spokes && Array.from({ length: 6 }, (_, i) => <mesh key={i} rotation={[0, i * Math.PI / 6, 0]}><boxGeometry args={[r * 1.15, 0.012, 0.012]} /><P c={CHROME} m={0.8} r={0.3} /></mesh>)}
  </group>;
}

/** 4.7 m four-door sedan */
function Sedan({ body, trim }) {
  const fz = 1.38, rz = -1.32, tr = 0.76;
  return <group>
    {[[tr, fz], [-tr, fz], [tr, rz], [-tr, rz]].map(([x, z]) => <Wheel key={x + ',' + z} p={[x, 0.32, z]} r={0.32} w={0.22} />)}
    <Round p={[0, 0.6, 0]} s={[1.8, 0.5, 4.6]} c={body} rad={0.16} r={0.6} />
    <Round p={[0, 1.08, -0.2]} s={[1.6, 0.5, 2.3]} c={body} rad={0.18} r={0.6} />
    <Box p={[0, 1.08, 0.97]} s={[1.48, 0.42, 0.04]} c={GLASS} m={0.3} r={0.15} rot={[-0.75, 0, 0]} />
    <Box p={[0, 1.08, -1.37]} s={[1.48, 0.4, 0.04]} c={GLASS} m={0.3} r={0.15} rot={[0.7, 0, 0]} />
    {[-1, 1].map(s => <group key={s}>
      <Box p={[s * 0.805, 1.1, -0.2]} s={[0.02, 0.32, 2.0]} c={GLASS} m={0.3} r={0.15} />
      <Box p={[s * 0.805, 1.1, -0.2]} s={[0.03, 0.34, 0.06]} c={body} />
      <Box p={[s * 0.905, 0.72, -0.2]} s={[0.012, 0.42, 0.012]} c="#222" />
      <Box p={[s * 0.905, 0.5, 0]} s={[0.02, 0.05, 4.2]} c={trim} m={0.5} r={0.5} />
      <Box p={[s * 0.55, 0.68, 2.31]} s={[0.36, 0.13, 0.03]} c="#e8e2c8" m={0.2} r={0.3} />
      <Box p={[s * 0.6, 0.72, -2.31]} s={[0.34, 0.12, 0.03]} c="#9a1c14" r={0.4} />
    </group>)}
    <Box p={[0, 0.62, 2.31]} s={[0.6, 0.16, 0.03]} c="#2b2b28" />
    <Round p={[0, 0.42, 2.34]} s={[1.84, 0.13, 0.1]} c={CHROME} rad={0.04} m={0.9} r={0.25} />
    <Round p={[0, 0.42, -2.34]} s={[1.84, 0.13, 0.1]} c={CHROME} rad={0.04} m={0.9} r={0.25} />
  </group>;
}

/** 4.9 m boxy work van: short nose, tall body, sliding side door */
function Van({ body, trim }) {
  const fz = 1.55, rz = -1.45, tr = 0.82;
  return <group>
    {[[tr, fz], [-tr, fz], [tr, rz], [-tr, rz]].map(([x, z]) => <Wheel key={x + ',' + z} p={[x, 0.36, z]} r={0.36} w={0.24} />)}
    <Round p={[0, 1.25, -0.35]} s={[1.92, 1.6, 4.0]} c={body} rad={0.12} r={0.7} />
    <Round p={[0, 0.75, 1.95]} s={[1.88, 0.6, 0.9]} c={body} rad={0.14} r={0.7} />
    <Box p={[0, 1.55, 1.72]} s={[1.72, 0.62, 0.04]} c={GLASS} m={0.3} r={0.15} rot={[-0.35, 0, 0]} />
    {[-1, 1].map(s => <group key={s}>
      <Box p={[s * 0.965, 1.55, 1.15]} s={[0.02, 0.5, 0.7]} c={GLASS} m={0.3} r={0.15} />
      <Box p={[s * 0.965, 1.1, 0.0]} s={[0.012, 1.3, 0.012]} c="#222" />
      <Box p={[s * 0.965, 1.1, -1.25]} s={[0.012, 1.3, 0.012]} c="#222" />
      <Box p={[s * 0.965, 0.62, -0.35]} s={[0.02, 0.18, 3.9]} c={trim} r={0.8} />
      <Box p={[s * 0.6, 0.85, 2.41]} s={[0.3, 0.16, 0.03]} c="#e8e2c8" m={0.2} r={0.3} />
      <Box p={[s * 0.8, 1.2, -2.36]} s={[0.12, 0.4, 0.03]} c="#9a1c14" r={0.4} />
      <Round p={[s * 1.05, 1.6, 1.3]} s={[0.05, 0.2, 0.14]} c={DARK} rad={0.02} />
    </group>)}
    <Box p={[0, 0.82, 2.41]} s={[0.9, 0.22, 0.03]} c="#2b2b28" />
    <Box p={[0, 1.3, -2.36]} s={[0.012, 1.4, 0.012]} c="#222" />
    <Round p={[0, 0.45, 2.44]} s={[1.92, 0.16, 0.12]} c={DARK} rad={0.04} />
    <Round p={[0, 0.45, -2.38]} s={[1.92, 0.16, 0.12]} c={DARK} rad={0.04} />
  </group>;
}

/** 2.1 m dirt bike on its side stand: tall, skinny, long travel, knobby tyres, number plate */
function DirtBike({ body, trim }) {
  return <group rotation={[0, 0, 0.1]}>
    <Wheel p={[0, 0.36, 0.72]} r={0.36} w={0.09} rim="#b8b4aa" spokes />
    <Wheel p={[0, 0.34, -0.7]} r={0.34} w={0.12} rim="#b8b4aa" spokes />
    {[-1, 1].map(s => <Cyl key={s} p={[s * 0.07, 0.78, 0.6]} rt={0.025} h={0.95} c="#c9b46a" m={0.7} r={0.35} rot={[0.42, 0, 0]} />)}
    <Box p={[0, 1.18, 0.42]} s={[0.72, 0.03, 0.03]} c={DARK} m={0.5} />
    <Round p={[0, 0.82, 0.92]} s={[0.16, 0.05, 0.5]} c={trim} rad={0.02} rot={[-0.25, 0, 0]} />
    <Round p={[0, 1.02, 0.5]} s={[0.26, 0.24, 0.07]} c={trim} rad={0.03} rot={[-0.3, 0, 0]} />
    <Round p={[0, 0.98, 0.18]} s={[0.3, 0.2, 0.42]} c={body} rad={0.07} />
    <Round p={[0, 0.98, -0.32]} s={[0.24, 0.08, 0.7]} c={DARK} rad={0.03} r={0.9} />
    <Round p={[0, 0.9, -0.82]} s={[0.18, 0.05, 0.5]} c={body} rad={0.02} rot={[0.25, 0, 0]} />
    {[-1, 1].map(s => <Round key={s} p={[s * 0.15, 0.8, -0.35]} s={[0.03, 0.2, 0.42]} c={trim} rad={0.01} />)}
    <Box p={[0, 0.62, 0.05]} s={[0.05, 0.05, 0.85]} c="#3a3c3e" m={0.6} rot={[0.2, 0, 0]} />
    <Round p={[0, 0.5, 0.05]} s={[0.22, 0.28, 0.32]} c="#55585a" rad={0.05} m={0.6} r={0.5} />
    <Box p={[0, 0.45, -0.36]} s={[0.06, 0.06, 0.7]} c="#3a3c3e" m={0.6} rot={[-0.15, 0, 0]} />
    <Cyl p={[0.14, 0.75, -0.5]} rt={0.045} h={0.55} c="#8a8478" m={0.7} r={0.4} rot={[Math.PI / 2 - 0.3, 0, 0]} />
  </group>;
}

/** 2.2 m street motorcycle on its side stand: round headlight, teardrop tank, chrome pipes */
function Moto({ body, trim }) {
  return <group rotation={[0, 0, 0.12]}>
    <Wheel p={[0, 0.32, 0.75]} r={0.32} w={0.12} rim={CHROME} spokes />
    <Wheel p={[0, 0.32, -0.72]} r={0.32} w={0.15} rim={CHROME} spokes />
    {[-1, 1].map(s => <Cyl key={s} p={[s * 0.08, 0.66, 0.62]} rt={0.025} h={0.75} c={CHROME} m={0.85} r={0.25} rot={[0.45, 0, 0]} />)}
    <Round p={[0, 0.74, 0.8]} s={[0.17, 0.04, 0.4]} c={body} rad={0.015} rot={[-0.3, 0, 0]} />
    <Box p={[0, 1.02, 0.45]} s={[0.7, 0.025, 0.025]} c={CHROME} m={0.85} r={0.25} />
    <group position={[0, 0.95, 0.6]} rotation={[Math.PI / 2, 0, 0]}><mesh castShadow><cylinderGeometry args={[0.1, 0.1, 0.1, 18]} /><P c={CHROME} m={0.85} r={0.25} /></mesh>
      <mesh position={[0, -0.051, 0]}><cylinderGeometry args={[0.085, 0.085, 0.01, 18]} /><P c="#efe8cf" r={0.3} /></mesh></group>
    <Round p={[0, 0.9, 0.18]} s={[0.32, 0.22, 0.52]} c={body} rad={0.1} r={0.35} m={0.3} />
    <Round p={[0, 0.84, -0.32]} s={[0.28, 0.09, 0.6]} c="#1c1a18" rad={0.04} r={0.9} />
    <Round p={[0, 0.72, -0.82]} s={[0.2, 0.05, 0.4]} c={body} rad={0.02} rot={[0.2, 0, 0]} />
    <Round p={[0, 0.48, 0.02]} s={[0.3, 0.3, 0.38]} c="#7b7d7f" rad={0.06} m={0.7} r={0.4} />
    <Box p={[0, 0.58, -0.32]} s={[0.05, 0.05, 0.75]} c={trim} m={0.5} rot={[-0.3, 0, 0]} />
    {[-1, 1].map(s => <Cyl key={s} p={[s * 0.17, 0.32, -0.42]} rt={0.04} h={0.95} c={CHROME} m={0.9} r={0.2} rot={[Math.PI / 2 - 0.06, 0, 0]} />)}
    <Box p={[0, 0.8, -1.08]} s={[0.1, 0.06, 0.03]} c="#9a1c14" r={0.4} />
  </group>;
}

/** draws the customer's vehicle by type (game/custRides.js) in their two job colours */
export default function CustomerRide({ ride = 'pickup', body, trim }) {
  if (ride === 'sedan') return <Sedan body={body} trim={trim} />;
  if (ride === 'van') return <Van body={body} trim={trim} />;
  if (ride === 'dirtbike') return <DirtBike body={body} trim={trim} />;
  if (ride === 'moto') return <Moto body={body} trim={trim} />;
  return <Pickup body={body} roof={trim} primer={body} />;
}
