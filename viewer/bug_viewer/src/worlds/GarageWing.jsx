import { matteFinish } from './shopFinishes.js';
import ShopBoxGeometry from './ShopBoxGeometry.jsx';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { OFFICE, STAIRS, LOFT, ANNEX, WING, PARTS_ROOM, WING_UP, deskOf } from './office.js';
import { signTex } from '../lot/CarLot.jsx';
import OriginalWall from './OriginalWall.jsx';
import { garageItems, nameOfItem } from '../game/items.js';
import { game, useGame } from '../game/store.js';
import { upgradeLevel, hasStage } from '../game/upgrades.js';

const Box = ({ p, s, map, color = '#b7a58a', rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><ShopBoxGeometry size={s} /><meshStandardMaterial map={map} color={color} roughness={0.88} roughnessMap={matteFinish} /></mesh>;
function BackstockCarton({ slot, contents }) {
  const title = nameOfItem(contents[0]);
  const count = contents.length;
  const label = useMemo(() => signTex([[title, 42], [count === 1 ? 'BACKSTOCK' : count + ' ITEMS', 35]], '#f0e3bc', '#302d26', '#766744'), [title, count]);
  React.useEffect(() => () => label.dispose(), [label]);
  return <group position={[-8.59 + slot % 3 * 0.49, 0.74 + Math.floor(slot / 3) * 0.8, -5.2]}>
    <Box p={[0,0.165,0]} s={[0.44,0.33,0.45]} color="#ac845a" />
    <Box p={[0,0.332,0]} s={[0.057,0.004,0.45]} color="#d1ad79" />
    <mesh position={[0,0.17,0.226]}><planeGeometry args={[0.34,0.17]} /><meshStandardMaterial map={label} /></mesh>
  </group>;
}
function StorageRoomStock() {
  useGame();
  const cartons = Array.from({ length: 9 }, () => []);
  garageItems().forEach((item, index) => cartons[index % cartons.length].push(item));
  return cartons.map((contents, slot) => contents.length ? <BackstockCarton key={slot} slot={slot} contents={contents} /> : null);
}
export default function GarageWing({ wall, timber, roof, floor, power }) {
  const { x0, x1, z0, z1, H, entry } = OFFICE;
  return <group>
    <Box p={[-10.1, 0.06, 0]} s={[6.8, 0.12, 12.6]} map={floor} color="#fff" />
    {/* west wall: solid, unless the "Office expansion" upgrade has cut a doorway through it (game/upgrades.js, openings.js WALLS.OW) */}
    <OriginalWall which="OW" map={wall} lining={timber} open={game.home?.openings || []} height={H} />
    {upgradeLevel('office') >= 1 && (hasStage('office1') ? <OfficeWing level={hasStage('office3') ? 3 : hasStage('office2') ? 2 : 1} wall={wall} timber={timber} roof={roof} floor={floor} power={power} /> : <OfficeAnnex wall={wall} timber={timber} roof={roof} floor={floor} power={power} />)}
    <Box p={[-10.1, H / 2, z0]} s={[6.2, H, 0.2]} map={wall} color="#fff" />
    <Box p={[(x0 + entry.x0) / 2, H / 2, z1]} s={[entry.x0 - x0, H, 0.2]} map={wall} color="#fff" />
    <Box p={[(x1 + entry.x1) / 2, H / 2, z1]} s={[x1 - entry.x1, H, 0.2]} map={wall} color="#fff" />
    <Box p={[-11, 3.9, z1]} s={[1.6, 3.4, 0.2]} map={wall} color="#fff" />
    <Box p={[-10.1, H + 0.35, 0]} s={[6.8, 0.18, 12.8]} map={roof} color="#fff" rot={[0, 0, 0.08]} />
    <Box p={[-7, 5.36, 0]} s={[0.2, 1.52, 12]} map={wall} color="#fff" />
    {[-6, 6].map(z => <mesh key={z} position={[0, H, z]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array([x0, 0, 0, x1, 0, 0, x1, 0.51, 0, x0, 0, 0, x1, 0.51, 0, x0, 0.015, 0]), 3]} />
        <bufferAttribute attach="attributes-normal" args={[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3]} />
      </bufferGeometry><meshStandardMaterial color="#817d68" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>)}
    <Box p={[-10.2, 2.75, 6.8]} s={[6.5, 0.15, 1.8]} map={roof} color="#fff" rot={[0.12, 0, 0]} />
    {[-13, -7.5].map(x => <Box key={x} p={[x, 1.35, 7.5]} s={[0.15, 2.7, 0.15]} map={timber} />)}
    {[-12.4, -8.7].map(x => <group key={x}>
      <Box p={[x, 4.35, 6.12]} s={[1.05, 1.2, 0.05]} color="#394848" />
      {[-0.57, 0, 0.57].map(dx => <Box key={dx} p={[x + dx, 4.35, 6.17]} s={[0.06, 1.3, 0.08]} map={timber} />)}
      {[-0.65, 0, 0.65].map(dy => <Box key={dy} p={[x, 4.35 + dy, 6.17]} s={[1.2, 0.06, 0.08]} map={timber} />)}
    </group>)}
    {/* Reception counter leaves both entrances and the stair foot clear. */}
    <Box p={[-11.8, 0.6, 1.7]} s={[1.7, 1, 1]} map={timber} />
    <Box p={[-11.8, 1.15, 1.7]} s={[1.9, 0.12, 1.2]} map={timber} color="#76583c" />
    <Box p={[-11.5, 1.25, 1.7]} s={[0.35, 0.08, 0.25]} color="#34332b" />
    {/* Painted tongue-and-groove counter front with an oak cap and a recessed kick plate. */}
    {Array.from({ length: 11 }, (_, i) => <Box key={i} p={[-12.55 + i * 0.15, 0.65, 2.208]}
      s={[0.146, 0.85, 0.025]} color={i % 3 === 0 ? '#496461' : '#516d69'} />)}
    <Box p={[-11.8, 0.19, 2.21]} s={[1.7, 0.09, 0.04]} color="#393931" />
    <Box p={[-11.8, 1.07, 2.23]} s={[1.72, 0.045, 0.045]} map={timber} />
    <Box p={[-11.5, 1.36, 1.69]} s={[0.055, 0.18, 0.05]} color="#4a4942" />
    <Box p={[-11.5, 1.5, 1.69]} s={[0.43, 0.25, 0.042]} color="#363b37" />
    <Box p={[-11.5, 1.5, 1.665]} s={[0.385, 0.206, 0.006]} color="#586860" />
    {/* Repair tickets and a small parts ledger on Walt's counter. */}
    <Box p={[-12.25, 1.225, 1.5]} s={[0.34, 0.008, 0.25]} color="#b9ac8d" rot={[0, 0.18, 0]} />
    <Box p={[-12.25, 1.231, 1.5]} s={[0.27, 0.003, 0.2]} color="#d8d0b7" rot={[0, 0.18, 0]} />
    <Box p={[-11.72, 1.22, 1.98]} s={[0.43, 0.035, 0.31]} color="#504738" rot={[0, -0.12, 0]} />
    <Box p={[-11.72, 1.24, 1.98]} s={[0.38, 0.003, 0.27]} color="#c8bfa8" rot={[0, -0.12, 0]} />
    {/* Bathroom doorway faces the reception; storage shares the rear service area. */}
    <Box p={[-12.6, 1.4, -2]} s={[1.2, 2.6, 0.12]} map={timber} />
    <Box p={[-10.55, 1.4, -2]} s={[0.3, 2.6, 0.12]} map={timber} />
    <Box p={[-11.3, 2.55, -2]} s={[1.4, 0.3, 0.12]} map={timber} />
    <Box p={[-10.4, 1.4, -4]} s={[0.12, 2.6, 4]} map={timber} />
    <Box p={[-12.35, 0.35, -4.9]} s={[0.55, 0.48, 0.8]} color="#e1dcc8" />
    <Box p={[-12.35, 0.8, -5.35]} s={[0.6, 0.65, 0.25]} color="#e1dcc8" />
    <mesh position={[-12.35, 0.62, -4.8]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.055, 8, 20]} /><meshStandardMaterial color="#f4ead5" /></mesh>
    <Box p={[-11.1, 0.2, -4.9]} s={[1, 0.16, 1.5]} color="#c7c5b5" />
    <Box p={[-11.1, 1.5, -5.65]} s={[0.045, 2.3, 0.045]} color="#646d65" />
    <Box p={[-11.1, 2.6, -5.4]} s={[0.25, 0.05, 0.4]} color="#8b9288" />
    <Box p={[-12.7, 0.95, -3]} s={[0.7, 0.18, 0.7]} color="#ded9c8" />
    <Box p={[-13.06, 1.65, -3]} s={[0.025, 0.7, 0.65]} color="#9cafaf" />
    {[0.7, 1.5, 2.3].map(y => <Box key={y} p={[-8.1, y, -5.2]} s={[1.6, 0.08, 0.6]} map={timber} />)}
    <StorageRoomStock />
    <Box p={[-10.1, LOFT.y - 0.1, -3.9]} s={[5.8, 0.2, 3.8]} map={timber} />
    {[-9.02, -7.58].map(x => <Box key={x} p={[x, STAIRS.count / 12 - 0.055, 4 - STAIRS.count / 6]}
      s={[0.085, 0.19, STAIRS.count * Math.hypot(1 / 3, 1 / 6)]} rot={[Math.atan(0.5), 0, 0]} color="#414b49" />)}
    {Array.from({ length: STAIRS.count }, (_, i) => <Box key={i} p={[-8.3, 0.12 + (i + 1) / 6 - 0.06, 4 - (i + 0.5) / 3]} s={[1.6, 0.12, 1 / 3]} map={timber} />)}
    {[-9.15, -7.45].map(x => <group key={x}>
      <Box p={[x, 2.62, 1]} s={[0.06, 0.06, 6.8]} color="#514536" rot={[Math.atan(0.5), 0, 0]} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => <Box key={i} p={[x, 0.62 + i * 0.5, 4 - i]} s={[0.06, 1, 0.06]} color="#514536" />)}
    </group>)}
    <Box p={[-11.15, 4.12, -1.95]} s={[3.7, 0.08, 0.08]} color="#514536" />
    {[-12.9, -12, -11, -10, -9.4].map(x => <Box key={x} p={[x, 3.62, -1.95]} s={[0.06, 1, 0.06]} color="#514536" />)}
    <Box p={[-11.8, 3.55, -4.9]} s={[1.4, 0.65, 1.6]} map={timber} />
    {[[-11, 2.5, 2], [-11, 5.25, -4]].map((p, i) => <pointLight key={i} position={p} color="#ffca81" intensity={power ? 13 : 0} distance={8} decay={2} />)}
  </group>;
}

