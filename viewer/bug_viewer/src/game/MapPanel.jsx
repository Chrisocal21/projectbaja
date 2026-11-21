import React from 'react';
import WestCoastMap from './WestCoastMap.jsx';

export const LABELS = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Barn', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds HQ' };

export default function MapPanel({ onClose }) {
  return <div className="overlay"><div className="card map-card">
    <div className="shop-head"><h2>WEST COAST</h2><button onClick={onClose}>Close (M)</button></div>
    <WestCoastMap />
  </div></div>;
}
