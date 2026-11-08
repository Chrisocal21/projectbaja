import React from 'react';
import * as THREE from 'three';
import { concreteTex, corrugatedTex, wood, metalTex } from './Sites.jsx';
import { canvasTex, rnd } from '../lot/CarLot.jsx';
import { WALL_H as H, DEFAULT_MAT, LEGACY_MAT } from './structures.js';

// The look of the building pieces. THIS FILE IS THE SKIN: rules, sizes and prices live in structures.js, so a visual overhaul only replaces what is here.
//   Overhaul 1 (this one): a newer, cleaner look for everything the player builds, in five materials.
//   Overhauls 2 and 3 (later): final art. Piece ids, sizes, pivots and material ids must not change, or saves would break.
// Pivot of every model: the piece's centre on the ground; local x runs along the piece, local z across it.
const T = 0.16;   // wall thickness (m)

// ---- clean textures (no rust, no cracks): a little sheen, a little dirt at the bottom ----
const cache = new Map();
const tex = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const sheetTex = color => tex('sheet' + color, () => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(7); g.fillStyle = color; g.fillRect(0, 0, w, h);
  const n = 16; for (let i = 0; i < n; i++) { const x = (i * w) / n, gr = g.createLinearGradient(x, 0, x + w / n, 0); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0.18)'); g.fillStyle = gr; g.fillRect(x, 0, w / n, h); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 5); }
  const d = g.createLinearGradient(0, h * 0.85, 0, h); d.addColorStop(0, 'rgba(90,80,60,0)'); d.addColorStop(1, 'rgba(90,80,60,0.16)'); g.fillStyle = d; g.fillRect(0, h * 0.85, w, h * 0.15);
}, [1, 1]));
const seamTex = color => tex('seam' + color, () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { const x = (i * w) / 8; g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 3, 0, 4, h); }
}, [1, 1]));
const sidingTex = color => tex('siding' + color, () => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(11); g.fillStyle = color; g.fillRect(0, 0, w, h);
  const n = 8; for (let i = 0; i < n; i++) { const y = (i * h) / n; g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, y + 2, w, 3); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.035})`; g.fillRect(r() * w, r() * h, 6 + r() * 20, 1); }
}, [1, 1]));
const blockTex = color => tex('block' + color, () => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(13); g.fillStyle = '#8f8c85'; g.fillRect(0, 0, w, h);
  const bw = 64, bh = 32; for (let row = 0; row < h / bh; row++) for (let col = -1; col < w / bw + 1; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), shade = (r() - 0.5) * 30; g.fillStyle = color; g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
    g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade / 160})` : `rgba(0,0,0,${-shade / 160})`; g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
  }
}, [1, 1]));
const stuccoTex = color => tex('stucco' + color, () => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(17); g.fillStyle = color; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.07})` : `rgba(255,255,255,${r() * 0.09})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
}, [1, 1]));
const cleanSlab = () => tex('slab', () => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(19); g.fillStyle = '#aeaea9'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,60,58' : '240,240,235'},${r() * 0.1})`; g.fillRect(r() * w, r() * h, 1 + r(), 1 + r()); }
  g.fillStyle = 'rgba(60,58,54,0.4)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
}, [1, 1]));
const planks = color => tex('plank' + color, () => { const m = wood(color, '#4a3520', false, 21); m.repeat.set(2, 2); return m; });

/** what each material looks like. `rusty` is the old Walt's-garage look (also what pieces built before materials existed use). */
const LOOKS = {
  sheet: { wall: () => sheetTex('#c5d0d4'), trim: '#eef2f3', door: '#2f5f7a', roof: () => seamTex('#58666e'), slab: cleanSlab, floor: () => cleanSlab(), post: '#eef2f3', roofM: 0.5 },
  siding: { wall: () => sidingTex('#e6dfcb'), trim: '#ffffff', door: '#5f8a63', roof: () => seamTex('#7a4f3a'), slab: cleanSlab, floor: () => planks('#b9966a'), post: '#ffffff', roofM: 0.3 },
  block: { wall: () => blockTex('#b4b1a8'), trim: '#d8d4c8', door: '#7a2f26', roof: () => seamTex('#4d555a'), slab: cleanSlab, floor: () => cleanSlab(), post: '#c8c4b8', roofM: 0.4 },
  stucco: { wall: () => stuccoTex('#d9c6a0'), trim: '#f4efe2', door: '#2f4a63', roof: () => seamTex('#8a5a44'), slab: cleanSlab, floor: () => planks('#a9835a'), post: '#f4efe2', roofM: 0.3 },
  rusty: { wall: () => tex('rwall', () => corrugatedTex('#9a9f98', 63)), trim: '#7b5a3a', trimTex: () => tex('rtrim', () => wood('#7b5a3a', '#2e2012', true, 69)), door: '#c9d4cf', roof: () => tex('rroof', () => metalTex('#59615f', 67)), slab: () => tex('rslab', () => concreteTex(61)), floor: () => planks('#a88a5c'), post: '#d8cdb8', roofM: 0.35 },
};

