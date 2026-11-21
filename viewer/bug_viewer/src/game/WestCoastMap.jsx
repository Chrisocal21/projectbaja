import React, { useEffect, useRef, useState } from 'react';
import { loadBorder, border } from '../worlds/border.js';
import { game, useGame } from './store.js';
import { SITES, ROADS, highways, pavedRoadAt } from '../worlds/county.js';
import { standingVehicles } from './fleet.js';
import { discovered } from './compass.js';
import { arrowRot } from './mapmath.js';
import { REAL_PLACES, projectPlace } from './realPlaces.js';

const SITE_NAMES = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Hollis Farm', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds' };

const WIDTH = 640, HEIGHT = 800;
const BOX = { x0: -20000, x1: 28000, z0: -8000, z1: 52000 };
const point = (x, z) => [(x - BOX.x0) / (BOX.x1 - BOX.x0) * WIDTH, (z - BOX.z0) / (BOX.z1 - BOX.z0) * HEIGHT];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MAIN_ROADS = new Set(['I-5', 'I-8', 'I-10', 'I-15', 'US-101', 'CA-86', 'CA-111', 'Mex 1', 'Mex 1D', 'Mex 2', 'Mex 2D', 'Mex 5']);
let backdropPromise;

function backdrop() {
  if (backdropPromise) return backdropPromise;
  backdropPromise = (async () => {
    const land = await loadBorder();
    const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT;
    const g = c.getContext('2d'), image = g.createImageData(WIDTH, HEIGHT), d = image.data;
    for (let py = 0; py < HEIGHT; py++) for (let px = 0; px < WIDTH; px++) {
      const x = BOX.x0 + (px + 0.5) / WIDTH * (BOX.x1 - BOX.x0);
      const z = BOX.z0 + (py + 0.5) / HEIGHT * (BOX.z1 - BOX.z0);
      const h = land.heightAt(x, z), water = land.waterAt(x, z) != null;
      const slope = clamp((land.heightAt(x - 75, z - 75) - land.heightAt(x + 75, z + 75)) / 100, -1, 1);
      const noise = Math.sin(px * 1.93 + py * 3.87) * Math.sin(px * 3.17 - py * 1.41) * 7;
      const k = (py * WIDTH + px) * 4;
      if (water) { const depth = clamp(-h / 300, 0, 1); d[k] = 11 + noise * 0.2; d[k + 1] = 45 - depth * 16 + noise * 0.3; d[k + 2] = 61 - depth * 17 + noise * 0.4; }
      else { const high = clamp(h / 360, 0, 1), light = slope * 24 + noise; d[k] = 82 + high * 29 + light; d[k + 1] = 77 + high * 21 + light; d[k + 2] = 56 + high * 13 + light; }
      d[k + 3] = 255;
    }
    g.putImageData(image, 0, 0);
    // The actual coast and peninsula come from the project's elevation and water mask.
    const shade = g.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 540);
    shade.addColorStop(0, '#09151b00'); shade.addColorStop(1, '#09151b77'); g.fillStyle = shade; g.fillRect(0, 0, WIDTH, HEIGHT);
    return c;
  })().catch(error => { backdropPromise = null; throw error; });
  return backdropPromise;
}

