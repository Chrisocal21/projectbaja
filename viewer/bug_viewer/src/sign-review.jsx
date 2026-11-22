import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { raceSignTexture, roadsideBoardTexture } from './worlds/raceSignTexture.js';

function Sign({ name, series, place = false }) {
  const ref = useRef();
  useEffect(() => {
    const draw = () => ref.current?.getContext('2d').drawImage(texture.image, 0, 0);
    const texture = place ? roadsideBoardTexture(name, series, false, draw) : raceSignTexture(name, series, false, draw);
    draw();
    return () => texture.dispose();
  }, [name, series]);
  const wood = series === 'MDR';
  return <div style={{ position: 'relative', width: 512, height: 365, display: 'flex', justifyContent: 'center' }}>
    <div style={{ position: 'absolute', top: 75, left: 65, width: 18, height: 290, background: wood ? '#796244' : '#807d72' }} />
    <div style={{ position: 'absolute', top: 75, right: 65, width: 18, height: 290, background: wood ? '#796244' : '#807d72' }} />
    <canvas ref={ref} width="512" height="256" style={{ position: 'relative', width: 430, height: 215, border: `8px solid ${wood ? '#6e593e' : '#746f5f'}`, boxShadow: '0 12px 18px #3a2c1f55' }} />
  </div>;
}

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
createRoot(document.getElementById('root')).render(<main style={{ height: '100vh', boxSizing: 'border-box', background: 'linear-gradient(#c9bdab 0%, #d5c3a4 48%, #a7855e 48%)', padding: '70px 34px', fontFamily: 'system-ui' }}>
  <h1 style={{ margin: '0 0 70px', color: '#382b1e', textAlign: 'center' }}>PROJECT BAJA · ROADSIDE SIGN MATERIALS</h1>
  <div style={{ display: 'flex', justifyContent: 'center', gap: 45, flexWrap: 'wrap' }}><Sign name="Baja 500" series="SCORE" /><Sign name="Ocotillo Loop" series="MDR" /><Sign name="Ensenada" series="MEXICO 1" place /></div>
</main>);
