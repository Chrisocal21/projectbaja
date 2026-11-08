import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from './store.js';
import { sizeOf, nameOfItem, held } from './items.js';
import { containers } from './loot.js';
import { height } from '../worlds/county.js';
import { ShellProp } from '../BuildModel.jsx';

const DIM = { 1: [0.34, 0.3, 0.4], 2: [0.5, 0.4, 0.62], 3: [0.72, 0.5, 0.86], 4: [0.9, 0.62, 1.05] };
const labels = new Map();
function labelTex(text) {
  if (labels.has(text)) return labels.get(text);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#e9dcb8'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#a33a2e'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#2a1d10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 30px system-ui,sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).length > 14 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  lines.push(cur); lines.slice(0, 3).forEach((l, i, a) => g.fillText(l, 128, 64 + (i - (a.length - 1) / 2) * 34));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; labels.set(text, t); return t;
}
const kraft = ['#b58b55', '#a9854f', '#c29a62', '#9c7a48'];

/** a cardboard crate stencilled with the part's name; its bottom sits at y = 0 */
export function Crate({ item, scale = 1 }) {
  const s = sizeOf(item.kind, item.id), [w, h, d] = DIM[s], tex = useMemo(() => labelTex(nameOfItem(item)), [item.id, item.kind]);
  return <group scale={scale}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={kraft[item.uid % 4]} roughness={0.9} /></mesh>
    <mesh position={[0, h / 2, 0]}><boxGeometry args={[w + 0.01, 0.06, d + 0.01]} /><meshStandardMaterial color="#8a6a3c" roughness={0.9} /></mesh>
    <mesh position={[0, h / 2 + 0.02, d / 2 + 0.006]}><planeGeometry args={[w * 0.8, h * 0.62]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
    <mesh position={[0, h + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.7, d * 0.5]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
  </group>;
}

/** boxes lying around the world, plus the box in the player's hands */
export default function Items() {
  useGame();
  const heldRef = useRef(), { camera } = useThree();
  const loose = game.items.filter(i => i.loc === 'world'), hand = held();
  useFrame(() => {
    const g = heldRef.current; if (!g) return;
    g.visible = game.onFoot && !!held();
    if (!g.visible) return;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    g.position.copy(camera.position).addScaledVector(fwd, 0.85).addScaledVector(right, 0.22); g.position.y -= 0.5;
    g.rotation.set(0, camera.rotation.y, 0);
  });
  return <>
    {loose.filter(it => it.kind === 'shell').map(it => <group key={it.uid} position={[it.x, height(it.x, it.z) + 0.06, it.z]} rotation={[0, it.ry || 0, 0]}><React.Suspense fallback={null}><ShellProp bodyId={it.id} /></React.Suspense></group>)}
    {loose.filter(it => it.kind !== 'shell').map(it => <group key={it.uid} position={[it.x, height(it.x, it.z) + (it.y || 0), it.z]} rotation={[0, it.ry ?? it.uid * 1.7, 0]}><Crate item={it} /></group>)}
    {containers.map(c => <group key={c.id} position={[c.x, c.y, c.z]} rotation={[0, c.wry, 0]}><Container type={c.type} open={!!game.boxes[c.id]?.searched} /></group>)}
    <group ref={heldRef} visible={false}>{hand && <Crate item={hand} scale={0.75} />}</group>
  </>;
}

const CAB = [[-0.3, 0.62, -0.6], [0.3, 0.62, -0.6], [0, 0.95, -0.6], [0, 0.62, -1.15]];
const TRUCK_CAB = [[-0.35, 1.05, -0.55], [0.35, 1.05, -0.55], [0, 1.35, -0.55]];
/** what a vehicle is carrying: the Bug's cab and roof rack, a truck's cab and bed. Rendered inside the vehicle so it moves with it. */
export function Cargo({ veh }) {
  useGame();
  const v = veh || game.active, mine = game.items.filter(i => i.loc === 'car' && (i.veh || 'bug') === v);
  if (v !== 'bug') {   // truck: crates stand in two rows on the bed floor
    let row = [0, 0];
    return <>{mine.map((it, i) => { const [w, , d] = DIM[sizeOf(it.kind, it.id)]; if (it.spot === 'cab') return <group key={it.uid} position={TRUCK_CAB[i % 3]}><Crate item={it} scale={0.7} /></group>;
      const side = row[0] <= row[1] ? 0 : 1, z = -0.75 - row[side] - d / 2; row[side] += d + 0.06; return <group key={it.uid} position={[side ? -0.42 : 0.42, 0.98, z]}><Crate item={it} /></group>; })}</>;
  }
  const cab = mine.filter(i => i.spot === 'cab'), roof = mine.filter(i => i.spot === 'roof');
  let z = -0.5;
  return <>
    {cab.map((it, i) => <group key={it.uid} position={CAB[i % 4]}><Crate item={it} scale={0.8} /></group>)}
    {roof.map(it => { const d = DIM[sizeOf(it.kind, it.id)][2] * 0.85, p = z + d / 2; z += d + 0.05; return <group key={it.uid} position={[0, 1.66, p]}><Crate item={it} scale={0.85} /></group>; })}
  </>;
}

const M = ({ c, r = 0.6, m = 0 }) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
/** toolbox / tool chest / cardboard box / wooden crate; `open` once it has been searched */
function Container({ type, open }) {
  if (type === 'toolbox') return <group>
    <mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.56, 0.22, 0.26]} /><M c="#b3261e" r={0.45} m={0.5} /></mesh>
    <group position={[0, 0.22, -0.13]} rotation={[open ? -1.9 : 0, 0, 0]}><mesh position={[0, 0.03, 0.13]} castShadow><boxGeometry args={[0.57, 0.06, 0.27]} /><M c="#c22d24" r={0.45} m={0.5} /></mesh></group>
    {!open && <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.24, 0.03, 0.03]} /><M c="#222" m={0.6} /></mesh>}
  </group>;
  if (type === 'drawer') return <group>
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow><boxGeometry args={[0.72, 1, 0.5]} /><M c="#a32a22" r={0.5} m={0.45} /></mesh>
    {[0.2, 0.42, 0.64, 0.86].map((y, i) => <mesh key={y} position={[0, y, 0.255 + (open && i === 3 ? 0.3 : 0)]}><boxGeometry args={[0.66, 0.18, open && i === 3 ? 0.5 : 0.02]} /><M c="#8c221b" r={0.5} m={0.45} /></mesh>)}
    {[0.2, 0.42, 0.64, 0.86].map((y, i) => <mesh key={'h' + y} position={[0, y, 0.275 + (open && i === 3 ? 0.55 : 0)]}><boxGeometry args={[0.3, 0.025, 0.025]} /><M c="#ccc" m={0.8} r={0.3} /></mesh>)}
  </group>;
  if (type === 'box') return <group>
    <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[0.55, 0.4, 0.5]} /><M c="#b08a58" r={0.95} /></mesh>
    {[-1, 1].map(sd => <mesh key={sd} position={[sd * 0.14, 0.4, 0]} rotation={[0, 0, open ? sd * 2.2 : 0]}><boxGeometry args={[0.27, 0.01, 0.5]} /><M c="#a47f50" r={0.95} /></mesh>)}
  </group>;
  return <group>
    <mesh position={[0, 0.43, 0]} castShadow receiveShadow><boxGeometry args={[0.92, 0.86, 0.92]} /><M c="#8a6a42" r={0.95} /></mesh>
    {[0.1, 0.43, 0.76].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.95, 0.09, 0.95]} /><M c="#6e5233" r={0.95} /></mesh>)}
    <mesh position={open ? [0.62, 0.45, 0] : [0, 0.89, 0]} rotation={open ? [0, 0, 1.35] : [0, 0, 0]} castShadow><boxGeometry args={[0.96, 0.06, 0.96]} /><M c="#7a5c38" r={0.95} /></mesh>
  </group>;
}
