// The garage grown backward (worlds/garageLevels.js), drawn by the look rules in docs/EXPANSION_PLAN.md:
//   new steel, not Walt's rust (clean ribbed panels outside, white liner inside, grey kick plate) / a real ceiling with steel beams, not a black void /
//   roll-up doors where the layout puts them (raised, so cars can drive in) / lights that light the room when the power is on /
//   fresh concrete or epoxy with painted, numbered bays / at level 3 a taller warehouse with whole-car racks on the back wall and a marked drive aisle.
// Basic boxes on purpose (ChatGPT polishes the look later). Garage-local metres; drawn inside Sites.jsx Garage().
import React from 'react';
import * as THREE from 'three';
import { extension, baysAt, levelData, wallFaces, BAY, DOOR_H } from './garageLevels.js';
import { canvasTex, rnd } from '../lot/CarLot.jsx';

const Box = ({ p, s, color = '#fff', map, metal = 0, rough = 0.9, emissive, ei = 2.2, cast = true }) => <mesh position={p} castShadow={cast} receiveShadow>
  <boxGeometry args={s} /><meshStandardMaterial color={color} map={map} metalness={metal} roughness={rough} emissive={emissive} emissiveIntensity={emissive ? ei : 0} /></mesh>;
const Decal = ({ p, s, color, map, rz = 0 }) => <mesh position={p} rotation={[-Math.PI / 2, 0, rz]}><planeGeometry args={s} />
  <meshStandardMaterial color={color} map={map} transparent={!!map} roughness={0.7} polygonOffset polygonOffsetFactor={-4} depthWrite={!map} /></mesh>;

