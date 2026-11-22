import React from 'react';
import { createRoot } from 'react-dom/client';
import WestCoastMap from './game/WestCoastMap.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <main style={{ minHeight: '100vh', background: '#171c1c', display: 'grid', placeItems: 'center', padding: 24 }}>
    <section style={{ color: '#eee2c7', width: 'min(100%, 960px)' }}>
      <h1 style={{ fontSize: 24, margin: '0 0 16px' }}>WEST COAST · MAP REVIEW</h1>
      <WestCoastMap />
    </section>
  </main>
);