function skinOf(mat) {
  const look = LOOKS[mat] || LOOKS[DEFAULT_MAT];
  const wallMap = look.wall(), trimMap = look.trimTex ? look.trimTex() : null, roofMap = look.roof(), slabMap = look.slab(), floorMap = look.floor();
  const Box = ({ p, s, map, color = '#fff', r = 0.9, m = 0, cast = true, rot }) => <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial map={map} color={color} roughness={r} metalness={m} /></mesh>;
  const Trim = props => <Box {...props} map={trimMap} color={trimMap ? '#fff' : look.trim} r={0.7} cast={false} />;
  const Glass = ({ p, s }) => <mesh position={p}><planeGeometry args={s} /><meshStandardMaterial color="#9fc4c8" transparent opacity={0.28} roughness={0.15} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>;
  const base = 0.12;   // walls stand on the slab top
  const Wall = ({ w = 2, y0 = base, y1 = base + H, x = 0 }) => y1 > y0 + 0.01 ? <Box p={[x, (y0 + y1) / 2, 0]} s={[w, y1 - y0, T]} map={wallMap} /> : null;
  const frame = (w, h, y, x = 0) => <>
    <Trim p={[x, y + h / 2 + 0.03, 0]} s={[w + 0.1, 0.06, T + 0.04]} /><Trim p={[x, y - h / 2 - 0.03, 0]} s={[w + 0.1, 0.06, T + 0.04]} />
    {[-1, 1].map(s => <Trim key={s} p={[x + s * (w / 2 + 0.03), y, 0]} s={[0.06, h, T + 0.04]} />)}
  </>;
  return {
    foundation: () => <Box p={[0, 0.06, 0]} s={[2, 0.12, 2]} map={slabMap} cast={false} />,
    floor: () => <Box p={[0, 0.14, 0]} s={[1.98, 0.04, 1.98]} map={floorMap} cast={false} />,
    roof: () => <group><Box p={[0, 3.2, 0]} s={[2.1, 0.1, 2.1]} map={roofMap} m={look.roofM} r={0.55} /><Box p={[0, 3.12, 0]} s={[2, 0.06, 2]} color="#9a9a90" r={1} cast={false} /></group>,
    wall: () => <group><Wall /><Trim p={[0, base + 0.05, 0]} s={[2.02, 0.1, T + 0.04]} /></group>,
    windowWall: () => { const y0 = base + 1.0, y1 = base + 2.1, wh = 1.4;
      return <group>
        <Wall y0={base} y1={y0} /><Wall y0={y1} y1={base + H} />
        {[-1, 1].map(s => <Wall key={s} w={(2 - wh) / 2} y0={y0} y1={y1} x={s * (wh / 2 + (2 - wh) / 4)} />)}
        <Glass p={[0, (y0 + y1) / 2, 0]} s={[wh, y1 - y0]} />{frame(wh, y1 - y0, (y0 + y1) / 2)}<Trim p={[0, (y0 + y1) / 2, 0]} s={[0.04, y1 - y0, T + 0.02]} />
      </group>; },
    door: () => { const ow = 1.0, oh = 2.2;
      return <group>
        {[-1, 1].map(s => <Wall key={s} w={(2 - ow) / 2} x={s * (ow / 2 + (2 - ow) / 4)} />)}
        <Wall w={ow} y0={base + oh} y1={base + H} x={0} />{frame(ow, oh, base + oh / 2)}
        <group position={[ow / 2, base + oh / 2, 0.02]} rotation={[0, -1.35, 0]}><Box p={[-ow / 2, 0, 0]} s={[ow - 0.04, oh - 0.04, 0.05]} map={trimMap} color={trimMap ? '#c9d4cf' : look.door} /><Box p={[-0.12, -0.05, 0.04]} s={[0.05, 0.05, 0.04]} color="#c9a227" m={0.8} r={0.3} cast={false} /></group>
      </group>; },
    garageDoor: () => { const ow = 3.2, oh = 2.5, pier = (4 - ow) / 2;
      return <group>
        {[-1, 1].map(s => <Wall key={s} w={pier} x={s * (ow / 2 + pier / 2)} />)}
        <Wall w={ow} y0={base + oh} y1={base + H} />{frame(ow, oh, base + oh / 2)}
        {/* the roller door stands open: slats rolled up in a drum above, side rails */}
        <mesh position={[0, base + oh - 0.1, 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.16, 0.16, ow, 14]} /><meshStandardMaterial map={wallMap} roughness={0.6} metalness={0.4} /></mesh>
        {[-1, 1].map(s => <Box key={s} p={[s * (ow / 2 - 0.03), base + oh / 2, 0.1]} s={[0.06, oh, 0.08]} color="#3c4346" m={0.6} r={0.5} cast={false} />)}
      </group>; },
    pillar: () => <group><Box p={[0, base + H / 2, 0]} s={[0.28, H, 0.28]} map={trimMap} color={trimMap ? '#d8cdb8' : look.post} r={0.7} /><Box p={[0, base + 0.04, 0]} s={[0.42, 0.08, 0.42]} color="#3c4346" m={0.5} r={0.6} cast={false} /><Box p={[0, base + H - 0.04, 0]} s={[0.4, 0.08, 0.4]} color="#3c4346" m={0.5} r={0.6} cast={false} /></group>,
  };
}
const skins = new Map();
/** the model of a building piece in a material (undefined = a piece built before materials: the old weathered look); origin = its centre on the ground */
export function StructureModel({ id, mat }) {
  const m = mat || LEGACY_MAT;
  if (!skins.has(m)) skins.set(m, skinOf(m));
  const M = skins.get(m)[id]; return M ? <M /> : null;
}
