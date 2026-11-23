import { brushedFinish, matteFinish } from './shopFinishes.js';
import ShopBoxGeometry from './ShopBoxGeometry.jsx';
import React, { useMemo } from 'react';
import { game, useGame } from '../game/store.js';
import { STANDS, stockOf } from '../game/stock.js';
import { signTex } from '../lot/CarLot.jsx';

// Walt's supply stands (game/stock.js): a small steel rack per supply along the garage's +x wall, with a sign and one box per unit in stock (0 to 10),
// so a walk past tells you what you are running low on. Drawn in the garage's own frame (Sites.jsx wraps it in Placed).
const W = 0.78, H = 1.5, D = 0.4;
const Box = ({ p, s, c, rough = 0.7, metal = 0 }) => <mesh position={p} castShadow receiveShadow><ShopBoxGeometry size={s} /><meshStandardMaterial color={c} roughness={rough} roughnessMap={metal > 0.55 ? brushedFinish : matteFinish} metalness={metal} /></mesh>;

function Unit({ s, i }) {   // slot i of ten: two shelves of five
  const row = i < 5 ? 0 : 1, col = i % 5, x = (col - 2) * 0.15, y = 0.52 + row * 0.5;
  if (s.id === 'battery') return <group position={[(i % 2 - 0.5) * 0.34, 0.04 + Math.floor(i / 2) * 0.25, 0]}>
    <Box p={[0, 0.092, 0]} s={[0.29, 0.184, 0.21]} c={s.color} />
    <Box p={[0, 0.193, 0]} s={[0.30, 0.018, 0.22]} c="#242629" />
    <Box p={[0, 0.10, 0.106]} s={[0.16, 0.07, 0.002]} c="#ded3ad" />
    {[-1, 1].map(k => <Box key={k} p={[k * 0.11, 0.214, 0.06]} s={[0.025, 0.024, 0.025]} c={k > 0 ? '#a03e32' : '#797e80'} metal={0.45} />)}
  </group>;
  if (s.id === 'oil') return <group position={[x, y, 0]}>
    <Box p={[0, 0.086, 0]} s={[0.105, 0.172, 0.09]} c={s.color} rough={0.45} />
    <Box p={[-0.024, 0.185, 0]} s={[0.047, 0.026, 0.048]} c="#323333" />
    <Box p={[0, 0.09, 0.046]} s={[0.082, 0.076, 0.002]} c="#e4dcbf" />
  </group>;
  if (s.id === 'belt') return <mesh position={[x, y + 0.14, 0]} scale={[0.47, 1, 1]} castShadow>
    <torusGeometry args={[0.13, 0.014, 6, 28]} /><meshStandardMaterial color="#373430" roughness={0.85} />
  </mesh>;
  if (s.id === 'wipers') return <group position={[x, y, 0]} rotation={[-0.38, 0, 0]}>
    <Box p={[0, 0.19, 0.067]} s={[0.067, 0.38, 0.027]} c="#325668" />
    <Box p={[0, 0.24, 0.083]} s={[0.045, 0.22, 0.004]} c="#dbd4b4" />
  </group>;
  return <group position={[x, y, 0]}>
    <Box p={[0, 0.075, 0]} s={[0.12, 0.15, 0.16]} c={s.color} />
    <Box p={[0, 0.105, 0.081]} s={[0.12, 0.044, 0.002]} c={s.id === 'plug' ? '#e5c58b' : '#46647b'} />
  </group>;
}

const displayYellow = '#efbc21';
const kitShelves = [0.19, 0.46, 0.73, 1.0];

function DisplayPrint({ p, size, map, rotation }) {
  return <mesh position={p} rotation={rotation}><planeGeometry args={size} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>;
}

