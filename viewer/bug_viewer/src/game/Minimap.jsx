// HUD minimap, bottom left (GTA / Forza style): a rounded-square map that turns with where you face (up = ahead), on foot and driving.
// Light by day, dark at night. Shows paved roads, dirt tracks, discovered places (labelled, and pinned to the edge when off the map),
// parked vehicles and you. Drawn straight to a canvas on its own timer (not React state) so it never forces a 60 fps re-render.
import React, { useEffect, useRef } from 'react';
import { game } from './store.js';
import { SITES, ROADS, highways } from '../worlds/county.js';
import { standingVehicles } from './fleet.js';
import { LABELS } from './MapPanel.jsx';
import { headingForMode, discovered } from './compass.js';
import { clockHour } from './clock.js';

const SIZE = 230, PX = SIZE * 2, C = PX / 2, INSET = C - 22, RAD = 44;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
/** 0 = broad day, 1 = night, with a ramp at dawn and dusk */
const nightK = h => (h >= 19.5 || h < 5.5 ? 1 : h < 7.5 ? (7.5 - h) / 2 : h < 17 ? 0 : (h - 17) / 2.5);
const bbox = new WeakMap();
const boxOf = pts => { let b = bbox.get(pts); if (!b) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; } b = [x0, x1, z0, z1]; bbox.set(pts, b); } return b; };
const dist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.max(10, Math.round(m / 10) * 10) + ' m');

export default function Minimap() {
  const cv = useRef(null), box = useRef(null), cap = useRef(null), zoomR = useRef(240);
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
      const target = driving ? Math.min(800, 320 + Math.abs(game.speed || 0) * 12) : 240;   // metres from the centre to the edge: wider the faster you go
      zoomR.current += (target - zoomR.current) * 0.08;
      const R = zoomR.current, s = INSET / R, th = -headingForMode(game) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
      const toScreen = (x, z) => { const dx = x - px, dz = z - pz; return [C + (dx * cs - dz * sn) * s, C + (dx * sn + dz * cs) * s]; };
      const nk = nightK(clockHour());
      const PAL = { base: mix('#cdbf9c', '#161c28', nk), dirt: mix('#b59a68', '#3f3c33', nk), dirtEdge: mix('#8f7a52', '#0c0e14', nk), paved: mix('#fffaf0', '#6a7794', nk), major: mix('#ffffff', '#8d9bb8', nk), edge: mix('#85775c', '#0a0d15', nk), text: mix('#2b241b', '#f4efe4', nk), halo: mix('#fff7e4', '#0a0d12', nk) };
      g.clearRect(0, 0, PX, PX); g.save();
      g.beginPath(); g.roundRect(4, 4, PX - 8, PX - 8, RAD); g.clip();
      g.fillStyle = PAL.base; g.fillRect(0, 0, PX, PX);
      const reach = R * 1.7, near = pts => { const b = boxOf(pts); return b[1] > px - reach && b[0] < px + reach && b[3] > pz - reach && b[2] < pz + reach; };
      const road = (pts, step, color, w) => { g.beginPath(); for (let i = 0; i < pts.length; i += step) { const p = pts[i], [a, b] = toScreen(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = w; g.stroke(); };
      const net = highways()?.roads || [], lines = [];
      for (const r of net) if (r.pts?.length > 1 && near(r.pts)) lines.push([r.pts, r.kind === 'dirt' ? 'dirt' : r.kind === 'major' ? 'major' : 'paved', r.kind === 'dirt' ? 2 : 3]);
      for (const r of ROADS) if (r.path?.pts?.length > 1 && near(r.path.pts)) lines.push([r.path.pts, r.kind === 'dirt' || r.kind === 'gravel' ? 'dirt' : r.kind === 'highway' ? 'major' : 'paved', 2]);
      const ORDER = { dirt: 0, paved: 1, major: 2 }, W = { dirt: 6, paved: 9, major: 13 }, COL = { dirt: PAL.dirt, paved: PAL.paved, major: PAL.major }, EDGEC = { dirt: PAL.dirtEdge, paved: PAL.edge, major: PAL.edge };
      lines.sort((a, b) => ORDER[a[1]] - ORDER[b[1]]);
      for (const [pts, k, step] of lines) road(pts, step, EDGEC[k], W[k] + 4);
      for (const [pts, k, step] of lines) road(pts, step, COL[k], W[k]);
      // parked vehicles
      g.fillStyle = '#2aa9d8'; g.strokeStyle = PAL.halo; g.lineWidth = 3;
      for (const v of standingVehicles()) if (!v.forSale && v.pose) { const [a, b] = toScreen(v.pose.x, v.pose.z); if (Math.max(Math.abs(a - C), Math.abs(b - C)) < INSET - 4) { g.beginPath(); g.arc(a, b, 6, 0, 7); g.stroke(); g.fill(); } }
      g.restore();
      // places: marker + name inside the map, a pin on the edge when they are further out
      const known = discovered(game.home); g.textAlign = 'center';
      for (const id of Object.keys(LABELS)) {
        if (!known.has(id) || !SITES[id]) continue;
        const [a, b] = toScreen(SITES[id].x, SITES[id].z), d = Math.max(Math.abs(a - C), Math.abs(b - C)), home = id === 'garage';
        if (d < INSET - 12) {
          marker(g, a, b, 10, home);
          g.font = '700 21px "Barlow Condensed", sans-serif'; g.lineWidth = 6; g.strokeStyle = PAL.halo; g.fillStyle = PAL.text; g.strokeText(LABELS[id], a, b + 32); g.fillText(LABELS[id], a, b + 32);
        } else { const k = (INSET + 4) / d; marker(g, C + (a - C) * k, C + (b - C) * k, 7, home, Math.atan2(b - C, a - C)); }
      }
      // north badge: a dark disc on the edge, in the direction of north
      { const nx = sn, ny = -cs, k = (INSET + 6) / Math.max(Math.abs(nx), Math.abs(ny)); g.fillStyle = '#0b0e10'; g.strokeStyle = PAL.halo; g.lineWidth = 3; g.beginPath(); g.arc(C + nx * k, C + ny * k, 17, 0, 7); g.stroke(); g.fill(); g.fillStyle = '#f2a33a'; g.font = '800 24px "Barlow Condensed", sans-serif'; g.fillText('N', C + nx * k, C + ny * k + 8); }
      // you: fixed in the centre, pointing up
      g.save(); g.translate(C, C); g.fillStyle = '#ffffff'; g.strokeStyle = '#0b0e10'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -20); g.lineTo(14, 15); g.lineTo(0, 8); g.lineTo(-14, 15); g.closePath(); g.stroke(); g.fill(); g.restore();
    };
    const marker = (g, x, y, r, home, ang) => {
      g.save(); g.translate(x, y); g.fillStyle = home ? '#f2a33a' : '#35b873'; g.strokeStyle = '#0b0e10'; g.lineWidth = 3; g.beginPath();
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