/** office level 1 (stage 'office1'): the annex grown into a wing the full depth of the office. Customer door at the front, waiting seats,
 *  a service counter beside the widened doorway, a back room with a desk and files. Basic boxes (ChatGPT polishes). */
function OfficeWing({ level, wall, timber, roof, floor, power }) {
  const { x0, x1, z0, z1, door, counter } = WING, H = level >= 3 ? WING_UP.H : WING.H, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, t = 0.2, d = z1 - z0, glass = '#394848';
  const cz0 = (counter.z0 + counter.z1) / 2, cl = counter.z1 - counter.z0 + 0.5;
  return <group>
    <Box p={[cx, 0.06, cz]} s={[x1 - x0, 0.12, d]} map={floor} color="#fff" />
    <Box p={[x0, H / 2, cz]} s={[t, H, d + t]} map={wall} color="#fff" />
    <Box p={[cx, H / 2, z0]} s={[x1 - x0, H, t]} map={wall} color="#fff" />
    {/* front wall: either side of the customer door, a header over it */}
    <Box p={[(x0 + door.x0) / 2, H / 2, z1]} s={[door.x0 - x0, H, t]} map={wall} color="#fff" />
    <Box p={[(x1 + door.x1) / 2, H / 2, z1]} s={[x1 - door.x1, H, t]} map={wall} color="#fff" />
    <Box p={[(door.x0 + door.x1) / 2, (2.6 + H) / 2, z1]} s={[door.x1 - door.x0, H - 2.6, t]} map={wall} color="#fff" />
    <Box p={[cx, H + 0.1, cz]} s={[x1 - x0 + 0.3, 0.16, d + 0.3]} map={roof} color="#fff" />
    {[[x0 - 0.02, 1.2], [x0 - 0.02, 4.3]].map(([x, z], i) => <Box key={i} p={[x, 2.2, z]} s={[0.05, 1.2, 1.6]} color={glass} />)}
    {/* the service counter, beside the widened doorway */}
    <Box p={[counter.x, 0.55, cz0]} s={[0.8, 1.1, cl]} map={timber} />
    <Box p={[counter.x, 1.15, cz0]} s={[1.0, 0.1, cl + 0.1]} map={timber} color="#76583c" />
    {level >= 2 && <Box p={[counter.x + 0.52, 1.5, cz0]} s={[0.04, 0.6, cl + 0.1]} color="#4b5a58" />}
    {/* waiting area by the front door: two benches and a low table */}
    {[3.9, 5.1].map(z => <group key={z} position={[x0 + 0.5, 0, z]}>
      {[-0.35,0.35].map(end => <group key={end}>
        <Box p={[0,0.09,end]} s={[0.43,0.045,0.045]} color="#555955" />
        <Box p={[0,0.27,end]} s={[0.045,0.35,0.045]} color="#555955" />
        <Box p={[-0.19,0.64,end]} s={[0.035,0.56,0.035]} color="#555955" />
      </group>)}
      {[-0.17,0,0.17].map(x => <Box key={x} p={[x,0.465,0]} s={[0.155,0.055,1.0]} map={timber} color="#ae8761" />)}
      {[0.68,0.82].map(y => <Box key={y} p={[-0.17,y,0]} s={[0.045,0.12,1.0]} map={timber} color="#a88360" />)}
    </group>)}
    <Box p={[x0 + 1.7, 0.39, 4.5]} s={[0.6, 0.05, 0.9]} map={timber} color="#8a6a44" />
    {[-0.22,0.22].flatMap(x => [-0.35,0.35].map(z => <Box key={x+':'+z} p={[x0+1.7+x,0.19,4.5+z]} s={[0.045,0.38,0.045]} color="#545652" />))}
    {level >= 2 ? <>
      {/* parts room: shelving along both side walls, a supplier desk beside the parts counter */}
      {PARTS_ROOM.shelves.map((sh, k) => level >= 3 && k === 0 ? null : <group key={k}>{[0.4, 1.1, 1.8, 2.5].map(y => <Box key={y} p={[sh.x, y, (sh.z0 + sh.z1) / 2]} s={[0.5, 0.06, sh.z1 - sh.z0]} map={timber} />)}
        {[sh.z0, (sh.z0 + sh.z1) / 2, sh.z1].map(z => <Box key={z} p={[sh.x, 1.3, z]} s={[0.5, 2.6, 0.06]} map={timber} color="#76583c" />)}
        {Array.from({ length: 9 }, (_, i) => <Box key={i} p={[sh.x, [0.58, 1.28, 1.98][i % 3], sh.z0 + 0.4 + i * 0.45]} s={[0.36, 0.3, 0.34]} color={['#8d5b39', '#76694f', '#594f3c'][i % 3]} />)}</group>)}
      {(() => { const dk = deskOf(level); return <>
      <Box p={[dk.x, 0.75, (dk.z0 + dk.z1) / 2]} s={[0.9, 0.07, dk.z1 - dk.z0]} map={timber} color="#a88a5c" />
      {[dk.z0, dk.z1].map(z => <Box key={z} p={[dk.x, 0.36, z]} s={[0.8, 0.72, 0.08]} map={timber} />)}
      </>; })()}
    </> : <>
    {/* back room: a desk and filing cabinets */}
    <Box p={[x0 + 1.0, 0.75, -4.6]} s={[1.0, 0.07, 1.9]} map={timber} color="#a88a5c" />
    {[-5.5, -3.7].map(z => <Box key={z} p={[x0 + 1.0, 0.36, z]} s={[0.9, 0.72, 0.08]} map={timber} />)}
    {[-5.4, -4.7].map(z => <group key={z} position={[x1-0.5,0,z]}>
      <Box p={[0,0.7,0]} s={[0.5,1.4,0.6]} color="#555e59" />
      {[0.28,0.72,1.16].map(y => <group key={y}>
        <Box p={[-0.253,y,0]} s={[0.02,0.421,0.56]} color="#798078" />
        <Box p={[-0.275,y+0.09,0]} s={[0.02,0.064,0.14]} color="#aea99a" />
        <Box p={[-0.288,y+0.09,0]} s={[0.008,0.043,0.11]} color="#dfd5ba" />
        <Box p={[-0.285,y-0.035,0]} s={[0.045,0.032,0.17]} color="#b5b5ac" />
      </group>)}
    </group>)}
    </>}
    {level >= 3 && <TeamFloor wall={wall} timber={timber} H={H} power={power} />}
    {[[cx, level >= 3 ? 2.4 : H - 0.8, -3], [cx, level >= 3 ? 2.4 : H - 0.8, 3]].map((p, i) => <pointLight key={i} position={p} color="#ffca81" intensity={power ? 11 : 0} distance={8} decay={2} />)}
  </group>;
}

