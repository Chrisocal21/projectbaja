import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { game, openCrate, setPrompt } from './store.js';
import { lootCrate } from './items.js';
import * as TC from '../worlds/testcenter.js';
import { lootSpots } from '../worlds/siteData.js';

const at = (path, f) => { const p = path.pts[Math.floor(path.pts.length * f)]; return [p.x, p.z]; };

/** Where the shop and the loot crates sit in each world. */
export function placesFor(kind) {
  if (kind === 'test') return { shop: { x: 16, z: 18, rot: -2.2 }, crates: [[-18, -14], [24, -22], [-30, 22], [-200, -304], [-250, -304], at(TC.dirtRoad, 0.3), at(TC.dirtRoad, 0.7), at(TC.offroad, 0.25), at(TC.offroad, 0.6), [200, -120], ...lootSpots()] };
  if (kind === 'open') return { shop: { x: 14, z: -16, rot: -2.2 }, crates: [[28, 14], [-34, 40], [52, -34], [-62, -52], [10, 90], [-90, 20]] };
  return { shop: { x: -22, z: 10, rot: 0.6 }, crates: [[20, -15], [40, 70], [-30, 60], [70, 40], [-60, -30]] };   // pro pad
}

function signTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#16382a'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f4d3a1'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#f4d3a1'; g.font = '800 64px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAJA PARTS', 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Shop({ spot, height, prompts }) {
  const y = height(spot.x, spot.z), tex = useMemo(signTexture, []), ring = useRef();
  useFrame(() => {
    const near = Math.hypot(game.pos.x - spot.x, game.pos.z - spot.z) < 11;
    if (prompts) { if (near) setPrompt('Press E — Parts shop'); else if (game.prompt.startsWith('Press E')) setPrompt(''); }
    if (ring.current) ring.current.material.opacity = near ? 0.9 : 0.4;
  });
  return <group position={[spot.x, y, spot.z]} rotation={[0, spot.rot, 0]}>
    <mesh position={[0, 2, 0]} castShadow receiveShadow><boxGeometry args={[9, 4, 6]} /><meshStandardMaterial color="#cfc8b8" roughness={0.9} /></mesh>
    <mesh position={[0, 4.15, 0]} castShadow><boxGeometry args={[9.6, 0.3, 6.6]} /><meshStandardMaterial color="#3a3f44" /></mesh>
    <mesh position={[0, 3.2, 3.9]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[9, 0.12, 2]} /><meshStandardMaterial color="#a33a2e" /></mesh>
    <mesh position={[0, 1.4, 3.01]}><boxGeometry args={[5, 2.4, 0.1]} /><meshStandardMaterial color="#1b2a30" emissive="#3a6a78" emissiveIntensity={0.6} /></mesh>
    <mesh position={[0, 5.2, 0]}><planeGeometry args={[6, 1.5]} /><meshBasicMaterial map={tex} side={THREE.DoubleSide} /></mesh>
    <mesh ref={ring} position={[0, 0.06, 6.5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.4, 4, 40]} /><meshBasicMaterial color="#5be08a" transparent opacity={0.5} depthWrite={false} /></mesh>
    <mesh position={[0, 11, 6.5]}><cylinderGeometry args={[0.25, 0.25, 22, 8]} /><meshBasicMaterial color="#5be08a" transparent opacity={0.25} depthWrite={false} /></mesh>
  </group>;
}

function Crates({ spots, height, kind, bodyId }) {
  const refs = useRef([]);
  const list = useMemo(() => spots.map(([x, z], i) => ({ x, z, y: height(x, z), id: `${kind}:${i}` })), [spots, height, kind]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, now = performance.now();
    list.forEach((c, i) => {
      const g = refs.current[i]; if (!g) return;
      const live = !(game.crates[c.id] > now); g.visible = live;
      if (!live || game.paused) return;
      g.rotation.y = t * 1.2 + i; g.position.y = c.y + 1.1 + Math.sin(t * 2 + i) * 0.15;
      if (Math.hypot(game.pos.x - c.x, game.pos.z - c.z) < 3.6) { game.crates[c.id] = now + 60000; g.visible = false; if (game.dev) openCrate(bodyId); else lootCrate(bodyId, c.x + 1.6, c.z + 1.6); }
    });
  });
  return <>{list.map((c, i) => <group key={c.id} ref={el => (refs.current[i] = el)} position={[c.x, c.y + 1.1, c.z]}>
    <mesh castShadow><boxGeometry args={[0.95, 0.95, 0.95]} /><meshStandardMaterial color="#c58a3a" roughness={0.7} /></mesh>
    <mesh><boxGeometry args={[1.02, 0.18, 1.02]} /><meshStandardMaterial color="#f4d34a" emissive="#f4d34a" emissiveIntensity={0.5} /></mesh>
    <mesh position={[0, 9, 0]}><cylinderGeometry args={[0.12, 0.12, 18, 6]} /><meshBasicMaterial color="#ffd23f" transparent opacity={0.3} depthWrite={false} /></mesh>
  </group>)}</>;
}

export default function GameObjects({ kind, height, bodyId }) {
  const p = useMemo(() => placesFor(kind), [kind]);
  return <><Shop spot={p.shop} height={height} prompts={kind !== 'test'} /><Crates spots={p.crates} height={height} kind={kind} bodyId={bodyId} /></>;
}