/** clean ribbed steel panel (new build: no rust) */
const steelTex = (base, seed) => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { const x = (i * w) / 16, gr = g.createLinearGradient(x, 0, x + w / 16, 0); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.2, 'rgba(0,0,0,0.16)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)'); g.fillStyle = gr; g.fillRect(x, 0, w / 16, h); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,60,55,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 10); }
  const gr = g.createLinearGradient(0, h * 0.9, 0, h); gr.addColorStop(0, 'rgba(120,100,70,0)'); gr.addColorStop(1, 'rgba(120,100,70,0.25)'); g.fillStyle = gr; g.fillRect(0, h * 0.9, w, h * 0.1);
}, [1, 1]);
/** white liner panels inside: faint seams every panel */
const linerTex = () => canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#eef0ee'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) g.fillRect((i * w) / 4, 0, 2, h); }, [1, 1]);
/** fresh concrete (light, smooth, saw cuts) or epoxy (grey with colour flake) */
const floorTex = epoxy => canvasTex(512, 512, (g, w, h) => {
  const r = rnd(epoxy ? 77 : 55); g.fillStyle = epoxy ? '#8d969c' : '#b9b8b1'; g.fillRect(0, 0, w, h);
  if (epoxy) for (let i = 0; i < 9000; i++) { g.fillStyle = ['#d8dcdf', '#40474d', '#6f7a82', '#b7bfc4'][(r() * 4) | 0]; g.globalAlpha = 0.25 + r() * 0.4; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  else { for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(90,88,80,0.08)' : 'rgba(255,255,250,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,70,66' : '240,240,232'},${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1, 1); }
    g.fillStyle = 'rgba(70,68,62,0.45)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }
  g.globalAlpha = 1;
}, [1, 1]);
const labelTex = text => canvasTex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e2b53a'; g.font = "800 46px Impact, 'Arial Black', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
// textures are made once and shared; repeats are cached by size so a re-render never makes new GPU textures
const cache = new Map(), once = (k, make) => (cache.has(k) ? cache.get(k) : (cache.set(k, make()), cache.get(k)));
const BASE = { steel: () => steelTex('#c3c6c0', 61), liner: linerTex, concrete: () => floorTex(false), epoxy: () => floorTex(true) };
const T = new Proxy({}, { get: (_, k) => once(`base:${k}`, BASE[k]) });
const rep = (t, x, y) => once(`${t.uuid}:${x.toFixed(2)}:${y.toFixed(2)}`, () => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; });
const label = id => once(`label:${id}`, () => labelTex(id));

/** one stretch of wall from a to b along a wall face: steel outside, liner + kick plate inside; door gaps get a header above DOOR_H */
function WallRun({ face, a, b, H, T, out }) {
  const len = b - a, mid = (a + b) / 2, z = face.axis === 'z', t = 0.2;
  const at = (u, v, y) => (z ? [u, y, v] : [v, y, u]), size = (l, th, hh) => (z ? [l, hh, th] : [th, hh, l]);
  return <group>
    <Box p={at(mid, face.at, H / 2)} s={size(len, t, H)} map={rep(T.steel, len / 3, 1)} color="#fff" rough={0.6} metal={0.25} />
    {out ? null : <>
      <Box p={at(mid, face.at + face.sign * 0.12, H / 2 + 0.6)} s={size(len, 0.03, H - 1.2)} map={rep(T.liner, len / 4, 1)} color="#fff" rough={0.8} cast={false} />
      <Box p={at(mid, face.at + face.sign * 0.13, 0.6)} s={size(len, 0.04, 1.2)} color="#6c7378" metal={0.5} rough={0.5} cast={false} />
    </>}
  </group>;
}
/** a raised roll-up door: opening up to DOOR_H, wall header above, coil box, side guides, yellow bump posts outside */
function RollUp({ face, a, b, H, T }) {
  const z = face.axis === 'z', mid = (a + b) / 2, w = b - a;
  const at = (u, v, y) => (z ? [u, y, v] : [v, y, u]), size = (l, th, hh) => (z ? [l, hh, th] : [th, hh, l]);
  return <group>
    <Box p={at(mid, face.at, (H + DOOR_H) / 2)} s={size(w, 0.2, H - DOOR_H)} map={rep(T.steel, w / 3, 0.3)} color="#fff" rough={0.6} metal={0.25} />
    <mesh position={at(mid, face.at + face.sign * 0.35, DOOR_H + 0.28)} rotation={z ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, w + 0.2, 16]} /><meshStandardMaterial color="#c9ccc8" metalness={0.5} roughness={0.45} /></mesh>
    {[a, b].map(u => <Box key={u} p={at(u, face.at + face.sign * 0.15, DOOR_H / 2)} s={size(0.12, 0.14, DOOR_H)} color="#8c9296" metal={0.5} rough={0.45} />)}
    {[a + 0.2, b - 0.2].map(u => <mesh key={`p${u}`} position={at(u, face.at - face.sign * 0.45, 0.6)} castShadow><cylinderGeometry args={[0.1, 0.1, 1.2, 12]} /><meshStandardMaterial color="#e8b625" roughness={0.6} /></mesh>)}
  </group>;
}

export default function GarageExtension({ level, power }) {
  const e = extension(level); if (!e) return null;
  const d = levelData(level), H = d.h, W = e.x1 - e.x0, D = e.z1 - e.z0, cx = (e.x0 + e.x1) / 2, cz = (e.z0 + e.z1) / 2, epoxy = d.floor === 'epoxy';
  const faces = wallFaces(level), back = faces.find(f => f.id === 'back'), east = faces.find(f => f.id === 'right'), west = faces.find(f => f.id === 'west');
  const eastPieces = east.pieces.map(([a, b]) => [a, Math.min(b, e.z1)]).filter(([a, b]) => b > a + 0.01);
  const bays = baysAt(level).filter(b => b.z < e.z1);
  const beams = []; for (let z = e.z1 - 2; z > e.z0 + 0.5; z -= 4) beams.push(z);
  const lightRows = level >= 3 ? [-10, -5, 0, 5] : level >= 2 ? [-9, -3.5, 2.5] : [-6, 1];
  const lightZ = []; for (let z = e.z1 - 2.5; z > e.z0 + 1; z -= 4.5) lightZ.push(z);
  const fl = rep(epoxy ? T.epoxy : T.concrete, W / 4, D / 4);
  return <group>
    {/* floor: one slab with the old shop's, fresh concrete or glossy epoxy; steel threshold strip where the old back wall stood */}
    <Box p={[cx, 0.06, cz]} s={[W, 0.12, D]} color="#fff" map={fl} rough={epoxy ? 0.28 : 0.9} metal={epoxy ? 0.05 : 0} cast={false} />
    <Box p={[0, 0.125, e.z1]} s={[14, 0.01, 0.3]} color="#7d8285" metal={0.6} rough={0.4} cast={false} />
    {/* walls */}
    {back.pieces.map(([a, b]) => <WallRun key={`b${a}`} face={back} a={a} b={b} H={H} T={T} />)}
    {back.gaps.map(([a, b]) => <RollUp key={`bd${a}`} face={back} a={a} b={b} H={H} T={T} />)}
    {eastPieces.map(([a, b]) => <WallRun key={`e${a}`} face={east} a={a} b={b} H={H} T={T} />)}
    {east.gaps.map(([a, b]) => <RollUp key={`ed${a}`} face={east} a={a} b={b} H={H} T={T} />)}
    {west.pieces.map(([a, b]) => <WallRun key={`w${a}`} face={west} a={a} b={b} H={H} T={T} />)}
    {west.gaps.map(([a, b]) => <RollUp key={`wd${a}`} face={west} a={a} b={b} H={H} T={T} />)}
    {/* the pass-through from Walt's shop into the new part: the old back wall is open between the office wing and the east wall, framed by a steel header and two jamb posts */}
    <Box p={[0, 4.35, e.z1]} s={[14, 0.5, 0.35]} color="#5d6a74" metal={0.55} rough={0.45} />
    {[-6.85, 6.85].map(x => <Box key={`pj${x}`} p={[x, 2.2, e.z1]} s={[0.3, 4.4, 0.35]} color="#5d6a74" metal={0.55} rough={0.45} />)}
    {[-1, 1].map(s => <Box key={`pk${s}`} p={[s * 6.7, 0.1, e.z1]} s={[0.12, 0.2, 0.6]} color="#e8b625" cast={false} />)}
    {/* the office's back wall faces the new room: it gets the same liner and kick plate (Walt's rusty skin stays outside the office only) */}
    <Box p={[(e.x0 - 7) / 2, (1.2 + Math.min(H, 4.6)) / 2, e.z1 - 0.14]} s={[-7 - e.x0, Math.min(H, 4.6) - 1.2, 0.03]} map={rep(T.liner, 1.5, 1)} color="#fff" rough={0.8} cast={false} />
    <Box p={[(e.x0 - 7) / 2, 0.6, e.z1 - 0.15]} s={[-7 - e.x0, 1.2, 0.04]} color="#6c7378" metal={0.5} rough={0.5} cast={false} />
    {/* where the extension stands taller than Walt's shop, the old back wall is closed above the old eave */}
    {H > 4.6 && <WallRun face={{ axis: 'z', at: e.z1, sign: -1 }} a={e.x0} b={e.x1} H={H} T={T} out />}
    {/* flat roof with a low parapet; white ceiling with steel beams and purlins under it */}
    <Box p={[cx, H + 0.12, cz]} s={[W + 0.3, 0.2, D + 0.2]} color="#9aa0a3" metal={0.4} rough={0.6} />
    {[[cx, e.z0, W + 0.3, 0.12], [cx, e.z1, W + 0.3, 0.12]].map(([x, z, w, t], i) => <Box key={`pa${i}`} p={[x, H + 0.4, z]} s={[w, 0.4, t]} color="#b3b7b2" metal={0.3} rough={0.6} />)}
    {[e.x0, e.x1].map(x => <Box key={`ps${x}`} p={[x, H + 0.4, cz]} s={[0.12, 0.4, D + 0.2]} color="#b3b7b2" metal={0.3} rough={0.6} />)}
    <mesh position={[cx, H - 0.02, cz]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W, D]} /><meshStandardMaterial color="#e9ecea" roughness={0.85} side={THREE.DoubleSide} /></mesh>
    {beams.map(z => <group key={`bm${z}`}>
      <Box p={[cx, H - 0.25, z]} s={[W, 0.4, 0.16]} color="#5d6a74" metal={0.55} rough={0.45} />
      {/* columns stand in the walls only where nothing is: none on the west bench wall (pegboards hang there) and none in a door opening */}
      {!east.gaps.some(([a, b]) => z > a - 0.5 && z < b + 0.5) && <Box p={[e.x1 - 0.15, H / 2, z]} s={[0.25, H, 0.25]} color="#5d6a74" metal={0.55} rough={0.45} />}
      {!west.gaps.some(([a, b]) => z > a - 0.5 && z < b + 0.5) && z < -14 && <Box p={[e.x0 + 0.15, H / 2, z]} s={[0.25, H, 0.25]} color="#5d6a74" metal={0.55} rough={0.45} />}
    </group>)}
    {[e.x0 + W / 3, e.x0 + (2 * W) / 3].map(x => <Box key={`pu${x}`} p={[x, H - 0.1, cz]} s={[0.1, 0.12, D]} color="#7a868e" metal={0.5} rough={0.5} cast={false} />)}
    {/* LED high-bay rows: glow always, light the room only with the power on */}
    {lightRows.flatMap(x => lightZ.map(z => <Box key={`l${x}${z}`} p={[x, H - 0.55, z]} s={[0.5, 0.06, 1.3]} color={power ? '#ffffff' : '#9a9d9e'} emissive={power ? '#f6f8ff' : undefined} ei={1.8} cast={false} />))}
    {power && lightRows.filter((_, i) => i % 2 === 0).map(x => <pointLight key={`pl${x}`} position={[x + 2, H - 0.9, cz]} intensity={level >= 3 ? 40 : 28} distance={D + 10} decay={1.5} color="#f3f4ff" />)}
    {/* painted bays: side lines stop short of the walls, a number at the end a car drives in from (the back door or the aisle) */}
    {bays.flatMap(b => [-1, 1].map(side => <Decal key={`${b.id}${side}`} p={[b.x + side * (BAY.w / 2 - 0.06), 0.131, b.z]} s={[0.1, BAY.d - 0.6]} color="#e2b53a" />))}
    {bays.map(b => <Decal key={`n${b.id}`} p={[b.x, 0.132, b.z - BAY.d / 2 + 0.9]} s={[1.4, 0.7]} map={label(b.id)} color="#ffffff" rz={Math.PI} />)}
    {/* drive aisle (level 3): white edge lines and arrows toward the big door */}
    {d.aisle && <>
      {[d.aisle.z0 + 0.1, d.aisle.z1 - 0.1].map(z => <Decal key={`ae${z}`} p={[(d.aisle.x0 + d.aisle.x1) / 2, 0.131, z]} s={[d.aisle.x1 - d.aisle.x0 - 0.4, 0.12]} color="#eeeeea" />)}
      {[-6, 0].map(x => <Decal key={`ar${x}`} p={[x, 0.131, (d.aisle.z0 + d.aisle.z1) / 2]} s={[2.2, 0.35]} color="#eeeeea" />)}
    </>}
    {/* whole-car racks on the back wall (level 3): orange uprights, braced, steel decks at floor, 2.0 m and 4.0 m */}
    {d.racks.map(k => { const kx = (k.x0 + k.x1) / 2, kz = (k.z0 + k.z1) / 2, kw = k.x1 - k.x0, kd = k.z1 - k.z0; return <group key={k.id}>
      {[k.x0 + 0.1, kx, k.x1 - 0.1].flatMap(x => [k.z0 + 0.25, k.z1 - 0.1].map(z => <Box key={`${x}${z}`} p={[x, 2.75, z]} s={[0.14, 5.5, 0.14]} color="#e0661f" metal={0.4} rough={0.5} />))}
      {[2.0, 4.0].map(y => <group key={y}>
        <Box p={[kx, y, kz]} s={[kw - 0.1, 0.08, kd - 0.3]} color="#59636a" metal={0.6} rough={0.5} />
        <Box p={[kx, y + 0.08, k.z1 - 0.1]} s={[kw - 0.1, 0.16, 0.08]} color="#e0661f" metal={0.4} rough={0.5} />
      </group>)}
      <Box p={[kx, 5.5, k.z1 - 0.1]} s={[kw - 0.1, 0.14, 0.12]} color="#e0661f" metal={0.4} rough={0.5} />
    </group>; })}
    {/* outside: concrete aprons in front of each roll-up door */}
    {back.gaps.map(([a, b]) => <Box key={`ap${a}`} p={[(a + b) / 2, 0.05, e.z0 - 2.5]} s={[b - a + 1, 0.1, 5]} color="#fff" map={rep(T.concrete, 1, 1.2)} cast={false} />)}
    {west.gaps.map(([a, b]) => <Box key={`apw${a}`} p={[e.x0 - 2.5, 0.05, (a + b) / 2]} s={[5, 0.1, b - a + 1]} color="#fff" map={rep(T.concrete, 1.2, 1)} cast={false} />)}
    {east.gaps.map(([a, b]) => <Box key={`ape${a}`} p={[e.x1 + 2.5, 0.05, (a + b) / 2]} s={[5, 0.1, b - a + 1]} color="#fff" map={rep(T.concrete, 1.2, 1)} cast={false} />)}
  </group>;
}
