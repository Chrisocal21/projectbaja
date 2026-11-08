import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

const FILE = '/models/VEH_010_Pickup.glb';

/**
 * The '84 4x4 pickup (assets/truck/export_truck.py): the GLB has its bed at +z, so every child is turned 180 deg about Y here (the nose is +z, as the drive sim wants; wheel nodes swap names FL<->RR, FR<->RL to stay with their corner), ground at y = 0, wheels are separate `Wheel_FL/FR/RL/RR` nodes
 * so the drive rig can spin and steer them. Each instance is its own clone (the active truck's wheels get re-parented by the rig).
 */
export default function TruckModel() {
  const { scene } = useGLTF(FILE);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material?.isMeshStandardMaterial && o.material.metalness > 0.3) { o.material = o.material.clone(); o.material.metalness = 0.25; } if (o.material?.name === 'Glass') { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } } });
    const flip = new THREE.Group(); flip.name = 'TruckFlip'; flip.rotation.y = Math.PI;   // bed was at +z, the sim drives +z: turn the model, keep the car frame
    [...c.children].forEach(k => flip.add(k)); c.add(flip);
    const swap = { FL: 'RR', FR: 'RL', RL: 'FR', RR: 'FL' };
    c.traverse(o => { const m = /^(C?Wheel_)(FL|FR|RL|RR)$/.exec(o.name); if (m) o.name = m[1] + swap[m[2]]; });
    return c;
  }, [scene]);
  return <primitive object={obj} />;
}
useGLTF.preload(FILE);
