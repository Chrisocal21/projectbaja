import React, { useEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { game, useGame } from '../game/store.js';
import Pickup from '../Pickup.jsx';

/** Honest Al's Used Cars: a dusty lot at the edge of the desert where the player starts, on foot, with a pocket of cash. */
export const LOT = { x0: -30, x1: 30, z0: -20, z1: 22, gate: 3.2 };
export const BUG_PRICE = 1800, SECOND_PRICE = 2300;
const BUG = { x: 9, z: -4, r: 0.6 }, TARP = { x: -6.5, z: -6, r: -0.4 }, OFFICE = { x: -18, z: -13 };
export const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t;
};
export const signTex = (lines, bg = '#f2e6c0', fg = '#2a1d10', accent = '#b2362a') => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = accent; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([txt, size, color], i) => { g.font = `800 ${size}px Impact, 'Arial Black', sans-serif`; g.fillStyle = color || fg; g.fillText(txt, w / 2, (h * (i + 1)) / (lines.length + 1)); });
});
export const asphaltTex = () => canvasTex(512, 512, (g, w, h) => {
  const r = rnd(5); g.fillStyle = '#4d4b48'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 90, 30 + r() * 70, r() * 3, 0, 6.3); g.fill(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = ['#6a6762', '#383634', '#7d7a74', '#2b2927'][Math.floor(r() * 4)]; g.globalAlpha = 0.5; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(12,12,12,0.7)'; g.lineWidth = 1.4;
  for (let k = 0; k < 14; k++) { let x = r() * w, y = r() * h, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 25; i++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 7; y += Math.sin(a) * 7; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(20,16,10,0.35)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 14, 7 + r() * 10, r() * 3, 0, 6.3); g.fill(); }
}, [10, 7]);
const chainTex = () => canvasTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#a9aeb2'; g.lineWidth = 2.2;
  for (let i = -h; i < w + h; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
}, null);
const dirtTex = () => canvasTex(512, 512, (g, w, h) => {
  const r = rnd(9); g.fillStyle = '#a58d66'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30000; i++) { g.fillStyle = ['#b8a077', '#8d7653', '#c2ab82', '#7a6546'][Math.floor(r() * 4)]; g.globalAlpha = 0.5; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
  g.globalAlpha = 1; for (let i = 0; i < 160; i++) { g.fillStyle = ['#9a8e7a', '#7d725f', '#b4a78e'][Math.floor(r() * 3)]; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2, r() * 3, 0, 6.3); g.fill(); }
}, [30, 30]);

// ---- colliders (circles in lot-local coordinates) and what can be looked at ----
export const LOT_CIRCLES = [];
(() => {
  const circles = LOT_CIRCLES;
  const addCar = c => { const fx = Math.sin(c.r), fz = Math.cos(c.r); for (const k of [-1.3, 0, 1.3]) circles.push([c.x + fx * k, c.z + fz * k, 1.25]); };
  addCar(TARP);
  for (let x = -22.5; x <= -13.5; x += 1.8) for (let z = -15.5; z <= -10.5; z += 1.7) circles.push([x, z, 1.4]);
  [[22, -14], [22.8, -14.6], [21.6, -15.2]].forEach(([x, z]) => circles.push([x, z, 0.45]));
  [[25, 10], [27, 9]].forEach(([x, z]) => circles.push([x, z, 0.7]));
  [[-20, 12], [20, 12]].forEach(([x, z]) => circles.push([x, z, 0.3]));
  for (let x = LOT.x0; x <= LOT.x1; x += 1.2) { circles.push([x, LOT.z0, 0.5]); if (Math.abs(x) > LOT.gate) circles.push([x, LOT.z1, 0.5]); }
  for (let z = LOT.z0; z <= LOT.z1; z += 1.2) { circles.push([LOT.x0, z, 0.5]); circles.push([LOT.x1, z, 0.5]); }
})();
/** lot-local spots: where the parked Bug sits, plus things to talk to */
export const LOT_SPOTS = { bug: BUG, tarp: TARP, al: { x: OFFICE.x, z: OFFICE.z + 4.2 } };

