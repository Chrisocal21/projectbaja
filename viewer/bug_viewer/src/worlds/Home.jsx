import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SITES, groundHeight, height } from './county.js';
import { StructureModel } from './StructureModels.jsx';
import IconBaker from './IconBaker.jsx';
import { isPiece } from './structures.js';
import { game, useGame, emit } from '../game/store.js';
import { junkWorld, isCleared, buildById, placeWhy, snapWorld, snapCutWorld, trailerHas, RACECAR, SCRAP_HEAPS, heapTaken } from '../game/home.js';
import { boxItems } from '../game/items.js';
import { tickJobs, jobById } from '../game/jobs.js';
import { holoMaterials, ghostify, footprint, HOLO } from '../hologram.js';
import { wood, metalTex, Tire as ShelfTire, ShelfStuff } from './Sites.jsx';
import { useGLTF, RoundedBox } from '@react-three/drei';
import { rimGeometry } from '../Rims.jsx';
import ProcEngine from '../Engine.jsx';
import Pickup from '../Pickup.jsx';
import { CAMPER } from './office.js';
import { STALL, rowsAtLevel } from './lot.js';
import { propertyTexture } from './propertyTextures.js';

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
  return <group position={[CAMPER.x, 0, CAMPER.z]} rotation={[0, Math.PI, 0]}>
    <RoundedBox position={[0, 1.75, 0]} args={[3.4, 2.5, 11]} radius={0.28} smoothness={3} castShadow receiveShadow><M c={painted ? '#f1e9d2' : '#cfc6ad'} map={T.cream} r={painted ? 0.5 : 0.8} m={0.2} /></RoundedBox>
    <mesh position={[0, 1.45, 0]}><boxGeometry args={[3.42, 0.5, 11.02]} /><M c={painted ? '#3fa395' : '#5f8f86'} map={T.teal} r={0.6} m={0.2} /></mesh>
    <mesh position={[0, 3.05, 0]} castShadow><boxGeometry args={[3.6, 0.15, 11.3]} /><M c={roof ? '#b8bcbf' : '#7d7a70'} map={T.steel} m={0.4} r={0.6} /></mesh>
    {!roof && [[0.6, -2], [-0.8, 2.6]].map(([x, z], i) => <B key={i} p={[x, 3.14, z]} s={[1.4, 0.04, 1.8]} c="#4a5a6a" rot={[0, 0.3, 0.05]} />)}
    {[-3.5, 0, 3.5].map(z => <B key={z} p={[1.72, 2.1, z]} s={[0.04, 0.8, 1.2]} c="#1b2629" r={0.2} cast={false} />)}
    {[-3.5, 0, 3.5].map(z => <group key={z}>
      {[-0.65, 0, 0.65].map(dz => <B key={dz} p={[1.76, 2.1, z + dz]} s={[0.06, 0.9, 0.045]} c="#a89b81" />)}
      {[-0.44, 0.44].map(dy => <B key={dy} p={[1.76, 2.1 + dy, z]} s={[0.06, 0.05, 1.35]} c="#a89b81" />)}
    </group>)}
    {Array.from({ length: 10 }, (_, i) => <B key={i} p={[-1.705, 0.7 + i * 0.22, 0]} s={[0.025, 0.025, 10.6]} c="#aea58e" />)}
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

const glowTex = (() => { let t; return () => t || (t = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,224,170,0.55)'); r.addColorStop(1, 'rgba(255,224,170,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })()); })();
/** floodlight poles around the customer lot: lit whenever the garage has power; purely lighting, not the OPEN signal */
const LOT_LIGHTS = [[-14.5, 12], [14.5, 12], [-14.5, 28], [14.5, 28], [-3.2, 31], [3.2, 31]];
function LotLights() {
  useGame();
  const on = !!game.home?.power, glow = glowTex();
  return <group>
    {LOT_LIGHTS.map(([x, z], i) => <group key={i}>
      <Cyl p={[x, 3.1, z]} a={[0.07, 0.1, 6.2, 6]} c="#3c4346" m={0.4} />
      <B p={[x, 6.2, z]} s={[0.9, 0.14, 0.4]} c="#2a2d2f" />
      <mesh position={[x, 6.1, z]}><boxGeometry args={[0.8, 0.05, 0.3]} /><meshStandardMaterial color="#ddd" emissive="#fff0c8" emissiveIntensity={on ? 2.4 : 0} /></mesh>
      <mesh position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[8, 24]} /><meshBasicMaterial map={glow} transparent opacity={on ? 1 : 0} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>)}
  </group>;
}

