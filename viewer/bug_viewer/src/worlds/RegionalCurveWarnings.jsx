import React, { useEffect, useMemo } from 'react';
import { useNearSites } from './drawDistance.js';
import * as THREE from 'three';
import { highways, groundHeight } from './county.js';
import { border } from './border.js';
import { curveWarnings } from './roadsideWarnings.js';

function warningTexture(turn) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 128);
  g.fillStyle = '#e9b83f'; g.strokeStyle = '#28251d'; g.lineWidth = 11;
  g.beginPath(); g.moveTo(0, -113); g.lineTo(113, 0); g.lineTo(0, 113); g.lineTo(-113, 0); g.closePath(); g.fill(); g.stroke();
  g.scale(turn === 'left' ? -1 : 1, 1);
  g.strokeStyle = '#24231e'; g.lineWidth = 22; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-49, 65); g.lineTo(-49, 12); g.quadraticCurveTo(-49, -42, 29, -42); g.stroke();
  g.fillStyle = '#24231e'; g.beginPath(); g.moveTo(59, -42); g.lineTo(17, -70); g.lineTo(17, -14); g.closePath(); g.fill();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export default function RegionalCurveWarnings() {
  const sites = useMemo(() => curveWarnings(highways(), border().waterAt, groundHeight), []);
  const maps = useMemo(() => ({ left: warningTexture('left'), right: warningTexture('right') }), []);
  useEffect(() => () => Object.values(maps).forEach(map => map.dispose()), [maps]);
  const near = useNearSites(sites);   // only the signs within the draw distance exist
  return <>{near.map(k => sites[k]).map((p, i) => <group key={near[i]} position={[p.x, p.y, p.z]} rotation={[0, p.h, 0]}>
    <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.045, 0.055, 2.7, 6]} /><meshStandardMaterial color="#817f78" metalness={0.45} roughness={0.7} /></mesh>
    <mesh position={[0, 2.66, 0.02]} castShadow><planeGeometry args={[1.25, 1.25]} /><meshStandardMaterial map={maps[p.turn]} transparent alphaTest={0.05} side={THREE.DoubleSide} roughness={0.78} /></mesh>
  </group>)}</>;
}