function Fence() {
  const chain = useMemo(chainTex, []), posts = useRef();
  const sides = useMemo(() => {
    const s = [], w = LOT.x1 - LOT.x0, d = LOT.z1 - LOT.z0, cx = (LOT.x0 + LOT.x1) / 2, cz = (LOT.z0 + LOT.z1) / 2, half = (w - LOT.gate * 2) / 2;
    s.push({ p: [cx, 1, LOT.z0], ry: 0, len: w }); s.push({ p: [LOT.x0, 1, cz], ry: Math.PI / 2, len: d }); s.push({ p: [LOT.x1, 1, cz], ry: Math.PI / 2, len: d });
    s.push({ p: [LOT.x0 + half / 2, 1, LOT.z1], ry: 0, len: half }); s.push({ p: [LOT.x1 - half / 2, 1, LOT.z1], ry: 0, len: half }); return s;
  }, []);
  const postPts = useMemo(() => { const a = []; for (let x = LOT.x0; x <= LOT.x1; x += 3) { a.push([x, LOT.z0]); if (Math.abs(x) > LOT.gate) a.push([x, LOT.z1]); } for (let z = LOT.z0; z <= LOT.z1; z += 3) { a.push([LOT.x0, z]); a.push([LOT.x1, z]); } a.push([-LOT.gate, LOT.z1], [LOT.gate, LOT.z1]); return a; }, []);
  useEffect(() => { const m = new THREE.Object3D(); postPts.forEach(([x, z], i) => { m.position.set(x, 1.05, z); m.updateMatrix(); posts.current.setMatrixAt(i, m.matrix); }); posts.current.instanceMatrix.needsUpdate = true; }, [postPts]);
  return <>
    <instancedMesh ref={posts} args={[null, null, postPts.length]} castShadow><boxGeometry args={[0.1, 2.1, 0.1]} /><meshStandardMaterial color="#7d8185" metalness={0.6} roughness={0.5} /></instancedMesh>
    {sides.map((s, i) => { const t = chain.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(s.len / 0.45, 2 / 0.45);
      return <group key={i} position={s.p} rotation={[0, s.ry, 0]}>
        <mesh><planeGeometry args={[s.len, 2]} /><meshStandardMaterial map={t} transparent alphaTest={0.4} side={THREE.DoubleSide} metalness={0.5} roughness={0.6} /></mesh>
        <mesh position={[0, 1.02, 0]}><boxGeometry args={[s.len, 0.05, 0.05]} /><meshStandardMaterial color="#7d8185" metalness={0.6} roughness={0.5} /></mesh>
      </group>; })}
  </>;
}

function Office() {
  const sign = useMemo(() => signTex([["HONEST AL'S", 78], ['USED CARS — CASH TALKS', 40, '#b2362a']], '#f2e6c0'), []);
  return <group position={[OFFICE.x, 0, OFFICE.z]}>
    <mesh position={[0, 1.6, 0]} castShadow receiveShadow><boxGeometry args={[9, 3.2, 5.5]} /><meshStandardMaterial color="#c9bfa6" roughness={0.95} /></mesh>
    <mesh position={[0, 3.35, 0]} castShadow><boxGeometry args={[9.8, 0.25, 6.3]} /><meshStandardMaterial color="#6a3d2b" roughness={0.9} /></mesh>
    <mesh position={[0, 0.05, 3.6]} receiveShadow><boxGeometry args={[9.6, 0.1, 1.8]} /><meshStandardMaterial color="#8b8880" roughness={1} /></mesh>
    <mesh position={[-1.6, 1.1, 2.76]}><boxGeometry args={[1.1, 2.2, 0.08]} /><meshStandardMaterial color="#5b3a22" roughness={0.8} /></mesh>
    <mesh position={[2, 1.7, 2.76]}><boxGeometry args={[2.8, 1.3, 0.08]} /><meshStandardMaterial color="#1b2a30" emissive="#e8c97a" emissiveIntensity={0.55} roughness={0.2} /></mesh>
    <mesh position={[0, 3.3, 3.3]} rotation={[0.25, 0, 0]} castShadow><boxGeometry args={[9.8, 0.08, 1.4]} /><meshStandardMaterial color="#a33a2e" roughness={0.8} /></mesh>
    <mesh position={[0, 4.4, 1.2]}><planeGeometry args={[6.4, 3.2]} /><meshBasicMaterial map={sign} side={THREE.DoubleSide} /></mesh>
    {[-2.6, 2.6].map(x => <mesh key={x} position={[x, 3.9, 1.2]}><boxGeometry args={[0.1, 1.2, 0.1]} /><meshStandardMaterial color="#444" /></mesh>)}
    <mesh position={[3.6, 3.7, -1]} castShadow><boxGeometry args={[1.3, 0.6, 1]} /><meshStandardMaterial color="#9ea3a6" metalness={0.5} roughness={0.5} /></mesh>
  </group>;
}

