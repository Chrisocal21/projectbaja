import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/** A real person model (game/people.js). No skeleton: they stand as modelled. */
function Model({ file }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const copy = useMemo(() => { const c = scene.clone(true); c.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return c; }, [scene]);
  return <primitive object={copy} dispose={null} />;
}
/** position is ground level, facing +z */
export default function Person({ file, ...props }) {
  return <group {...props}><Suspense fallback={null}><Model file={file} /></Suspense></group>;
}
