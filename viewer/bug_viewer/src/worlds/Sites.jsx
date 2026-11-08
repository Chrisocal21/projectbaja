import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SITES, height } from './county.js';
import { game, useGame } from '../game/store.js';
import { GARAGE, BARN, CACTI } from './siteData.js';
import { OFFICE } from './office.js';
import GarageWing from './GarageWing.jsx';
import { propertyTexture } from './propertyTextures.js';
import { furniture } from '../game/loot.js';
import LotSite, { canvasTex, signTex, asphaltTex, rnd } from '../lot/CarLot.jsx';
import ProcEngine from '../Engine.jsx';

export const wood = (base, dark, vertical = true, seed = 3) => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const n = 16; for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.16})`; vertical ? g.fillRect((i * w) / n, 0, 2, h) : g.fillRect(0, (i * h) / n, w, 2);
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.07})`; vertical ? g.fillRect((i * w) / n + 2, 0, w / n - 2, h) : g.fillRect(0, (i * h) / n + 2, w, h / n - 2);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = dark; g.globalAlpha = 0.1 + r() * 0.25; vertical ? g.fillRect(r() * w, r() * h, 1, 4 + r() * 22) : g.fillRect(r() * w, r() * h, 4 + r() * 22, 1); }
  g.globalAlpha = 1;
}, [1, 1]);
export const metalTex = (base, seed = 5) => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { const x = (i * w) / 16, gr = g.createLinearGradient(x, 0, x + w / 16, 0); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0.16)'); g.fillStyle = gr; g.fillRect(x, 0, w / 16, h); }
  for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(120,56,24,0.3)'); gr.addColorStop(1, 'rgba(120,56,24,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(30,24,18,${r() * 0.18})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 8); }
}, [1, 1]);
const Box = ({ p, s, color = '#888', map, rough = 0.9, metal = 0, emissive, ei = 0, cast = true, rot }) =>
  <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} map={map} roughness={rough} metalness={metal} emissive={emissive} emissiveIntensity={ei} /></mesh>;
const Tire = ({ p, r = 0.38, w = 0.28, rim = '#9aa0a4', rot = [Math.PI / 2, 0, 0] }) => <group position={p} rotation={rot}>
  <mesh castShadow><cylinderGeometry args={[r, r, w, 20]} /><meshStandardMaterial color="#141414" roughness={0.95} /></mesh>
  <mesh position={[0, w * 0.52, 0]}><cylinderGeometry args={[r * 0.62, r * 0.62, 0.02, 18]} /><meshStandardMaterial color={rim} metalness={0.7} roughness={0.4} /></mesh></group>;

/** poured concrete: speckle, soft blotches, saw-cut joints, hairline cracks and oil stains */
const concreteTex = (seed = 21) => canvasTex(512, 512, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = '#9c9d98'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 110, gr = g.createRadialGradient(x, y, 0, x, y, rad), dk = r() < 0.5; gr.addColorStop(0, dk ? 'rgba(60,58,52,0.12)' : 'rgba(255,255,250,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,40,38' : '235,235,228'},${r() * 0.22})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  for (let i = 0; i < 7; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 60, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(25,20,14,0.5)'); gr.addColorStop(0.6, 'rgba(25,20,14,0.22)'); gr.addColorStop(1, 'rgba(25,20,14,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(40,38,34,0.5)'; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(50,48,44,0.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);   // saw-cut joints at the tile edges
}, [3, 3]);
/** corrugated sheet: fine ribs, rust streaks running down from the top, dirt splash along the bottom */
const corrugatedTex = (base, seed = 31) => canvasTex(512, 512, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const n = 32; for (let i = 0; i < n; i++) { const x = (i * w) / n, gr = g.createLinearGradient(x, 0, x + w / n, 0); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0.22)'); g.fillStyle = gr; g.fillRect(x, 0, w / n, h); }
  for (let i = 0; i < 26; i++) { const x = r() * w, len = 60 + r() * 300, wd = 3 + r() * 10, gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(130,60,25,0.55)'); gr.addColorStop(1, 'rgba(130,60,25,0)'); g.fillStyle = gr; g.fillRect(x, 0, wd, len); }
  for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, rad = 8 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(120,56,24,0.45)'); gr.addColorStop(1, 'rgba(120,56,24,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const gr = g.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, 'rgba(90,70,45,0)'); gr.addColorStop(1, 'rgba(90,70,45,0.55)'); g.fillStyle = gr; g.fillRect(0, h * 0.82, w, h * 0.18);
}, [1, 1]);
/** pegboard: grey hardboard with a hole grid and painted tool outlines */
const pegTex = () => canvasTex(512, 160, (g, w, h) => {
  g.fillStyle = '#8f8a7c'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(30,28,24,0.75)'; for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 10) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(200,40,30,0.6)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const x = 30 + i * 38; g.strokeRect(x, 30, 10, 70 + (i % 3) * 15); }
}, [1, 1]);
const Arm = ({ a, b, w = 0.1, c = '#e8b43a' }) => { const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz); return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[0, Math.atan2(-dz, dx), 0]} castShadow><boxGeometry args={[len, 0.07, w]} /><meshStandardMaterial color={c} metalness={0.4} roughness={0.5} /></mesh>; };
/** two-post car lift around the Bug's bay (local x = ±1.65, z = -0.5), arms swung in under the car at their lowest */
function CarLift() {
  const red = '#b8302a';
  return <group position={[0, 0.12, -0.5]}>
    {[-1, 1].map(s => <group key={s} position={[s * 1.65, 0, 0]}>
      <Box p={[0, 0.015, 0]} s={[0.62, 0.03, 0.6]} color="#3a3d40" metal={0.5} />
      <Box p={[0, 1.8, 0]} s={[0.3, 3.6, 0.34]} color={red} metal={0.35} rough={0.5} />
      <Box p={[-s * 0.16, 1.8, 0]} s={[0.04, 3.4, 0.14]} color="#7a1f1a" metal={0.4} cast={false} />
      {[0.14, 0.24].map(y => <Box key={y} p={[0, y, 0]} s={[0.31, 0.05, 0.35]} color={y === 0.14 ? '#f2c230' : '#1a1a1a'} cast={false} />)}
      <Box p={[-s * 0.2, 0.34, 0]} s={[0.24, 0.3, 0.42]} color="#3a3d40" metal={0.6} rough={0.4} />
      <Arm a={[-s * 0.25, 0.25, 0.12]} b={[-s * 1.0, 0.2, 1.05]} /><Arm a={[-s * 0.25, 0.25, -0.12]} b={[-s * 1.0, 0.2, -1.0]} />
      {[1.05, -1.0].map(z => <mesh key={z} position={[-s * 1.0, 0.25, z]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.06, 12]} /><meshStandardMaterial color="#1a1a1a" roughness={0.8} /></mesh>)}
    </group>)}
    <Box p={[0, 3.72, 0]} s={[3.64, 0.18, 0.26]} color={red} metal={0.35} rough={0.5} />
    <group position={[1.95, 1.1, 0]}><Box p={[0, 0, 0]} s={[0.26, 0.4, 0.3]} color="#2c4f7a" metal={0.4} rough={0.5} /><Box p={[0, 0.3, 0]} s={[0.14, 0.2, 0.14]} color="#1a1a1a" metal={0.5} /></group>
  </group>;
}
/** stuff on a shelf: oil quarts, jerry cans, paint, a spare rim, a battery, a coffee can of bolts */
function ShelfStuff({ kind, p }) {
  if (kind === 'oil') return <group position={p}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 0.1, i * 0.12 - 0.3]} castShadow><boxGeometry args={[0.08, 0.2, 0.1]} /><meshStandardMaterial color={['#e8b43a', '#2b6cb0', '#e8b43a'][i % 3]} roughness={0.4} /></mesh>)}</group>;
  if (kind === 'jerry') return <group position={p}>{[0, 0.38].map(z => <group key={z} position={[0, 0, z]}><mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.34, 0.4, 0.17]} /><meshStandardMaterial color={z ? '#2f6b3a' : '#a9281e'} metalness={0.3} roughness={0.5} /></mesh><mesh position={[0.09, 0.43, 0]}><boxGeometry args={[0.12, 0.06, 0.05]} /><meshStandardMaterial color="#222" /></mesh></group>)}</group>;
  if (kind === 'paint') return <group position={p}>{Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, 0.1 + (i > 2 ? 0.2 : 0), (i % 3) * 0.2 - 0.2]} castShadow><cylinderGeometry args={[0.085, 0.085, 0.19, 14]} /><meshStandardMaterial color={['#c9c4b6', '#7a2f26', '#2f4a63', '#cfc8b8', '#3f6b3a'][i]} metalness={0.5} roughness={0.45} /></mesh>)}</group>;
  if (kind === 'rim') return <group position={p} rotation={[0, 0, Math.PI / 2]}><mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.2, 22, 1, true]} /><meshStandardMaterial color="#b8bcc0" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} /></mesh><mesh><cylinderGeometry args={[0.24, 0.24, 0.02, 20]} /><meshStandardMaterial color="#9aa0a4" metalness={0.8} roughness={0.35} /></mesh></group>;
  if (kind === 'battery') return <group position={p}><mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.18, 0.22, 0.3]} /><meshStandardMaterial color="#1e1f22" roughness={0.6} /></mesh><mesh position={[0, 0.23, 0]}><boxGeometry args={[0.18, 0.01, 0.3]} /><meshStandardMaterial color="#c9a227" /></mesh></group>;
  return <group position={p}><mesh position={[0, 0.08, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.16, 14]} /><meshStandardMaterial color="#8a5a2a" metalness={0.5} roughness={0.5} /></mesh></group>;
}

