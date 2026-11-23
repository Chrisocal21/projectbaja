import React, { useEffect, useRef, useState } from 'react';
import { loadBorder, border } from '../worlds/border.js';
import { game, useGame } from './store.js';
import { SITES, ROADS, highways, pavedRoadAt, raceCourses } from '../worlds/county.js';
import { standingVehicles } from './fleet.js';
import { discovered } from './compass.js';
import { arrowRot } from './mapmath.js';
import { REAL_PLACES, projectPlace } from './realPlaces.js';
import { setWaypoint, clearWaypoint, waypoint, routeNow } from './navigation.js';
import { whereAmI } from './whereAmI.js';

const SITE_NAMES = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Hollis Farm', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds' };
const WIDTH = 960, HEIGHT = 1200, K = WIDTH / 640;   // K scales the sizes written for the old 640 px map
const BOX = { x0: -20000, x1: 28000, z0: -8000, z1: 52000 };
const point = (x, z) => [(x - BOX.x0) / (BOX.x1 - BOX.x0) * WIDTH, (z - BOX.z0) / (BOX.z1 - BOX.z0) * HEIGHT];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MAIN_ROADS = new Set(['I-5', 'I-8', 'I-10', 'I-15', 'US-101', 'CA-86', 'CA-111', 'Mex 1', 'Mex 1D', 'Mex 2', 'Mex 2D', 'Mex 5']);
const C = { land: [228, 220, 200], water: [126, 164, 190], ink: '#2f3640', halo: '#f1ebdc', major: '#ffffff', majorEdge: '#8d8470', minor: '#fbf7ec', dirt: '#b98a4e', pink: '#ff3fa4', score: '#e8742a', mdr: '#8a5cc2' };
const SERIES_COLOR = { SCORE: C.score, MDR: C.mdr };
// US - Mexico border, the real line through San Ysidro, Calexico and the Colorado River (lon, lat): drawn dashed, with the country names either side
const BORDER = [[-117.12, 32.534], [-117.03, 32.543], [-115.5, 32.67], [-114.72, 32.718]];
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
      const slope = clamp((land.heightAt(x - 110, z - 110) - land.heightAt(x + 110, z + 110)) / 120, -1, 1);
      const k = (py * WIDTH + px) * 4;
      if (water) { const depth = clamp(-h / 400, 0, 1); d[k] = C.water[0] - depth * 22; d[k + 1] = C.water[1] - depth * 20; d[k + 2] = C.water[2] - depth * 14; }
      else { const high = clamp(h / 900, 0, 1), light = slope * 22; d[k] = C.land[0] - high * 38 + light; d[k + 1] = C.land[1] - high * 40 + light; d[k + 2] = C.land[2] - high * 44 + light; }
      d[k + 3] = 255;
    }
    g.putImageData(image, 0, 0);
    return c;
  })().catch(error => { backdropPromise = null; throw error; });
  return backdropPromise;
}

const LEGEND = [
  ['you', 'You'], ['pin', 'Your waypoint (click the map)'], ['home', "Walt's Garage"], ['place', 'Places you have found'], ['town', 'Towns and cities'],
  ['start', 'Race start'], ['finish', 'Race finish'], ['score', 'SCORE race route (Baja 1000, 500, 400, SF 250)'], ['mdr', 'MDR dirt loop'], ['road', 'Highway'], ['dirt', 'Dirt road'], ['car', 'Parked vehicle'],
];