/** office level 3 (stage 'office3'): the wing's second floor. A stair up the west wall, the team room (a long table) and the race planning wall.
 *  The wall above the old office's roofline closes the east side. Basic boxes (ChatGPT polishes). */
function TeamFloor({ wall, timber, H, power }) {
  const { y, stair: s, floor: f, landing: l, table: tb, board } = WING_UP, { x0, x1, z0, z1 } = WING, tz = (tb.z0 + tb.z1) / 2, slab = 0.2, cx = (x0 + x1) / 2;
  const run = (s.zBottom - s.zTop) / s.count, rise = (y - 0.12) / s.count, w = s.x1 - s.x0, sx = (s.x0 + s.x1) / 2;
  return <group>
    {/* the upstairs floor (a slab under it) and the landing at the top of the stair */}
    {[f, l].map((r, i) => <Box key={i} p={[(r.x0 + r.x1) / 2, y - slab / 2, (r.z0 + r.z1) / 2]} s={[r.x1 - r.x0, slab, r.z1 - r.z0]} map={timber} color="#9a8467" />)}
    {/* the east side above the old office's wall */}
    <Box p={[x1, (OFFICE.H + H) / 2, (z0 + z1) / 2]} s={[0.2, H - OFFICE.H, z1 - z0]} map={wall} color="#fff" />
    {/* the stair: 16 treads climbing north, a closed side under it, and a rail along the open side */}
    {Array.from({ length: s.count }, (_, i) => <Box key={i} p={[sx, 0.12 + (i + 0.5) * rise, s.zBottom - (i + 0.5) * run]} s={[w, 0.1, run + 0.02]} map={timber} />)}
    {[-1, 1].map(side => <Box key={side} p={[sx + side * (w / 2 - 0.04), (y + 0.12) / 2 - 0.09, (s.zBottom + s.zTop) / 2]}
      s={[0.075, 0.16, Math.hypot(s.zBottom - s.zTop, y - 0.12)]} color="#494d49" rot={[Math.atan2(rise, run), 0, 0]} />)}
    {[0.48, 0.96].map(h => <Box key={h} p={[s.x1, (y + 0.12) / 2 + h, (s.zBottom + s.zTop) / 2]}
      s={[0.045, 0.045, Math.hypot(s.zBottom - s.zTop, y - 0.12)]} color="#565b55" rot={[Math.atan2(rise, run), 0, 0]} />)}
    {[0, 0.25, 0.5, 0.75, 1].map(t => <Box key={t} p={[s.x1, 0.12 + t * (y - 0.12) + 0.48, s.zBottom + t * (s.zTop - s.zBottom)]}
      s={[0.045, 0.96, 0.045]} color="#565b55" />)}
    {/* the open floor edge: a rail along the south side */}
    <Box p={[(f.x0 + f.x1) / 2, y + 0.95, f.z1]} s={[f.x1 - f.x0, 0.06, 0.06]} color="#514536" />
    {[f.x0 + 0.1, (f.x0 + f.x1) / 2, f.x1 - 0.1].map(x => <Box key={x} p={[x, y + 0.5, f.z1]} s={[0.05, 1, 0.05]} color="#514536" />)}
    {/* plain timber panelling on the walls and a pale ceiling, so the room reads as an office and not a shed */}
    <Box p={[x0 + 0.13, y + 0.7, -3]} s={[0.05, 1.4, 5.9]} color="#c8b48c" />
    <Box p={[cx, y + 0.7, z0 + 0.13]} s={[x1 - x0 - 0.2, 1.4, 0.05]} color="#c8b48c" />
    <Box p={[x1 - 0.13, y + 0.7, -3]} s={[0.05, 1.4, 5.9]} color="#c8b48c" />
    <Box p={[cx, H - 0.06, 0]} s={[x1 - x0 - 0.2, 0.06, z1 - z0 - 0.2]} color="#d6ccb4" />
    {/* the team table with chairs */}
    <Box p={[tb.x, y + 0.74, tz]} s={[0.9, 0.07, tb.z1 - tb.z0]} map={timber} color="#a88a5c" />
    {[tb.z0 + 0.1, tb.z1 - 0.1].map(z => [-0.35, 0.35].map(dx => <Box key={`${z}${dx}`} p={[tb.x + dx, y + 0.37, z]} s={[0.08, 0.74, 0.08]} map={timber} />))}
    {[-3.8, -3.2, -2.6].map(z => [-1, 1].map(side =>
      <group key={z + '/' + side} position={[tb.x + side * 0.75, y, z]}>
        <Box p={[0, 0.46, 0]} s={[0.42, 0.075, 0.42]} color="#586359" />
        <Box p={[side * 0.19, 0.75, 0]} s={[0.055, 0.22, 0.41]} map={timber} color="#98754f" />
        {[-0.165, 0.165].map(dz => <React.Fragment key={dz}>
          <Box p={[side * 0.17, 0.38, dz]} s={[0.028, 0.76, 0.028]} color="#464d4b" />
          <Box p={[-side * 0.17, 0.22, dz]} s={[0.028, 0.44, 0.028]} color="#464d4b" />
        </React.Fragment>)}
      </group>))}
    {/* the race planning wall, on the old office's wall: a framed cork board with paper and route strips pinned on (blank: no names or routes yet) */}
    {(() => { const bz = (board.z0 + board.z1) / 2, bl = board.z1 - board.z0, fx = board.x + 0.0, face = board.x - 0.035; return <>
      <Box p={[fx, y + 1.6, bz]} s={[0.05, 1.7, bl + 0.16]} map={timber} color="#4f3a26" />
      <Box p={[fx - 0.01, y + 1.6, bz]} s={[0.05, 1.54, bl]} color="#b89a6a" />
      {[[-4.5, 1.2, 0.9], [-3.3, 1.9, 0.8], [-2.3, 2.1, 1.0], [-4.2, 2.15, 0.7]].map(([z, h, w2], i) => <Box key={i} p={[face, y + h - 0.2, z]} s={[0.02, 0.04, w2]} color={['#a2382c', '#38639f', '#c9a640', '#4d7a4c'][i]} />)}
      {[[-4.6, 1.5], [-3.7, 1.0], [-2.8, 1.55], [-1.9, 1.1]].map(([z, h], i) => <Box key={z} p={[face - 0.005, y + h, z]} s={[0.012, 0.34, 0.26]} color="#e2dac2" rot={[0.04 * (i - 1.5), 0, 0]} />)}
    </>; })()}
    {[[x0 - 0.02, -1.2], [x0 - 0.02, -3.2]].map(([x, z], i) => <Box key={i} p={[x, y + 1.5, z]} s={[0.05, 1.1, 1.4]} color="#394848" />)}
    <pointLight position={[cx, y + 2.6, -3.2]} color="#ffca81" intensity={power ? 12 : 0} distance={8} decay={2} />
  </group>;
}