/** The player's garage: concrete slab, roller door, two-post lift, workbench + pegboard, shelves, an engine on a stand. Local +z = the door. */
function Garage() {
  useGame();
  const { w, d, door } = GARAGE, t = 0.2, H = 4.6, power = game.home?.power;
  const wallBack = useMemo(() => { const m = corrugatedTex('#8a9893'); m.repeat.set(5, 1); return m; }, []);
  const wallSide = useMemo(() => { const m = corrugatedTex('#8a9893', 33); m.repeat.set(4, 1); return m; }, []);
  const wallFront = useMemo(() => { const m = corrugatedTex('#8a9893', 35); m.repeat.set(1.3, 1); return m; }, []);
  const roof = useMemo(() => metalTex('#59615f', 9), []);
  const floor = useMemo(() => propertyTexture(7, 5, 4), []);
  const apron = useMemo(() => propertyTexture(7, 3, 2), []);
  const ply = useMemo(() => { const m = wood('#a88a5c', '#5a4428', true, 41); m.repeat.set(6, 1); return m; }, []);
  const peg = useMemo(() => pegTex(), []);
  const sign = useMemo(() => signTex([["WALT'S GARAGE", 66, '#803c29'], ['REPAIR · WELDING · SALVAGE', 30, '#59422e']], '#d4bd8d', '#74583b', '#a28a62'), []);
  const bench = useMemo(() => wood('#8a6a44', '#3a2a18', false, 4), []);
  return <group>
    {/* slab + apron */}
    <Box p={[0, 0.06, 0]} s={[w * 2 + 1.2, 0.12, d * 2 + 1.2]} color="#fff" map={floor} rough={0.95} cast={false} />
    <Box p={[0, 0.07, d + 2.6]} s={[door * 2 + 2, 0.1, 5]} color="#fff" map={apron} rough={0.95} cast={false} />
    {/* bay lines either side of the lift */}
    {[-2.05, 2.05].map(x => <mesh key={x} position={[x, 0.122, 0.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.1, 8]} /><meshStandardMaterial color="#d9b23a" roughness={0.8} /></mesh>)}
    {/* walls: corrugated outside, plywood lining up to 1.3 m inside */}
    <Box p={[0, H / 2, -d]} s={[w * 2, H, t]} color="#fff" map={wallBack} /><Box p={[w, H / 2, 0]} s={[t, H, d * 2]} color="#fff" map={wallSide} />
    {/* left wall: reception doorway */}
    <Box p={[-w, H / 2, (-d + OFFICE.inner.z0) / 2]} s={[t, H, OFFICE.inner.z0 + d]} color="#fff" map={wallSide} />
    <Box p={[-w, H / 2, (d + OFFICE.inner.z1) / 2]} s={[t, H, d - OFFICE.inner.z1]} color="#fff" map={wallSide} />
    <Box p={[-w, (H + 2.4) / 2, (OFFICE.inner.z0 + OFFICE.inner.z1) / 2]} s={[t, H - 2.4, OFFICE.inner.z1 - OFFICE.inner.z0]} color="#fff" map={wallSide} />
    <Box p={[-(w + door) / 2, H / 2, d]} s={[w - door, H, t]} color="#fff" map={wallFront} /><Box p={[(w + door) / 2, H / 2, d]} s={[w - door, H, t]} color="#fff" map={wallFront} />
    <Box p={[0, (H + 3.7) / 2, d]} s={[door * 2, H - 3.7, t]} color="#fff" map={wallFront} />
    <Box p={[0, 0.77, -d + 0.12]} s={[w * 2 - 0.3, 1.3, 0.03]} color="#fff" map={ply} cast={false} />
    <Box p={[w - 0.12, 0.77, 0]} s={[0.03, 1.3, d * 2 - 0.3]} color="#fff" map={ply} cast={false} />
    <Box p={[-w + 0.12, 0.77, (-d + 0.15 + OFFICE.inner.z0) / 2]} s={[0.03, 1.3, OFFICE.inner.z0 + d - 0.15]} color="#fff" map={ply} cast={false} />
    <Box p={[-w + 0.12, 0.77, (d - 0.15 + OFFICE.inner.z1) / 2]} s={[0.03, 1.3, d - 0.15 - OFFICE.inner.z1]} color="#fff" map={ply} cast={false} />
    <Box p={[0, 3.62, d - 0.15]} s={[door * 2, 0.35, 0.3]} color="#2c3234" metal={0.4} />
    {/* roof, steel rafters and purlins */}
    {[-1, 1].map(side => <Box key={side} p={[side * 3.65, H + 1.15, 0]} s={[7.75, 0.16, 13]} color="#b4a08a" map={roof} rot={[0, 0, -side * Math.atan(2.3 / 7.3)]} />)}
    {[-d, d].map(z => <mesh key={z} position={[0, H, z]} castShadow receiveShadow>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-w, 0, 0, w, 0, 0, 0, 2.3, 0]), 3]} /><bufferAttribute attach="attributes-normal" args={[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3]} /><bufferAttribute attach="attributes-uv" args={[new Float32Array([0, 0, 1, 0, 0.5, 1]), 2]} /></bufferGeometry>
      <meshStandardMaterial map={wallBack} color="#b5a28a" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>)}
    <Box p={[0, H + 2.35, 0]} s={[0.2, 0.16, 13.2]} color="#79523a" metal={0.4} />
    {[-7, -3.65, 3.65, 7].map(x => <Box key={x} p={[x, 2.3, 6.15]} s={[0.18, 4.6, 0.22]} map={bench} color="#a18b68" />)}
    {[-1, 1].map(side => <Box key={side} p={[side * 3.65, H + 1.15, 6.16]} s={[7.75, 0.18, 0.2]} map={bench} color="#8c7151" rot={[0, 0, -side * Math.atan(2.3 / 7.3)]} />)}
    {[-4.8, 0, 4.8].map(x => <group key={x} position={[x, x === 0 ? 6.25 : 3.5, 6.5]}>
      <Box p={[0, 0.15, -0.15]} s={[0.07, 0.4, 0.4]} color="#423e31" metal={0.7} />
      <mesh rotation={[0, 0, Math.PI]}><coneGeometry args={[0.25, 0.15, 16, 1, true]} /><meshStandardMaterial color="#554b36" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.05, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#ffe4ae" emissive="#ffc577" emissiveIntensity={power ? 3 : 0} /></mesh>
      <pointLight position={[0, -0.25, 0.2]} color="#ffc577" intensity={power ? 14 : 0} distance={9} />
    </group>)}
    <GarageWing wall={wallSide} timber={bench} roof={roof} floor={floor} power={power} />
    {[-4.5, -1.5, 1.5, 4.5].map(z => <Box key={z} p={[0, H - 0.1, z]} s={[w * 2, 0.22, 0.1]} color="#3c4346" metal={0.6} rough={0.5} />)}
    {[-4.5, 0, 4.5].map(x => <Box key={x} p={[x, H - 0.02, 0]} s={[0.08, 0.08, d * 2]} color="#4a5255" metal={0.6} rough={0.5} cast={false} />)}
    <mesh position={[0, H + 0.75, d + 0.2]}><boxGeometry args={[6, 1.15, 0.12]} /><meshStandardMaterial map={sign} roughness={0.7} /></mesh>
    {/* the lift */}
    <CarLift />
    {/* workbench along the back wall, pegboard with tools above it, compressor at the end */}
    <Box p={[-3, 0.92, -d + 0.8]} s={[5.2, 0.12, 1.1]} color="#fff" map={bench} />
    {[-5.4, -0.6].map(x => <Box key={x} p={[x, 0.45, -d + 0.8]} s={[0.12, 0.9, 1]} color="#3b3f42" metal={0.5} />)}
    <Box p={[-3, 0.35, -d + 0.8]} s={[5, 0.7, 0.9]} color="#a33a2e" rough={0.6} metal={0.3} />
    {[-4.6, -3.4, -2.2].map(x => <Box key={x} p={[x, 0.55, -d + 1.26]} s={[0.4, 0.03, 0.02]} color="#cfd2d4" metal={0.8} rough={0.3} cast={false} />)}
    <mesh position={[-3, 2.0, -d + 0.15]}><boxGeometry args={[5.4, 1.5, 0.04]} /><meshStandardMaterial map={peg} roughness={0.85} /></mesh>
    {Array.from({ length: 12 }, (_, i) => { const x = -5.3 + i * 0.42, y = 2.05 + ((i * 7) % 5) * 0.12 - 0.25, kind = i % 3;
      return <group key={i} position={[x, y, -d + 0.22]}>
        <Box p={[0, 0, 0]} s={[0.04, 0.32 + (i % 3) * 0.08, 0.02]} color={kind === 2 ? '#c8372b' : '#c9ccd0'} metal={0.7} rough={0.35} cast={false} />
        {kind === 0 && <mesh position={[0, 0.2 + (i % 3) * 0.04, 0]}><torusGeometry args={[0.04, 0.013, 6, 14]} /><meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.3} /></mesh>}
        {kind === 1 && <Box p={[0, 0.2, 0]} s={[0.14, 0.06, 0.04]} color="#3a3f44" metal={0.6} rough={0.4} cast={false} />}
        {kind === 2 && <Box p={[0, -0.2, 0]} s={[0.035, 0.12, 0.035]} color="#e8b43a" rough={0.5} cast={false} />}
      </group>; })}
    <group position={[0.3, 0.12, -d + 0.6]}>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.9, 18]} /><meshStandardMaterial color="#b8302a" metalness={0.4} roughness={0.45} /></mesh>
      <Box p={[0.1, 0.62, 0]} s={[0.35, 0.22, 0.25]} color="#2a2a2a" metal={0.5} /><Box p={[-0.3, 0.6, 0]} s={[0.1, 0.18, 0.1]} color="#cfd2d4" metal={0.8} rough={0.3} />
      {[-0.35, 0.35].map(x => <mesh key={x} position={[x, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.04, 12]} /><meshStandardMaterial color="#1a1a1a" /></mesh>)}
    </group>
    {/* engine on a stand (moved to the left side, clear of the #7's corner) */}
    <group position={[-4.3, 0.12, 0.9]} rotation={[0, Math.PI / 2, 0]}>
      <Box p={[0, 0.05, 0]} s={[0.9, 0.06, 0.08]} color="#2c4f7a" metal={0.5} /><Box p={[0, 0.05, 0.25]} s={[0.08, 0.06, 0.6]} color="#2c4f7a" metal={0.5} />
      <Box p={[0, 0.45, 0.25]} s={[0.08, 0.8, 0.08]} color="#2c4f7a" metal={0.5} /><Box p={[0, 0.82, 0.12]} s={[0.12, 0.12, 0.3]} color="#2c4f7a" metal={0.5} />
      {[[-0.4, 0], [0.4, 0], [0, 0.55]].map(([x, z], i) => <mesh key={i} position={[x, 0.04, z]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#111" /></mesh>)}
      <group position={[0, 0.45, 1.5]}><ProcEngine stockExhaust={false} /></group>
    </group>
    {/* left shelves: tires + rims; right shelves: oil, jerry cans, paint, a spare rim, a battery */}
    {[0.55, 1.45, 2.35].map((y, i) => <group key={i}>
      <Box p={[-w + 0.5, y, -0.2]} s={[0.8, 0.06, 7.4]} color="#4a4f52" metal={0.5} />
      <Box p={[w - 0.5, y, -0.9]} s={[0.8, 0.06, 6.6]} color="#4a4f52" metal={0.5} />
    </group>)}
    {[-3.4, 3.2].map(z => [-w + 0.1, w - 0.1].map((x, k) => <Box key={z + '' + k} p={[x, 1.4, z]} s={[0.08, 2.8, 0.08]} color="#d9962f" metal={0.4} />))}
    {[-3.2, -1.7, -0.2, 1.3, 2.8].map((z, i) => <Tire key={i} p={[-w + 0.5, 0.95 + (i % 2) * 0.9, z]} r={0.36 + (i % 3) * 0.03} rim={['#9aa0a4', '#d9962f', '#2b2b2b', '#b8bcc0', '#cf3e2f'][i]} rot={[0, 0, Math.PI / 2]} />)}
    {[['oil', 0.58, -3.4], ['jerry', 0.58, -0.9], ['battery', 0.58, 1.4], ['paint', 1.48, -3.2], ['rim', 1.78, -1.0], ['bolts', 1.48, 1.2], ['oil', 2.38, -2.2], ['paint', 2.38, 0.6]].map(([k, y, z], i) => <ShelfStuff key={i} kind={k} p={[w - 0.5, y, z]} />)}
    <Tire p={[-5.2, 0.26, 4.6]} rot={[0, 0, 0]} /><Tire p={[-5.2, 0.54, 4.6]} rot={[0, 0, 0]} rim="#cf3e2f" /><Tire p={[-5.15, 0.82, 4.62]} rot={[0, 0, 0]} />
    <mesh position={[1.4, 0.123, -1.4]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 20]} /><meshBasicMaterial color="#17120d" transparent opacity={0.3} depthWrite={false} /></mesh>
    {[-3.5, 3.5].map(x => <mesh key={x} position={[x, H - 0.3, 0]}><boxGeometry args={[0.18, 0.08, 6.2]} /><meshStandardMaterial color={power ? '#fff6dc' : '#6d6a62'} emissive="#fff0c0" emissiveIntensity={power ? 1.4 : 0} /></mesh>)}
    <pointLight position={[0, H - 0.8, 0]} intensity={power ? 32 : 6} distance={20} decay={1.6} color={power ? '#ffeccc' : '#b9a98a'} />
    {/* grandpa's letter on the bench */}
    <mesh position={[-2.6, 0.985, -5.25]} rotation={[-Math.PI / 2, 0, 0.2]}><planeGeometry args={[0.24, 0.32]} /><meshStandardMaterial color="#efe6cf" roughness={0.9} /></mesh>
    {/* the main breaker panel (press E) */}
    <Box p={[w - 0.16, 1.5, -1.2]} s={[0.12, 0.7, 0.5]} color="#5b6266" metal={0.5} rough={0.5} />
    <Box p={[w - 0.23, 1.55, -1.2]} s={[0.04, 0.12, 0.05]} color={power ? '#3fbf5a' : '#c8372b'} emissive={power ? '#3fbf5a' : '#c8372b'} ei={0.8} cast={false} />
  </group>;
}


/** a wall run with openings: ax 'x' runs along local x at z = at, ax 'z' along local z at x = at. opening = [u0, u1, y0, y1, glass] */
function Wall({ ax, at, a, b, h, t = 0.2, map, open = [] }) {
  const parts = [], ops = [...open].sort((p, q) => p[0] - q[0]);
  const box = (u0, u1, y0, y1, key) => {
    const len = u1 - u0, hh = y1 - y0, uc = (u0 + u1) / 2, yc = (y0 + y1) / 2;
    if (len < 0.01 || hh < 0.01) return null;
    return <Box key={key} p={ax === 'x' ? [uc, yc, at] : [at, yc, uc]} s={ax === 'x' ? [len, hh, t] : [t, hh, len]} color="#fff" map={map} />;
  };
  let u = a;
  ops.forEach(([u0, u1, y0, y1, glass], i) => {
    parts.push(box(u, u0, 0, h, 'p' + i), y0 > 0 && box(u0, u1, 0, y0, 'b' + i), box(u0, u1, y1, h, 't' + i));
    if (glass) {
      const uc = (u0 + u1) / 2, len = u1 - u0, hh = y1 - y0, yc = (y0 + y1) / 2;
      parts.push(<mesh key={'g' + i} position={ax === 'x' ? [uc, yc, at] : [at, yc, uc]} rotation={ax === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0]}><planeGeometry args={[len, hh]} /><meshStandardMaterial color="#9fc4c8" transparent opacity={0.28} roughness={0.15} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>);
      const f = 0.05, fb = (pu, py, su, sy, k) => <Box key={k + i} p={ax === 'x' ? [uc + pu, yc + py, at] : [at, yc + py, uc + pu]} s={ax === 'x' ? [su, sy, t + 0.04] : [t + 0.04, sy, su]} color="#e8e2d2" cast={false} />;
      parts.push(fb(0, hh / 2, len + f, f, 'ft'), fb(0, -hh / 2, len + f, f, 'fb'), fb(-len / 2, 0, f, hh, 'fl'), fb(len / 2, 0, f, hh, 'fr'), fb(0, 0, f * 0.6, hh, 'fm'));
    }
    u = u1;
  });
  parts.push(box(u, b, 0, h, 'end'));
  return <group>{parts}</group>;
}

