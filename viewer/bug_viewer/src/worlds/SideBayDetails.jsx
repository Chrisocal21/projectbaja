import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SIDE_BAY as B, roofAt } from './sideBay.js';

const Steel = ({ p, s, rot, color = '#606b67' }) => <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} metalness={0.45} roughness={0.72} /></mesh>;

/** Decorative only; leaves the doorway, slab, roof and collision dimensions intact. */
export default function SideBayDetails({ power = false }) {
  const wear = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
    const g = canvas.getContext('2d');
    // Two lightly scuffed wheel paths and a few old drips below the engine bay.
    for (const x of [183, 329]) for (let j = 0; j < 24; j++) {
      g.fillStyle = `rgba(47,42,32,${0.025 + (j % 5) * 0.007})`;
      g.fillRect(x - 11 + Math.sin(j * 8) * 4, 200 + j * 29, 23, 20);
    }
    for (let i = 0; i < 23; i++) {
      const x = 240 + Math.sin(i * 7.3) * 49, y = 446 + Math.cos(i * 3.7) * 66, r = 3 + (i % 7) * 3;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, '#302d2390'); grad.addColorStop(1, '#302d2300');
      g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => wear.dispose(), [wear]);
  const target = useMemo(() => { const object = new THREE.Object3D(); object.position.set(10, 0, -0.4); return object; }, []);
  const slope = Math.atan((B.hHigh - B.hLow) / (B.x1 - B.x0));
  return <group name="SideBayArt">
    {/* Head flashing tucks under the main eave; end fascias cover the exposed roof edge. */}
    <Steel p={[B.x0 + 0.12, B.hHigh + 0.16, 0]} s={[0.42, 0.045, 12.65]} rot={[0, 0, -slope]} />
    <Steel p={[B.x0 - 0.07, B.hHigh + 0.24, 0]} s={[0.045, 0.24, 12.65]} />
    {[-6.29, 6.29].map(z => <Steel key={z} p={[10, roofAt(10) + 0.04, z]} s={[6.55, 0.22, 0.065]} rot={[0, 0, -slope]} />)}
    <Steel p={[13.22, roofAt(13.22) + 0.04, 0]} s={[0.065, 0.22, 12.65]} />
    {/* Open roller door: the same slat seam, track recess and steel finish as the main bay. */}
    {Array.from({ length: 4 }, (_, i) => <Steel key={i} p={[10, B.door.h + 0.107 + i * 0.11, 6.16]} s={[3.9, 0.009, 0.012]} color="#373b38" />)}
    {[7.9, 12.1].map(x => <Steel key={x} p={[x, 1.55, 6.225]} s={[0.025, 3.1, 0.02]} color="#2d3130" />)}
    <Steel p={[10, 3.045, 5.85]} s={[4, 0.13, 0.25]} color="#2c3234" />
    <mesh position={[10, 0.123, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5.6, 11.5]} /><meshBasicMaterial map={wear} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh>
    {/* Task fixture on the back wall, independent lens and metal housing. */}
    <Steel p={[10, 2.75, -5.82]} s={[0.55, 0.29, 0.15]} color="#39403c" />
    <mesh name="SideBayWorkLightLens" position={[10, 2.75, -5.733]}><boxGeometry args={[0.46, 0.19, 0.022]} /><meshStandardMaterial color={power ? '#fff3d5' : '#aaa99c'} emissive="#ffedc0" emissiveIntensity={power ? 1.6 : 0} roughness={0.5} /></mesh>
    <primitive object={target} />
    <spotLight position={[10, 2.72, -5.62]} target={target} intensity={power ? 32 : 0} distance={9} angle={0.9} penumbra={0.65} color="#fff0d5" />
  </group>;
}
