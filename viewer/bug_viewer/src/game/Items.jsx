import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from './store.js';
import { sizeOf, nameOfItem, held } from './items.js';
import { height } from '../worlds/testcenter.js';

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
    {loose.map(it => <group key={it.uid} position={[it.x, height(it.x, it.z), it.z]} rotation={[0, it.uid * 1.7, 0]}><Crate item={it} /></group>)}
    <group ref={heldRef} visible={false}>{hand && <Crate item={hand} scale={0.75} />}</group>
  </>;
}

const CAB = [[-0.3, 0.62, -0.6], [0.3, 0.62, -0.6], [0, 0.95, -0.6], [0, 0.62, -1.15]];
/** what the car is carrying: inside the cab, and up on the roof rack. Rendered inside the vehicle so it moves with it. */
export function Cargo() {
  useGame();
  const cab = game.items.filter(i => i.loc === 'car' && i.spot === 'cab'), roof = game.items.filter(i => i.loc === 'car' && i.spot === 'roof');
  let z = -0.5;
  return <>
    {cab.map((it, i) => <group key={it.uid} position={CAB[i % 4]}><Crate item={it} scale={0.8} /></group>)}
    {roof.map(it => { const d = DIM[sizeOf(it.kind, it.id)][2] * 0.85, p = z + d / 2; z += d + 0.05; return <group key={it.uid} position={[0, 1.66, p]}><Crate item={it} scale={0.85} /></group>; })}
  </>;
}