/** The office attached to the garage's right side: a small shed-roofed room with a desk, files and a coffee pot. Dusty, nothing clever. */
function Office({ power }) {
  const { x0, x1, z0, z1, H, entry } = OFFICE, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const wall = useMemo(() => { const m = corrugatedTex('#9a8f78', 37); m.repeat.set(2, 1); return m; }, []);
  const floor = useMemo(() => { const m = concreteTex(29); m.repeat.set(2, 2); return m; }, []);
  const ply = useMemo(() => { const m = wood('#a88a5c', '#5a4428', true, 43); m.repeat.set(4, 1); return m; }, []);
  const desk = useMemo(() => wood('#6e4f30', '#2e2012', false, 8), []);
  const door = useMemo(() => wood('#5a6e68', '#22302c', true, 12), []);
  const roof = useMemo(() => metalTex('#6a615a', 14), []);
  const sign = useMemo(() => signTex([['OFFICE', 64, '#f2c14e'], ['come on in', 30, '#cfd8d6']], '#1c2a2e', '#fff', '#f2c14e'), []);
  const wy = [1.0, 2.15];
  return <group>
    {/* floor slab (the garage slab already runs under the shared wall) */}
    <Box p={[cx + 0.1, 0.06, cz + 0.1]} s={[x1 - x0 + 0.7, 0.12, z1 - z0 + 0.8]} color="#fff" map={floor} rough={0.95} cast={false} />
    {/* walls: back (windowed), far (windowed), front (street door + window) */}
    <Wall ax="x" at={z0} a={x0} b={x1} h={H} map={wall} open={[[10.4, 12.0, wy[0], wy[1], true]]} />
    <Wall ax="z" at={x1} a={z0} b={z1} h={H} map={wall} open={[[1.4, 3.4, wy[0], wy[1], true]]} />
    <Wall ax="x" at={z1} a={x0} b={x1} h={H} map={wall} open={[[entry.x0, entry.x1, 0, 2.2, false], [11.0, 12.4, wy[0], wy[1], true]]} />
    {/* plywood lining inside, like the garage */}
    <Box p={[cx, 0.77, z0 + 0.12]} s={[x1 - x0 - 0.3, 1.3, 0.03]} color="#fff" map={ply} cast={false} />
    {/* the street door, standing open against its jamb, and a small awning with the sign */}
    <group position={[entry.x1, 1.05, z1 - 0.02]} rotation={[0, -1.5, 0]}><Box p={[-0.55, 0, 0]} s={[1.1, 2.1, 0.05]} color="#fff" map={door} /><Box p={[-0.2, 0, 0.04]} s={[0.06, 0.06, 0.05]} color="#c9a227" metal={0.8} rough={0.3} cast={false} /></group>
    <Box p={[(entry.x0 + entry.x1) / 2, 2.3, z1 + 0.5]} s={[2.0, 0.07, 1.1]} color="#fff" map={roof} rot={[0.08, 0, 0]} />
    {[entry.x0 - 0.7, entry.x1 + 0.7].map(x => <Box key={x} p={[x, 1.2, z1 + 0.95]} s={[0.07, 2.4, 0.07]} color="#3c4346" metal={0.5} />)}
    <mesh position={[(entry.x0 + entry.x1) / 2, 2.62, z1 + 0.06]}><boxGeometry args={[1.5, 0.36, 0.06]} /><meshStandardMaterial map={sign} roughness={0.7} /></mesh>
    {/* shed roof, sloping away from the garage */}
    <Box p={[cx + 0.2, H + 0.12, cz + 0.2]} s={[x1 - x0 + 0.9, 0.18, z1 - z0 + 1.2]} color="#fff" map={roof} rot={[0, 0, -0.035]} />
    {/* furniture: a big wooden desk under the far window, chair, files, shelf, coffee pot */}
    <group position={[x1 - 0.95, 0.12, 2.4]}>
      <Box p={[0, 0.74, 0]} s={[0.9, 0.07, 2.0]} color="#fff" map={desk} />
      {[[-0.35, -0.9], [0.35, -0.9], [-0.35, 0.9], [0.35, 0.9]].map(([x, z], i) => <Box key={i} p={[x, 0.36, z]} s={[0.07, 0.72, 0.07]} color="#4a331c" />)}
      <Box p={[-0.05, 0.4, 0.55]} s={[0.7, 0.62, 0.8]} color="#fff" map={desk} />
      <Box p={[0, 0.79, -0.3]} s={[0.4, 0.015, 0.55]} color="#7a7f60" rough={1} cast={false} />
      <Box p={[0.2, 0.82, 0.8]} s={[0.22, 0.1, 0.22]} color="#2a2a2a" metal={0.4} />
      <mesh position={[0.2, 1.05, 0.8]}><coneGeometry args={[0.13, 0.2, 10, 1, true]} /><meshStandardMaterial color="#2f6b3a" side={THREE.DoubleSide} roughness={0.6} /></mesh>
      <Box p={[-0.1, 0.8, 0.1]} s={[0.2, 0.06, 0.16]} color="#1c1c1c" rough={0.6} />
    </group>
    <group position={[x1 - 2.0, 0.12, 2.5]} rotation={[0, -1.7, 0]}>
      <Box p={[0, 0.48, 0]} s={[0.5, 0.06, 0.5]} color="#3b3f42" metal={0.4} /><Box p={[0, 0.78, -0.22]} s={[0.46, 0.5, 0.06]} color="#3b3f42" metal={0.4} />
      <Box p={[0, 0.24, 0]} s={[0.06, 0.48, 0.06]} color="#222" metal={0.6} /><Box p={[0, 0.04, 0]} s={[0.5, 0.05, 0.05]} color="#222" /><Box p={[0, 0.04, 0]} s={[0.05, 0.05, 0.5]} color="#222" />
    </group>
    {[0, 1].map(i => <group key={i} position={[x0 + 1.1 + i * 0.58, 0.12, z0 + 0.4]}>
      <Box p={[0, 0.65, 0]} s={[0.5, 1.3, 0.6]} color="#7d8579" metal={0.5} rough={0.55} />
      {[0.25, 0.65, 1.05].map(y => <Box key={y} p={[0, y, 0.31]} s={[0.4, 0.3, 0.02]} color="#6a7165" metal={0.5} cast={false} />)}
    </group>)}
    <group position={[11.7, 0.12, z0 + 0.3]}>
      <Box p={[0, 0.5, 0]} s={[1.5, 0.05, 0.4]} color="#fff" map={desk} /><Box p={[0, 1.1, 0]} s={[1.5, 0.05, 0.4]} color="#fff" map={desk} /><Box p={[0, 1.7, 0]} s={[1.5, 0.05, 0.4]} color="#fff" map={desk} />
      {[-0.7, 0.7].map(x => <Box key={x} p={[x, 0.85, 0]} s={[0.05, 1.7, 0.4]} color="#fff" map={desk} />)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Box key={i} p={[-0.6 + i * 0.17, 0.62 + (i % 2) * 0.6, 0]} s={[0.12, 0.22, 0.28]} color={['#2f4a63', '#7a2f26', '#3f5a3a', '#c9c4b6'][i % 4]} rough={0.9} cast={false} />)}
    </group>
    <group position={[x1 - 0.5, 0.12, z1 - 0.5]}>
      <Box p={[0, 0.3, 0]} s={[0.5, 0.6, 0.5]} color="#7d8579" metal={0.5} />
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.2, 10]} /><meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.5} /></mesh>
      <Box p={[0, 0.63, 0]} s={[0.22, 0.05, 0.22]} color="#1c1c1c" />
    </group>
    {/* a cork board with a few blank clipboards, and a clock over the doorway */}
    <Box p={[x0 + 0.12, 1.7, 1.2]} s={[0.04, 0.6, 0.9]} color="#a88a5c" rough={1} cast={false} />
    {[0.8, 1.2, 1.5].map((z, i) => <Box key={z} p={[x0 + 0.15, 1.7 + (i % 2) * 0.1, z]} s={[0.02, 0.22, 0.17]} color="#e8e0c8" rough={1} cast={false} />)}
    <mesh position={[x0 + 0.13, 2.05, 4.2]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.2, 20]} /><meshStandardMaterial color="#efe6cf" roughness={0.6} /></mesh>
    {/* light: fluorescent tube, dead until Walt's breaker is flipped */}
    <mesh position={[cx, H - 0.1, cz]}><boxGeometry args={[0.18, 0.07, 3.6]} /><meshStandardMaterial color={power ? '#fff6dc' : '#6d6a62'} emissive="#fff0c0" emissiveIntensity={power ? 1.4 : 0} /></mesh>
    <pointLight position={[cx, H - 0.7, cz]} intensity={power ? 11 : 2} distance={9} decay={1.6} color={power ? '#ffeccc' : '#b9a98a'} />
  </group>;
}