function RepairDisplay({ count }) {
  const label = useMemo(() => signTex([['WALT?S', 47], ['TIRE REPAIR', 62], ['PLUG KIT', 40]], '#eee3b9', '#292925', '#ab462c'), []);
  React.useEffect(() => () => { label.dispose(); }, [label]);
  return <>
    {[-1,1].map(k => <group key={k}>
      {[-0.145,0.145].map(z => <group key={z} position={[k*0.335,0,z]}>
        <mesh position={[0,0.047,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.047,0.047,0.032,14]} /><meshStandardMaterial color="#373936" /></mesh>
        <Box p={[0,0.103,0]} s={[0.042,0.064,0.048]} c="#83867d" metal={0.55} />
      </group>)}
      <Box p={[k*0.35,0.72,-0.07]} s={[0.035,1.20,0.25]} c={displayYellow} metal={0.22} />
      <Box p={[k*0.35,0.67,0.156]} s={[0.032,1.06,0.032]} c={displayYellow} />
    </group>)}
    {kitShelves.map(y => <group key={y}>
      <Box p={[0,y,0]} s={[0.7,0.03,0.34]} c="#525650" metal={0.4} />
      <Box p={[0,y+0.012,0.171]} s={[0.72,0.054,0.026]} c={displayYellow} />
    </group>)}
    {Array.from({length: count}, (_,i) => <group key={i} position={[(i%3-1)*0.212,kitShelves[Math.floor(i/3)]+0.015,0.025]}>
      <Box p={[0,0.086,0]} s={[0.184,0.172,0.21]} c="#3c3d36" />
      <DisplayPrint p={[0,0.088,0.106]} size={[0.17,0.149]} map={label} />
    </group>)}
  </>;
}

function Stand({ s }) {
  useGame();
  const n = stockOf(game.home, s.id);
  const accent = { oil: '#99502e', bulb: '#345b72', plug: '#8b4335', wipers: '#355f60', belt: '#62533d', battery: '#a43229' }[s.id];
  const hanging = s.id === 'belt' || s.id === 'wipers';
  if (s.id === 'plug') return <group position={[s.lx,0,s.lz]} rotation={[0,s.ry,0]}>
    <RepairDisplay count={n} />
  </group>;
  const battery = s.id === 'battery';
  const frame = battery ? accent : '#456466';
  return <group position={[s.lx, 0, s.lz]} rotation={[0, s.ry, 0]}>
    {[-1, 1].flatMap(side => [-1, 1].map(end => <Box key={side + '/' + end}
      p={[side * (W / 2 - 0.02), H / 2, end * (D / 2 - 0.02)]} s={[0.036, H, 0.036]} c={frame} metal={0.42} />))}
    {(battery ? [0.02, 0.27, 0.52, 0.77, 1.02] : [0.5, 1]).map(y =>
      <Box key={y} p={[0, y, D / 2]} s={[W, 0.043, 0.014]} c={battery ? accent : "#b67c41"} metal={0.34} />)}
    {battery ? Array.from({ length: 5 }, (_, i) => <group key={i} position={[0,0.02 + i*0.25,0]}>
      {Array.from({length: 9}, (_, j) => <Box key={j} p={[(j-4)*0.082,0,0]} s={[0.052,0.04,D]} c="#575958" metal={0.55} />)}
      <Box p={[0,0,-D/2]} s={[W,0.043,0.018]} c={accent} />
    </group>) : [0.5, 1.0].map(y => <Box key={y} p={[0, y, 0]} s={[W, 0.04, D]} c="#5a646e" metal={0.5} />)}
    {!battery && <Box p={[0, 1.16, -D / 2 + 0.01]} s={[W, 0.62, 0.02]} c="#39434c" />}
    {hanging && <>
      <Box p={[0, 0.82, -0.18]} s={[W - 0.065, 1.12, 0.02]} c="#b5afa1" />
      {[0.52, 1.02].map(y => [-2,-1,0,1,2].map(col => <Box key={y + '/' + col}
        p={[col * 0.15, y + (s.id === 'belt' ? 0.26 : 0.34), -0.075]} s={[0.015,0.016,0.2]} c="#939b99" metal={0.6} />))}
    </>}
    {Array.from({ length: n }, (_, i) => <Unit key={i} s={s} i={i} />)}
  </group>;
}
export default function SupplyStands() { return <>{STANDS.map(s => <Stand key={s.id} s={s} />)}</>; }
