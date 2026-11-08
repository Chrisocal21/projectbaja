import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SITES, groundHeight } from './county.js';
import { game, useGame, emit } from '../game/store.js';
import { junkWorld, isCleared, buildById, placeWhy, trailerHas, RACECAR, SCRAP_HEAPS, heapTaken } from '../game/home.js';
import { boxItems } from '../game/items.js';
import { tickJobs, jobById } from '../game/jobs.js';
import { holoMaterials, ghostify, footprint, HOLO } from '../hologram.js';
import { wood, metalTex } from './Sites.jsx';
import Pickup from '../Pickup.jsx';

/** Grandpa's place around the garage: his trailer, windmill and tank, his old race car, the junk you clear, customers' cars, and everything you build. */
const G = SITES.garage;
const M = ({ c = '#fff', r = 0.85, m = 0, e, ei = 0, map, t, o = 1, side }) => <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e} emissiveIntensity={ei} map={map} transparent={t} opacity={o} side={side} />;
const B = ({ p, s, c, r, m, rot, map, cast = true }) => <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><M c={c} r={r} m={m} map={map} /></mesh>;
const Cyl = ({ p, a, c, r, m, rot, map }) => <mesh position={p} rotation={rot} castShadow receiveShadow><cylinderGeometry args={a} /><M c={c} r={r} m={m} map={map} /></mesh>;
const Tire = ({ p, rot = [Math.PI / 2, 0, 0], r = 0.32, w = 0.14 }) => <mesh position={p} rotation={rot} castShadow><torusGeometry args={[r, w, 10, 20]} /><M c="#151515" r={0.95} /></mesh>;
/** a straight tube between two points */
function Tube({ a, b, r = 0.025, c = '#2b2e31', m = 0.5 }) {
  const { pos, q, len } = useMemo(() => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A); return { pos: A.clone().add(Bv).multiplyScalar(0.5).toArray(), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }; }, [a.join(), b.join()]);
  return <mesh position={pos} quaternion={q} castShadow><cylinderGeometry args={[r, r, len, 8]} /><M c={c} m={m} r={0.5} /></mesh>;
}
const useTex = () => useMemo(() => ({
  oldWood: wood('#8a7458', '#3a2a18', true, 51), newWood: wood('#b38a5a', '#5b3a22', true, 53), deck: wood('#9c7a52', '#4a3018', false, 55),
  steel: metalTex('#7d8584', 61), red: metalTex('#a8322a', 63), cream: metalTex('#d8d0b8', 65), teal: metalTex('#5f8f86', 67),
}), []);

