import React from 'react';
import { RoundedBox } from '@react-three/drei';

/**
 * Placeholder '78 pickup (a 1970s half-ton): 5.1 m long, 1.95 m wide, 3.1 m wheelbase, +z forward, ground at y = 0.
 * Faded two-tone paint, a primer-grey replacement fender, chrome grille and bumpers, an open bed.
 * Stand-in until the real truck model arrives; the shapes match its eventual part slots (hood, doors, fenders, bed, tailgate...).
 */
const P = ({ c, m = 0.15, r = 0.75 }) => <meshStandardMaterial color={c} metalness={m} roughness={r} />;
const Box = ({ p, s, c, m, r, rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><P c={c} m={m} r={r} /></mesh>;
const Round = ({ p, s, c, rad = 0.08, m, r }) => <RoundedBox args={s} radius={rad} smoothness={3} position={p} castShadow receiveShadow><P c={c} m={m} r={r} /></RoundedBox>;
const CHROME = '#cfd3d6', GLASS = '#1b2a30';

function Wheel({ x, z }) {
  return <group position={[x, 0.39, z]} rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[0.39, 0.39, 0.27, 24]} /><P c="#151515" r={0.95} m={0} /></mesh>
    <mesh position={[0, x > 0 ? 0.14 : -0.14, 0]}><cylinderGeometry args={[0.22, 0.22, 0.02, 20]} /><P c="#8a8d90" m={0.7} r={0.35} /></mesh>
    <mesh position={[0, x > 0 ? 0.152 : -0.152, 0]}><cylinderGeometry args={[0.08, 0.08, 0.02, 12]} /><P c={CHROME} m={0.9} r={0.25} /></mesh>
  </group>;
}

export default function Pickup({ body = '#a4532f', roof = '#e3d6b4', primer = '#8a8c88' }) {
  const fz = 1.55, rz = -1.55, track = 0.82;
  return <group>
    {/* frame + running gear */}
    {[-0.45, 0.45].map(x => <Box key={x} p={[x, 0.42, -0.1]} s={[0.1, 0.14, 4.6]} c="#202224" m={0.4} r={0.7} />)}
    {[[track, fz], [-track, fz], [track, rz], [-track, rz]].map(([x, z]) => <Wheel key={x + '' + z} x={x} z={z} />)}
    <Box p={[0, 0.39, rz]} s={[1.4, 0.12, 0.14]} c="#2a2c2e" m={0.4} />
    {/* front clip: hood + front fenders + grille + lights + bumper */}
    <Round p={[0, 0.82, 1.78]} s={[1.86, 0.42, 1.45]} c={body} rad={0.1} />
    <Round p={[0.62, 0.72, 1.62]} s={[0.62, 0.36, 1.2]} c={primer} rad={0.12} />
    <Round p={[-0.62, 0.72, 1.62]} s={[0.62, 0.36, 1.2]} c={body} rad={0.12} />
    <Box p={[0, 0.79, 2.51]} s={[1.5, 0.34, 0.04]} c="#1a1a1a" r={0.6} />
    {[0.7, 0.78, 0.86].map(y => <Box key={y} p={[0, y, 2.53]} s={[1.46, 0.025, 0.02]} c={CHROME} m={0.9} r={0.25} />)}
    {[-0.66, 0.66].map(x => <mesh key={x} position={[x, 0.82, 2.52]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.04, 18]} /><meshStandardMaterial color="#f4f1e2" emissive="#fff6d8" emissiveIntensity={0.15} metalness={0.3} roughness={0.2} /></mesh>)}
    <Round p={[0, 0.5, 2.6]} s={[1.98, 0.16, 0.14]} c={CHROME} rad={0.05} m={0.9} r={0.25} />
    {/* cab: two-tone, slanted windshield, side glass, doors, mirrors */}
    <Round p={[0, 0.98, 0.45]} s={[1.92, 0.78, 1.25]} c={body} rad={0.09} />
    <Round p={[0, 1.58, 0.38]} s={[1.84, 0.44, 1.05]} c={roof} rad={0.12} />
    <Box p={[0, 1.55, 0.93]} s={[1.6, 0.4, 0.04]} c={GLASS} m={0.3} r={0.15} rot={[-0.28, 0, 0]} />
    {[-1, 1].map(s => <group key={s}>
      <Box p={[s * 0.925, 1.55, 0.36]} s={[0.02, 0.32, 0.86]} c={GLASS} m={0.3} r={0.15} />
      <Box p={[s * 0.965, 0.98, 0.42]} s={[0.012, 0.7, 0.012]} c="#2a1a12" />
      <Box p={[s * 0.965, 0.98, 0.98]} s={[0.012, 0.7, 0.012]} c="#2a1a12" />
      <Box p={[s * 0.97, 1.05, 0.55]} s={[0.03, 0.03, 0.14]} c={CHROME} m={0.9} r={0.25} />
      <Box p={[s * 1.06, 1.38, 0.92]} s={[0.03, 0.16, 0.1]} c={CHROME} m={0.9} r={0.25} />
    </group>)}
    <Box p={[0, 1.55, -0.18]} s={[1.5, 0.3, 0.03]} c={GLASS} m={0.3} r={0.15} />
    {/* bed: floor, sides, tailgate, wheel tubs; rear bumper + taillights */}
    <Box p={[0, 0.72, -1.45]} s={[1.86, 0.06, 2.3]} c="#3a2a1e" r={0.85} />
    {[-1, 1].map(s => <group key={s}>
      <Box p={[s * 0.9, 0.98, -1.45]} s={[0.07, 0.5, 2.3]} c={body} />
      <Box p={[s * 0.9, 1.24, -1.45]} s={[0.1, 0.04, 2.3]} c={roof} />
      <Round p={[s * 0.62, 0.86, rz]} s={[0.44, 0.24, 0.95]} c="#2c1f16" rad={0.1} />
    </group>)}
    <Box p={[0, 0.98, -2.6]} s={[1.86, 0.5, 0.07]} c={body} />
    <Box p={[0, 1.22, -2.6]} s={[1.86, 0.04, 0.09]} c={roof} />
    <Round p={[0, 0.5, -2.7]} s={[1.98, 0.16, 0.14]} c={CHROME} rad={0.05} m={0.9} r={0.25} />
    {[-0.82, 0.82].map(x => <Box key={x} p={[x, 0.98, -2.64]} s={[0.12, 0.22, 0.04]} c="#b3221a" m={0.2} r={0.4} />)}
    {/* rust bloom + a spare in the bed */}
    <Box p={[-0.97, 0.66, -0.6]} s={[0.01, 0.16, 0.6]} c="#6b3a1e" r={0.95} />
    <group position={[0.3, 0.88, -2.0]} rotation={[Math.PI / 2, 0, 0.3]}><mesh castShadow><cylinderGeometry args={[0.36, 0.36, 0.25, 20]} /><P c="#151515" r={0.95} m={0} /></mesh></group>
  </group>;
}
