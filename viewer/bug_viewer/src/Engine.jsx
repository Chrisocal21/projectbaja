import React from 'react';

/**
 * The Bug's air-cooled flat-four, built to fit the measured engine bay (game units, car space):
 *   x -0.44..0.44 (inside the rear wheels), y 0.20..0.75 (above the belly, under the lid), z -1.86..-1.28 (tail panel .. firewall)
 * Everything below stays inside that box, so nothing pokes through the body. Upgrades swap pieces in place:
 *   engineCarb  : stock single Solex → dual Kadrons → dual Weber 44s
 *   engineBore  : stock 1600 → 1776 big bore → 2110 stroker (fatter, red-finned barrels)
 *   engineIgnition : stock points → electronic ignition + hot coil
 *   engineCooling  : stock tins → "doghouse" shroud + external oil cooler
 */
export const ENGINE_BAY = { min: [-0.44, 0.2, -1.86], max: [0.44, 0.75, -1.28] };
export const ENGINE_MOD_SLOTS = ['engineCarb', 'engineBore', 'engineIgnition', 'engineCooling'];

const M = ({ c, m = 0.4, r = 0.55 }) => <meshStandardMaterial color={c} metalness={m} roughness={r} />;
const Box = ({ p, s, c, m, r, rot }) => <mesh position={p} rotation={rot} castShadow><boxGeometry args={s} /><M c={c} m={m} r={r} /></mesh>;
const Cyl = ({ p, r: rad, h, c, m, ro, axis = 'y', seg = 18 }) => <mesh position={p} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow><cylinderGeometry args={[rad, rad, h, seg]} /><M c={c} m={m} r={ro} /></mesh>;
const CHROME = '#d9dde0', ALLOY = '#a3a39b', BLACK = '#1d1e20';

function Barrel({ side, z, bore, red }) {
  const x0 = side * 0.155, len = 0.15;
  return <group>
    <Cyl p={[x0 + side * len / 2, 0.13, z]} r={bore} h={len} c={ALLOY} m={0.5} ro={0.5} axis="x" />
    {[0.02, 0.05, 0.08, 0.11, 0.14].map(d => <Cyl key={d} p={[x0 + side * d, 0.13, z]} r={bore + 0.014} h={0.008} c={red ? '#9a2a22' : '#8a8a84'} m={0.5} ro={0.5} axis="x" />)}
  </group>;
}