export default function WestCoastMap() {
  useGame();
  const ref = useRef(null), drag = useRef(null), view = useRef({ zoom: 1, ox: 0, oy: 0 }), [revision, redraw] = useState(0), [races, setRaces] = useState(true), wp = waypoint();
  useEffect(() => { let active = true; backdrop().then(() => { if (active) redraw(n => n + 1); }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true;
    backdrop().then(base => {
      if (!active || !ref.current) return;
      const g = ref.current.getContext('2d'), { zoom, ox, oy } = view.current, z1 = zoom;
      g.clearRect(0, 0, WIDTH, HEIGHT); g.save(); g.translate(ox, oy); g.scale(zoom, zoom); g.drawImage(base, 0, 0);
      const roadLine = (pts, color, width, step = 10, hidden = () => false) => { g.beginPath(); let started = false; for (let i = 0; i < pts.length; i += step) { const p = pts[i]; if (hidden(p)) { started = false; continue; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } } const last = pts[pts.length - 1]; if (last && !hidden(last)) { const [a, b] = point(last.x, last.z); if (started) g.lineTo(a, b); else g.moveTo(a, b); } g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = width / z1; g.stroke(); };
      const network = highways()?.roads || [];
      for (const r of [...network].sort((a, b) => (a.kind === 'dirt' ? -1 : 0) - (b.kind === 'dirt' ? -1 : 0))) {
        if (r.kind === 'dirt' && zoom < 5) continue;
        if (r.kind === 'dirt' && r.name.endsWith(' (dirt)') && zoom < 8) continue;
        if (zoom < 3 && !MAIN_ROADS.has(r.name)) continue;
        if (zoom < 5 && r.kind === 'secondary' && !MAIN_ROADS.has(r.name)) continue;
        const w = (r.kind === 'major' ? 3.6 : r.kind === 'secondary' ? 2.4 : 1.6) * K;
        const dirt = r.kind === 'dirt', hidden = dirt ? undefined : p => highways().higherRoadAt(p.x, p.z, r), step = dirt ? 1 : 2;
        roadLine(r.pts, dirt ? '#7a5a2c' : C.majorEdge, w + 1.6 * K, step, hidden);
        roadLine(r.pts, dirt ? C.dirt : r.kind === 'major' ? C.major : C.minor, w, step, hidden);
      }
      if (zoom >= 8) {
        for (const r of ROADS) {
          g.beginPath(); let started = false; r.path.pts.forEach((p, i) => { if (i % 6) return; if ((r.kind === 'dirt' || r.kind === 'gravel') && pavedRoadAt(p.x, p.z, 4)) { started = false; return; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } });
          g.lineJoin = g.lineCap = 'round'; g.strokeStyle = C.majorEdge; g.lineWidth = 5 * K / z1; g.stroke(); g.strokeStyle = r.kind === 'highway' ? C.major : C.minor; g.lineWidth = (r.kind === 'highway' ? 3 : 2) * K / z1; g.stroke();
        }
      }
      const meta = border()?.meta;
      if (meta) { g.beginPath(); BORDER.forEach(([lon, lat], i) => { const p = projectPlace(lat, lon, meta), [a, b] = point(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.setLineDash([10 * K / z1, 6 * K / z1]); g.strokeStyle = '#b3402f'; g.lineWidth = 2.4 * K / z1; g.stroke(); g.setLineDash([]); }
      const label = (name, x, z, color = C.ink, size = 13) => { const [a, b] = point(x, z); g.font = `800 ${size * K / z1}px "Barlow Condensed", system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3.5 * K / z1; g.strokeStyle = C.halo; g.strokeText(name, a, b); g.fillStyle = color; g.fillText(name, a, b); };
      if (zoom < 5) { label('CALIFORNIA', -7000, -1000, '#5a5347', 17); label('ARIZONA', 13500, 1500, '#5a5347', 17); label('BAJA CALIFORNIA', -10500, 27000, '#4f5d4a', 17); label('PACIFIC OCEAN', -16000, 22000, '#2f5f7c', 16); label('GULF OF CALIFORNIA', 14000, 35000, '#2f5f7c', 16); label('MEXICO', -9000, 14000, '#b3402f', 14); label('UNITED STATES', -9000, -3500, '#b3402f', 14); }
      if (zoom >= 4 && zoom < 10) label('BAJA COUNTY', 0, 2500, '#4a3f2e', 18);
      // race routes, starts and finishes
      if (races && meta) {
        for (const c of raceCourses()) {
          const big = c.id === 'score-b1000', color = SERIES_COLOR[c.series] || C.score;
          if (!c.line?.length || (zoom < 3 && !big)) continue;
          g.beginPath(); c.line.forEach(([x, z], i) => { const [a, b] = point(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.lineJoin = g.lineCap = 'round'; g.setLineDash([8 * K / z1, 5 * K / z1]); g.strokeStyle = color; g.lineWidth = (big ? 4 : 2.6) * K / z1; g.globalAlpha = 0.9; g.stroke(); g.globalAlpha = 1; g.setLineDash([]);
        }
        for (const c of raceCourses()) {
          const big = c.id === 'score-b1000', color = SERIES_COLOR[c.series] || C.score; if (zoom < 3 && !big) continue;
          const loop = c.kind === 'loop', s = c.start, f = c.finish || c.start;
          const flag = (p, txt, col) => { const [a, b] = point(p.x, p.z), r = (big ? 9 : 7) * K / z1; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2 * K / z1; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `800 ${(big ? 11 : 9) * K / z1}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.fillText(txt, a, b + 3.5 * K / z1); };
          if (s) flag(s, loop ? 'S/F' : 'S', '#2f9e5b'); if (!loop && f) flag(f, 'F', '#c4372d');
          if (s && (big || zoom >= 6)) label(c.name.toUpperCase() + (loop ? ' START/FINISH' : ' START'), s.x, s.z - (big ? 600 : 400), color, 12);
          if (!loop && f && (big || zoom >= 6)) label(c.name.toUpperCase() + ' FINISH', f.x, f.z - 600, color, 12);
        }
      }
      // cities and towns
      const occupied = [];
      for (const place of REAL_PLACES) {
        if (zoom < place.zoom || !meta) continue;
        const { x, z } = projectPlace(place.lat, place.lon, meta), [a, b] = point(x, z);
        const sx = a * zoom + ox, sy = b * zoom + oy, width = place.name.length * 7 * K + 13;
        if (sx < 8 || sx > WIDTH - 8 || sy < 8 || sy > HEIGHT - 8) continue;
        const box = [sx + 4, sy - 13 * K, sx + 4 + width, sy + 4 * K];
        if (occupied.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
        occupied.push(box);
        g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 1.6 * K / z1; g.beginPath(); g.arc(a, b, 3.6 * K / z1, 0, 7); g.fill(); g.stroke();
        g.font = `700 ${12 * K / z1}px "Barlow Condensed", system-ui, sans-serif`; g.textAlign = 'left'; g.lineWidth = 3 * K / z1; g.strokeStyle = C.halo; g.strokeText(place.name, a + 6 * K / z1, b + 4 * K / z1); g.fillStyle = C.ink; g.fillText(place.name, a + 6 * K / z1, b + 4 * K / z1);
      }
      if (zoom >= 3) {
        for (const [key, site] of Object.entries(SITES)) if (discovered(game.home).has(key)) { const [a, b] = point(site.x, site.z); g.fillStyle = key === 'garage' ? '#f2a33a' : '#35b873'; g.strokeStyle = '#0b0e10'; g.lineWidth = 1.8 * K / z1; g.beginPath(); g.arc(a, b, 5.5 * K / z1, 0, 7); g.fill(); g.stroke(); if (zoom >= 5 || key === 'garage') label(SITE_NAMES[key] || key, site.x + 170, site.z - 100, '#2f3640', 13); }
      }
      for (const v of standingVehicles()) if (!v.forSale) { const [a, b] = point(v.pose.x, v.pose.z); g.fillStyle = '#2aa9d8'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * K / z1; g.beginPath(); g.arc(a, b, 4.5 * K / z1, 0, Math.PI * 2); g.fill(); g.stroke(); }
      // the route and the waypoint
      const rt = routeNow(game.pos.x, game.pos.z, performance.now());
      if (rt) {
        g.beginPath(); rt.pts.forEach((p, i) => { const [a, b] = point(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.lineJoin = g.lineCap = 'round'; if (rt.straight) g.setLineDash([9 * K / z1, 7 * K / z1]); g.strokeStyle = C.pink; g.lineWidth = 4 * K / z1; g.stroke(); g.setLineDash([]);
        const [a, b] = point(rt.wp.x, rt.wp.z), r = 9 * K / z1; g.fillStyle = C.pink; g.strokeStyle = '#fff'; g.lineWidth = 2.4 * K / z1; g.beginPath(); g.arc(a, b - r * 1.6, r, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(a, b); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(a, b - r * 1.6, r * 0.38, 0, 7); g.fill();
      }
      const [a, b] = point(game.pos.x, game.pos.z), yaw = game.onFoot ? Math.atan2(game.face.x, game.face.z) : game.pose?.h || 0;
      g.translate(a, b); g.rotate(arrowRot(yaw)); g.fillStyle = '#ff4a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1.8 * K / z1;
      g.beginPath(); g.moveTo(0, -11 * K / z1); g.lineTo(7 * K / z1, 8 * K / z1); g.lineTo(0, 4 * K / z1); g.lineTo(-7 * K / z1, 8 * K / z1); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.fillStyle = C.ink; g.font = '800 18px "Barlow Condensed", sans-serif'; g.textAlign = 'left'; g.fillText('N', 28, 36); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(35, 44); g.lineTo(35, 78); g.moveTo(28, 52); g.lineTo(35, 44); g.lineTo(42, 52); g.stroke();
    });
    return () => { active = false; };
  }, [revision, races, game.pos.x, game.pos.z, game.pose?.h, game.face.x, game.face.z, game.home]);
  const toCanvas = e => { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * WIDTH, (e.clientY - r.top) / r.height * HEIGHT]; };
  const wheel = e => {
    e.preventDefault();
    const [px, py] = toCanvas(e), v = view.current, next = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), 1, 24), ratio = next / v.zoom;
    v.ox = clamp(px - (px - v.ox) * ratio, WIDTH * (1 - next), 0); v.oy = clamp(py - (py - v.oy) * ratio, HEIGHT * (1 - next), 0); v.zoom = next;
    redraw(n => n + 1);
  };
  const pointerDown = e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: view.current.ox, oy: view.current.oy, moved: false }; };
  const pointerMove = e => { const d = drag.current; if (!d) return; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true; const r = e.currentTarget.getBoundingClientRect(), v = view.current; v.ox = clamp(d.ox + (e.clientX - d.x) / r.width * WIDTH, WIDTH * (1 - v.zoom), 0); v.oy = clamp(d.oy + (e.clientY - d.y) / r.height * HEIGHT, HEIGHT * (1 - v.zoom), 0); redraw(n => n + 1); };
  const pointerUp = e => {   // a click (not a drag) drops the waypoint there
    const d = drag.current; drag.current = null; if (!d || d.moved) return;
    const [px, py] = toCanvas(e), v = view.current, x = BOX.x0 + ((px - v.ox) / v.zoom) / WIDTH * (BOX.x1 - BOX.x0), z = BOX.z0 + ((py - v.oy) / v.zoom) / HEIGHT * (BOX.z1 - BOX.z0);
    let name = ''; try { name = whereAmI(x, z).place.replace(/^near /, ''); } catch { /* no name */ }
    setWaypoint(x, z, name || 'Map marker'); redraw(n => n + 1);
  };
  return <div className="map-stage"><div className="map-row">
    <canvas ref={ref} width={WIDTH} height={HEIGHT} className="map-canvas west-coast-map" onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; }} onContextMenu={e => { e.preventDefault(); clearWaypoint(); redraw(n => n + 1); }} aria-label="West coast map. Scroll to zoom, drag to pan, click to set a waypoint, right click to clear it." />
    <aside className="map-legend"><h3>LEGEND</h3>
      {LEGEND.map(([k, t]) => <div key={k} className="lg-row"><i className={`lg lg-${k}`} /><span>{t}</span></div>)}
      <label className="lg-toggle"><input type="checkbox" checked={races} onChange={e => setRaces(e.target.checked)} /> Show race routes</label>
      <div className="lg-wp">{wp ? <><b>Waypoint: {wp.label}</b><button onClick={() => { clearWaypoint(); redraw(n => n + 1); }}>Clear waypoint</button></> : <small>Click anywhere to set a waypoint. The route follows the roads and shows on your minimap.</small>}</div>
    </aside></div>
    <p className="hint">Scroll to zoom | drag to pan | click: set waypoint | right click: clear it</p></div>;
}