export default function WestCoastMap() {
  useGame();
  const ref = useRef(null), drag = useRef(null), view = useRef({ zoom: 1, ox: 0, oy: 0 }), [revision, redraw] = useState(0);
  useEffect(() => { let active = true; backdrop().then(() => { if (active) redraw(n => n + 1); }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true;
    backdrop().then(base => {
      if (!active || !ref.current) return;
      const g = ref.current.getContext('2d'), { zoom, ox, oy } = view.current;
      g.clearRect(0, 0, WIDTH, HEIGHT); g.save(); g.translate(ox, oy); g.scale(zoom, zoom); g.drawImage(base, 0, 0);
      const roadLine = (pts, color, width, step = 10, hidden = () => false) => { g.beginPath(); let started = false; for (let i = 0; i < pts.length; i += step) { const p = pts[i]; if (hidden(p)) { started = false; continue; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } } const last = pts[pts.length - 1]; if (last && !hidden(last)) { const [a, b] = point(last.x, last.z); if (started) g.lineTo(a, b); else g.moveTo(a, b); } g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = width / zoom; g.stroke(); };
      const network = highways()?.roads || [];
      for (const r of [...network].sort((a, b) => (a.kind === 'dirt' ? -1 : 0) - (b.kind === 'dirt' ? -1 : 0))) {
        if (r.kind === 'dirt' && zoom < 3) continue;
        if (zoom < 3 && !MAIN_ROADS.has(r.name)) continue;
        if (zoom < 5 && r.kind === 'secondary' && !MAIN_ROADS.has(r.name)) continue;
        const w = r.kind === 'major' ? 3.3 : r.kind === 'secondary' ? 2.2 : 1.4;
        const dirt = r.kind === 'dirt', hidden = dirt ? p => highways().pavedAt(p.x, p.z, 4) : p => highways().higherRoadAt(p.x, p.z, r), step = dirt ? 1 : 2;
        roadLine(r.pts, '#10191a', w + 1.8, step, hidden);
        roadLine(r.pts, dirt ? '#ab9773' : r.kind === 'major' ? '#edc47d' : '#cbb589', w, step, hidden);
      }
      const label = (name, x, z, color = '#f2d59b', size = 13) => { const [a, b] = point(x, z); g.font = `700 ${size / zoom}px system-ui`; g.textAlign = 'center'; g.lineWidth = 3 / zoom; g.strokeStyle = '#071216'; g.strokeText(name, a, b); g.fillStyle = color; g.fillText(name, a, b); };
      if (zoom < 5) { label('CALIFORNIA', -7000, -1000); label('ARIZONA', 13500, 1500); label('BAJA CALIFORNIA', -10500, 27000); label('PACIFIC OCEAN', -16000, 22000, '#96b9c2'); label('GULF OF MEXICO', 14000, 35000, '#96b9c2'); }
      const occupied = [];
      for (const place of REAL_PLACES) {
        if (zoom < place.zoom) continue;
        const { x, z } = projectPlace(place.lat, place.lon, border().meta), [a, b] = point(x, z);
        const sx = a * zoom + ox, sy = b * zoom + oy, width = place.name.length * 7 + 13;
        if (sx < 8 || sx > WIDTH - 8 || sy < 8 || sy > HEIGHT - 8) continue;
        const box = [sx + 4, sy - 13, sx + 4 + width, sy + 4];
        if (occupied.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
        occupied.push(box);
        g.fillStyle = '#f8e9ca'; g.beginPath(); g.arc(a, b, 2.5 / zoom, 0, 7); g.fill();
        g.font = `600 ${11 / zoom}px system-ui`; g.textAlign = 'left'; g.lineWidth = 2.5 / zoom; g.strokeStyle = '#081318'; g.strokeText(place.name, a + 5 / zoom, b + 4 / zoom); g.fillText(place.name, a + 5 / zoom, b + 4 / zoom);
      }
      if (zoom >= 8) {
        for (const r of ROADS) {
          g.beginPath(); let started = false; r.path.pts.forEach((p, i) => { if (i % 6) return; if ((r.kind === 'dirt' || r.kind === 'gravel') && pavedRoadAt(p.x, p.z, 4)) { started = false; return; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } });
          g.lineJoin = g.lineCap = 'round'; g.strokeStyle = '#171d1d'; g.lineWidth = 5 / zoom; g.stroke(); g.strokeStyle = r.kind === 'highway' ? '#ffcc78' : '#dbc097'; g.lineWidth = (r.kind === 'highway' ? 3 : 2) / zoom; g.stroke();
        }
      }
      if (zoom >= 4 && zoom < 10) label('BAJA COUNTY', 0, 2500, '#f2d59b', 16);
      if (zoom >= 10) {
        for (const [key, site] of Object.entries(SITES)) if (discovered(game.home).has(key)) { const [a, b] = point(site.x, site.z); g.fillStyle = '#ffdc91'; g.beginPath(); g.arc(a, b, 3.5 / zoom, 0, 7); g.fill(); if (zoom >= 15 || key === 'garage') label(SITE_NAMES[key] || key, site.x + 170, site.z - 100, '#fff0cd', 12); }
      }
      for (const v of standingVehicles()) if (!v.forSale) { const [a, b] = point(v.pose.x, v.pose.z); g.fillStyle = '#63d5f6'; g.beginPath(); g.arc(a, b, 4 / zoom, 0, Math.PI * 2); g.fill(); }
      const [a, b] = point(game.pos.x, game.pos.z), yaw = game.onFoot ? Math.atan2(game.face.x, game.face.z) : game.pose?.h || 0;
      g.translate(a, b); g.rotate(arrowRot(yaw)); g.fillStyle = '#ff4a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 / zoom;
      g.beginPath(); g.moveTo(0, -9 / zoom); g.lineTo(6 / zoom, 7 / zoom); g.lineTo(0, 3 / zoom); g.lineTo(-6 / zoom, 7 / zoom); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.fillStyle = '#f4d69a'; g.font = '700 15px system-ui'; g.fillText('N', 24, 28); g.strokeStyle = '#f4d69a'; g.beginPath(); g.moveTo(29, 34); g.lineTo(29, 62); g.moveTo(24, 41); g.lineTo(29, 34); g.lineTo(34, 41); g.stroke();
    });
    return () => { active = false; };
  }, [revision, game.pos.x, game.pos.z, game.pose?.h, game.face.x, game.face.z, game.home]);
  const wheel = e => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * WIDTH, py = (e.clientY - r.top) / r.height * HEIGHT;
    const v = view.current, next = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), 1, 24), ratio = next / v.zoom;
    v.ox = clamp(px - (px - v.ox) * ratio, WIDTH * (1 - next), 0); v.oy = clamp(py - (py - v.oy) * ratio, HEIGHT * (1 - next), 0); v.zoom = next;
    redraw(n => n + 1);
  };
  const pointerDown = e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: view.current.ox, oy: view.current.oy }; };
  const pointerMove = e => { if (!drag.current) return; const r = e.currentTarget.getBoundingClientRect(), v = view.current; v.ox = clamp(drag.current.ox + (e.clientX - drag.current.x) / r.width * WIDTH, WIDTH * (1 - v.zoom), 0); v.oy = clamp(drag.current.oy + (e.clientY - drag.current.y) / r.height * HEIGHT, HEIGHT * (1 - v.zoom), 0); redraw(n => n + 1); };
  return <div className="map-stage"><canvas ref={ref} width={WIDTH} height={HEIGHT} className="map-canvas west-coast-map" onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} aria-label="West coast map. Scroll to zoom and drag to pan." /><p className="hint">Scroll to zoom | drag to pan | red arrow: you | blue dots: parked vehicles</p></div>;
}
