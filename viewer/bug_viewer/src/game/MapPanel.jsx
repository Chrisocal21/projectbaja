import React from 'react';
import WestCoastMap from './WestCoastMap.jsx';

export const LABELS = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Barn', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds HQ' };

export default function MapPanel({ onClose }) {
  return <div className="map-full">
    <WestCoastMap />
    <div className="map-top"><h2>WEST COAST</h2><button onClick={onClose}>Close (M)</button></div>
  </div>;
}
