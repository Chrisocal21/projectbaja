import React, { useMemo } from 'react';
import { game, useGame } from '../game/store.js';
import { STANDS, STAND_CAP, stockOf } from '../game/stock.js';
import { signTex } from '../lot/CarLot.jsx';

// Walt's supply stands (game/stock.js): a small steel rack per supply along the garage's +x wall, with a sign and one box per unit in stock (0 to 10),
// so a walk past tells you what you are running low on. Drawn in the garage's own frame (Sites.jsx wraps it in Placed).
const W = 0.78, H = 1.5, D = 0.4;
const Box = ({ p, s, c, rough = 0.7, metal = 0 }) => <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={rough} metalness={metal} /></mesh>;

function Unit({ s, i }) {   // slot i of ten: two shelves of five
  const row = i < 5 ? 0 : 1, col = i % 5, x = (col - 2) * 0.15, y = 0.56 + row * 0.5;
  if (s.id === 'battery') return <Box p={[(i % 2 ? 1 : -1) * 0.19, 0.12 + Math.floor(i / 2) * 0.0, 0]} s={[0.3, 0.22, 0.2]} c={s.color} />;
  if (s.id === 'oil') return <group position={[x, y + 0.1, 0]}><mesh castShadow><cylinderGeometry args={[0.055, 0.055, 0.2, 10]} /><meshStandardMaterial color={s.color} roughness={0.5} /></mesh></group>;
  if (s.id === 'wipers') return <Box p={[x, y + 0.03, 0]} s={[0.12, 0.05, 0.3]} c={s.color} />;
  return <Box p={[x, y + 0.07, 0]} s={[0.12, 0.14, 0.2]} c={s.color} />;
}

function Stand({ s }) {
  useGame();
  const n = stockOf(game.home, s.id);
  const sign = useMemo(() => signTex([[s.name.toUpperCase(), 40, '#fff'], [`${n} / ${STAND_CAP}`, 56, n === 0 ? '#ff8a7a' : n < 3 ? '#ffd23f' : '#9be39b']], '#1d2a33', '#fff', '#e8efe8'), [s.name, n]);
  const battery = s.id === 'battery';
  return <group position={[s.lx, 0, s.lz]} rotation={[0, s.ry, 0]}>
    {[-1, 1].map(k => <Box key={k} p={[k * (W / 2 - 0.02), H / 2, 0]} s={[0.04, H, D]} c="#4a5560" metal={0.5} />)}
    {battery ? <Box p={[0, 0.02, 0]} s={[W, 0.04, D]} c="#4a5560" metal={0.5} /> : [0.5, 1.0].map(y => <Box key={y} p={[0, y, 0]} s={[W, 0.04, D]} c="#5a646e" metal={0.5} />)}
    <Box p={[0, 1.16, -D / 2 + 0.01]} s={[W, 0.62, 0.02]} c="#39434c" />
    <mesh position={[0, 1.38, D / 2 - 0.01]}><planeGeometry args={[W - 0.06, 0.2]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    {Array.from({ length: n }, (_, i) => <Unit key={i} s={s} i={i} />)}
  </group>;
}
export default function SupplyStands() { return <>{STANDS.map(s => <Stand key={s.id} s={s} />)}</>; }