function Bunting() {
  const mesh = useRef(), N = 54;
  useEffect(() => {
    const m = new THREE.Object3D(), cols = ['#c8372b', '#f2c84b', '#2f6fb0', '#f4efe2', '#3f8a4e'], c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), x = -26 + t * 52, y = 3.6 - Math.sin(t * Math.PI) * 0 - 0.55 * Math.sin(((t * 4) % 1) * Math.PI) ;
      m.position.set(x, y, 17); m.rotation.set(0, 0, 0); m.updateMatrix(); mesh.current.setMatrixAt(i, m.matrix); mesh.current.setColorAt(i, c.set(cols[i % cols.length]));
    }
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.instanceColor.needsUpdate = true;
  }, []);
  const tri = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3)); g.computeVertexNormals(); return g; }, []);
  return <>
    <instancedMesh ref={mesh} args={[tri, null, N]}><meshStandardMaterial side={THREE.DoubleSide} roughness={0.9} /></instancedMesh>
    <mesh position={[0, 3.62, 17]}><boxGeometry args={[52, 0.015, 0.015]} /><meshStandardMaterial color="#222" /></mesh>
    {[-26, 26].map(x => <mesh key={x} position={[x, 1.9, 17]} castShadow><cylinderGeometry args={[0.07, 0.09, 3.8, 8]} /><meshStandardMaterial color="#6b5a45" /></mesh>)}
  </>;
}

function PriceSign({ at, rot = 0, lines, bg, fg, accent }) {
  const tex = useMemo(() => signTex(lines, bg, fg, accent), [JSON.stringify(lines)]);
  return <group position={[at[0], 0, at[1]]} rotation={[0, rot, 0]}>
    {[-0.55, 0.55].map(x => <mesh key={x} position={[x, 0.45, 0]} castShadow><boxGeometry args={[0.05, 0.9, 0.05]} /><meshStandardMaterial color="#3a3a3a" /></mesh>)}
    <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[1.4, 0.7, 0.04]} /><meshStandardMaterial map={tex} roughness={0.7} /></mesh>
  </group>;
}

