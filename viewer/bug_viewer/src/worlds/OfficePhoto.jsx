// A framed photo of grandpa's #7 on the office wall behind the reception counter (garage-local metres; drawn inside the garage group in Home.jsx).
// The #7 itself sits in a shed in Iron Flats (docs/CANON.md): this picture is how the one who takes over the garage first sees it.
// The photo is a real render of the #7's model (the same GLB as the car), warm-lit like an old print. Who is in it, when and where are UNKNOWN in canon, so it shows only the car.
import React, { Suspense, useMemo } from 'react';
import { useGLTF, RenderTexture, PerspectiveCamera } from '@react-three/drei';

const G7_FILE = '/models/VEH_007_Grandpa7.glb';
/** where it hangs: the office's west wall (inner face x -13.2), behind the counter, at eye height, facing into the office */
export const PHOTO = { x: -13.1, y: 1.75, z: 3.4, ry: Math.PI / 2, w: 0.72, h: 0.5 };

function Car() {
  const { scene } = useGLTF(G7_FILE);
  const obj = useMemo(() => scene.clone(true), [scene]);   // with its wheels: in the old photo it is whole
  return <primitive object={obj} />;
}

function Shot() {
  return <>
    <color attach="background" args={['#c9b48c']} />
    <PerspectiveCamera makeDefault position={[3.6, 1.3, 3.4]} fov={34} onUpdate={c => c.lookAt(0, 0.55, 0)} />
    <ambientLight intensity={0.9} color="#f3dfb6" />
    <directionalLight position={[4, 6, 3]} intensity={2.2} color="#ffe2b0" />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#b89a6c" /></mesh>
    <Suspense fallback={null}><Car /></Suspense>
  </>;
}

export function OfficePhoto() {
  const { x, y, z, ry, w, h } = PHOTO;
  return <group position={[x, y, z]} rotation={[0, ry, 0]}>
    <mesh position={[0, 0, -0.012]}><boxGeometry args={[w + 0.09, h + 0.09, 0.025]} /><meshStandardMaterial color="#3b2a1c" roughness={0.7} /></mesh>
    <mesh position={[0, 0, 0.001]}><planeGeometry args={[w + 0.03, h + 0.03]} /><meshStandardMaterial color="#efe6cf" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.003]}>
      <planeGeometry args={[w - 0.04, h - 0.04]} />
      <meshStandardMaterial roughness={0.85} color="#f1e2c4">
        <RenderTexture attach="map" width={512} height={352} frames={Infinity}><Shot /></RenderTexture>
      </meshStandardMaterial>
    </mesh>
  </group>;
}