/** mods: { engineCarb, engineBore, engineIgnition, engineCooling } (catalog part ids or undefined); stockExhaust: draw the stock muffler */
export default function ProcEngine({ mods = {}, stockExhaust = true }) {
  const bore = mods.engineBore === 'EMOD_Bore2110' ? 0.062 : mods.engineBore === 'EMOD_Bore1776' ? 0.057 : 0.052;
  const red = !!mods.engineBore, dog = !!mods.engineCooling, carb = mods.engineCarb || 'stock';
  const tin = dog ? '#c7c7c0' : BLACK;
  return <group position={[0, 0.2, -1.57]}>
    {/* crankcase + barrels + heads + valve covers */}
    <Box p={[0, 0.12, 0]} s={[0.3, 0.2, 0.5]} c={ALLOY} m={0.5} r={0.5} />
    {[-1, 1].map(s => [-0.1, 0.12].map(z => <Barrel key={s + '' + z} side={s} z={z} bore={bore} red={red} />))}
    {[-1, 1].map(s => <group key={s}>
      <Box p={[s * 0.33, 0.13, 0.01]} s={[0.07, 0.16, 0.4]} c="#8f8f88" m={0.5} r={0.5} />
      <Box p={[s * 0.385, 0.13, 0.01]} s={[0.04, 0.11, 0.34]} c={red ? CHROME : BLACK} m={red ? 0.9 : 0.3} r={red ? 0.25 : 0.6} />
    </group>)}
    {/* cooling tins + fan housing, generator, pulleys, belt */}
    <Box p={[0, 0.31, 0.03]} s={[0.62, 0.12, 0.36]} c={tin} m={dog ? 0.6 : 0.3} r={0.5} />
    <Cyl p={[0, 0.34, -0.16]} r={0.15} h={dog ? 0.18 : 0.14} c={tin} m={0.3} ro={0.5} axis="z" />
    <Cyl p={[0, 0.47, -0.08]} r={0.055} h={0.2} c={dog ? CHROME : '#3a3c3e'} m={0.7} ro={0.35} axis="z" />
    <Cyl p={[0, 0.47, -0.2]} r={0.06} h={0.02} c="#2a2a2a" m={0.6} axis="z" />
    <Cyl p={[0, 0.1, -0.265]} r={0.075} h={0.03} c={red ? CHROME : '#2a2a2a'} m={0.7} axis="z" />
    <Box p={[0, 0.285, -0.255]} s={[0.025, 0.37, 0.012]} c="#111" m={0} r={0.9} />
    {dog && <group position={[0.24, 0.42, -0.02]}><Box p={[0, 0, 0]} s={[0.12, 0.09, 0.16]} c="#2b2d30" m={0.6} r={0.4} />{[-0.06, -0.03, 0, 0.03, 0.06].map(z => <Box key={z} p={[0, 0, z]} s={[0.13, 0.1, 0.006]} c="#5a5e62" m={0.7} r={0.4} />)}</group>}
    {/* oil filler, distributor + coil */}
    <Cyl p={[-0.1, 0.41, 0.17]} r={0.022} h={0.1} c={BLACK} m={0.3} />
    <Cyl p={[0.09, 0.42, 0.18]} r={0.026} h={0.09} c={mods.engineIgnition ? '#c0261c' : '#222'} m={0.4} />
    {mods.engineIgnition && <Cyl p={[0.2, 0.42, 0.14]} r={0.03} h={0.11} c="#1b3fa3" m={0.5} ro={0.4} />}
    {/* induction */}
    {carb === 'stock' && <group>
      <Box p={[0, 0.41, 0.05]} s={[0.07, 0.08, 0.07]} c={ALLOY} m={0.5} />
      {[-1, 1].map(s => <Box key={s} p={[s * 0.15, 0.39, 0.05]} s={[0.24, 0.025, 0.025]} c={ALLOY} m={0.5} />)}
      <Cyl p={[0, 0.5, 0.05]} r={0.12} h={0.08} c={BLACK} m={0.3} />
    </group>}
    {carb === 'EMOD_DualKadron' && [-1, 1].map(s => <group key={s} position={[s * 0.21, 0, 0.02]}>
      <Box p={[0, 0.41, 0]} s={[0.07, 0.08, 0.07]} c={ALLOY} m={0.5} />
      <Cyl p={[0, 0.49, 0]} r={0.065} h={0.07} c={CHROME} m={0.9} ro={0.25} />
    </group>)}
    {carb === 'EMOD_DualWeber' && <group>
      {[-1, 1].map(s => <group key={s} position={[s * 0.21, 0, 0.02]}>
        <Box p={[0, 0.41, 0]} s={[0.09, 0.09, 0.13]} c="#b8b8b0" m={0.6} r={0.4} />
        <Box p={[0, 0.5, 0]} s={[0.15, 0.08, 0.2]} c={CHROME} m={0.9} r={0.25} />
        <Box p={[0, 0.545, 0]} s={[0.13, 0.012, 0.18]} c="#c0261c" m={0.2} r={0.6} />
      </group>)}
      <Box p={[0, 0.45, 0.13]} s={[0.42, 0.012, 0.012]} c={CHROME} m={0.9} r={0.25} />
    </group>}
    {/* stock exhaust: heater boxes + muffler + twin tailpipes under the rear apron */}
    {stockExhaust && <group>
      {[-1, 1].map(s => <Cyl key={s} p={[s * 0.3, 0.02, -0.02]} r={0.035} h={0.4} c="#4a3a30" m={0.4} ro={0.7} axis="z" />)}
      <Box p={[0, 0.02, -0.29]} s={[0.6, 0.11, 0.12]} c="#3a3532" m={0.4} r={0.7} />
      {[-1, 1].map(s => <Cyl key={'t' + s} p={[s * 0.2, 0.0, -0.36]} r={0.018} h={0.1} c={CHROME} m={0.9} ro={0.25} axis="z" />)}
    </group>}
  </group>;
}
