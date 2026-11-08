import React, { useEffect, useRef, useState } from 'react';
import { game, useGame } from './store.js';
import { SIZE, HALF, surface, height, ROADS, TRAILS, SITES, BIOMES, circuit, offroad, dirtStrip, startLine } from '../worlds/county.js';
import { standingVehicles, vehicleType } from './fleet.js';

/** the county drawn once (surface colours + hill shading + roads); markers are drawn on top every time the map opens */
const PX = 640, STEP = SIZE / PX * 1.25;
let base = null;
function baseMap() {
  if (base) return base;
  const c = document.createElement('canvas'); c.width = c.height = PX; const g = c.getContext('2d');
  const n = Math.floor(PX / 1.25), img = g.createImageData(n, n), hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cache = new Map();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -HALF + (i + 0.5) * STEP, z = HALF - (j + 0.5) * STEP;   // north (+z) at the top
    const sf = surface(x, z), col = cache.get(sf.key) || (cache.set(sf.key, hex(sf.color)), cache.get(sf.key));
    const h = height(x, z), shade = 1 + Math.max(-0.35, Math.min(0.35, (height(x - STEP, z + STEP) - h) * 0.09)) + Math.min(0.25, Math.max(0, h - 20) * 0.006);
    const k = (j * n + i) * 4; img.data[k] = col[0] * shade; img.data[k + 1] = col[1] * shade; img.data[k + 2] = col[2] * shade; img.data[k + 3] = 255;
  }
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = n; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, PX, PX);
  const P = (x, z) => [(x + HALF) / SIZE * PX, (HALF - z) / SIZE * PX];
  const line = (pts, w, col, closed) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => { if (i % 6) return; const [a, b] = P(p.x, p.z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); if (closed) g.closePath(); g.stroke(); };
  const W = { highway: [4, '#2b2d30'], street: [3.5, '#2b2d30'], gravel: [2.4, '#8b7f68'], dirt: [2, '#9a7a4e'] };
  for (const r of ROADS) { line(r.path.pts, W[r.kind][0] + 2, '#00000055'); line(r.path.pts, W[r.kind][0], W[r.kind][1]); }
  for (const r of ROADS.filter(r => r.kind === 'highway')) { g.setLineDash([6, 6]); line(r.path.pts, 1, '#e8c23a'); g.setLineDash([]); }
  for (const t of TRAILS) { g.setLineDash([4, 4]); line(t.path.pts, 2, '#6b4a2a', true); g.setLineDash([]); }
  line(circuit.pts, 4, '#33363a', true); line(offroad.pts, 3, '#6b4a2a', true); line(dirtStrip.pts, 3, '#9a7a4e');
  g.font = '700 13px system-ui, sans-serif'; g.textAlign = 'center';
  for (const b of Object.values(BIOMES)) { if (b.name === "Grandpa's place") continue; const [a, c2] = P(b.x, b.z + (b.rz || b.r || 100) * 0.55); g.fillStyle = '#ffffffcc'; g.strokeStyle = '#00000088'; g.lineWidth = 3; g.strokeText(b.name.toUpperCase(), a, c2); g.fillText(b.name.toUpperCase(), a, c2); }
  base = c; return c;
}
const LABELS = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Barn', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds HQ' };

export default function MapPanel({ onClose }) {
  useGame();
  const ref = useRef(), [zoom, setZoom] = useState(1);
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'), m = baseMap();
    const pl = game.pos, s = zoom, cx = (pl.x + HALF) / SIZE * PX, cz = (HALF - pl.z) / SIZE * PX;
    g.clearRect(0, 0, PX, PX); g.save();
    if (s > 1) { g.translate(PX / 2, PX / 2); g.scale(s, s); g.translate(-cx, -cz); }
    g.drawImage(m, 0, 0);
    const P = (x, z) => [(x + HALF) / SIZE * PX, (HALF - z) / SIZE * PX];
    g.font = `600 ${11 / s}px system-ui, sans-serif`; g.textAlign = 'left';
    for (const [k, label] of Object.entries(LABELS)) { const st = SITES[k], [a, b] = P(st.x, st.z); g.fillStyle = k === 'garage' ? '#f2c14e' : '#ffffff'; g.beginPath(); g.arc(a, b, (k === 'garage' ? 5 : 3.5) / s, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1 / s; g.stroke(); g.lineWidth = 3 / s; g.strokeStyle = '#000000aa'; g.strokeText(label, a + 6 / s, b + 4 / s); g.fillText(label, a + 6 / s, b + 4 / s); }
    for (const v of standingVehicles()) if (!v.forSale) { const [a, b] = P(v.pose.x, v.pose.z); g.fillStyle = '#5bd8ff'; g.fillRect(a - 3 / s, b - 3 / s, 6 / s, 6 / s); g.fillStyle = '#fff'; g.fillText(vehicleType(v.id).name, a + 6 / s, b - 4 / s); }
    if (game.job) { const [a, b] = P(game.job.x, game.job.z); g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(a, b, 5 / s, 0, 7); g.fill(); }
    // you: an arrow pointing where you face (on foot) or drive
    const [a, b] = P(pl.x, pl.z), yaw = game.onFoot ? Math.atan2(game.face.x, game.face.z) : (game.pose?.h || 0);
    g.translate(a, b); g.rotate(Math.PI - yaw); g.fillStyle = '#ff4a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 / s;
    g.beginPath(); g.moveTo(0, -9 / s); g.lineTo(6 / s, 7 / s); g.lineTo(0, 3 / s); g.lineTo(-6 / s, 7 / s); g.closePath(); g.fill(); g.stroke();
    g.restore();
    void startLine;
  }, [zoom, game.pos.x, game.pos.z]);
  return <div className="overlay"><div className="card map-card">
    <div className="shop-head"><h2>BAJA COUNTY</h2><span className="map-btns"><button onClick={() => setZoom(z => (z === 1 ? 3 : 1))}>{zoom === 1 ? 'Zoom in' : 'Whole county'}</button><button onClick={onClose}>Close (M)</button></span></div>
    <canvas ref={ref} width={PX} height={PX} className="map-canvas" />
    <p className="hint">Red arrow — you · blue — your parked vehicles{game.job ? ' · orange — a customer waiting' : ''}</p>
  </div></div>;
}