const barnShape = (w, wallH, ridge, door, doorH) => {
  const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, wallH); s.lineTo(0, ridge); s.lineTo(-w, wallH); s.lineTo(-w, 0);
  if (door) { const h = new THREE.Path(); h.moveTo(-door, 0); h.lineTo(-door, doorH); h.lineTo(door, doorH); h.lineTo(door, 0); h.lineTo(-door, 0); s.holes.push(h); }
  return s;
};

/** A weathered red barn with a hayloft: hay bales, barrels, crates (loot) and a lantern. */
function Barn() {
  const { w, d, door } = BARN, wallH = 5, ridge = 8.8, run = Math.hypot(w, ridge - wallH), ang = Math.atan2(ridge - wallH, w);
  const planks = useMemo(() => { const m = wood('#8f3b2d', '#2a0d08', true, 6); m.repeat.set(2, 1); return m; }, []);
  const roofMap = useMemo(() => metalTex('#7d8584', 12), []);
  const gableF = useMemo(() => new THREE.ExtrudeGeometry(barnShape(w, wallH, ridge, door, 4.2), { depth: 0.25, bevelEnabled: false }), [w, door]);
  const gableB = useMemo(() => new THREE.ExtrudeGeometry(barnShape(w, wallH, ridge), { depth: 0.25, bevelEnabled: false }), [w]);
  const hay = useMemo(() => canvasTex(128, 128, (g, W, Hh) => { const r = rnd(8); g.fillStyle = '#c9a45a'; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 1400; i++) { g.strokeStyle = ['#e0c07a', '#a9863f', '#d4b36c'][i % 3]; g.beginPath(); const x = r() * W, y = r() * Hh; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 6); g.stroke(); } g.fillStyle = '#5a4a28'; g.fillRect(W * 0.28, 0, 3, Hh); g.fillRect(W * 0.7, 0, 3, Hh); }, [1, 1]), []);
  const bale = (p, ry = 0, key) => <Box key={key} p={p} s={[1.5, 0.75, 0.8]} color="#fff" map={hay} rot={[0, ry, 0]} rough={1} />;
  return <group>
    {[[-w, 0, 'x'], [w, 0, 'x']].map(([x], i) => <Box key={i} p={[x, wallH / 2, 0]} s={[0.25, wallH, d * 2]} color="#fff" map={planks} />)}
    <mesh geometry={gableB} position={[0, 0, -d - 0.25]} castShadow receiveShadow><meshStandardMaterial map={planks} roughness={0.95} /></mesh>
    <mesh geometry={gableF} position={[0, 0, d]} castShadow receiveShadow><meshStandardMaterial map={planks} roughness={0.95} /></mesh>
    {[-1, 1].map(sd => <group key={sd} position={[sd * w * 0.5, (wallH + ridge) / 2 + 0.2, 0]} rotation={[0, 0, -sd * ang]}><Box p={[0, 0, 0]} s={[run + 0.9, 0.18, d * 2 + 1]} color="#fff" map={roofMap} metal={0.35} rough={0.6} /></group>)}
    {/* doors: open sliding panels + trim */}
    {[-1, 1].map(sd => <Box key={sd} p={[sd * (door + 0.9), 2.1, d + 0.45]} s={[1.8, 4.2, 0.12]} color="#fff" map={planks} />)}
    {[-1, 1].map(sd => [0.15, 4.2].map(y => <Box key={sd + '' + y} p={[sd * (door + 0.9), y, d + 0.52]} s={[1.9, 0.16, 0.08]} color="#e8e2d2" cast={false} />))}
    <Box p={[0, 4.3, d + 0.15]} s={[door * 2 + 0.5, 0.18, 0.3]} color="#e8e2d2" cast={false} />
    <mesh position={[0, 7.2, d + 0.3]} rotation={[0, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshStandardMaterial color="#1c1410" /></mesh>
    {/* hayloft */}
    <Box p={[0, 3.55, -d / 2 - 0.5]} s={[w * 2 - 0.4, 0.18, d - 1]} color="#fff" map={planks} />
    {[-w + 0.6, w - 0.6].map(x => [-d + 1, -d / 2 - 0.5, -1].map((z, k) => <Box key={x + '' + k} p={[x, 1.75, z]} s={[0.22, 3.5, 0.22]} color="#5b3a22" />))}
    {[[-5.6, -d + 1.6], [-4.0, -d + 1.6], [-5.6, -d + 3.2]].map(([x, z], i) => bale([x, 4.05, z], i, 'l' + i))}
    <Box p={[0, 4.4, -d / 2 + 0.2]} s={[w * 2 - 0.6, 0.08, 0.1]} color="#4a2f1b" />
    {/* ground-floor bales, barrels, tools */}
    {bale([-6.6, 0.4, -8.5], 0.1, 'a')}{bale([-6.5, 0.4, -6.6], -0.05, 'b')}{bale([-6.55, 1.17, -7.6], 0.08, 'c')}{bale([-6.5, 0.4, -4.4], 0.2, 'd')}
    {bale([6.4, 0.4, -9], 1.6, 'e')}{bale([6.5, 0.4, -7.1], 1.5, 'f')}{bale([6.5, 1.17, -8], 1.57, 'g')}
    {[[5.9, 4.5], [-6, 6.5], [-6.2, 7.8]].map(([x, z], i) => <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.45, 0.45, 1.1, 14]} /><meshStandardMaterial color={['#6e3a24', '#2f4a63', '#6b6f3a'][i]} metalness={0.4} roughness={0.7} /></mesh>)}
    <Box p={[0, 0.5, -d + 0.8]} s={[2.4, 1, 0.8]} color="#6b4a2a" rough={1} />
    <mesh position={[-1.2, 0.012, -2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.4, 20]} /><meshBasicMaterial color="#6e5a3a" transparent opacity={0.35} depthWrite={false} /></mesh>
    <group position={[0, 5.2, -2]}><mesh><cylinderGeometry args={[0.16, 0.16, 0.34, 10]} /><meshStandardMaterial color="#ffd48a" emissive="#ffb35a" emissiveIntensity={2} /></mesh></group>
    <pointLight position={[0, 4.6, -2]} intensity={55} distance={22} decay={1.5} color="#ffc27a" />
    <pointLight position={[0, 2.5, 6]} intensity={22} distance={14} decay={1.6} color="#ffe0b0" />
  </group>;
}

