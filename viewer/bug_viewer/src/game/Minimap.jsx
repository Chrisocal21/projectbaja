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
import { routeNow } from './navigation.js';
import { regionAt, unproject } from './region.js';
import { border } from '../worlds/border.js';

const PW = 640, PH = 420, CX = PW / 2, CY = PH / 2, IX = CX - 28, IY = CY - 28, RAD = 34;   // a wide rounded rectangle like the GTA 6 minimap (320 x 210 on screen)
const edgeness = (a, b) => Math.max(Math.abs(a - CX) / IX, Math.abs(b - CY) / IY);   // < 1 = inside the map, 1 = on its inner edge
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
/** 0 = broad day, 1 = night, with a ramp at dawn and dusk */
const nightK = h => (h >= 19.5 || h < 5.5 ? 1 : h < 7.5 ? (7.5 - h) / 2 : h < 17 ? 0 : (h - 17) / 2.5);
const bbox = new WeakMap();
const boxOf = pts => { let b = bbox.get(pts); if (!b) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; } b = [x0, x1, z0, z1]; bbox.set(pts, b); } return b; };
const miles = m => { const mi = m / 1609.34; return mi >= 0.2 ? mi.toFixed(1) + ' mi' : Math.max(50, Math.round(m * 3.281 / 50) * 50) + ' ft'; };
const regionText = (x, z) => { try { const meta = border()?.meta; if (!meta) return ''; const [lat, lon] = unproject(x, z, meta), r = regionAt(lat, lon); return `${r.name}${r.country === 'MEX' ? ', MEX' : ''}`; } catch { return ''; } };
const dist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.max(10, Math.round(m / 10) * 10) + ' m');

