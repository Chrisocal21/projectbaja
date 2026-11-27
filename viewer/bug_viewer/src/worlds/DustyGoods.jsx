// The things for sale at Dusty's, standing on their shelf spots with a price card. Kept outside the merged static
// meshes (their models load late). Taking one is dustyShop.takeGood; the shelf stays stocked.
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GOODS_SPOTS } from './dustyGoods.js';
import { SITES } from './county.js';
import { toWorld } from './kit.js';
import { STORE_ITEMS } from '../game/jobs.js';
import { MAT_PACKS } from '../game/materials.js';

function PriceCard({ price }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#f4ecd2'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#7a1f14'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$' + price, 64, 35);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [price]);
  return <mesh><planeGeometry args={[0.2, 0.1]} /><meshBasicMaterial map={map} side={THREE.DoubleSide} /></mesh>;
}

/** Item is Items.jsx's Crate, passed in so the two files do not import each other */
export default function DustyGoods({ Item }) {
  const ref = useRef(), { camera } = useThree(), s = SITES.gas;
  useFrame(() => { if (ref.current) ref.current.visible = Math.hypot(camera.position.x - s.x, camera.position.z - s.z) < 60; });
  return <group ref={ref} visible={false}>{GOODS_SPOTS.map(([what, lx, ly, lz]) => {
    const [kind, id] = what.split(':'), [x, z] = toWorld(s, lx, lz), price = STORE_ITEMS.find(r => r[0] === what)[2];
    const onFloor = ly < 0.2, depth = onFloor ? 0.42 : 0.38;
    return <group key={what} position={[x, s.y + ly, z]} rotation={[0, s.rot, 0]}>
      <group scale={onFloor || kind === 'stock' || kind === 'junk' ? 1 : 1.4}><Item item={{ uid: 0, kind, id, n: MAT_PACKS[id]?.n }} /></group>
      {/* the card faces the aisle: the island is read from both sides */}
      <group position={[0, onFloor ? 0.06 : -0.05, depth]}><PriceCard price={price} /></group>
      {kind !== 'mat' && ly > 0.9 && lz > -14 && <group position={[0, -0.05, -depth]} rotation={[0, Math.PI, 0]}><PriceCard price={price} /></group>}
    </group>;
  })}</group>;
}
