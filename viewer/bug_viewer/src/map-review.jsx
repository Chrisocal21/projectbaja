import React from 'react';
import { createRoot } from 'react-dom/client';
import WestCoastMap from './game/WestCoastMap.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <div className="map-full"><WestCoastMap /><div className="map-top"><h2>WEST COAST · MAP REVIEW</h2></div></div>
);