const priceTex = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#1c2a34'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8372b'; g.fillRect(0, 0, w, 150); g.fillStyle = '#fff'; g.font = '800 62px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('DUSTY', w / 2, 70); g.fillText('FUEL', w / 2, 132);
  g.font = '800 27px sans-serif'; g.fillStyle = '#9fc0c8'; ['REGULAR', 'PLUS', 'DIESEL'].forEach((t, i) => { g.fillStyle = '#9fc0c8'; g.textAlign = 'left'; g.fillText(t, 20, 220 + i * 90); g.fillStyle = '#ffd23f'; g.textAlign = 'right'; g.fillText(['3.89', '4.29', '4.55'][i], w - 20, 220 + i * 90); });
}, [1, 1]);

/** Dusty Fuel: canopy over two pump islands, a corner store, and a price pylon. Local +z = the pumps. */
function GasStation() {
  const sign = useMemo(() => signTex([['DUSTY FUEL & GO', 62, '#fff'], ['cold drinks · ice · parts', 34, '#ffd23f']], '#b02f26', '#fff', '#ffd23f'), []);
  const price = useMemo(priceTex, []);
  const asphalt = useMemo(() => { const t = asphaltTex(); t.repeat.set(5, 5); return t; }, []);
  const Pump = ({ x }) => <group position={[x, 0, 6.2]}>
    <Box p={[0, 0.1, 0]} s={[1.3, 0.2, 4.4]} color="#9a9a94" rough={1} />
    <Box p={[0, 0.95, 0]} s={[0.8, 1.7, 0.55]} color="#d9d6cc" rough={0.5} metal={0.2} /><Box p={[0, 1.2, 0.285]} s={[0.55, 0.4, 0.02]} color="#0c1f1a" emissive="#5bd8a0" ei={0.9} cast={false} />
    <Box p={[0, 1.75, 0]} s={[0.85, 0.28, 0.6]} color="#c8372b" rough={0.5} /><Box p={[0.36, 0.95, 0.1]} s={[0.1, 0.5, 0.1]} color="#222" />
  </group>;
  return <group>
    <mesh position={[0, 0.045, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[19.5, 40]} /><meshStandardMaterial map={asphalt} roughness={0.95} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} /></mesh>
    {/* store */}
    <Box p={[0, 2, -12]} s={[16, 4, 7]} color="#d8cfb4" rough={0.95} /><Box p={[0, 4.15, -12]} s={[16.6, 0.3, 7.6]} color="#7a2f26" />
    <Box p={[0, 1.7, -8.46]} s={[9, 2.2, 0.08]} color="#17262b" emissive="#8fd2e0" ei={0.45} rough={0.2} cast={false} /><Box p={[-5.6, 1.1, -8.46]} s={[1.2, 2.2, 0.1]} color="#4a2f1b" />
    <Box p={[0, 3.35, -8.35]} s={[7, 1, 0.1]} color="#fff" cast={false} />
    <mesh position={[0, 3.35, -8.29]}><planeGeometry args={[6.8, 0.9]} /><meshStandardMaterial map={sign} roughness={0.7} emissive="#ffffff" emissiveIntensity={0.25} /></mesh>
    {/* canopy */}
    <Box p={[0, 5.4, 4.5]} s={[16, 0.5, 10]} color="#e8e6dc" rough={0.7} /><Box p={[0, 5.4, 9.55]} s={[16.2, 0.62, 0.12]} color="#c8372b" /><Box p={[0, 5.4, -0.55]} s={[16.2, 0.62, 0.12]} color="#c8372b" />
    {[-7, 7].map(x => [0.8, 8.2].map(z => <Box key={x + '' + z} p={[x, 2.6, z]} s={[0.45, 5.2, 0.45]} color="#d8d6ce" metal={0.2} rough={0.6} />))}
    {[-3.6, 3.6].map(x => <Box key={x} p={[x, 5.12, 6.2]} s={[1.6, 0.06, 5]} color="#fff6dc" emissive="#fff0c0" ei={1.6} cast={false} />)}
    <Pump x={-3.6} /><Pump x={3.6} />
    <pointLight position={[0, 4.6, 5]} intensity={40} distance={16} decay={1.6} color="#fff0d0" />
    {/* pylon + clutter */}
    <group position={[12.5, 0, 12]}><Box p={[0, 3.5, 0]} s={[0.4, 7, 0.4]} color="#555a5e" metal={0.5} /><mesh position={[0, 6.3, 0.22]}><boxGeometry args={[2.4, 4.4, 0.18]} /><meshStandardMaterial map={price} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.6} /></mesh></group>
    <group position={[12, 0, -4]}>{[0, 1, 2].map(i => <mesh key={i} position={[0, 0.45 + i * 0.01, i * 0.9]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.9, 14]} /><meshStandardMaterial color={['#c8372b', '#2f5d86', '#bdbdb4'][i]} metalness={0.4} roughness={0.6} /></mesh>)}</group>
    <group position={[-13, 0, -10]}><Box p={[0, 1.1, 0]} s={[2.2, 2.2, 1.6]} color="#2f6a4a" metal={0.3} rough={0.7} /><Box p={[0, 2.3, 0]} s={[2.3, 0.16, 1.7]} color="#244f38" /></group>
    {[[-9, -5], [-9, -3.9], [-9, -2.8]].map(([x, z], i) => <Tire key={i} p={[x, 0.2 + i * 0.4, z]} rot={[Math.PI / 2, 0, 0]} />)}
    <group position={[10, 0, 8]}><mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, 1.2, 12]} /><meshStandardMaterial color="#d8d6ce" metalness={0.4} /></mesh><mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.28, 12, 8]} /><meshStandardMaterial color="#d8d6ce" /></mesh></group>
  </group>;
}