// ---------------- grandpa's trailer (fix it up: roof, porch, paint, A/C, string lights) ----------------
function Trailer({ T }) {
  useGame();
  const painted = trailerHas('paint'), roof = trailerHas('roof');
  return <group position={[-22.5, 0, 1]}>
    <mesh position={[0, 1.75, 0]} castShadow receiveShadow><boxGeometry args={[3.4, 2.5, 11]} /><M c={painted ? '#f1e9d2' : '#cfc6ad'} map={T.cream} r={painted ? 0.5 : 0.8} m={0.2} /></mesh>
    <mesh position={[0, 1.45, 0]}><boxGeometry args={[3.42, 0.5, 11.02]} /><M c={painted ? '#3fa395' : '#5f8f86'} map={T.teal} r={0.6} m={0.2} /></mesh>
    <mesh position={[0, 3.05, 0]} castShadow><boxGeometry args={[3.6, 0.15, 11.3]} /><M c={roof ? '#b8bcbf' : '#7d7a70'} map={T.steel} m={0.4} r={0.6} /></mesh>
    {!roof && [[0.6, -2], [-0.8, 2.6]].map(([x, z], i) => <B key={i} p={[x, 3.14, z]} s={[1.4, 0.04, 1.8]} c="#4a5a6a" rot={[0, 0.3, 0.05]} />)}
    {[-3.5, 0, 3.5].map(z => <B key={z} p={[1.72, 2.1, z]} s={[0.04, 0.8, 1.2]} c="#1b2629" r={0.2} cast={false} />)}
    <B p={[1.72, 1.6, -1.8]} s={[0.05, 1.9, 0.9]} c="#7a5c38" map={T.oldWood} />
    {trailerHas('porch') ? <group position={[2.9, 0, -1.8]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.12, 3.4]} /><M map={T.deck} /></mesh>
      {[[-1.1, -1.6], [1.1, -1.6], [-1.1, 1.6], [1.1, 1.6]].map(([x, z], i) => <B key={i} p={[x, 0.27, z]} s={[0.12, 0.55, 0.12]} c="#6e5034" />)}
      {[0.2, 0.45].map((y, i) => <B key={i} p={[1.6 + i * 0.3, y - 0.05, 0]} s={[0.3, 0.08, 1.2]} map={T.deck} />)}
      <B p={[0, 1.05, 1.68]} s={[2.4, 0.06, 0.06]} c="#6e5034" /><B p={[0, 1.05, -1.68]} s={[2.4, 0.06, 0.06]} c="#6e5034" />
    </group> : [[2.3, 0.2, -1.8], [2.3, 0.45, -1.8]].map((p, i) => <B key={i} p={p} s={[1, 0.25, 1.2 - i * 0.3]} c="#8f8a80" r={1} />)}
    {[-4.5, -1.5, 1.5, 4.5].map(z => [-1.2, 1.2].map(x => <B key={x + '' + z} p={[x, 0.25, z]} s={[0.4, 0.5, 0.4]} c="#8f8a80" r={1} />))}
    {trailerHas('ac') && <group position={[1.85, 2.1, 3.5]}><B p={[0, 0, 0]} s={[0.4, 0.45, 0.65]} c="#d8d6ce" m={0.3} /><B p={[0.21, 0, 0]} s={[0.02, 0.35, 0.55]} c="#555" /></group>}
    {trailerHas('lights') && Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[2.2 + Math.sin(i * 0.5) * 0.05, 2.5 - Math.sin((i / 11) * Math.PI) * 0.25, -3.6 + i * 0.33]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#ffe6a0" emissive="#ffcf60" emissiveIntensity={2} /></mesh>)}
    {trailerHas('lights') && <pointLight position={[2.6, 2.2, -1.8]} intensity={6} distance={9} color="#ffd690" />}
    <B p={[3.4, 2.2, -1.8]} s={[2.4, 0.06, 2.4]} c="#a33a2e" rot={[0, 0, -0.15]} />
  </group>;
}
function Windmill() {
  const blades = useRef();
  useFrame((_, dt) => { if (blades.current) blades.current.rotation.z += dt * 1.6; });
  return <group position={[18, 0, 14]}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} p={[x * 0.6, 4.5, z * 0.6]} a={[0.05, 0.05, 9.1, 5]} c="#7c8083" m={0.6} rot={[z * -0.06, 0, x * 0.06]} />)}
    <group position={[0, 9.1, 0.3]}><group ref={blades}>{Array.from({ length: 12 }, (_, i) => <B key={i} p={[Math.cos(i * 0.52) * 0.9, Math.sin(i * 0.52) * 0.9, 0]} s={[1.5, 0.22, 0.02]} c="#9aa0a3" m={0.5} rot={[0, 0.3, i * 0.52]} />)}</group></group>
    <B p={[0, 9.1, -0.7]} s={[0.05, 0.6, 1.6]} c="#8a8d90" m={0.5} />
  </group>;
}
function Tank({ T }) {
  return <group position={[16, 0, -6]}>
    <Cyl p={[0, 2.6, 0]} a={[1.5, 1.5, 2.6, 18]} c="#9aa6a2" m={0.5} r={0.6} map={T.steel} />
    <mesh position={[0, 4.1, 0]} castShadow><coneGeometry args={[1.6, 0.6, 18]} /><M c="#6b7774" m={0.5} r={0.6} /></mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} p={[x, 0.65, z]} a={[0.08, 0.08, 1.3, 6]} c="#5e4a36" />)}
  </group>;
}