function Forecourt() {
  const map = useMemo(() => propertyTexture(4, 16, 11), []);
  const normalMap = useMemo(() => propertyTexture(4, 16, 11, true), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.45, 0.45), color: '#fff0d6', roughness: 1, transparent: true, depthWrite: false });
    m.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 propertyUV;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\npropertyUV = uv;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 propertyUV;')
        .replace('#include <alphatest_fragment>', 'diffuseColor.a *= smoothstep(0.0, 0.28, min(min(propertyUV.x, 1.0-propertyUV.x), min(propertyUV.y, 1.0-propertyUV.y)));\n#include <alphatest_fragment>');
    };
    return m;
  }, [map, normalMap]);
  useEffect(() => () => material.dispose(), [material]);
  return <group>
    <LotLights />
    <mesh position={[0, 0.025, 20.5]} rotation={[-Math.PI / 2, 0, 0]} material={material} receiveShadow>
      <planeGeometry args={[34, 23]} />
    </mesh>
    {/* parking bays down both sides of the drive lane, nose-out (worlds/lot.js); the lane to the garage door stays open.
        Rows grow with the "Parking lot expansion" yard upgrade (game/upgrades.js). */}
    {[-1, 1].map(side => { const rows = rowsAtLevel(game.home?.upgrades?.parking || 0); return <group key={side}>
      {Array.from({ length: rows + 1 }, (_, k) => <mesh key={k} position={[side * (STALL.inner + STALL.d / 2), 0.04, STALL.z0 + k * STALL.w]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[STALL.d, 0.14]} /><M c="#e6dcc0" r={1} /></mesh>)}
      {Array.from({ length: rows }, (_, k) => <B key={k} p={[side * (STALL.inner + STALL.d - 0.4), 0.09, STALL.z0 + (k + 0.5) * STALL.w]} s={[0.22, 0.15, 1.7]} c="#9a9080" />)}
    </group>; })}
  </group>;
}

