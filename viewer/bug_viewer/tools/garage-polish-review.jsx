// Standalone art review. Run through esbuild, serve the game root, and open dist/garage-polish.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import SideBayDetails from '../src/worlds/SideBayDetails.jsx';
import RackTire from '../src/worlds/RackTire.jsx';

function Box({ p, s, color = '#87918a', rot }) { return <mesh position={p} rotation={rot} receiveShadow castShadow><boxGeometry args={s} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>; }
createRoot(document.getElementById('root')).render(<Canvas shadows camera={{ position: [19, 9, 18], fov: 43, near: 0.1, far: 100 }} onCreated={({ camera }) => camera.lookAt(9, 1.6, 0)}>
  <color attach="background" args={['#c5cccb']} /><ambientLight intensity={1.1} /><directionalLight position={[5, 12, 9]} intensity={3} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
  <Box p={[10,0.06,0]} s={[6.6,.12,13.2]} color="#a5a59b" />
  <Box p={[10,1.8,-6]} s={[6,3.6,.2]} /><Box p={[13,1.8,0]} s={[.2,3.6,12]} />
  <Box p={[7,2.3,0]} s={[.2,4.6,12]} color="#7a8982" />
  <Box p={[10,4.2,0]} s={[6.55,.14,12.6]} color="#b4a08a" rot={[0,0,-Math.atan(1/6)]} />
  {[7.5,12.5].map(x=><Box key={x} p={[x,1.8,6]} s={[1,3.6,.2]} />)}
  <Box p={[10,3.35,6]} s={[4,.5,.2]} />
  {Array.from({length:4},(_,i)=><Box key={i} p={[10,3.16+i*.11,6.13]} s={[3.9,.1,.045]} color={i%2?'#8d9188':'#777971'} />)}
  {[7.9,12.1].map(x=><Box key={x} p={[x,1.55,6.13]} s={[.12,3.1,.15]} color="#59605c" />)}
  <SideBayDetails power />
  {/* A shelf in front of the bay makes sidewalls and tread visible at the existing tight spacing. */}
  <group position={[8.5,.15,8]}>
    <Box p={[0,0,0]} s={[2.2,.08,.75]} color="#355875" />
    {[-.75,-.25,.25,.75].map((x,i)=><group key={i} position={[x,.04,0]}><RackTire dia={.72} width={.25} upright /></group>)}
  </group>
</Canvas>);