export default function Minimap() {
  const cv = useRef(null), box = useRef(null), cap = useRef(null), reg = useRef(null), rte = useRef(null), left = useRef(0), zoomR = useRef(240);
  useEffect(() => {
    let raf, last = 0, capAt = 0;
    const loop = t => {
      raf = requestAnimationFrame(loop);
      if (t - last < 50) return; last = t;
      const el = cv.current, wrap = box.current; if (!el || !wrap) return;
      const hide = game.paused || game.flyMode; wrap.style.display = hide ? 'none' : ''; if (hide) return;
      draw(el.getContext('2d'));
      if (t - capAt > 300 && cap.current) { capAt = t; cap.current.textContent = nearestText(); if (reg.current) reg.current.textContent = regionText(game.pos.x, game.pos.z); if (rte.current) { rte.current.textContent = left.current > 0 ? miles(left.current) : ''; rte.current.style.display = left.current > 0 ? '' : 'none'; } }
    };
    const draw = g => {
      const px = game.pos.x, pz = game.pos.z, driving = !game.onFoot;
      const target = driving ? Math.min(800, 320 + Math.abs(game.speed || 0) * 12) : 240;   // metres from the centre to the edge: wider the faster you go
      zoomR.current += (target - zoomR.current) * 0.08;
      const R = zoomR.current, s = IY / R, th = -headingForMode(game) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
      const toScreen = (x, z) => { const dx = x - px, dz = z - pz; return [CX + (dx * cs - dz * sn) * s, CY + (dx * sn + dz * cs) * s]; };
      const nk = nightK(clockHour());
      const PAL = { base: mix('#b8ab8c', '#18222b', nk), dirt: mix('#b78955', '#675543', nk), dirtEdge: mix('#59442e', '#15171a', nk), paved: mix('#e5e4d8', '#82929c', nk), major: mix('#ffffff', '#c3d5db', nk), edge: mix('#555b54', '#111b23', nk), text: mix('#1d292d', '#f4f6ee', nk), halo: mix('#f4ead1', '#101b22', nk) };
      g.clearRect(0, 0, PW, PH); g.save();
      g.beginPath(); g.roundRect(4, 4, PW - 8, PH - 8, RAD); g.clip();
      g.fillStyle = PAL.base; g.fillRect(0, 0, PW, PH);
      // Broad land texture follows world coordinates, so it stays fixed while the map turns.
      for (let y = 0; y < PH; y += 28) for (let x = 0; x < PW; x += 28) {
        const dx = x - CX, dy = y - CY, wx = px + (dx * cs + dy * sn) / s, wz = pz + (-dx * sn + dy * cs) / s;
        const grain = Math.sin(wx * 0.014) * Math.cos(wz * 0.011) + Math.sin(wx * 0.045 + wz * 0.025) * 0.35;
        g.fillStyle = grain > 0 ? `rgba(245,218,165,${((grain + 0.3) * (1 - nk * 0.5) * 0.065).toFixed(3)})` : `rgba(35,46,43,${((-grain + 0.3) * (1 - nk * 0.4) * 0.09).toFixed(3)})`;
        g.fillRect(x, y, 28, 28);
      }
      const reach = R * 2.6, near = pts => { const b = boxOf(pts); return b[1] > px - reach && b[0] < px + reach && b[3] > pz - reach && b[2] < pz + reach; };
      const road = (pts, step, color, w) => { g.beginPath(); for (let i = 0; i < pts.length; i += step) { const p = pts[i], [a, b] = toScreen(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); } const end = pts[pts.length - 1], [ex, ey] = toScreen(end.x, end.z); g.lineTo(ex, ey); g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = w; g.stroke(); };
      const net = highways()?.roads || [], lines = [];
      for (const r of net) if (r.pts?.length > 1 && near(r.pts)) lines.push([r.pts, r.kind === 'dirt' ? 'dirt' : r.kind === 'major' ? 'major' : 'paved', r.kind === 'dirt' ? 2 : 3]);
      for (const r of ROADS) if (r.path?.pts?.length > 1 && near(r.path.pts)) lines.push([r.path.pts, r.kind === 'dirt' || r.kind === 'gravel' ? 'dirt' : r.kind === 'highway' ? 'major' : 'paved', 2]);
      const ORDER = { dirt: 0, paved: 1, major: 2 }, W = { dirt: 7, paved: 10, major: 15 }, COL = { dirt: PAL.dirt, paved: PAL.paved, major: PAL.major }, EDGEC = { dirt: PAL.dirtEdge, paved: PAL.edge, major: PAL.edge };
      lines.sort((a, b) => ORDER[a[1]] - ORDER[b[1]]);
      for (const [pts, k, step] of lines) road(pts, step, EDGEC[k], W[k] + 4);
      for (const [pts, k, step] of lines) road(pts, step, COL[k], W[k]);
      // the route to your waypoint, along the roads (dashed straight line when no road leads there)
      const rt = routeNow(px, pz, performance.now()); left.current = rt ? rt.left : 0;
      if (rt) { g.lineJoin = g.lineCap = 'round'; if (rt.straight) g.setLineDash([16, 14]); const draw1 = (c, w) => { g.beginPath(); rt.pts.forEach((p, i) => { const [a, b] = toScreen(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }; draw1('rgba(60,0,40,0.75)', 15); draw1('#ff3fa4', 9); g.setLineDash([]); }
      // parked vehicles
      g.fillStyle = '#2aa9d8'; g.strokeStyle = PAL.halo; g.lineWidth = 3;
      for (const v of standingVehicles()) if (!v.forSale && v.pose) { const [a, b] = toScreen(v.pose.x, v.pose.z); if (edgeness(a, b) < 0.95) { g.beginPath(); g.arc(a, b, 6, 0, 7); g.stroke(); g.fill(); } }
      g.restore();
      // places: marker + name inside the map, a pin on the edge when they are further out
      const known = discovered(game.home); g.textAlign = 'center';
      for (const id of Object.keys(LABELS)) {
        if (!known.has(id) || !SITES[id]) continue;
        const [a, b] = toScreen(SITES[id].x, SITES[id].z), d = edgeness(a, b), home = id === 'garage';
        if (d < 0.9) {
          marker(g, a, b, 10, home);
          g.font = '700 21px "Barlow Condensed", sans-serif'; g.lineWidth = 6; g.strokeStyle = PAL.halo; g.fillStyle = PAL.text; g.strokeText(LABELS[id], a, b + 32); g.fillText(LABELS[id], a, b + 32);
        } else { const k = 1.02 / d; marker(g, CX + (a - CX) * k, CY + (b - CY) * k, 7, home, Math.atan2(b - CY, a - CX)); }
      }
      // the waypoint pin (an arrow on the edge when it is off the map)
      if (rt) { const [a, b] = toScreen(rt.wp.x, rt.wp.z), d = edgeness(a, b); if (d < 0.92) pin(g, a, b); else { const k = 1.02 / d; marker(g, CX + (a - CX) * k, CY + (b - CY) * k, 9, false, Math.atan2(b - CY, a - CX), '#ff3fa4'); } }
      // north badge: fixed in the bottom-left corner (the map turns, so it points where north is)
      { const bx = 46, by = PH - 46, [nx, ny] = toScreen(px, pz - 100); g.save(); g.translate(bx, by); g.fillStyle = '#101b22'; g.strokeStyle = '#f4f6ee'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke(); g.fill(); g.rotate(Math.atan2(nx - CX, CY - ny)); g.fillStyle = '#f4f6ee'; g.beginPath(); g.moveTo(0, -15); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore(); }
      // you: fixed in the centre, pointing up
      g.save(); g.translate(CX, CY); g.fillStyle = '#ffffff'; g.strokeStyle = '#0b0e10'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -20); g.lineTo(14, 15); g.lineTo(0, 8); g.lineTo(-14, 15); g.closePath(); g.stroke(); g.fill(); g.restore();
    };
    const pin = (g, x, y) => { g.save(); g.translate(x, y); g.fillStyle = '#ff3fa4'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(0, -22, 13, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(0, 0); g.closePath(); g.stroke(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -22, 5, 0, 7); g.fill(); g.restore(); };
    const marker = (g, x, y, r, home, ang, color) => {
      g.save(); g.translate(x, y); g.fillStyle = color || (home ? '#f2a33a' : '#35b873'); g.strokeStyle = '#0b0e10'; g.lineWidth = 3; g.beginPath();
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
  return <div ref={box} className="minimap"><canvas ref={cv} width={PW} height={PH} /><div ref={cap} className="mm-cap" /><div ref={reg} className="mm-region" /><div ref={rte} className="mm-route" /></div>;
}