// ---------------- grandpa's #7 desert racer: under a tarp until you pull it off ----------------
function RaceCar({ T }) {
  useGame();
  const open = !!game.home.raceCar, left = boxItems('racecar'), wheels = left.some(i => i.kind === 'wheel'), rims = left.some(i => i.kind === 'rim'), shocks = left.some(i => i.kind === 'part');
  const steel = '#4b3a2d', arm = '#3a3330', R = 0.52, L = [[0.92, 1.2], [-0.92, 1.2], [0.92, -1.15], [-0.92, -1.15]];
  const tb = (a, b, r = 0.03, c = steel) => <Tube a={a} b={b} r={r} c={c} m={0.45} />;
  const hood = Math.atan2(0.25, 1.15), seven = sevenTex(), carRef = useRef();
  return <group position={[RACECAR.lx, RACECAR.ly || 0, RACECAR.lz]} rotation={[0, RACECAR.ry, 0]}>
    {open ? <mesh position={[-1.7, 0.08, 1.4]} scale={[0.75, 0.16, 0.9]} castShadow><sphereGeometry args={[1, 12, 8]} /><M c="#4f6b86" r={0.95} /></mesh> : <RaceTarp carRef={carRef} R={R} L={L} ck={`${wheels}${rims}${shocks}`} />}
    <JunkPile covered={!open} T={T} />
    <group ref={carRef}><group position={[0, wheels ? 0 : -0.08, 0]}>
      {[-1, 1].map(s => <React.Fragment key={s}>
        {/* frame rails, belt line and the low boxy cage */}
        {tb([s * 0.55, 0.5, 1.75], [s * 0.55, 0.5, -1.6], 0.034)}{tb([s * 0.55, 0.95, 0.55], [s * 0.55, 0.95, -1.0])}
        {tb([s * 0.55, 0.95, 0.55], [s * 0.48, 1.45, 0.05])}{tb([s * 0.48, 1.45, 0.05], [s * 0.48, 1.45, -0.65])}
        {tb([s * 0.55, 0.5, -0.6], [s * 0.48, 1.45, -0.65], 0.034)}{tb([s * 0.48, 1.45, -0.65], [s * 0.55, 0.95, -1.0])}
        {tb([s * 0.55, 0.5, 0.55], [s * 0.55, 0.95, 0.55])}{tb([s * 0.55, 0.52, 0.5], [s * 0.55, 0.93, -0.55], 0.026)}
        {/* rear: engine cradle */}
        {tb([s * 0.55, 0.95, -1.0], [s * 0.5, 0.78, -1.65])}{tb([s * 0.5, 0.78, -1.65], [s * 0.55, 0.5, -1.6])}
        {/* front: hood rails down to the nose */}
        {tb([s * 0.55, 0.95, 0.55], [s * 0.45, 0.7, 1.7])}{tb([s * 0.45, 0.7, 1.7], [s * 0.55, 0.5, 1.75])}
        {/* shock towers, front and rear */}
        {tb([s * 0.55, 0.5, 1.25], [s * 0.56, 1.16, 1.2])}{tb([s * 0.56, 1.16, 1.2], [s * 0.55, 0.95, 0.55], 0.026)}{tb([s * 0.56, 1.16, 1.2], [s * 0.47, 0.75, 1.62], 0.026)}
        {tb([s * 0.55, 0.5, -1.2], [s * 0.56, 1.16, -1.15])}{tb([s * 0.56, 1.16, -1.15], [s * 0.48, 1.45, -0.65], 0.026)}{tb([s * 0.56, 1.16, -1.15], [s * 0.51, 0.78, -1.6], 0.026)}
        {/* A-arms out to the hubs */}
        {[1.2, -1.15].map(z => <React.Fragment key={z}>
          {tb([s * 0.55, 0.52, z + 0.25], [s * 0.76, 0.5, z], 0.026, arm)}{tb([s * 0.55, 0.52, z - 0.25], [s * 0.76, 0.5, z], 0.026, arm)}
          {tb([s * 0.56, 0.82, z + 0.18], [s * 0.74, 0.68, z], 0.022, arm)}{tb([s * 0.56, 0.82, z - 0.18], [s * 0.74, 0.68, z], 0.022, arm)}
          <Cyl p={[s * 0.76, 0.58, z]} a={[0.05, 0.05, 0.22, 10]} c={arm} m={0.5} />
        </React.Fragment>)}
        {/* the #7 side panel and a seat */}
        <mesh position={[s * 0.565, 0.73, -0.3]} castShadow><boxGeometry args={[0.02, 0.44, 1.12]} /><meshStandardMaterial map={seven} roughness={0.75} metalness={0.15} /></mesh>
        <RoundedBox args={[0.38, 0.12, 0.44]} radius={0.05} smoothness={3} position={[s * 0.23, 0.6, -0.1]} castShadow><M c="#2a2522" r={0.9} /></RoundedBox>
        <RoundedBox args={[0.38, 0.6, 0.12]} radius={0.05} smoothness={3} position={[s * 0.23, 0.92, -0.38]} rotation={[-0.15, 0, 0]} castShadow><M c="#2a2522" r={0.9} /></RoundedBox>
      </React.Fragment>)}
      {[1.75, 1.25, 0.55, -0.6, -1.2, -1.6].map(z => <React.Fragment key={z}>{tb([-0.55, 0.5, z], [0.55, 0.5, z])}</React.Fragment>)}
      {tb([-0.48, 1.45, 0.05], [0.48, 1.45, 0.05])}{tb([-0.48, 1.45, -0.65], [0.48, 1.45, -0.65])}{tb([-0.48, 1.45, 0.05], [0.48, 1.45, -0.65], 0.024)}
      {tb([-0.55, 0.95, 0.55], [0.55, 0.95, 0.55])}{tb([-0.45, 0.7, 1.7], [0.45, 0.7, 1.7])}{tb([-0.5, 0.78, -1.65], [0.5, 0.78, -1.65])}
      {tb([-0.56, 1.16, 1.2], [0.56, 1.16, 1.2], 0.026)}{tb([-0.56, 1.16, -1.15], [0.56, 1.16, -1.15], 0.026)}
      {/* sloped #7 hood, skid plate */}
      <mesh position={[0, 0.84, 1.125]} rotation={[hood, 0, 0]} castShadow><boxGeometry args={[1.0, 0.02, 1.18]} /><meshStandardMaterial map={seven} roughness={0.75} metalness={0.15} /></mesh>
      <B p={[0, 0.5, 1.82]} s={[0.6, 0.3, 0.03]} c="#5a4636" m={0.5} r={0.8} rot={[-0.3, 0, 0]} />
      {/* roof spotlights */}
      {[-0.24, 0.24].map(x => <group key={x} position={[x, 1.55, 0.06]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.085, 0.07, 0.12, 16]} /><M c="#2a2a2a" m={0.7} r={0.35} /></mesh>
        <mesh position={[0, 0, 0.061]}><circleGeometry args={[0.075, 16]} /><meshStandardMaterial color="#efe6c8" emissive="#fff0c0" emissiveIntensity={0.15} /></mesh>
        <Cyl p={[0, -0.07, 0]} a={[0.012, 0.012, 0.06, 6]} c="#2a2a2a" m={0.6} />
      </group>)}
      {/* engine in the rear cradle */}
      <group position={[0, 0.3, 0.2]}><ProcEngine mods={{ engineBore: 'EMOD_Bore1776' }} stockExhaust={false} /></group>
      {/* floor, dash, steering */}
      <B p={[0, 0.52, -0.05]} s={[1.08, 0.02, 1.2]} c="#4a4440" m={0.5} r={0.8} />
      <B p={[0, 0.98, 0.5]} s={[1.0, 0.18, 0.06]} c="#1d1d1f" r={0.8} rot={[-0.25, 0, 0]} />
      {[-0.23, 0.23].map(x => <group key={x} position={[x, 1.0, 0.465]} rotation={[Math.PI / 2 - 0.25, 0, 0]}><mesh><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#d8d2bf" /></mesh></group>)}
      <group position={[-0.23, 0.92, 0.32]} rotation={[-0.9, 0, 0]}>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.018, 0.018, 0.35, 8]} /><M c="#2b2b2e" m={0.5} /></mesh>
        <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.15, 0.018, 8, 24]} /><M c="#1d1d1f" r={0.7} /></mesh>
      </group>
      {shocks && L.map(([x, z], i) => <RaceShock key={i} x={x} z={z} />)}
    </group>
    {L.map(([x, z], i) => wheels || rims ? <RaceWheel key={i} x={x} z={z} R={R} tire={wheels} rim={rims} /> : <B key={i} p={[x * 0.85, 0.22, z]} s={[0.4, 0.4, 0.22]} c="#8a8a84" r={1} />)}
    </group>
  </group>;
}
/** real junk piled on and around the covered #7 (drums, tire stacks, a crate, an old door, an engine block) so from the door it reads as grandpa's clutter; uncovered, it's shoved into the corner */
const Drum = ({ p, c = '#3d5a6e', tip = 0 }) => <group position={p} rotation={[tip, 0, 0]}>
  <mesh position={[0, 0.44, 0]} castShadow receiveShadow><cylinderGeometry args={[0.29, 0.29, 0.88, 20]} /><M c={c} m={0.4} r={0.6} /></mesh>
  {[0.15, 0.44, 0.73].map(y => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.292, 0.012, 6, 24]} /><M c="#2a2a2a" m={0.5} /></mesh>)}
  <mesh position={[0, 0.885, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.28, 20]} /><M c="#6b4a32" m={0.4} r={0.8} /></mesh>
