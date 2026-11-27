// The inside and outside of Dusty's store: walls with a real doorway and window, floor, shelves of goods, a counter with a register and a drinks cooler.
// The boxes and cans here are set dressing. The things you can buy are DustyGoods.jsx, on the boards listed in dustyGoods.js.
import React from 'react';
import { STORE, DOOR, WINDOW, COUNTER, SHELVES, COOLER } from './dustyLayout.js';
import { REAL_BOARDS } from './dustyGoods.js';

const Box = ({ p, s, color, rough = 0.9, metal = 0, emissive, ei = 0, cast = true }) =>
  <mesh position={p} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive || '#000000'} emissiveIntensity={ei} /></mesh>;
/** a box given by its edges */
const Span = ({ x, y, z, ...rest }) => <Box p={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]} s={[x[1] - x[0], y[1] - y[0], z[1] - z[0]]} {...rest} />;

const WALL = '#d8cfb4', INSIDE = '#cfc4a6', TRIM = '#4a2f1b', GOODS = ['#c8372b', '#2f5d86', '#e0b020', '#3f6b3a', '#d8d6ce', '#8a5a2a'];

/** a steel shelf unit with rows of boxes and cans on it */
function Shelf({ s, seed, bare = [] }) {
  const levels = [0.18, 0.18 + (s.h - 0.3) / 2, s.h - 0.12], n = Math.floor(s.w / 0.34);
  return <group position={[s.x, 0, s.z]}>
    {[-s.w / 2, 0, s.w / 2].map(x => <Box key={x} p={[x, s.h / 2, 0]} s={[0.05, s.h, s.d]} color="#5a6064" metal={0.4} />)}
    {levels.map((y, l) => <group key={y}>
      <Box p={[0, y, 0]} s={[s.w, 0.04, s.d]} color="#8a8f92" metal={0.3} />
      {!bare.includes(l) && Array.from({ length: n }, (_, i) => {
        const k = (i * 7 + l * 5 + seed) % 11, x = -s.w / 2 + 0.24 + i * ((s.w - 0.48) / (n - 1)), h = 0.14 + (k % 4) * 0.06, c = GOODS[(i + l * 2 + seed) % GOODS.length];
        if (k === 3) return null;   // a gap on the shelf
        return k % 3 === 0
          ? <mesh key={i} position={[x, y + 0.02 + h / 2, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, h, 10]} /><meshStandardMaterial color={c} metalness={0.4} roughness={0.5} /></mesh>
          : <Box key={i} p={[x, y + 0.02 + h / 2, (k % 2) * 0.06 - 0.03]} s={[0.22, h, Math.min(0.36, s.d - 0.14)]} color={c} />;
      })}
    </group>)}
  </group>;
}

