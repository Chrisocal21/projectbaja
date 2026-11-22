import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import ToolModel from './game/ToolModel.jsx';

function View({ id }) {
  return <section style={{ width: 500, height: 620 }}>
    <h2 style={{ color: '#eee2c7', font: '700 20px system-ui', letterSpacing: 2 }}>{id === 'jack' ? 'FLOOR JACK' : 'COMBINATION WRENCH'}</h2>
    <div style={{ width: 500, height: 550, background: '#554b3d' }}><Canvas camera={{ position: [0, 0, 1.25], fov: 42 }}>
      <color attach="background" args={['#554b3d']} />
      <ambientLight intensity={2.2} /><directionalLight position={[2, 4, 4]} intensity={3} />
      <group position={[0, 0.06, 0]} rotation={[0, id === 'jack' ? -0.4 : -0.25, -0.1]} scale={id === 'jack' ? 1.25 : 1.75}><ToolModel id={id} /></group>
    </Canvas></div>
  </section>;
}

document.body.style.margin = '0';
createRoot(document.getElementById('root')).render(<main style={{ minHeight: '100vh', padding: 38, boxSizing: 'border-box', background: '#302b25' }}>
  <h1 style={{ color: '#e5d6b9', font: '700 30px system-ui' }}>BAJA · FIRST-PERSON TOOLS</h1>
  <div style={{ display: 'flex', gap: 40 }}><View id="wrench" /><View id="jack" /></div>
</main>);