</group>;
const OldTire = ({ p, flat = true, r = 0.33 }) => <mesh position={p} rotation={flat ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow receiveShadow><torusGeometry args={[r - 0.09, 0.1, 10, 22]} /><M c="#1b1b1b" r={0.95} /></mesh>;
const TireStack = ({ p, n = 3 }) => <group position={p}>{Array.from({ length: n }, (_, i) => <OldTire key={i} p={[(i % 2) * 0.03, 0.1 + i * 0.2, 0]} />)}</group>;
const JerryCan = ({ p, ry = 0 }) => <group position={p} rotation={[0, ry, 0]}><mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.17, 0.4, 0.34]} /><M c="#a9281e" m={0.3} r={0.5} /></mesh><mesh position={[0, 0.43, 0.09]}><boxGeometry args={[0.05, 0.06, 0.12]} /><M c="#222" /></mesh></group>;
const Crate = ({ p, s = 0.6, ry = 0, T }) => <mesh position={[p[0], p[1] + s / 2, p[2]]} rotation={[0, ry, 0]} castShadow receiveShadow><boxGeometry args={[s, s * 0.8, s]} /><M map={T.oldWood} r={0.9} /></mesh>;
const EngineBlock = ({ p, ry = 0 }) => <group position={p} rotation={[0, ry, 0]}>
  <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.55, 0.4, 0.42]} /><M c="#4d4a46" m={0.6} r={0.6} /></mesh>
  {[-1, 1].map(s => <mesh key={s} position={[s * 0.36, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.2, 12]} /><M c="#6a6a64" m={0.6} r={0.5} /></mesh>)}
