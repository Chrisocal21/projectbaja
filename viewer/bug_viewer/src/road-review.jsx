import React from 'react';
import { createRoot } from 'react-dom/client';
import { blacktop, shoulderTex } from './worlds/County.jsx';

function Sample({ title, texture, width }) {
  const image = texture.image;
  return <section style={{ width }}><h2 style={{ fontSize: 16, letterSpacing: 2 }}>{title}</h2><img src={image.toDataURL()} style={{ width: '100%', height: 650, objectFit: 'cover', border: '1px solid #a69375' }} /></section>;
}

document.body.style.margin = '0';
createRoot(document.getElementById('root')).render(<main style={{ background: '#c4b399', color: '#352c22', minHeight: '100vh', boxSizing: 'border-box', padding: 28, fontFamily: 'system-ui' }}>
  <h1 style={{ margin: '0 0 12px' }}>BAJA ROAD SURFACES</h1>
  <p style={{ margin: '0 0 24px' }}>Paved route, gravel shoulder, and secondary route texture preview</p>
  <div style={{ display: 'flex', gap: 24 }}><Sample title="MEX 1 · PAVED" texture={blacktop('double')()} width={360} /><Sample title="GRAVEL VERGE" texture={shoulderTex()} width={220} /><Sample title="SECONDARY ROAD" texture={blacktop('dashed')()} width={360} /></div>
</main>);
