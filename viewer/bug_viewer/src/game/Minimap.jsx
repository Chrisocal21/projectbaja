// HUD minimap, top right: a round map that turns with where you face (up = ahead), on foot and driving.
// Shows paved roads, dirt tracks, discovered places (labelled, and pinned to the rim when they are off the map), parked vehicles and you.
// Drawn straight to a canvas on its own timer (not React state) so it never forces a 60 fps re-render.
import React, { useEffect, useRef } from 'react';
import { game } from './store.js';
import { SITES, ROADS, highways } from '../worlds/county.js';
import { standingVehicles } from './fleet.js';
import { LABELS } from './MapPanel.jsx';
import { headingForMode, discovered } from './compass.js';

const SIZE = 190, PX = SIZE * 2, C = PX / 2, RIM = C - 6;
const bbox = new WeakMap();
const boxOf = pts => { let b = bbox.get(pts); if (!b) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; } b = [x0, x1, z0, z1]; bbox.set(pts, b); } return b; };
const dist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.max(10, Math.round(m / 10) * 10) + ' m');

export default function Minimap() {
  const cv = useRef(null), box = useRef(null), cap = useRef(null), zoomR = useRef(260);
  useEffect(() => {
    let raf, last = 0, capAt = 0;
    const loop = t => {
      raf = requestAnimationFrame(loop);
      if (t - last < 50) return; last = t;
      const el = cv.current, wrap = box.current; if (!el || !wrap) return;
      const hide = game.paused || game.flyMode; wrap.style.display = hide ? 'none' : ''; if (hide) return;
      draw(el.getContext('2d'));
      if (t - capAt > 300 && cap.current) { capAt = t; cap.current.textContent = nearestText(); }
    };
    const draw = g => {
      const px = game.pos.x, pz = game.pos.z, driving = !game.onFoot;
      const target = driving ? Math.min(750, 300 + Math.abs(game.speed || 0) * 11) : 220;   // metres from the centre to the rim: wider the faster you go
      zoomR.current += (target - zoomR.current) * 0.08;
      const R = zoomR.current, s = RIM / R, th = -headingForMode(game) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
      const toScreen = (x, z) => { const dx = x - px, dz = z - pz; return [C + (dx * cs - dz * sn) * s, C + (dx * sn + dz * cs) * s]; };
      g.clearRect(0, 0, PX, PX); g.save();
      g.beginPath(); g.arc(C, C, RIM, 0, 7); g.clip();
      g.fillStyle = '#23211d'; g.fillRect(0, 0, PX, PX);
      // faint distance rings
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2; for (const f of [0.33, 0.66]) { g.beginPath(); g.arc(C, C, RIM * f, 0, 7); g.stroke(); }
      const reach = R * 1.5, near = pts => { const b = boxOf(pts); return b[1] > px - reach && b[0] < px + reach && b[3] > pz - reach && b[2] < pz + reach; };
      const road = (pts, step, color, w) => { g.beginPath(); for (let i = 0; i < pts.length; i += step) { const p = pts[i], [a, b] = toScreen(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = w; g.stroke(); };
      const net = highways()?.roads || [], lines = [];
      for (const r of net) if (r.pts?.length > 1 && near(r.pts)) lines.push([r.pts, r.kind === 'dirt' ? 'dirt' : r.kind === 'major' ? 'major' : 'paved', r.kind === 'dirt' ? 2 : 3]);
      for (const r of ROADS) if (r.path?.pts?.length > 1 && near(r.path.pts)) lines.push([r.path.pts, r.kind === 'dirt' || r.kind === 'gravel' ? 'dirt' : r.kind === 'highway' ? 'major' : 'paved', 2]);
      const ORDER = { dirt: 0, paved: 1, major: 2 }, W = { dirt: 5, paved: 7, major: 10 }, COL = { dirt: '#6f5f47', paved: '#a9a395', major: '#e9e2d0' };
      lines.sort((a, b) => ORDER[a[1]] - ORDER[b[1]]);
      for (const [pts, k, step] of lines) road(pts, step, '#0f0e0c', W[k] + 3);
      for (const [pts, k, step] of lines) road(pts, step, COL[k], W[k]);
      // parked vehicles
      g.fillStyle = '#63d5f6'; for (const v of standingVehicles()) if (!v.forSale && v.pose) { const [a, b] = toScreen(v.pose.x, v.pose.z); if (Math.hypot(a - C, b - C) < RIM - 6) { g.beginPath(); g.arc(a, b, 5, 0, 7); g.fill(); } }
      g.restore();
      // places: marker + name inside the map, a pin on the rim when they are further out
      const known = discovered(game.home); g.textAlign = 'center';
      for (const id of Object.keys(LABELS)) {
        if (!known.has(id) || !SITES[id]) continue;
        const [a, b] = toScreen(SITES[id].x, SITES[id].z), d = Math.hypot(a - C, b - C), home = id === 'garage';
        if (d < RIM - 14) {
          marker(g, a, b, 9, home);
          g.font = '700 21px "Barlow Condensed", sans-serif'; g.lineWidth = 5; g.strokeStyle = 'rgba(8,10,12,.9)'; g.fillStyle = '#f4efe4'; g.strokeText(LABELS[id], a, b + 30); g.fillText(LABELS[id], a, b + 30);
        } else { const k = (RIM - 9) / d; marker(g, C + (a - C) * k, C + (b - C) * k, 6, home, Math.atan2(b - C, a - C)); }
      }
      // north tick on the rim
      const nx = C + sn * (RIM - 16), ny = C - cs * (RIM - 16);
      g.fillStyle = '#f2a33a'; g.font = '800 24px "Barlow Condensed", sans-serif'; g.fillText('N', nx, ny + 8);
      // you: fixed in the centre, pointing up
      g.save(); g.translate(C, C); g.fillStyle = '#f2a33a'; g.strokeStyle = '#0b0e10'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -17); g.lineTo(12, 13); g.lineTo(0, 7); g.lineTo(-12, 13); g.closePath(); g.stroke(); g.fill(); g.restore();
    };
    const marker = (g, x, y, r, home, ang) => {
      g.save(); g.translate(x, y); g.fillStyle = home ? '#f2a33a' : '#7fd4a0'; g.strokeStyle = '#0b0e10'; g.lineWidth = 3; g.beginPath();
      if (ang != null) { g.rotate(ang); g.moveTo(r + 2, 0); g.lineTo(-r, r); g.lineTo(-r, -r); } else if (home) { g.moveTo(0, -r - 2); g.lineTo(r + 1, -1); g.lineTo(r + 1, r); g.lineTo(-r - 1, r); g.lineTo(-r - 1, -1); } else { g.moveTo(0, -r - 1); g.lineTo(r + 1, 0); g.lineTo(0, r + 1); g.lineTo(-r - 1, 0); }
      g.closePath(); g.stroke(); g.fill(); g.restore();
    };
    const nearestText = () => {
      const known = discovered(game.home); let best = null;
      for (const id of Object.keys(LABELS)) if (known.has(id) && SITES[id]) { const m = Math.hypot(SITES[id].x - game.pos.x, SITES[id].z - game.pos.z); if (!best || m < best.m) best = { id, m }; }
      return best ? (best.m < 40 ? LABELS[best.id] : `${LABELS[best.id]} · ${dist(best.m)}`) : '';
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={box} className="minimap"><canvas ref={cv} width={PX} height={PX} /><div ref={cap} className="mm-cap" /></div>;
}