/** the "Office expansion" upgrade: a back room through the new doorway in the office's west wall. A bare room on
 *  purpose — build-mode furniture can't reach it yet (open question; see docs/OPEN_QUESTIONS.md), so it stays undressed
 *  but for a desk, to make clear what it's for without promising the old PC / parts-ordering feature that isn't built. */
function OfficeAnnex({ wall, timber, roof, floor, power }) {
  const { x0, x1, z0, z1, H } = ANNEX, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, t = 0.2;
  return <group>
    <Box p={[cx, 0.06, cz]} s={[x1 - x0, 0.12, z1 - z0]} map={floor} color="#fff" />
    <Box p={[x0, H / 2, cz]} s={[t, H, z1 - z0 + t]} map={wall} color="#fff" />
    <Box p={[cx, H / 2, z0]} s={[x1 - x0, H, t]} map={wall} color="#fff" />
    <Box p={[cx, H / 2, z1]} s={[x1 - x0, H, t]} map={wall} color="#fff" />
    <Box p={[cx, H + 0.1, cz]} s={[x1 - x0 + 0.3, 0.16, z1 - z0 + 0.3]} map={roof} color="#fff" />
    <Box p={[x0 + 0.5, 0.74, cz]} s={[0.05, 0.74, 1.3]} map={timber} color="#8a6a44" />
    <Box p={[x0 + 0.52, 1.12, cz]} s={[0.9, 0.04, 0.6]} map={timber} color="#a88a5c" />
    <pointLight position={[cx, H - 0.8, cz]} color="#ffca81" intensity={power ? 11 : 0} distance={7} decay={2} />
  </group>;
}
