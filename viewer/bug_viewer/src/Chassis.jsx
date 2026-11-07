import React from 'react';

const M = ({ c, m = 0.45, r = 0.6 }) => <meshStandardMaterial color={c} metalness={m} roughness={r} />;
const Box = ({ p, s, c = '#2c2e30', m, r, rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><M c={c} m={m} r={r} /></mesh>;
const Tube = ({ p, r: rad, h, c = '#2c2e30', rot }) => <mesh position={p} rotation={rot} castShadow><cylinderGeometry args={[rad, rad, h, 12]} /><M c={c} /></mesh>;

/**
 * The Bug's floor pan, seen once the body shell is lifted off: pan halves, centre tunnel, front torsion beam,
 * rear trailing arms, transaxle, steering box and pedal cluster. The engine and wheels are drawn by the build as usual.
 * This is what a buggy body bolts onto later.
 */
export default function RollingChassis({ pedals = true }) {
  const rust = '#4a3a2e', steel = '#34373a';
  return <group>
    {/* pan halves + centre tunnel (backbone) */}
    {[-1, 1].map(s => <Box key={s} p={[s * 0.3, 0.25, -0.12]} s={[0.56, 0.035, 2.25]} c={rust} m={0.35} r={0.8} />)}
    <Box p={[0, 0.31, -0.05]} s={[0.16, 0.12, 2.5]} c={steel} />
    {/* front torsion beam (two tubes) + frame head + steering box */}
    {[0.36, 0.46].map(y => <Tube key={y} p={[0, y, 1.19]} r={0.035} h={1.24} rot={[0, 0, Math.PI / 2]} />)}
    <Box p={[0, 0.4, 1.12]} s={[0.22, 0.22, 0.22]} c={steel} />
    <Box p={[0.18, 0.5, 1.02]} s={[0.1, 0.08, 0.12]} c="#222" />
    <Tube p={[0.24, 0.62, 0.72]} r={0.018} h={0.62} c="#222" rot={[1.0, 0, 0]} />
    {/* rear torsion housing + trailing arms + transaxle */}
    <Tube p={[0, 0.34, -0.86]} r={0.05} h={1.2} rot={[0, 0, Math.PI / 2]} />
    {[-1, 1].map(s => <Box key={s} p={[s * 0.5, 0.34, -1.04]} s={[0.07, 0.08, 0.42]} c={steel} />)}
    <Box p={[0, 0.32, -1.12]} s={[0.36, 0.22, 0.34]} c="#8f8f88" m={0.5} r={0.5} />
    {[-1, 1].map(s => <Tube key={'ax' + s} p={[s * 0.36, 0.34, -1.19]} r={0.03} h={0.38} c="#555" rot={[0, 0, Math.PI / 2]} />)}
    {/* pedal cluster + seat runners + battery tray */}
    {pedals && [0.12, 0.2, 0.28].map(x => <Box key={x} p={[x, 0.36, 0.86]} s={[0.04, 0.16, 0.03]} c="#222" />)}
    {[-1, 1].flatMap(s => [-0.12, 0.12].map(o => <Box key={s + '' + o} p={[s * 0.3 + o, 0.28, 0.0]} s={[0.025, 0.02, 0.5]} c="#555" />))}
    <Box p={[0.32, 0.28, -0.62]} s={[0.24, 0.02, 0.18]} c="#333" />
  </group>;
}