</group>;
function JunkPile({ covered, T }) {
  if (!covered) return <>
    <Drum p={[-1.75, 0, -1.65]} c="#3d5a6e" /><Drum p={[-1.75, 0, -1.05]} c="#5a6b3a" /><TireStack p={[-1.8, 0, -0.35]} n={5} />
    <Crate p={[-1.7, 0, 0.45]} T={T} ry={0.2} /><JerryCan p={[-1.6, 0.48, 0.45]} ry={0.4} /><EngineBlock p={[-1.7, 0, 1.2]} ry={0.3} />
  </>;
  return <>
    {/* on top: two old tires on the roof, a jerry can and a crate on the hood */}
    <OldTire p={[0.05, 1.68, -0.32]} /><OldTire p={[0.1, 1.88, -0.3]} />
    <JerryCan p={[-0.25, 0.98, 1.0]} ry={0.5} /><Crate p={[0.2, 0.9, 1.25]} s={0.42} ry={-0.3} T={T} />
    {/* front wall: drums, a crate, a tire stack */}
    <Drum p={[-0.62, 0, 2.2]} c="#3d5a6e" /><Drum p={[0.02, 0, 2.28]} c="#7a3a26" /><Crate p={[0.72, 0, 2.15]} T={T} ry={0.1} /><TireStack p={[-1.3, 0, 2.0]} n={4} />
    {/* the side facing the room: tires, an old door leaning on the car, an engine block */}
    <TireStack p={[-1.5, 0, 0.55]} n={5} />
    <mesh position={[-1.32, 0.5, -0.45]} rotation={[0, 0.05, 0.22]} castShadow><boxGeometry args={[0.05, 1.0, 1.05]} /><M c="#7d8a8c" m={0.3} r={0.7} map={T.teal} /></mesh>
    <EngineBlock p={[-1.5, 0, -1.45]} ry={0.4} /><Drum p={[1.45, 0, 1.55]} c="#5a6b3a" />
  </>;
}

/**
 * The tarp over the #7, draped on the real car underneath. The car's top surface is measured by casting rays straight
 * down into its frame/panels/engine (tires are added from their known shape), then the sheet is relaxed like a
 * stretched cloth under light gravity that can never pass through that surface; its outer edge lies on the ground.
 */
