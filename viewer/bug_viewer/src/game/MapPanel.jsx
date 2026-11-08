import React, { useEffect, useRef, useState } from 'react';
import { game, useGame } from './store.js';
import { SIZE, HALF, surface, height, ROADS, TRAILS, SITES, BIOMES, circuit, offroad, dirtStrip, startLine } from '../worlds/county.js';
import { standingVehicles, vehicleType } from './fleet.js';
import { OFFICE, CAMPER } from '../worlds/office.js';
import { worldToMap, arrowRot, siteCleared } from './mapmath.js';
import { discovered } from './compass.js';
import { containers, spots } from './loot.js';
import { SCRAP_HEAPS } from './home.js';

/** the county drawn once (surface colours + hill shading + roads); markers are drawn on top every time the map opens */
const PX = 640, STEP = SIZE / PX * 1.25;
let base = null;
function baseMap() {
  if (base) return base;
  const c = document.createElement('canvas'); c.width = c.height = PX; const g = c.getContext('2d');
  const n = Math.floor(PX / 1.25), img = g.createImageData(n, n), hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cache = new Map();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -HALF + (i + 0.5) * STEP, z = -HALF + (j + 0.5) * STEP;   // north (-z) at the top, east (+x) on the right
    const sf = surface(x, z), col = cache.get(sf.key) || (cache.set(sf.key, hex(sf.color)), cache.get(sf.key));
    const h = height(x, z), shade = 1 + Math.max(-0.35, Math.min(0.35, (height(x - STEP, z - STEP) - h) * 0.09)) + Math.min(0.25, Math.max(0, h - 20) * 0.006);
    const k = (j * n + i) * 4; img.data[k] = col[0] * shade; img.data[k + 1] = col[1] * shade; img.data[k + 2] = col[2] * shade; img.data[k + 3] = 255;
  }
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = n; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, PX, PX);
  const P = (x, z) => worldToMap(x, z, HALF).map(v => v * PX);
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
export const LABELS = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Barn', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds HQ' };

export default function MapPanel({ onClose }) {
  useGame();
  const ref = useRef(), [zoom, setZoom] = useState(3);
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'), m = baseMap();
    const pl = game.pos, s = zoom, [cx, cz] = worldToMap(pl.x, pl.z, HALF).map(v => v * PX);
    g.clearRect(0, 0, PX, PX); g.save();
    if (s > 1) { g.translate(PX / 2, PX / 2); g.scale(s, s); g.translate(-cx, -cz); }
    g.drawImage(m, 0, 0);
    const P = (x, z) => worldToMap(x, z, HALF).map(v => v * PX);
    g.font = `600 ${11 / s}px system-ui, sans-serif`; g.textAlign = 'left';
    for (const [k, label0] of Object.entries(LABELS)) { if (!discovered(game.home).has(k)) continue; let label = label0; const st = SITES[k], [a, b] = P(st.x, st.z); g.fillStyle = k === 'garage' ? '#f2c14e' : '#ffffff'; g.beginPath(); g.arc(a, b, (k === 'garage' ? 5 : 3.5) / s, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1 / s; g.stroke();
      if (siteCleared(k, { boxes: game.boxes, items: game.items, heaps: game.home.heaps }, { containers, spots, heaps: SCRAP_HEAPS })) { g.strokeStyle = '#3ddc84'; g.lineWidth = 2.5 / s; g.beginPath(); g.moveTo(a - 3 / s, b); g.lineTo(a - 0.5 / s, b + 3 / s); g.lineTo(a + 4 / s, b - 3.5 / s); g.stroke(); label += ' ✓'; }
      g.lineWidth = 3 / s; g.strokeStyle = '#000000aa'; g.strokeText(label, a + 6 / s, b + 4 / s); g.fillText(label, a + 6 / s, b + 4 / s); }
    for (const v of standingVehicles()) if (!v.forSale) { const [a, b] = P(v.pose.x, v.pose.z); g.fillStyle = '#5bd8ff'; g.fillRect(a - 3 / s, b - 3 / s, 6 / s, 6 / s); g.fillStyle = '#fff'; g.fillText(vehicleType(v.id).name, a + 6 / s, b - 4 / s); }
    if (game.job) { const [a, b] = P(game.job.x, game.job.z); g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(a, b, 5 / s, 0, 7); g.fill(); }
    // you: an arrow pointing where you face (on foot) or drive
    const [a, b] = P(pl.x, pl.z), yaw = game.onFoot ? Math.atan2(game.face.x, game.face.z) : (game.pose?.h || 0);
    g.translate(a, b); g.rotate(arrowRot(yaw)); g.fillStyle = '#ff4a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 / s;
    g.beginPath(); g.moveTo(0, -9 / s); g.lineTo(6 / s, 7 / s); g.lineTo(0, 3 / s); g.lineTo(-6 / s, 7 / s); g.closePath(); g.fill(); g.stroke();
    g.restore();
    void startLine;
  }, [zoom, game.pos.x, game.pos.z, game.pose?.h, game.face.x, game.face.z, game.items, game.boxes, game.home]);
  return <div className="overlay"><div className="card map-card">
    <div className="shop-head"><h2>BAJA COUNTY</h2><span className="map-btns"><button onClick={() => setZoom(z => (z === 1 ? 3 : 1))}>{zoom === 1 ? 'Zoom in' : 'Whole county'}</button><button onClick={onClose}>Close (M)</button></span></div>
    <canvas ref={ref} width={PX} height={PX} className="map-canvas" />
    <p className="hint">Red arrow — you · blue — your parked vehicles{game.job ? ' · orange — a customer waiting' : ''}</p>
    <details><summary>Walt's property · facing the garage</summary>
      <svg viewBox="-36 -12 72 43" style={{ width: '100%', maxHeight: 210, background: '#66543d' }} role="img" aria-label="Office, reception, bathroom and loft on left; garage center; camper right; parking in front; expansion land far left">
        <g fill="#c6ad82" stroke="#382d23" strokeWidth=".2">
          <rect x="-7" y="-6" width="14" height="12" />
          <rect x={OFFICE.x0} y={OFFICE.z0} width={OFFICE.x1 - OFFICE.x0} height="12" />
          <rect x={CAMPER.x - 1.7} y={CAMPER.z - 5.5} width="3.4" height="11" />
          <rect x="-8.5" y="10" width="17" height="15" fill="#9d8b6c" />
        </g>
        <g fill="#fff1d2" fontSize="1.7" textAnchor="middle">
          <text x="0" y="0">GARAGE</text><text x="-10.1" y="-8">OFFICE / LOFT</text>
          <text x="24" y="-8">CAMPER</text><text x="-25" y="4">EXPANSION</text>
          <text x="0" y="19">CLEAR PARKING</text>
        </g>
      </svg>
      <p className="hint">Reception has the bathroom and parts storage behind it. Take the stairs beside the shared garage wall to the loft.</p>
    </details>
  </div></div>;
}