/** a run-down steel warehouse: 24 x 16 m, roll door open in +z, broken skylights. Pallet racks + benches come from loot.js */
function Warehouse() {
  const W = 12, D = 8, H = 6.5, t = 0.2, door = 4.2;
  const metal = useMemo(() => { const m = metalTex('#8a8f86', 21); m.repeat.set(5, 1.4); return m; }, []);
  const roof = useMemo(() => { const m = metalTex('#6c706b', 23); m.repeat.set(4, 3); return m; }, []);
  const gable = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-W, H - 0.05); sh.lineTo(W, H - 0.05); sh.lineTo(0, H + 1.05); sh.lineTo(-W, H - 0.05); return new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); }, []);
  const sign = useMemo(() => signTex([['SALVAGE & SURPLUS', 54, '#e8dcb0'], ['closed · keep out', 32, '#c8372b']], '#2c3234', '#fff', '#8a8f86'), []);
  return <group>
    <Box p={[0, 0.06, 0]} s={[W * 2, 0.12, D * 2]} color="#7e7f7a" rough={1} cast={false} />
    <Box p={[0, H / 2, -D]} s={[W * 2, H, t]} color="#fff" map={metal} /><Box p={[-W, H / 2, 0]} s={[t, H, D * 2]} color="#fff" map={metal} /><Box p={[W, H / 2, 0]} s={[t, H, D * 2]} color="#fff" map={metal} />
    <Box p={[-(W + door) / 2, H / 2, D]} s={[W - door, H, t]} color="#fff" map={metal} /><Box p={[(W + door) / 2, H / 2, D]} s={[W - door, H, t]} color="#fff" map={metal} />
    <Box p={[0, (H + 4.6) / 2, D]} s={[door * 2, H - 4.6, t]} color="#fff" map={metal} /><Box p={[0, 4.4, D - 0.2]} s={[door * 2, 0.45, 0.4]} color="#3a3f42" metal={0.4} />
    {[-1, 1].map(sd => <Box key={sd} p={[sd * W * 0.5, H + 0.35, 0]} s={[W + 0.4, 0.2, D * 2 + 0.6]} color="#fff" map={roof} rot={[0, 0, -sd * 0.1]} />)}
    {[-D - 0.1, D - 0.1].map(z => <mesh key={z} geometry={gable} position={[0, 0, z]}><meshStandardMaterial map={metal} side={THREE.DoubleSide} roughness={0.9} /></mesh>)}
    {[-6, 0, 6].map(x => <mesh key={x} position={[x, H + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 6]} /><meshStandardMaterial color="#c8d4c8" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>)}
    {[-8, -3, 3, 8].map((x, i) => <Box key={x} p={[x, 4.6, D + 0.12]} s={[2, 1, 0.05]} color={i % 2 ? '#1c2326' : '#2c383c'} rough={0.3} cast={false} />)}
    <mesh position={[0, 5.6, D + 0.13]}><planeGeometry args={[6.5, 1.2]} /><meshStandardMaterial map={sign} roughness={0.8} /></mesh>
    {/* clutter: drums, pallets, a dead engine block, tire pile */}
    {[[-3, 5.5], [-2.2, 6.1], [-3.7, 6.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.36, 0.36, 1.0, 14]} /><meshStandardMaterial color={['#2f5d86', '#6e3a24', '#3f6b3a'][i]} metalness={0.4} roughness={0.7} /></mesh>)}
    {[[10.5, 6.5], [-9.5, -4]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>{[0, 1, 2].map(k => <Box key={k} p={[0, 0.08 + k * 0.15, 0]} s={[1.2, 0.12, 1.0]} color="#9c7a48" rough={1} />)}</group>)}
    {[0, 1, 2, 3, 4].map(k => <Tire key={k} p={[10.6 + (k % 2) * 0.3, 0.6 + k * 0.28, -6]} rot={[0, 0, 0]} />)}
    <pointLight position={[0, H - 1, 0]} intensity={60} distance={30} decay={1.5} color="#e8eadc" />
  </group>;
}