let TARP_CACHE = null;   // { key, geo }: the drape is solved once per car state, not every time the world remounts
function RaceTarp({ carRef, R, L, ck }) {
  const [geo, setGeo] = useState(() => TARP_CACHE?.key === ck ? TARP_CACHE.geo : null);
  useEffect(() => {
    if (TARP_CACHE?.key === ck) { setGeo(TARP_CACHE.geo); return; }   // passive effect: runs after the sibling car group's ref is attached (a layout effect here ran first and saw no car)
    const car = carRef.current; if (!car) return;
    const parent = car.parent; parent.updateWorldMatrix(true, true);
    const meshes = []; car.traverse(o => { if (o.isMesh && o.visible && (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 < 4000) meshes.push(o); });
    const NX = 84, NZ = 132, X0 = -1.45, X1 = 1.45, Z0 = -2.35, Z1 = 2.45, dx = (X1 - X0) / NX, dz = (Z1 - Z0) / NZ, W = NX + 1;
    const H = new Float32Array(W * (NZ + 1)).fill(-1), Y = new Float32Array(W * (NZ + 1));
    const ray = new THREE.Raycaster(), o = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), hp = new THREE.Vector3();
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const x = X0 + i * dx, z = Z0 + j * dz, k = j * W + i;
      ray.set(parent.localToWorld(o.set(x, 4, z)), down);
      const hit = ray.intersectObjects(meshes, false)[0]; if (hit) H[k] = parent.worldToLocal(hp.copy(hit.point)).y;
      for (const [wx, wz] of L) { const ddz = z - wz; if (Math.abs(x - wx) < 0.21 && Math.abs(ddz) < R) H[k] = Math.max(H[k], R + Math.sqrt(R * R - ddz * ddz)); }
    }
    // distance (m) from each cell to the nearest cell the car is under: the skirt must reach the floor within ~0.3 m of the car
    const D = new Float32Array(W * (NZ + 1)); for (let k = 0; k < D.length; k++) D[k] = H[k] > 0 ? 0 : 1e9;
    const dd = Math.hypot(dx, dz);
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const jj = pass ? NZ - j : j, ii = pass ? NX - i : i, k = jj * W + ii, st = pass ? -1 : 1;
      const nb = [[ii - st, jj, dx], [ii, jj - st, dz], [ii - st, jj - st, dd], [ii + st, jj - st, dd]];
      for (const [a2, b2, c2] of nb) if (a2 >= 0 && a2 <= NX && b2 >= 0 && b2 <= NZ) D[k] = Math.min(D[k], D[b2 * W + a2] + c2);
    }
    const EPS = 0.065, G = 0.0004, HEM = 0.3, POOL = 0.5;
    const fixed = k => D[k] > HEM;   // on the floor
    for (let k = 0; k < Y.length; k++) Y[k] = H[k] > 0 ? H[k] + EPS : 0;
    for (let it = 0; it < 700; it++) for (let j = 1; j < NZ; j++) for (let i = 1; i < NX; i++) {
      const k = j * W + i; if (fixed(k)) { Y[k] = 0.012; continue; }
      const avg = (Y[k - 1] + Y[k + 1] + Y[k - W] + Y[k + W]) * 0.25 - G;
      Y[k] = Math.max(avg, H[k] > 0 ? H[k] + EPS : 0.012);
    }
    const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    for (let k = 0; k < P.count; k++) {   // PlaneGeometry rows run from -z to +z after the rotation, matching the grid
      const x = P.getX(k), z = P.getZ(k) + (Z0 + Z1) / 2, i = Math.round((x - X0) / dx), j = Math.round((z - Z0) / dz), c = j * W + i, y = Y[c];
      if (D[c] > POOL) { P.setXYZ(k, x, -0.05, z); continue; }   // beyond the pooled hem: tucked under the slab, out of sight
      const free = y - Math.max(H[c], 0) > 0.08 && y > 0.05, fold = free ? 0.018 * Math.sin(x * 9 + z * 2.5) + 0.012 * Math.sin(z * 14 - x * 3) : 0;
      const pool = D[c] > HEM ? 0.012 + 0.025 * Math.max(0, Math.sin(x * 7 + z * 5) * Math.sin(z * 6 - x * 2)) : 0;   // the hem lies in loose rucks on the floor
      P.setXYZ(k, x, (D[c] > HEM ? pool : y + fold), z);
    }
    g.computeVertexNormals();
    TARP_CACHE = { key: ck, geo: g }; setGeo(g);
  }, [carRef, R, L.length, ck]);
  const tex = useMemo(() => tarpTex(), []);
  return geo ? <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#ffffff" map={tex} roughness={0.92} side={THREE.DoubleSide} /></mesh> : null;
}
/** a weathered blue poly tarp: woven grid, sun-faded patches, dust and a reinforced seam */
let TARP = null;
function tarpTex() {
  if (TARP) return TARP;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#41627f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 30 + Math.random() * 90, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,175,190,0.22)'); gr.addColorStop(1, 'rgba(150,175,190,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.globalAlpha = 0.16; g.strokeStyle = '#1d2f3f'; g.lineWidth = 1;
  for (let i = 0; i < 512; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,100,80' : '20,30,40'},${Math.random() * 0.18})`; g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  g.fillStyle = 'rgba(20,35,50,0.35)'; g.fillRect(250, 0, 10, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 4); t.anisotropy = 4; return (TARP = t);
}
/** faded red sheet metal with a big hand-painted 7 (shared by the hood and both side panels) */
let SEVEN = null;
function sevenTex() {
  if (SEVEN) return SEVEN;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#9a3626'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) { const x = Math.random() * 512, y = Math.random() * 256, r = Math.random() * 7 + 1; g.fillStyle = Math.random() < 0.55 ? 'rgba(70,35,20,' + (Math.random() * 0.35) + ')' : 'rgba(200,120,90,' + (Math.random() * 0.2) + ')'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(215,190,160,' + (Math.random() * 0.35) + ')'; g.lineWidth = 1; g.beginPath(); const x = Math.random() * 512, y = Math.random() * 256; g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 12); g.stroke(); }
  g.fillStyle = 'rgba(230,215,185,0.92)'; g.font = '900 210px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 330, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (SEVEN = t);
}
const TIRE_FILE = '/models/TIRE_RuggedTextured.glb', SHOCK_FILE = '/models/SHOCK_001_Coilover.glb';
/** Grandpa's beadlock rim + rugged tire (same assets as the Bug's wheel sets), each hidden when you take it */
function RaceWheel({ x, z, R, tire, rim }) {
  const { scene } = useGLTF(TIRE_FILE);
  const obj = useMemo(() => { const c = scene.clone(true); c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); o.material.metalness = 0; } }); return c; }, [scene]);
  const geo = useMemo(() => rimGeometry('beadlock'), []);
  return <group position={[x, R, z]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} scale={R / 0.475}>
    {tire && <primitive object={obj} />}
    {rim && <mesh geometry={geo} castShadow><meshStandardMaterial color="#6e5a46" metalness={0.45} roughness={0.7} side={THREE.DoubleSide} /></mesh>}
  </group>;
}
/** race coilover (SHOCK_001 scaled to ~0.6 m) from the lower arm up to its tower */
function RaceShock({ x, z }) {
  const { scene } = useGLTF(SHOCK_FILE);
  const obj = useMemo(() => { const c = scene.clone(true); c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.color.set(o.name === 'spring' ? '#b8392a' : /body|seat/.test(o.name) ? '#c9a23a' : '#2b2b2e'); o.material.metalness = 0.3; o.material.roughness = 0.55; } }); return c; }, [scene]);
  const s = Math.sign(x);
  return <group position={[s * 0.68, 0.56, z]} rotation={[0, 0, s * 0.2]} scale={1.18}><primitive object={obj} /></group>;
}
useGLTF.preload(TIRE_FILE); useGLTF.preload(SHOCK_FILE);

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
export function PropModel({ id, T, mat }) {
  if (isPiece(id)) return <StructureModel id={id} mat={mat} />;
  if (id === 'wallOpening') return <group>{[-0.96, 0.96].map(x => <mesh key={x} position={[x, 1.3, 0]}><boxGeometry args={[0.1, 2.6, 0.3]} /><meshStandardMaterial color="#6b4a2f" /></mesh>)}<mesh position={[0, 2.56, 0]}><boxGeometry args={[2, 0.1, 0.3]} /><meshStandardMaterial color="#6b4a2f" /></mesh></group>;
  switch (id) {
    case 'fenceWood': return <>{[-1.5, 0, 1.5].map(x => <P key={x} p={[x, 0.62, 0]} s={[0.12, 1.24, 0.12]} map={T.oldWood} c="#9a8468" />)}{[0.38, 0.9].map(y => <P key={y} p={[0, y, 0.07]} s={[3.1, 0.14, 0.04]} map={T.newWood} />)}{[-1.5, 0, 1.5].map(x => <P key={'c' + x} p={[x, 1.26, 0]} s={[0.16, 0.04, 0.16]} c="#6e5034" />)}</>;
    case 'fenceChain': return <>{[-1.5, 1.5].map(x => <C key={x} p={[x, 0.95, 0]} a={[0.035, 0.035, 1.9, 8]} c="#9aa0a3" m={0.7} r={0.4} />)}<C p={[0, 1.88, 0]} a={[0.025, 0.025, 3, 6]} c="#9aa0a3" m={0.7} r={0.4} rot={[0, 0, Math.PI / 2]} />{Array.from({ length: 14 }, (_, i) => <P key={i} p={[-1.4 + i * 0.215, 0.95, 0]} s={[0.008, 1.8, 0.008]} c="#a7abad" m={0.7} rot={[0, 0, (i % 2 ? 1 : -1) * 0.12]} />)}</>;
    case 'gate': return <>{[-2, 2].map(x => <P key={x} p={[x, 0.75, 0]} s={[0.2, 1.5, 0.2]} map={T.oldWood} c="#8a7458" />)}{[0.4, 0.78, 1.16].map(y => <P key={y} p={[0, y, 0]} s={[3.8, 0.07, 0.05]} c="#8d9396" m={0.6} r={0.4} />)}<P p={[0, 0.78, 0]} s={[4.2, 0.05, 0.05]} c="#8d9396" m={0.6} rot={[0, 0, 0.19]} /></>;
    case 'floodlight': return <><C p={[0, 3, 0]} a={[0.07, 0.11, 6, 10]} c="#7c8083" m={0.6} r={0.4} /><P p={[0, 6.05, 0.15]} s={[0.9, 0.08, 0.1]} c="#555" m={0.5} />{[-0.3, 0.3].map(x => <group key={x} position={[x, 6.05, 0.3]} rotation={[0.5, 0, 0]}><P p={[0, 0, 0]} s={[0.38, 0.3, 0.16]} c="#3a3d40" m={0.5} /><mesh position={[0, 0, 0.085]}><planeGeometry args={[0.32, 0.24]} /><meshStandardMaterial color="#fff6dc" emissive="#fff2d0" emissiveIntensity={2.5} /></mesh></group>)}<pointLight position={[0, 5.6, 1.2]} intensity={70} distance={28} decay={1.5} color="#fff2d6" /></>;
    case 'yardRack': return <>{[-1, 1].flatMap(x => [-0.4, 0.4].map(z => <P key={x + '' + z} p={[x, 1.1, z]} s={[0.07, 2.2, 0.07]} c="#2f5f9e" m={0.5} r={0.5} />))}{[0.3, 1.1, 1.9].map(y => <P key={y} p={[0, y, 0]} s={[2.1, 0.05, 0.9]} c="#d9962f" m={0.4} r={0.5} />)}{[[-0.6, 0.48, 0.5], [0.4, 0.5, 0.6], [-0.3, 1.3, 0.55], [0.6, 1.26, 0.4]].map(([x, y, w], i) => <P key={'b' + i} p={[x, y, 0]} s={[w, 0.32, 0.5]} c={['#b58b55', '#a9854f', '#c29a62'][i % 3]} r={1} />)}</>;
    case 'shelfTires': case 'shelfSupplies': return <>
      {[-1.15, 1.15].flatMap(x => [-0.35, 0.35].map(z => <P key={x + '' + z} p={[x, 1.4, z]} s={[0.07, 2.8, 0.07]} c="#d9962f" m={0.4} r={0.5} />))}
      {[0.55, 1.45, 2.35].map(y => <P key={y} p={[0, y, 0]} s={[2.4, 0.06, 0.8]} c="#4a4f52" m={0.5} r={0.5} />)}
      {id === 'shelfTires'
        ? <>{[-0.8, 0, 0.8].map((x, i) => <ShelfTire key={i} p={[x, 0.95, 0]} r={0.36} rim={['#9aa0a4', '#d9962f', '#2b2b2b'][i]} />)}{[-0.5, 0.5].map((x, i) => <ShelfTire key={'u' + i} p={[x, 1.85, 0]} r={0.38} rim={['#b8bcc0', '#cf3e2f'][i]} />)}</>
        : <>{[['oil', 0.58, -0.8], ['jerry', 0.58, 0.1], ['battery', 0.58, 0.9], ['paint', 1.48, -0.8], ['rim', 1.78, 0.1], ['bolts', 1.48, 0.8], ['oil', 2.38, -0.4], ['paint', 2.38, 0.6]].map(([k, y, x], i) => <group key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><ShelfStuff kind={k} p={[0, y, 0]} /></group>)}</>}
    </>;
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
  }, [item?.id, game.buildMode?.mat]);
  useFrame(({ clock }) => {
    if (!item || !ref.current || !game.buildMode || !inner.current) return;
    ghostify(inner.current, mats); mats.pulse(clock.elapsedTime, true);
    let x, z, ry = game.buildMode.ry || 0;
    if (item.cut) { const sn = snapCutWorld(camera.position.x + game.face.x * 3, camera.position.z + game.face.z * 3); if (sn) { x = sn.x; z = sn.z; ry = sn.ry; } else { x = camera.position.x + game.face.x * 3; z = camera.position.z + game.face.z * 3; } }
    else if (item.struct) { const sn = snapWorld(item, camera.position.x + game.face.x * 4.5, camera.position.z + game.face.z * 4.5); x = sn.x; z = sn.z; ry = sn.ry; }   // building pieces snap to the 2 m grid and turn to the nearest edge
    else { const d = 4 + (item.len || 0) * 0.5; x = Math.round((camera.position.x + game.face.x * d) * 2) / 2; z = Math.round((camera.position.z + game.face.z * d) * 2) / 2; }
    const why = placeWhy(item, x, z, !!game.buildMode.moving, ry, game.buildMode.mat);
    mats.set(why ? HOLO.bad : HOLO.ok);
    ref.current.position.set(x, item.struct || item.cut ? height(x, z) : groundHeight(x, z), z); ref.current.rotation.set(0, ry, 0);
    if (game.buildMode.x !== x || game.buildMode.z !== z || game.buildMode.why !== why || ((item.struct || item.cut) && game.buildMode.ry !== ry)) { game.buildMode = { ...game.buildMode, x, z, why, ...(item.struct || item.cut ? { ry } : {}) }; emit(); }
  });
  if (!item) return null;
  return <group ref={ref}><group ref={inner} key={item.id + ':' + (item.struct ? game.buildMode.mat || 'sheet' : '')}><PropModel id={item.id} T={T} mat={item.struct ? game.buildMode.mat || 'sheet' : undefined} /></group><group ref={foot} /></group>;
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
    <group position={[G.x, G.y, G.z]} rotation={[0, G.rot, 0]}><Forecourt /><Trailer T={T} /><Windmill /><Tank T={T} /><RaceCar T={T} /></group>
    {junkWorld.filter(j => !isCleared(j.id)).map(j => <group key={j.id} position={[j.x, groundHeight(j.x, j.z), j.z]} rotation={[0, j.lx * 0.7, 0]}><Junk kind={j.kind} /></group>)}
    {SCRAP_HEAPS.filter(h => !heapTaken(h.id)).map((h, i) => <group key={h.id} position={[h.x, groundHeight(h.x, h.z), h.z]} rotation={[0, i * 1.3, 0]}><ScrapHeap seed={i} /></group>)}
    {game.props.filter(p => p.uid !== game.buildMode?.moving?.uid).map(p => <group key={p.uid} position={[p.x, isPiece(p.id) ? height(p.x, p.z) : groundHeight(p.x, p.z), p.z]} rotation={[0, p.ry || 0, 0]}><PropModel id={p.id} T={T} mat={p.mat} /></group>)}
    <Customer />
    <Ghost T={T} />
    <IconBaker Model={PropModel} T={T} />
  </>;
}