export default function DustyStore() {
  const { x0, x1, z0, z1, h, t } = STORE, front = [z1 - t, z1];
  return <group>
    <Span x={[x0, x1]} y={[0.02, 0.13]} z={[z0, z1]} color="#8f8a7c" cast={false} />   {/* high enough that the forecourt asphalt (drawn with a depth bias) cannot show through */}
    {/* walls: back, two sides, then the front in pieces round the door and the window */}
    <Span x={[x0, x1]} y={[0, h]} z={[z0, z0 + t]} color={WALL} />
    <Span x={[x0, x0 + t]} y={[0, h]} z={[z0 + t, z1 - t]} color={WALL} /><Span x={[x1 - t, x1]} y={[0, h]} z={[z0 + t, z1 - t]} color={WALL} />
    <Span x={[x0, DOOR.x0]} y={[0, h]} z={front} color={WALL} />
    <Span x={[DOOR.x0, DOOR.x1]} y={[DOOR.h, h]} z={front} color={WALL} />
    <Span x={[DOOR.x1, WINDOW.x0]} y={[0, h]} z={front} color={WALL} />
    <Span x={[WINDOW.x0, WINDOW.x1]} y={[0, WINDOW.y0]} z={front} color={WALL} />
    <Span x={[WINDOW.x0, WINDOW.x1]} y={[WINDOW.y1, h]} z={front} color={WALL} />
    <Span x={[WINDOW.x1, x1]} y={[0, h]} z={front} color={WALL} />
    <mesh position={[(WINDOW.x0 + WINDOW.x1) / 2, (WINDOW.y0 + WINDOW.y1) / 2, z1 - t / 2]}><boxGeometry args={[WINDOW.x1 - WINDOW.x0, WINDOW.y1 - WINDOW.y0, 0.03]} /><meshStandardMaterial color="#9fd4e0" transparent opacity={0.22} roughness={0.15} depthWrite={false} /></mesh>
    {[0, 1, 2, 3].map(i => { const x = WINDOW.x0 + i * (WINDOW.x1 - WINDOW.x0) / 3; return <Box key={i} p={[x, (WINDOW.y0 + WINDOW.y1) / 2, z1 - t / 2]} s={[0.08, WINDOW.y1 - WINDOW.y0, 0.1]} color={TRIM} />; })}
    {/* door frame, and the door standing open against the front of the building */}
    {[DOOR.x0, DOOR.x1].map(x => <Box key={x} p={[x, DOOR.h / 2, z1 + 0.02]} s={[0.1, DOOR.h, 0.06]} color={TRIM} />)}
    <Box p={[DOOR.x0 - 0.78, DOOR.h / 2, z1 + 0.09]} s={[1.5, DOOR.h - 0.06, 0.06]} color={TRIM} />
    {/* roof */}
    <Box p={[0, h + 0.15, (z0 + z1) / 2]} s={[x1 - x0 + 0.6, 0.3, z1 - z0 + 0.6]} color="#7a2f26" />
    <Span x={[x0 + t, x1 - t]} y={[h - 0.02, h]} z={[z0 + t, z1 - t]} color="#e6e1d2" emissive="#3a382f" ei={1} cast={false} />
    {/* light panels */}
    {[-4.5, 0.5, 5].map(x => <Box key={x} p={[x, h - 0.06, -11.9]} s={[1.6, 0.05, 0.5]} color="#fff6dc" emissive="#fff0c0" ei={1.4} cast={false} />)}
    <pointLight position={[-3.5, h - 0.6, -12]} intensity={14} distance={12} decay={1.6} color="#fff0d0" />
    <pointLight position={[3.5, h - 0.6, -12]} intensity={14} distance={12} decay={1.6} color="#fff0d0" />
    {/* counter, register and the wall behind it */}
    <Box p={[COUNTER.x, COUNTER.h / 2, COUNTER.z]} s={[COUNTER.w, COUNTER.h, COUNTER.d]} color="#7a5232" />
    <Box p={[COUNTER.x, COUNTER.h + 0.03, COUNTER.z]} s={[COUNTER.w + 0.12, 0.06, COUNTER.d + 0.12]} color="#b9925e" rough={0.6} />
    <Box p={[COUNTER.x - 0.7, COUNTER.h + 0.2, COUNTER.z]} s={[0.46, 0.28, 0.36]} color="#33383b" metal={0.4} />
    <Box p={[COUNTER.x - 0.7, COUNTER.h + 0.42, COUNTER.z - 0.06]} s={[0.3, 0.16, 0.06]} color="#10241c" emissive="#5bd8a0" ei={0.7} cast={false} />
    <Shelf s={{ x: COUNTER.x, z: z0 + 0.45, w: 2.8, d: 0.45, h: 2.1 }} seed={5} />
    {SHELVES.map((s, i) => <Shelf key={i} s={s} seed={i * 3} bare={REAL_BOARDS.filter(r => r[0] === i).map(r => r[1])} />)}
    {/* drinks cooler */}
    <Box p={[COOLER.x, COOLER.h / 2, COOLER.z]} s={[COOLER.w, COOLER.h, COOLER.d]} color="#d8d6ce" metal={0.3} />
    <Box p={[COOLER.x - COOLER.w / 2 - 0.01, 1.2, COOLER.z]} s={[0.03, 1.7, COOLER.d - 0.3]} color="#1c3a44" emissive="#8fd2e0" ei={0.35} rough={0.2} cast={false} />
    {[-1, 0, 1].map(i => <Box key={i} p={[COOLER.x - COOLER.w / 2 - 0.04, 1.2, COOLER.z + i * 0.98]} s={[0.04, 1.75, 0.07]} color="#8a8f92" metal={0.5} />)}
  </group>;
}