// ---------------- grandpa's #7 desert racer: under a tarp until you pull it off ----------------
function RaceCar({ T }) {
  useGame();
  const open = !!game.home.raceCar, left = boxItems('racecar'), wheels = left.some(i => i.kind === 'wheel'), shocks = left.some(i => i.kind === 'part');
  const W = [[0.86, 1.38], [-0.86, 1.38], [0.86, -1.32], [-0.86, -1.32]];
  if (!open) return <group position={[RACECAR.lx, 0, RACECAR.lz]} rotation={[0, RACECAR.ry, 0]}>
    <mesh position={[0, 0.85, 0]} scale={[1.08, 0.62, 2.25]} castShadow receiveShadow><sphereGeometry args={[1, 20, 14]} /><M c="#4f6b86" r={0.95} /></mesh>
    <mesh position={[0, 1.25, -0.1]} scale={[0.75, 0.45, 0.85]} castShadow><sphereGeometry args={[1, 16, 12]} /><M c="#55728d" r={0.95} /></mesh>
    {W.map(([x, z], i) => <mesh key={i} position={[x, 0.42, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.44, 0.44, 0.34, 18]} /><M c="#1a1a1a" r={0.95} /></mesh>)}
    {[[-0.9, 0.05, 1.9], [1.1, 0.05, -1.5], [0.2, 0.05, 2.3]].map((p, i) => <B key={i} p={p} s={[0.3, 0.1, 0.22]} c="#8a8a84" r={1} />)}
  </group>;
  const frame = '#c8c4b8', panel = '#e8e2d0';
  return <group position={[RACECAR.lx, 0, RACECAR.lz]} rotation={[0, RACECAR.ry, 0]}>
    <mesh position={[1.9, 0.18, 0.3]} scale={[0.7, 0.2, 1.1]} castShadow><sphereGeometry args={[1, 12, 8]} /><M c="#4f6b86" r={0.95} /></mesh>
    <group position={[0, wheels ? 0 : -0.06, 0]}>
      {[-1, 1].map(s => <React.Fragment key={s}>
        <Tube a={[s * 0.5, 0.42, 1.9]} b={[s * 0.5, 0.42, -1.9]} r={0.03} c={frame} />
        <Tube a={[s * 0.48, 0.42, 0.55]} b={[s * 0.42, 1.48, 0.15]} c={frame} /><Tube a={[s * 0.48, 0.42, -0.65]} b={[s * 0.42, 1.48, -0.45]} c={frame} />
        <Tube a={[s * 0.42, 1.48, 0.15]} b={[s * 0.42, 1.48, -0.45]} c={frame} />
        <Tube a={[s * 0.5, 0.42, 1.9]} b={[s * 0.46, 0.85, 1.25]} c={frame} /><Tube a={[s * 0.46, 0.85, 1.25]} b={[s * 0.45, 1.3, 0.3]} c={frame} />
        <Tube a={[s * 0.5, 0.42, -1.9]} b={[s * 0.46, 0.95, -1.55]} c={frame} /><Tube a={[s * 0.46, 0.95, -1.55]} b={[s * 0.44, 1.35, -0.5]} c={frame} />
      </React.Fragment>)}
      {[1.9, 0.55, -0.65, -1.9].map(z => <Tube key={z} a={[-0.5, 0.42, z]} b={[0.5, 0.42, z]} c={frame} />)}
      <Tube a={[-0.42, 1.48, 0.15]} b={[0.42, 1.48, 0.15]} c={frame} /><Tube a={[-0.42, 1.48, -0.45]} b={[0.42, 1.48, -0.45]} c={frame} /><Tube a={[-0.42, 1.48, 0.15]} b={[0.42, 1.48, -0.45]} c={frame} />
      <mesh position={[0, 0.78, 1.55]} rotation={[0.42, 0, 0]} castShadow><boxGeometry args={[1.0, 0.04, 0.95]} /><M c={panel} map={T.cream} r={0.8} /></mesh>
      <mesh position={[0, 0.9, -1.45]} rotation={[-0.25, 0, 0]} castShadow><boxGeometry args={[1.25, 0.04, 0.9]} /><M c={panel} map={T.cream} r={0.8} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.53, 0.75, 0]} castShadow><boxGeometry args={[0.04, 0.5, 1.2]} /><M c="#b8362a" map={T.red} r={0.85} /></mesh>)}
      {[-1, 1].map(s => <group key={'n' + s} position={[s * 0.56, 0.78, 0]} rotation={[0, s * Math.PI / 2, 0]}><mesh><circleGeometry args={[0.22, 20]} /><meshStandardMaterial color="#efe6cf" /></mesh><mesh position={[0.02, 0.06, 0.003]} rotation={[0, 0, -0.35]}><planeGeometry args={[0.07, 0.26]} /><meshStandardMaterial color="#1a1a1a" /></mesh><mesh position={[-0.02, 0.17, 0.003]}><planeGeometry args={[0.16, 0.06]} /><meshStandardMaterial color="#1a1a1a" /></mesh></group>)}
      <B p={[0, 0.62, -0.15]} s={[0.45, 0.5, 0.45]} c="#2b2b2b" />
      <B p={[0, 0.85, -1.15]} s={[0.7, 0.45, 0.55]} c="#5a4a3a" m={0.4} r={0.9} />
      {shocks && W.map(([x, z], i) => <group key={'s' + i}><Tube a={[x * 0.8, 0.5, z]} b={[x * 0.62, 1.15, z * 0.82]} r={0.045} c="#c8372b" m={0.4} /><Tube a={[x * 0.8, 0.62, z * 0.97]} b={[x * 0.68, 0.98, z * 0.88]} r={0.065} c="#e8b43a" m={0.6} /></group>)}
    </group>
    {W.map(([x, z], i) => wheels ? <group key={i} position={[x, 0.44, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[0.44, 0.44, 0.32, 20]} /><M c="#1a1a1a" r={0.95} /></mesh>
      <mesh position={[0, x > 0 ? 0.165 : -0.165, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02, 18]} /><M c="#c8c4b8" m={0.7} r={0.35} /></mesh>
      <mesh position={[0, x > 0 ? 0.172 : -0.172, 0]}><torusGeometry args={[0.27, 0.02, 6, 20]} /><M c="#9a9a94" m={0.8} r={0.3} /></mesh>
    </group> : <B key={i} p={[x * 0.85, 0.18, z]} s={[0.4, 0.36, 0.2]} c="#8a8a84" r={1} />)}
  </group>;
}

