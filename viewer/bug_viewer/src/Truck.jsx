import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

const FILE = '/models/VEH_010_Pickup.glb';

/**
 * The '84 4x4 pickup (assets/truck/export_truck.py): +z forward, ground at y = 0, wheels are separate `Wheel_FL/FR/RL/RR` nodes
 * so the drive rig can spin and steer them. Each instance is its own clone (the active truck's wheels get re-parented by the rig).
 */
export default function TruckModel() {
  const { scene } = useGLTF(FILE);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material?.isMeshStandardMaterial && o.material.metalness > 0.3) { o.material = o.material.clone(); o.material.metalness = 0.25; } if (o.material?.name === 'Glass') { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } } });
    return c;
  }, [scene]);
  return <primitive object={obj} />;
}
useGLTF.preload(FILE);
