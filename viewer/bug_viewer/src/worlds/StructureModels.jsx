import React from 'react';
import * as THREE from 'three';
import { concreteTex, corrugatedTex, wood, metalTex } from './Sites.jsx';
import { WALL_H as H } from './structures.js';

// The look of the building pieces. THIS FILE IS THE SKIN: rules and sizes live in structures.js, so a visual overhaul only replaces what is here.
//   Overhaul 1 (soon): better models/textures per piece, same footprints.   Overhauls 2 and 3 (later): final art, same piece ids and sizes.
// To add a skin: write another builder like `yardSkin` below, register it in SKINS, and point ACTIVE_SKIN at it. Piece ids, sizes and
// pivots (origin = the piece's centre on the ground, local x along the piece, local z across it) must not change, or saves would break.
const T = 0.16;   // wall thickness (m)

function yardSkin() {
  const tex = {
    slab: (() => { const m = concreteTex(61); m.repeat.set(1, 1); return m; })(),
    wall: (() => { const m = corrugatedTex('#9a9f98', 63); m.repeat.set(1, 1); return m; })(),
    plank: (() => { const m = wood('#a88a5c', '#5a4428', false, 65); m.repeat.set(2, 2); return m; })(),
    roof: (() => { const m = metalTex('#59615f', 67); return m; })(),
    trim: (() => { const m = wood('#7b5a3a', '#2e2012', true, 69); return m; })(),
  };
  const Box = ({ p, s, map, color = '#fff', r = 0.9, m = 0, cast = true, rot }) => <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial map={map} color={color} roughness={r} metalness={m} /></mesh>;
  const Glass = ({ p, s }) => <mesh position={p}><planeGeometry args={s} /><meshStandardMaterial color="#9fc4c8" transparent opacity={0.28} roughness={0.15} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>;
  const base = 0.12;   // walls stand on the slab top
  const Wall = ({ w = 2, y0 = base, y1 = base + H, x = 0 }) => y1 > y0 + 0.01 ? <Box p={[x, (y0 + y1) / 2, 0]} s={[w, y1 - y0, T]} map={tex.wall} /> : null;
  const frame = (w, h, y, x = 0) => <>
    <Box p={[x, y + h / 2 + 0.03, 0]} s={[w + 0.1, 0.06, T + 0.04]} map={tex.trim} cast={false} /><Box p={[x, y - h / 2 - 0.03, 0]} s={[w + 0.1, 0.06, T + 0.04]} map={tex.trim} cast={false} />
    {[-1, 1].map(s => <Box key={s} p={[x + s * (w / 2 + 0.03), y, 0]} s={[0.06, h, T + 0.04]} map={tex.trim} cast={false} />)}
  </>;
  const models = {
    foundation: () => <Box p={[0, 0.06, 0]} s={[2, 0.12, 2]} map={tex.slab} cast={false} />,
    floor: () => <Box p={[0, 0.14, 0]} s={[1.98, 0.04, 1.98]} map={tex.plank} cast={false} />,
    roof: () => <group><Box p={[0, 3.2, 0]} s={[2.1, 0.1, 2.1]} map={tex.roof} m={0.35} r={0.6} /><Box p={[0, 3.12, 0]} s={[2, 0.06, 2]} color="#9a9a90" r={1} cast={false} /></group>,
    wall: () => <group><Wall /><Box p={[0, base + 0.05, 0]} s={[2.02, 0.1, T + 0.04]} map={tex.trim} cast={false} /></group>,
    windowWall: () => { const y0 = base + 1.0, y1 = base + 2.1, wh = 1.4;
      return <group>
        <Wall y0={base} y1={y0} /><Wall y0={y1} y1={base + H} />
        {[-1, 1].map(s => <Wall key={s} w={(2 - wh) / 2} y0={y0} y1={y1} x={s * (wh / 2 + (2 - wh) / 4)} />)}
        <Glass p={[0, (y0 + y1) / 2, 0]} s={[wh, y1 - y0]} />{frame(wh, y1 - y0, (y0 + y1) / 2)}<Box p={[0, (y0 + y1) / 2, 0]} s={[0.04, y1 - y0, T + 0.02]} map={tex.trim} cast={false} />
      </group>; },
    door: () => { const ow = 1.0, oh = 2.2;
      return <group>
        {[-1, 1].map(s => <Wall key={s} w={(2 - ow) / 2} x={s * (ow / 2 + (2 - ow) / 4)} />)}
        <Wall w={ow} y0={base + oh} y1={base + H} x={0} />{frame(ow, oh, base + oh / 2)}
        <group position={[ow / 2, base + oh / 2, 0.02]} rotation={[0, -1.35, 0]}><Box p={[-ow / 2, 0, 0]} s={[ow - 0.04, oh - 0.04, 0.05]} map={tex.trim} color="#c9d4cf" /><Box p={[-0.12, -0.05, 0.04]} s={[0.05, 0.05, 0.04]} color="#c9a227" m={0.8} r={0.3} cast={false} /></group>
      </group>; },
    garageDoor: () => { const ow = 3.2, oh = 2.5, pier = (4 - ow) / 2;
      return <group>
        {[-1, 1].map(s => <Wall key={s} w={pier} x={s * (ow / 2 + pier / 2)} />)}
        <Wall w={ow} y0={base + oh} y1={base + H} />{frame(ow, oh, base + oh / 2)}
        {/* the roller door stands open: slats rolled up in a drum above, side rails, bottom bar parked at the top */}
        <mesh position={[0, base + oh - 0.1, 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.16, 0.16, ow, 14]} /><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.4} /></mesh>
        {[-1, 1].map(s => <Box key={s} p={[s * (ow / 2 - 0.03), base + oh / 2, 0.1]} s={[0.06, oh, 0.08]} color="#3c4346" m={0.6} r={0.5} cast={false} />)}
      </group>; },
    pillar: () => <group><Box p={[0, base + H / 2, 0]} s={[0.28, H, 0.28]} map={tex.trim} color="#d8cdb8" /><Box p={[0, base + 0.04, 0]} s={[0.42, 0.08, 0.42]} color="#3c4346" m={0.5} r={0.6} cast={false} /><Box p={[0, base + H - 0.04, 0]} s={[0.4, 0.08, 0.4]} color="#3c4346" m={0.5} r={0.6} cast={false} /></group>,
  };
  return models;
}
const SKINS = { yard: yardSkin };
const ACTIVE_SKIN = 'yard';
let skin = null;
/** the model of a building piece; origin = its centre on the ground */
export function StructureModel({ id }) {
  skin = skin || SKINS[ACTIVE_SKIN]();
  const M = skin[id]; return M ? <M /> : null;
}