/** a heap of usable scrap metal (gone once taken) */
function ScrapHeap({ seed = 1 }) {
  return <>{Array.from({ length: 7 }, (_, i) => { const a = i * 1.7 + seed, d = (i % 3) * 0.3; return i % 3 === 0
    ? <Tube key={i} a={[Math.cos(a) * d - 0.6, 0.06 + (i % 2) * 0.12, Math.sin(a) * d]} b={[Math.cos(a) * d + 0.6, 0.12, Math.sin(a) * d + 0.3]} r={0.03} c="#6b4a32" />
    : <B key={i} p={[Math.cos(a) * d, 0.05 + (i % 2) * 0.08, Math.sin(a) * d]} s={[0.6 - (i % 2) * 0.2, 0.03, 0.4]} c={['#7a7d80', '#6b4a32', '#8e5a3a'][i % 3]} m={0.5} rot={[0.15 * (i % 2), a, 0.1]} />; })}</>;
}

/** one pile of junk (rendered until you clear it) */
function Junk({ kind }) {
  if (kind === 'tires') return <>{[[0, 0], [0.7, 0.2], [-0.5, 0.6], [0.2, 0.8]].map(([x, z], i) => [0, 1, 2].slice(0, 3 - (i % 2)).map(k => <Tire key={i + '' + k} p={[x, 0.15 + k * 0.28, z]} />))}</>;
  if (kind === 'scrap') return <><B p={[0, 0.3, 0]} s={[2.4, 0.6, 1.4]} c="#6b4a32" m={0.4} r={0.9} rot={[0, 0.3, 0.08]} /><B p={[0.6, 0.75, 0.2]} s={[1.6, 0.08, 1]} c="#7a7d80" m={0.6} rot={[0.4, 0.5, 0.2]} /><Cyl p={[-0.8, 0.8, -0.2]} a={[0.06, 0.06, 2, 6]} c="#4a3a2e" m={0.4} rot={[0, 0, 1.2]} /><B p={[0.2, 0.9, -0.4]} s={[0.9, 0.5, 0.06]} c="#8e5a3a" m={0.4} rot={[0.2, -0.6, 0.5]} /></>;
  if (kind === 'fridge') return <><B p={[0, 0.85, 0]} s={[0.8, 1.7, 0.75]} c="#d9d2bc" m={0.2} r={0.6} rot={[0, 0.4, 0.05]} /><B p={[0.55, 0.75, 0.25]} s={[0.05, 1.4, 0.7]} c="#cfc8b1" rot={[0, 1.2, 0]} /></>;
  if (kind === 'brush') return <>{[[0, 0, 0.8], [1, 0.4, 0.6], [-0.7, 0.6, 0.7], [0.3, -0.8, 0.5]].map(([x, z, s], i) => <mesh key={i} position={[x, s * 0.7, z]} castShadow><icosahedronGeometry args={[s, 1]} /><M c="#9a8456" r={1} t o={0.92} /></mesh>)}</>;
  if (kind === 'cans') return <>{Array.from({ length: 9 }, (_, i) => <Cyl key={i} p={[(i % 3) * 0.32 - 0.3, 0.17 + (i > 6 ? 0.34 : 0), Math.floor(i / 3) * 0.32 - 0.3]} a={[0.13, 0.13, 0.34, 10]} c={['#7a2f26', '#2f4a63', '#cfc8b8', '#3f6b3a'][i % 4]} m={0.5} r={0.5} />)}<mesh position={[0.4, 0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshBasicMaterial color="#120d08" transparent opacity={0.5} depthWrite={false} /></mesh></>;
  if (kind === 'papers') return <>{Array.from({ length: 6 }, (_, i) => <B key={i} p={[(i % 2) * 0.5 - 0.25, 0.2 + Math.floor(i / 2) * 0.32, (i % 3) * 0.1]} s={[0.45, 0.3, 0.6]} c={['#cfc4a4', '#bdb08c', '#d8ceb0'][i % 3]} r={1} rot={[0, i * 0.3, 0]} />)}</>;
  return <>{[[0, 0, 0], [0.62, 0, 0.1], [0.3, 0.5, 0.05], [-0.4, 0, 0.6], [-0.2, 0.45, 0.5]].map(([x, y, z], i) => <B key={i} p={[x, 0.25 + y, z]} s={[0.6, 0.5, 0.55]} c={['#a07c4a', '#8f6c3e', '#b08a58'][i % 3]} r={1} rot={[0, i * 0.4, (i % 2) * 0.1]} />)}</>;
}

/** things the player has built on the property (build mode). The same models become the placement hologram. */
const P = ({ p, s, c = '#fff', rot, map, m = 0, r = 0.8 }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><M c={c} map={map} m={m} r={r} /></mesh>;
const C = ({ p, a, c = '#fff', rot, m = 0, r = 0.8, map }) => <mesh position={p} rotation={rot} castShadow receiveShadow><cylinderGeometry args={a} /><M c={c} m={m} r={r} map={map} /></mesh>;
export function PropModel({ id, T }) {
  switch (id) {
    case 'fenceWood': return <>{[-1.5, 0, 1.5].map(x => <P key={x} p={[x, 0.62, 0]} s={[0.12, 1.24, 0.12]} map={T.oldWood} c="#9a8468" />)}{[0.38, 0.9].map(y => <P key={y} p={[0, y, 0.07]} s={[3.1, 0.14, 0.04]} map={T.newWood} />)}{[-1.5, 0, 1.5].map(x => <P key={'c' + x} p={[x, 1.26, 0]} s={[0.16, 0.04, 0.16]} c="#6e5034" />)}</>;
    case 'fenceChain': return <>{[-1.5, 1.5].map(x => <C key={x} p={[x, 0.95, 0]} a={[0.035, 0.035, 1.9, 8]} c="#9aa0a3" m={0.7} r={0.4} />)}<C p={[0, 1.88, 0]} a={[0.025, 0.025, 3, 6]} c="#9aa0a3" m={0.7} r={0.4} rot={[0, 0, Math.PI / 2]} />{Array.from({ length: 14 }, (_, i) => <P key={i} p={[-1.4 + i * 0.215, 0.95, 0]} s={[0.008, 1.8, 0.008]} c="#a7abad" m={0.7} rot={[0, 0, (i % 2 ? 1 : -1) * 0.12]} />)}</>;
    case 'gate': return <>{[-2, 2].map(x => <P key={x} p={[x, 0.75, 0]} s={[0.2, 1.5, 0.2]} map={T.oldWood} c="#8a7458" />)}{[0.4, 0.78, 1.16].map(y => <P key={y} p={[0, y, 0]} s={[3.8, 0.07, 0.05]} c="#8d9396" m={0.6} r={0.4} />)}<P p={[0, 0.78, 0]} s={[4.2, 0.05, 0.05]} c="#8d9396" m={0.6} rot={[0, 0, 0.19]} /></>;
    case 'floodlight': return <><C p={[0, 3, 0]} a={[0.07, 0.11, 6, 10]} c="#7c8083" m={0.6} r={0.4} /><P p={[0, 6.05, 0.15]} s={[0.9, 0.08, 0.1]} c="#555" m={0.5} />{[-0.3, 0.3].map(x => <group key={x} position={[x, 6.05, 0.3]} rotation={[0.5, 0, 0]}><P p={[0, 0, 0]} s={[0.38, 0.3, 0.16]} c="#3a3d40" m={0.5} /><mesh position={[0, 0, 0.085]}><planeGeometry args={[0.32, 0.24]} /><meshStandardMaterial color="#fff6dc" emissive="#fff2d0" emissiveIntensity={2.5} /></mesh></group>)}<pointLight position={[0, 5.6, 1.2]} intensity={70} distance={28} decay={1.5} color="#fff2d6" /></>;
    case 'yardRack': return <>{[-1, 1].flatMap(x => [-0.4, 0.4].map(z => <P key={x + '' + z} p={[x, 1.1, z]} s={[0.07, 2.2, 0.07]} c="#2f5f9e" m={0.5} r={0.5} />))}{[0.3, 1.1, 1.9].map(y => <P key={y} p={[0, y, 0]} s={[2.1, 0.05, 0.9]} c="#d9962f" m={0.4} r={0.5} />)}{[[-0.6, 0.48, 0.5], [0.4, 0.5, 0.6], [-0.3, 1.3, 0.55], [0.6, 1.26, 0.4]].map(([x, y, w], i) => <P key={'b' + i} p={[x, y, 0]} s={[w, 0.32, 0.5]} c={['#b58b55', '#a9854f', '#c29a62'][i % 3]} r={1} />)}</>;
    case 'toolChest': return <><P p={[0, 0.55, 0]} s={[1.2, 0.95, 0.55]} c="#b3261e" map={T.red} m={0.4} r={0.45} />{[0.2, 0.38, 0.56, 0.74, 0.9].map(y => <React.Fragment key={y}><P p={[0, y, 0.28]} s={[1.12, 0.012, 0.012]} c="#4a1410" /><P p={[0, y + 0.06, 0.29]} s={[0.5, 0.025, 0.025]} c="#d8d8d8" m={0.8} r={0.3} /></React.Fragment>)}<P p={[0, 1.1, 0]} s={[1.0, 0.22, 0.5]} c="#c22d24" map={T.red} m={0.4} r={0.45} />{[-0.5, 0.5].flatMap(x => [-0.22, 0.22].map(z => <C key={x + '' + z} p={[x, 0.05, z]} a={[0.05, 0.05, 0.04, 10]} c="#222" rot={[Math.PI / 2, 0, 0]} />))}</>;
    case 'lift': return <>{[-1.55, 1.55].map(x => <React.Fragment key={x}><P p={[x, 1.9, 0]} s={[0.32, 3.8, 0.42]} c="#c8372b" map={T.red} m={0.3} r={0.5} /><P p={[x, 0.03, 0]} s={[0.7, 0.06, 0.7]} c="#555" m={0.5} /><P p={[x * 0.62, 0.45, 0.32]} s={[1.2, 0.08, 0.14]} c="#444" m={0.6} rot={[0, x > 0 ? 0.45 : -0.45, 0]} /><P p={[x * 0.62, 0.45, -0.32]} s={[1.2, 0.08, 0.14]} c="#444" m={0.6} rot={[0, x > 0 ? -0.45 : 0.45, 0]} /></React.Fragment>)}<P p={[0, 3.85, 0]} s={[3.5, 0.18, 0.28]} c="#c8372b" map={T.red} m={0.3} /><P p={[1.55, 1.5, 0.25]} s={[0.25, 0.35, 0.12]} c="#2b2b2b" /></>;
    case 'engineStand': return <><P p={[0, 0.06, 0]} s={[1, 0.08, 0.1]} c="#c8372b" /><P p={[0, 0.06, 0]} s={[0.1, 0.08, 0.8]} c="#c8372b" /><C p={[0, 0.5, 0]} a={[0.05, 0.05, 0.9, 8]} c="#c8372b" /><P p={[0.25, 0.92, 0]} s={[0.4, 0.1, 0.1]} c="#c8372b" /><C p={[0.46, 0.92, 0]} a={[0.16, 0.16, 0.03, 16]} c="#666" m={0.6} rot={[0, 0, Math.PI / 2]} /></>;
    case 'welder': return <><P p={[0, 0.5, 0]} s={[0.5, 0.45, 0.75]} c="#1f5fae" m={0.3} r={0.5} /><P p={[0, 0.74, 0.39]} s={[0.4, 0.28, 0.02]} c="#222" /><C p={[0.1, 0.8, 0.41]} a={[0.04, 0.04, 0.02, 12]} c="#ddd" m={0.6} rot={[Math.PI / 2, 0, 0]} /><C p={[0, 1.05, -0.2]} a={[0.11, 0.11, 0.6, 14]} c="#3f6b3a" m={0.4} r={0.4} /><P p={[0, 0.22, 0]} s={[0.55, 0.06, 0.85]} c="#333" m={0.5} />{[-0.22, 0.22].map(x => <C key={x} p={[x, 0.12, -0.3]} a={[0.12, 0.12, 0.05, 14]} c="#222" rot={[0, 0, Math.PI / 2]} />)}<mesh position={[0.3, 0.55, 0.2]} rotation={[0.4, 0, 0.9]}><torusGeometry args={[0.18, 0.015, 6, 16]} /><M c="#222" /></mesh></>;
    case 'bender': return <><P p={[0, 0.45, 0]} s={[0.25, 0.9, 0.25]} c="#3a3d40" m={0.5} /><P p={[0, 0.03, 0]} s={[0.8, 0.06, 0.8]} c="#555" m={0.5} /><C p={[0, 0.95, 0]} a={[0.2, 0.2, 0.08, 20]} c="#d9962f" m={0.5} r={0.4} /><C p={[0.5, 0.98, 0]} a={[0.03, 0.03, 1.1, 8]} c="#3a3d40" m={0.6} rot={[0, 0, Math.PI / 2]} /><C p={[-0.3, 1.0, 0.15]} a={[0.02, 0.02, 0.9, 8]} c="#cfcfcf" m={0.7} rot={[Math.PI / 2, 0, 0.2]} /></>;
    case 'computer': return <><P p={[0, 0.74, 0]} s={[1.6, 0.05, 0.8]} map={T.newWood} />{[-0.7, 0.7].map(x => <P key={x} p={[x, 0.37, 0]} s={[0.06, 0.74, 0.7]} c="#5b4630" />)}<P p={[0.1, 1.0, -0.1]} s={[0.5, 0.42, 0.42]} c="#d8d2bc" /><mesh position={[0.1, 1.0, 0.115]}><planeGeometry args={[0.38, 0.29]} /><meshStandardMaterial color="#123" emissive="#3ad07a" emissiveIntensity={0.5} /></mesh><P p={[-0.35, 0.79, 0.12]} s={[0.45, 0.035, 0.16]} c="#d8d2bc" /><C p={[0.6, 0.83, 0.15]} a={[0.04, 0.04, 0.12, 10]} c="#f2f2e8" /><P p={[0, 0.45, 0.6]} s={[0.5, 0.06, 0.45]} c="#2b2b2b" /><C p={[0, 0.22, 0.6]} a={[0.03, 0.03, 0.44, 6]} c="#555" m={0.5} /></>;
    case 'couch': return <><P p={[0, 0.22, 0]} s={[2, 0.3, 0.85]} c="#6b5a3a" /><P p={[0, 0.65, -0.35]} s={[2, 0.6, 0.18]} c="#6b5a3a" />{[-0.48, 0.48].map(x => <P key={x} p={[x, 0.44, 0.04]} s={[0.92, 0.14, 0.72]} c="#7a6844" />)}{[-0.95, 0.95].map(x => <P key={x} p={[x, 0.5, 0]} s={[0.16, 0.5, 0.85]} c="#5a4a30" />)}<P p={[0.6, 0.46, 0.1]} s={[0.3, 0.02, 0.25]} c="#c8a46a" rot={[0, 0.4, 0]} /></>;
    case 'neon': return <><P p={[0, 1.6, 0]} s={[1.4, 0.55, 0.06]} c="#1a1010" /><mesh position={[0, 1.6, 0.04]}><planeGeometry args={[1.2, 0.4]} /><meshStandardMaterial color="#ff4a6a" emissive="#ff2a5a" emissiveIntensity={2.4} /></mesh><C p={[0, 0.65, 0]} a={[0.04, 0.04, 1.3, 6]} c="#555" /></>;
    case 'flamingo': return <><C p={[0, 0.35, 0]} a={[0.012, 0.012, 0.7, 4]} c="#222" /><mesh position={[0, 0.8, 0]} scale={[0.6, 0.45, 1]} castShadow><sphereGeometry args={[0.25, 12, 10]} /><M c="#ff6fa8" r={0.4} /></mesh><C p={[0, 1.05, 0.12]} a={[0.025, 0.03, 0.42, 6]} c="#ff6fa8" rot={[0.4, 0, 0]} /><mesh position={[0, 1.27, 0.2]} castShadow><sphereGeometry args={[0.07, 10, 8]} /><M c="#ff6fa8" /></mesh><mesh position={[0, 1.24, 0.29]} rotation={[1.9, 0, 0]}><coneGeometry args={[0.025, 0.1, 6]} /><M c="#222" /></mesh></>;
    case 'gnome': return <><C p={[0, 0.5, 0]} a={[0.3, 0.45, 1, 12]} c="#3a5fb0" /><mesh position={[0, 1.15, 0]} castShadow><sphereGeometry args={[0.3, 12, 10]} /><M c="#f1c9a0" /></mesh><mesh position={[0, 0.95, 0.2]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[0.24, 0.5, 10]} /><M c="#eeeeee" /></mesh><mesh position={[0, 1.65, 0]} castShadow><coneGeometry args={[0.32, 0.8, 12]} /><M c="#c8372b" /></mesh><mesh position={[0, 1.15, 0.29]} castShadow><sphereGeometry args={[0.07, 8, 6]} /><M c="#e09a80" /></mesh></>;
    case 'dinosaur': return <><P p={[0, 3, 0]} s={[2.2, 2.4, 6]} c="#5c8a4a" /><P p={[0, 5.6, 3.4]} s={[1.2, 1.2, 2.4]} c="#5c8a4a" rot={[-0.5, 0, 0]} /><P p={[0, 6.6, 4.8]} s={[1.3, 1.1, 1.8]} c="#5c8a4a" />{[-0.35, 0.35].map(x => <P key={x} p={[x, 6.9, 5.5]} s={[0.15, 0.15, 0.1]} c="#111" />)}<P p={[0, 6.2, 5.6]} s={[1.0, 0.1, 0.4]} c="#d8d2bc" /><P p={[0, 2.5, -4.6]} s={[0.9, 0.9, 4]} c="#5c8a4a" rot={[0.25, 0, 0]} />{[[-0.8, 1.6], [0.8, 1.6], [-0.8, -1.6], [0.8, -1.6]].map(([x, z], i) => <P key={i} p={[x, 0.9, z]} s={[0.7, 1.8, 0.8]} c="#4f7a3e" />)}{Array.from({ length: 6 }, (_, i) => <mesh key={'sp' + i} position={[0, 4.4 + Math.sin(i * 0.5) * 0.5, 2 - i * 1]}><coneGeometry args={[0.3, 0.7, 4]} /><M c="#c8a43a" /></mesh>)}</>;
    case 'tireStack': return <>{[0, 1, 2, 3].map(k => <mesh key={k} position={[0, 0.15 + k * 0.28, 0]} rotation={[Math.PI / 2, 0, k * 0.4]} castShadow><torusGeometry args={[0.32, 0.14, 10, 20]} /><M c="#151515" r={0.95} /></mesh>)}</>;
    case 'drum': return <><C p={[0, 0.45, 0]} a={[0.3, 0.3, 0.9, 16]} c="#2f5d86" m={0.4} r={0.6} />{[0.2, 0.7].map(y => <C key={y} p={[0, y, 0]} a={[0.31, 0.31, 0.03, 16]} c="#24486a" m={0.4} />)}</>;
    case 'picnic': return <><P p={[0, 0.74, 0]} s={[1.8, 0.06, 0.8]} map={T.deck} />{[-0.6, 0.6].map(z => <P key={z} p={[0, 0.45, z]} s={[1.8, 0.05, 0.28]} map={T.deck} />)}{[-0.7, 0.7].map(x => <React.Fragment key={x}><P p={[x, 0.37, 0.25]} s={[0.07, 0.8, 0.07]} c="#6e5034" rot={[0.5, 0, 0]} /><P p={[x, 0.37, -0.25]} s={[0.07, 0.8, 0.07]} c="#6e5034" rot={[-0.5, 0, 0]} /></React.Fragment>)}</>;
    case 'grill': return <><mesh position={[0, 0.85, 0]} castShadow><sphereGeometry args={[0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><M c="#222" m={0.4} r={0.5} side={THREE.DoubleSide} /></mesh><mesh position={[0, 0.85, 0]} rotation={[Math.PI, 0, 0]} castShadow><sphereGeometry args={[0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><M c="#222" m={0.4} r={0.5} side={THREE.DoubleSide} /></mesh>{[0, 2.1, 4.2].map(a => <C key={a} p={[Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18]} a={[0.015, 0.015, 0.75, 4]} c="#444" rot={[Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]} />)}</>;
    case 'carSpot': return <><mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3, 5.5]} /><M c="#8f877a" r={1} /></mesh>{[-1.5, 1.5].map(x => <mesh key={x} position={[x, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 5.5]} /><M c="#e8e6dc" /></mesh>)}<P p={[0, 0.08, -2.4]} s={[1.6, 0.14, 0.2]} c="#c9c4b4" /></>;
    default: return <P p={[0, 0.5, 0]} s={[1, 1, 1]} c="#888" />;
  }
}

/** the hologram of what you are about to build (§7 of the assembly guide): glowing body, edges through walls, footprint; ~4 m ahead, snapped to 0.5 m */
function Ghost({ T }) {
  useGame();
  const ref = useRef(), inner = useRef(), foot = useRef(), { camera } = useThree(), mats = useMemo(() => holoMaterials(), []);
  const item = game.buildMode ? buildById[game.buildMode.item] : null;
  useEffect(() => () => mats.dispose(), [mats]);
  useEffect(() => {   // footprint follows the item's size
    if (!item || !inner.current || !foot.current) return;
    inner.current.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(inner.current.matrixWorld).invert(), b = new THREE.Box3();
    inner.current.traverse(o => { if (o.isMesh && !o.isLineSegments) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))); } });
    const s = b.isEmpty() ? new THREE.Vector3(1, 1, 1) : b.getSize(new THREE.Vector3());
    foot.current.clear(); foot.current.add(footprint(Math.max(0.6, s.x + 0.2), Math.max(0.6, s.z + 0.2), mats));
  }, [item?.id]);
  useFrame(({ clock }) => {
    if (!item || !ref.current || !game.buildMode || !inner.current) return;
    ghostify(inner.current, mats); mats.pulse(clock.elapsedTime, true);
    const d = 4 + (item.len || 0) * 0.5, x = Math.round((camera.position.x + game.face.x * d) * 2) / 2, z = Math.round((camera.position.z + game.face.z * d) * 2) / 2;
    const ry = game.buildMode.ry || 0, why = placeWhy(item, x, z);
    mats.set(why ? HOLO.bad : HOLO.ok);
    ref.current.position.set(x, groundHeight(x, z), z); ref.current.rotation.set(0, ry, 0);
    if (game.buildMode.x !== x || game.buildMode.z !== z || game.buildMode.why !== why) { game.buildMode = { ...game.buildMode, x, z, why }; emit(); }
  });
  if (!item) return null;
  return <group ref={ref}><group ref={inner} key={item.id}><PropModel id={item.id} T={T} /></group><group ref={foot} /></group>;
}

/** the customer car on the driveway (odd jobs) + the clock that sends the next one */
function Customer() {
  useGame();
  useFrame((_, dt) => tickJobs(Math.min(dt, 0.1)));
  const j = game.job && jobById[game.job.id]; if (!j) return null;
  return <group position={[game.job.x, groundHeight(game.job.x, game.job.z), game.job.z]} rotation={[0, game.job.h, 0]}><Pickup body={j.car[0]} roof={j.car[1]} primer={j.car[0]} /></group>;
}

export default function Home() {
  useGame();
  const T = useTex();
  return <>
    <group position={[G.x, G.y, G.z]} rotation={[0, G.rot, 0]}><Trailer T={T} /><Windmill /><Tank T={T} /><RaceCar T={T} /></group>
    {junkWorld.filter(j => !isCleared(j.id)).map(j => <group key={j.id} position={[j.x, groundHeight(j.x, j.z), j.z]} rotation={[0, j.lx * 0.7, 0]}><Junk kind={j.kind} /></group>)}
    {SCRAP_HEAPS.filter(h => !heapTaken(h.id)).map((h, i) => <group key={h.id} position={[h.x, groundHeight(h.x, h.z), h.z]} rotation={[0, i * 1.3, 0]}><ScrapHeap seed={i} /></group>)}
    {game.props.map(p => <group key={p.uid} position={[p.x, groundHeight(p.x, p.z), p.z]} rotation={[0, p.ry || 0, 0]}><PropModel id={p.id} T={T} /></group>)}
    <Customer />
    <Ghost T={T} />
  </>;
}