/** a tumbledown plank shack (5.2 x 4.4 m), doorway in +z */
function Shack() {
  const planks = useMemo(() => { const m = wood('#7a6a58', '#2a2018', true, 31); m.repeat.set(1.4, 1); return m; }, []);
  const roof = useMemo(() => metalTex('#6f5a48', 33), []);
  const W = 2.6, D = 2.2, H = 2.6, door = 1.15;
  return <group>
    <Box p={[0, 0.05, 0]} s={[W * 2, 0.1, D * 2]} color="#6e5c48" rough={1} cast={false} />
    <Box p={[0, H / 2, -D]} s={[W * 2, H, 0.15]} color="#fff" map={planks} /><Box p={[-W, H / 2, 0]} s={[0.15, H, D * 2]} color="#fff" map={planks} /><Box p={[W, H / 2, 0]} s={[0.15, H, D * 2]} color="#fff" map={planks} />
    <Box p={[-(W + door) / 2, H / 2, D]} s={[W - door, H, 0.15]} color="#fff" map={planks} /><Box p={[(W + door) / 2, H / 2, D]} s={[W - door, H, 0.15]} color="#fff" map={planks} />
    <Box p={[0, H - 0.25, D]} s={[door * 2, 0.5, 0.15]} color="#fff" map={planks} />
    <Box p={[0, H + 0.25, 0.1]} s={[W * 2 + 0.6, 0.08, D * 2 + 0.9]} color="#fff" map={roof} rot={[0.12, 0, 0.03]} />
    <Box p={[door + 0.75, 1.05, D + 0.55]} s={[1.0, 2.0, 0.06]} color="#fff" map={planks} rot={[0, -1.2, 0]} />
    <pointLight position={[0, H - 0.4, 0]} intensity={10} distance={8} decay={1.6} color="#ffd9a0" />
  </group>;
}

