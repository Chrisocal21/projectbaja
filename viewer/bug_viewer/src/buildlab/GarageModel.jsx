// Walt's garage, building shell only, for the Build Sandbox. Origin = the garage's own origin (garage-local 0, 0); +z = the roller door.
// The main hall is a THIN COPY of the shell parts of Garage() in worlds/Sites.jsx (slab, apron, walls, door header, roof, gables,
// front posts, sign): that function can't be reused as-is because it also draws the lift, bench, lamps and reads the live save.
// If the garage's shell changes in Sites.jsx, change it here too. PROPOSAL: move the shell into its own component in worlds/ so both share it.
// The office wing is the game's own component (worlds/GarageWing.jsx; it only READS game state, which on this page is the empty default
// because storageGuard.js hides the save: no cut doorways, no office upgrade). The back and right walls are worlds/OriginalWall.jsx.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { corrugatedTex, metalTex, wood } from '../worlds/Sites.jsx';
import { signTex } from '../lot/CarLot.jsx';
import { propertyTexture } from '../worlds/propertyTextures.js';
import { GARAGE } from '../worlds/siteData.js';
import { OFFICE } from '../worlds/office.js';
import OriginalWall from '../worlds/OriginalWall.jsx';
import GarageWing from '../worlds/GarageWing.jsx';

const Box = ({ p, s, color = '#fff', map, rough = 0.9, metal = 0, rot, cast = true }) => <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} map={map} roughness={rough} metalness={metal} /></mesh>;

export default function GarageModel() {
  const { w, d, door } = GARAGE, t = 0.2, H = 4.6;
  const tx = useMemo(() => {
    const wallBack = corrugatedTex('#8a9893'); wallBack.repeat.set(5, 1);
    const wallSide = corrugatedTex('#8a9893', 33); wallSide.repeat.set(4, 1);
    const wallFront = corrugatedTex('#8a9893', 35); wallFront.repeat.set(1.3, 1);
    const ply = wood('#a88a5c', '#5a4428', true, 41); ply.repeat.set(6, 1);
    return { wallBack, wallSide, wallFront, ply, roof: metalTex('#59615f', 9), floor: propertyTexture(7, 5, 4), apron: propertyTexture(7, 3, 2), bench: wood('#8a6a44', '#3a2a18', false, 4),
      sign: signTex([["WALT'S GARAGE", 66, '#803c29'], ['REPAIR · WELDING · SALVAGE', 30, '#59422e']], '#d4bd8d', '#74583b', '#a28a62') };
  }, []);
  const gable = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, 0, 2.3, 0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); return g; }, [w]);
  const { wallBack, wallSide, wallFront, ply, roof, floor, apron, bench, sign } = tx;
  return <group>
    <Box p={[0, 0.06, 0]} s={[w * 2 + 1.2, 0.12, d * 2 + 1.2]} map={floor} rough={0.95} cast={false} />
    <Box p={[0, 0.07, d + 2.6]} s={[door * 2 + 2, 0.1, 5]} map={apron} rough={0.95} cast={false} />
    <OriginalWall which="B" map={wallBack} lining={ply} open={[]} /><OriginalWall which="R" map={wallSide} lining={ply} open={[]} />
    <Box p={[-w, H / 2, (-d + OFFICE.inner.z0) / 2]} s={[t, H, OFFICE.inner.z0 + d]} map={wallSide} />
    <Box p={[-w, H / 2, (d + OFFICE.inner.z1) / 2]} s={[t, H, d - OFFICE.inner.z1]} map={wallSide} />
    <Box p={[-w, (H + 2.4) / 2, (OFFICE.inner.z0 + OFFICE.inner.z1) / 2]} s={[t, H - 2.4, OFFICE.inner.z1 - OFFICE.inner.z0]} map={wallSide} />
    <Box p={[-(w + door) / 2, H / 2, d]} s={[w - door, H, t]} map={wallFront} /><Box p={[(w + door) / 2, H / 2, d]} s={[w - door, H, t]} map={wallFront} />
    <Box p={[0, (H + 3.7) / 2, d]} s={[door * 2, H - 3.7, t]} map={wallFront} />
    <Box p={[0, 3.62, d - 0.15]} s={[door * 2, 0.35, 0.3]} color="#2c3234" metal={0.4} />
    {[-1, 1].map(side => <Box key={side} p={[side * 3.65, H + 1.15, 0]} s={[7.75, 0.16, 13]} color="#b4a08a" map={roof} rot={[0, 0, -side * Math.atan(2.3 / 7.3)]} />)}
    {[-d, d].map(z => <mesh key={z} position={[0, H, z]} geometry={gable} castShadow receiveShadow><meshStandardMaterial map={wallBack} color="#b5a28a" roughness={0.9} side={THREE.DoubleSide} /></mesh>)}
    <Box p={[0, H + 2.35, 0]} s={[0.2, 0.16, 13.2]} color="#79523a" metal={0.4} />
    {[-7, -3.65, 3.65, 7].map(x => <Box key={x} p={[x, 2.3, 6.15]} s={[0.18, 4.6, 0.22]} map={bench} color="#a18b68" />)}
    {[-1, 1].map(side => <Box key={side} p={[side * 3.65, H + 1.15, 6.16]} s={[7.75, 0.18, 0.2]} map={bench} color="#8c7151" rot={[0, 0, -side * Math.atan(2.3 / 7.3)]} />)}
    {[-4.5, -1.5, 1.5, 4.5].map(z => <Box key={z} p={[0, H - 0.1, z]} s={[w * 2, 0.22, 0.1]} color="#3c4346" metal={0.6} rough={0.5} />)}
    <mesh position={[0, H + 0.75, d + 0.2]}><boxGeometry args={[6, 1.15, 0.12]} /><meshStandardMaterial map={sign} roughness={0.7} /></mesh>
    <GarageWing wall={wallSide} timber={bench} roof={roof} floor={floor} power={false} />
  </group>;
}