function TarpCar() {
  return <group position={[TARP.x, 0, TARP.z]} rotation={[0, TARP.r, 0]}>
    <RoundedBox args={[1.95, 0.85, 4.1]} radius={0.28} position={[0, 0.82, 0]} castShadow receiveShadow><meshStandardMaterial color="#6d737b" roughness={1} /></RoundedBox>
    {[[0, 1.3, -0.2, 0.92, 0.5, 1.2], [0, 1.0, 1.45, 0.9, 0.3, 0.85], [0, 1.05, -1.55, 0.85, 0.3, 0.7]].map(([x, y, z, sx, sy, sz], i) => <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#737a82" roughness={1} /></mesh>)}
    {[[0.9, 1.3], [-0.9, 1.3], [0.9, -1.3], [-0.9, -1.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.32, 0.32, 0.24, 18]} /><meshStandardMaterial color="#141414" roughness={0.95} /></mesh>)}
    {[-1, 0.2, 1.4].map(z => <mesh key={z} position={[0, 1.02, z]}><boxGeometry args={[2.0, 0.025, 0.04]} /><meshStandardMaterial color="#222" /></mesh>)}
  </group>;
}

function Props() {
  const bigSign = useMemo(() => signTex([['USED CARS', 96, '#fff'], ['CASH ONLY · NO REFUNDS', 36, '#ffd23f']], '#1f5c3a', '#fff', '#ffd23f'), []);
  return <>
    {[[22, -14], [22.8, -14.6], [21.6, -15.2]].map(([x, z], i) => <mesh key={i} position={[x, 0.45, z]} castShadow><cylinderGeometry args={[0.32, 0.32, 0.9, 14]} /><meshStandardMaterial color={['#8b2e2a', '#2f5d86', '#6b6f3a'][i]} metalness={0.5} roughness={0.55} /></mesh>)}
    {[[25, 10], [27, 9]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>{[0, 1, 2, 3].map(k => <mesh key={k} position={[0, 0.15 + k * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.32, 0.15, 10, 18]} /><meshStandardMaterial color="#161616" roughness={0.95} /></mesh>)}</group>)}
    {[[-20, 12], [20, 12]].map(([x, z], i) => <group key={i} position={[x, 0, z]}><mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 4.4, 8]} /><meshStandardMaterial color="#555" metalness={0.5} /></mesh><mesh position={[0.5, 4.35, 0]}><boxGeometry args={[1.1, 0.12, 0.35]} /><meshStandardMaterial color="#e8dcb0" emissive="#e8dcb0" emissiveIntensity={0.4} /></mesh></group>)}
    <group position={[-9, 0, 30]} rotation={[0, 0.15, 0]}>{[-2.2, 2.2].map(x => <mesh key={x} position={[x, 2.2, 0]} castShadow><boxGeometry args={[0.18, 4.4, 0.18]} /><meshStandardMaterial color="#5b4630" /></mesh>)}<mesh position={[0, 3.6, 0.12]} castShadow><planeGeometry args={[5.6, 2.1]} /><meshBasicMaterial map={bigSign} side={THREE.DoubleSide} /></mesh></group>
  </>;
}

function Ground() {
  const asphalt = useMemo(asphaltTex, []);
  const pad = [['bug', BUG], ['tarp', TARP]];
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 1]} receiveShadow><planeGeometry args={[LOT.x1 - LOT.x0, LOT.z1 - LOT.z0]} /><meshStandardMaterial map={asphalt} roughness={0.95} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} /></mesh>
    {pad.map(([k, c]) => <mesh key={k} position={[c.x, 0.09, c.z]} rotation={[0, c.r, 0]} receiveShadow><boxGeometry args={[3.6, 0.04, 6]} /><meshStandardMaterial color="#8b8880" roughness={1} /></mesh>)}
  </>;
}

/** Honest Al's Used Cars, drawn in lot-local coordinates (put it in a group at the site). The Bug itself is the player's real, drivable car. */
export default function LotSite() {
  useGame();
  const owned = game.owned.has('car:bug');
  return <>
    <Ground /><Fence /><Office /><Bunting /><Props /><group position={[TARP.x, 0.06, TARP.z]} rotation={[0, TARP.r, 0]}><Pickup /></group>
    <PriceSign at={[BUG.x + 3.6, BUG.z + 3.4]} rot={-0.45} lines={owned ? [['SOLD', 120, '#fff']] : [["'71 CLASSIC BUG", 52], ['RUNS (MOSTLY)', 38, '#b2362a'], [`$${BUG_PRICE.toLocaleString()}`, 70]]} bg={owned ? '#b2362a' : '#f2e6c0'} />
    <PriceSign at={[TARP.x + 3.6, TARP.z + 3.2]} rot={-0.2} lines={[["'78 PICKUP", 56], ['NEEDS A MOTOR', 36, '#b2362a'], [`$${SECOND_PRICE.toLocaleString()}`, 70]]} />
  </>;
}
export { BUG, TARP };