/** workbenches and pallet racks that loot sits on */
function Furniture() {
  const top = useMemo(() => wood('#7d5f3d', '#33220f', false, 41), []);
  return <>{furniture.map((f, i) => <group key={i} position={[f.x, f.y, f.z]} rotation={[0, f.wry, 0]}>
    {f.type === 'bench' ? <>
      <Box p={[0, 0.92, 0]} s={[f.len, 0.08, 0.8]} color="#fff" map={top} />
      {[-1, 1].map(sd => <Box key={sd} p={[sd * (f.len / 2 - 0.12), 0.45, 0]} s={[0.1, 0.9, 0.7]} color="#4a4f52" metal={0.4} />)}
      <Box p={[0, 0.25, 0]} s={[f.len - 0.3, 0.05, 0.7]} color="#5b4630" />
    </> : <>
      {[-1, 1].flatMap(sd => [-0.45, 0.45].map(z => <Box key={sd + '' + z} p={[sd * (f.len / 2 - 0.05), 1.3, z]} s={[0.1, 2.6, 0.1]} color="#2f5f9e" metal={0.5} />))}
      {[0.1, 1.55].map(y => <Box key={y} p={[0, y, 0]} s={[f.len, 0.07, 1.0]} color="#d9962f" metal={0.4} />)}
    </>}
  </group>)}</>;
}

function Placed({ site, children }) { return <group position={[site.x, site.y, site.z]} rotation={[0, site.rot, 0]}>{children}</group>; }

/** cacti scattered over the open desert (the same positions the car and the walker collide with; the boulders are real rock models, Desert.jsx) */
function Scenery() {
  const cacti = useRef(), arms = useRef();
  const armList = useMemo(() => CACTI.filter(c => c.arms), []);
  useEffect(() => {
    const o = new THREE.Object3D();
    CACTI.forEach((p, i) => { o.position.set(p.x, height(p.x, p.z) + p.s, p.z); o.scale.set(0.34 * p.s, p.s * 2, 0.34 * p.s); o.rotation.set(0, p.ry, 0); o.updateMatrix(); cacti.current.setMatrixAt(i, o.matrix); });
    armList.forEach((p, i) => { o.position.set(p.x + Math.cos(p.ry) * 0.5 * p.s, height(p.x, p.z) + p.s * 1.5, p.z + Math.sin(p.ry) * 0.5 * p.s); o.scale.set(0.2 * p.s, p.s * 0.8, 0.2 * p.s); o.rotation.set(0, p.ry, Math.PI / 2 * 0.0); o.updateMatrix(); arms.current.setMatrixAt(i, o.matrix); });
    cacti.current.instanceMatrix.needsUpdate = arms.current.instanceMatrix.needsUpdate = true;
  }, [armList]);
  return <>
    <instancedMesh ref={cacti} args={[null, null, CACTI.length]} castShadow><cylinderGeometry args={[0.6, 0.8, 1, 10]} /><meshStandardMaterial color="#5a7a45" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, armList.length]} castShadow><cylinderGeometry args={[0.6, 0.7, 1, 8]} /><meshStandardMaterial color="#5a7a45" roughness={0.9} /></instancedMesh>
  </>;
}

/** big banded mesas far beyond the drivable map */
export function Mesas({ d0 = 470, dr = 120, sc = 1, n = 16 }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.55, 1, 1, 9, 8, false); const pos = g.attributes.position, col = [], c = new THREE.Color();
    const bands = ['#a5683f', '#b9825a', '#8e5333', '#c79568', '#9c6040'];
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.5, band = Math.floor(y * 9) % bands.length; c.set(bands[(band + (y > 0.98 ? 1 : 0)) % bands.length]); col.push(c.r, c.g, c.b); const a = Math.atan2(pos.getZ(i), pos.getX(i)); pos.setX(i, pos.getX(i) * (1 + 0.12 * Math.sin(a * 3 + y * 5))); pos.setZ(i, pos.getZ(i) * (1 + 0.12 * Math.cos(a * 2 + y * 4))); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  const list = useMemo(() => { const r = rnd(41); return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + r() * 0.3, d = d0 + r() * dr; return [Math.cos(a) * d, Math.sin(a) * d, (70 + r() * 90) * sc, (40 + r() * 70) * sc]; }); }, [d0, dr, sc, n]);
  return <>{list.map(([x, z, w, h], i) => <mesh key={i} geometry={geo} position={[x, h / 2 - 10, z]} scale={[w, h, w * 0.8]} rotation={[0, i, 0]}><meshStandardMaterial vertexColors roughness={1} flatShading /></mesh>)}</>;
}

export default function Sites() {
  return <>
    <Placed site={SITES.lot}><LotSite /></Placed>
    <Placed site={SITES.garage}><Garage /></Placed>
    <Placed site={SITES.barn}><Barn /></Placed>
    <Placed site={SITES.gas}><GasStation /></Placed>
    <Placed site={SITES.warehouse}><Warehouse /></Placed>
    <Placed site={SITES.shack1}><Shack /></Placed>
    <Placed site={SITES.shack2}><Shack /></Placed>
    <Placed site={SITES.shack3}><Shack /></Placed>
    <Furniture />
    <Scenery />
  </>;
}
