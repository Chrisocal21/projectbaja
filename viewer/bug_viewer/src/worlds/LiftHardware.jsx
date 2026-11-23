import React from 'react';

// Shared by the movable starter lift and the installed second bay.
export default function LiftHardware() {
  return <>
    {[-1, 1].map(side => <group key={side} position={[side * 1.65, 0, 0]}>
      <mesh position={[-side * 0.153, 1.94, 0]}><boxGeometry args={[0.028, 3.18, 0.18]} /><meshStandardMaterial color="#494b46" metalness={0.55} roughness={0.45} /></mesh>
      <mesh position={[-side * 0.18, 1.92, 0]}><cylinderGeometry args={[0.033, 0.033, 3.12, 12]} /><meshStandardMaterial color="#b5b6ab" metalness={0.68} roughness={0.32} /></mesh>
      {[1.05, -1].map(z => <mesh key={z} position={[-side * 0.27, 0.31, z]} castShadow><cylinderGeometry args={[0.098, 0.083, 0.058, 16]} /><meshStandardMaterial color="#373632" roughness={0.87} /></mesh>)}
      {[-0.23, 0.23].flatMap(x => [-0.22, 0.22].map(z => <mesh key={x + '/' + z} position={[x, 0.049, z]}><cylinderGeometry args={[0.027, 0.027, 0.038, 6]} /><meshStandardMaterial color="#928b79" metalness={0.55} /></mesh>))}
    </group>)}
    <mesh position={[1.95, 0.79, 0]} castShadow><cylinderGeometry args={[0.108, 0.096, 0.37, 16]} /><meshStandardMaterial color="#c1b999" roughness={0.58} /></mesh>
    <mesh position={[1.95, 1.43, 0]} castShadow><cylinderGeometry args={[0.083, 0.083, 0.26, 16]} /><meshStandardMaterial color="#4b514d" metalness={0.44} /></mesh>
    <mesh position={[1.95, 1.1, 0.163]}><boxGeometry args={[0.195, 0.29, 0.024]} /><meshStandardMaterial color="#d2cabc" /></mesh>
    {['#a63c32', '#526f51'].map((color, i) => <mesh key={color} position={[1.95, 1.04 + i * 0.11, 0.187]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.029, 0.033, 0.028, 12]} /><meshStandardMaterial color={color} /></mesh>)}
  </>;
}
