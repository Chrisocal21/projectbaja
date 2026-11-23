import React, { useEffect, useRef, useState } from 'react';
import { loadBorder, border } from '../worlds/border.js';
import { game, useGame } from './store.js';
import { SITES, ROADS, highways, pavedRoadAt, raceCourses, trailRoutes, junctions } from '../worlds/county.js';
import { standingVehicles } from './fleet.js';
import { discovered } from './compass.js';
import { arrowRot } from './mapmath.js';
import { REAL_PLACES, projectPlace } from './realPlaces.js';
import { setWaypoint, clearWaypoint, waypoint, routeNow } from './navigation.js';

const SITE_NAMES = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", shop: 'Baja Parts', barn: 'Hollis Farm', warehouse: 'Salvage & Surplus', proving: 'Proving Grounds' };
const WIDTH = 960, HEIGHT = 1200, K = 1.25;   // map space is 960 x 1200; K sizes the marks in screen pixels. The backdrop is drawn finer (BW x BH) so a full-screen map stays sharp
const BW = 1440, BH = 1800, OLD = 0.77;   // OLD: the screen scale of the old small map: the zoom thresholds below are still written for it
const BOX = { x0: -20000, x1: 28000, z0: -8000, z1: 52000 };
const point = (x, z) => [(x - BOX.x0) / (BOX.x1 - BOX.x0) * WIDTH, (z - BOX.z0) / (BOX.z1 - BOX.z0) * HEIGHT];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MAIN_ROADS = new Set(['I-5', 'I-8', 'I-10', 'I-15', 'US-101', 'CA-86', 'CA-111', 'Mex 1', 'Mex 1D', 'Mex 2', 'Mex 2D', 'Mex 5']);
const C = { land: [188, 192, 166], water: [52, 120, 151], ink: '#152a32', halo: '#e4e6d4', major: '#f9f9ef', majorEdge: '#56636a', minor: '#e2e9df', dirt: '#a4754c', pink: '#ff4aa8', score: '#e8742a', mdr: '#8a5cc2' };
const SERIES_COLOR = { SCORE: C.score, MDR: C.mdr };
// US - Mexico border, the real line through San Ysidro, Calexico and the Colorado River (lon, lat): drawn dashed, with the country names either side
const BORDER = [[-117.12, 32.534], [-117.03, 32.543], [-115.5, 32.67], [-114.72, 32.718]];
let backdropPromise;

function backdrop() {
  if (backdropPromise) return backdropPromise;
  backdropPromise = (async () => {
    const land = await loadBorder();
    const c = document.createElement('canvas'); c.width = BW; c.height = BH;
    const g = c.getContext('2d'), image = g.createImageData(BW, BH), d = image.data;
    for (let py = 0; py < BH; py++) for (let px = 0; px < BW; px++) {
      const x = BOX.x0 + (px + 0.5) / BW * (BOX.x1 - BOX.x0);
      const z = BOX.z0 + (py + 0.5) / BH * (BOX.z1 - BOX.z0);
      const h = land.heightAt(x, z), water = land.waterAt(x, z) != null;
      const slope = clamp((land.heightAt(x - 110, z - 110) - land.heightAt(x + 110, z + 110)) / 120, -1, 1);
      const k = (py * BW + px) * 4;
      if (water) { const depth = clamp(-h / 400, 0, 1); d[k] = C.water[0] - depth * 22; d[k + 1] = C.water[1] - depth * 20; d[k + 2] = C.water[2] - depth * 14; }
      else { const high = clamp(h / 850, 0, 1), light = slope * 30, grain = (Math.sin(x * .018) * Math.cos(z * .024)) * 2.5; d[k] = C.land[0] + high * 14 + light + grain; d[k + 1] = C.land[1] - high * 37 + light + grain; d[k + 2] = C.land[2] - high * 48 + light + grain; }
      d[k + 3] = 255;
    }
    g.putImageData(image, 0, 0);
    return c;
  })().catch(error => { backdropPromise = null; throw error; });
  return backdropPromise;
}

const LEGEND = [
  ['you', 'You'], ['pin', 'Your waypoint (click the map)'], ['home', "Walt's Garage"], ['place', 'Places you have found'], ['town', 'Towns and cities'],
  ['gas', 'Gas station + shop (fuel, wash, repair)'], ['rest', 'Rest stop (wash, repair)'], ['barn', 'Barn (cheap finds, supplies)'], ['junk', 'Junkyard (used parts)'], ['offroad', 'Off-road store (new parts)'], ['start', 'Race start'], ['finish', 'Race finish'], ['score', 'SCORE race route (Baja 1000, 500, 400, SF 250)'], ['mdr', 'MDR dirt loop'], ['road', 'Highway'], ['dirt', 'Dirt road'], ['car', 'Parked vehicle'],
];

export default function WestCoastMap() {
  useGame();
  const ref = useRef(null), drag = useRef(null), view = useRef({ m: 1, ox: 0, oy: 0, init: false }), [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight }), [revision, redraw] = useState(0), [races, setRaces] = useState(true), [trails, setTrails] = useState(true), [selected, setSelected] = useState(''), wp = waypoint();
  useEffect(() => { const on = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const s0 = Math.max(vp.w / WIDTH, vp.h / HEIGHT);   // the least zoom: the map covers the whole screen
  const fit = v => { const S = s0 * v.m; v.ox = clamp(v.ox, vp.w - WIDTH * S, 0); v.oy = clamp(v.oy, vp.h - HEIGHT * S, 0); };
  useEffect(() => { let active = true; backdrop().then(() => { if (active) redraw(n => n + 1); }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true;
    backdrop().then(base => {
      if (!active || !ref.current) return;
      const g = ref.current.getContext('2d'), v = view.current;
      if (!v.init) { v.init = true; v.m = Math.max(1, 6 * OLD / s0); const S0 = s0 * v.m, [a0, b0] = point(game.pos.x, game.pos.z); v.ox = vp.w / 2 - a0 * S0; v.oy = vp.h / 2 - b0 * S0; }
      fit(v);
      const { ox, oy } = v, z1 = s0 * v.m, zoom = z1 / OLD;   // z1: screen pixels per map unit; zoom: the old-map scale the thresholds use
      g.clearRect(0, 0, vp.w, vp.h); g.save(); g.translate(ox, oy); g.scale(z1, z1); g.drawImage(base, 0, 0, WIDTH, HEIGHT);
      const roadLine = (pts, color, width, step = 10, hidden = () => false) => { g.beginPath(); let started = false; for (let i = 0; i < pts.length; i += step) { const p = pts[i]; if (hidden(p)) { started = false; continue; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } } const last = pts[pts.length - 1]; if (last && !hidden(last)) { const [a, b] = point(last.x, last.z); if (started) g.lineTo(a, b); else g.moveTo(a, b); } g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = width / z1; g.stroke(); };
      const network = highways()?.roads || [];
      for (const r of [...network].sort((a, b) => (a.kind === 'dirt' ? -1 : 0) - (b.kind === 'dirt' ? -1 : 0))) {
        if (r.kind === 'dirt' && r.name === 'Dirt road' && !trails) continue;
        if (r.kind === 'dirt' && zoom < 3) continue;
        if (r.kind === 'dirt' && r.name.endsWith(' (dirt)') && zoom < 8) continue;
        if (zoom < 3 && !MAIN_ROADS.has(r.name)) continue;
        if (zoom < 5 && r.kind === 'secondary' && !MAIN_ROADS.has(r.name)) continue;
        const w = (r.kind === 'major' ? 3.6 : r.kind === 'secondary' ? 2.4 : 1.6) * K;
        const dirt = r.kind === 'dirt', hidden = dirt ? undefined : p => highways().higherRoadAt(p.x, p.z, r), step = dirt ? 1 : 2;
        roadLine(r.pts, dirt ? '#5a4234' : C.majorEdge, w + 1.1 * K, step, hidden);
        roadLine(r.pts, dirt ? C.dirt : r.kind === 'major' ? C.major : C.minor, w, step, hidden);
      }
      if (zoom >= 8) {
        for (const r of ROADS) {
          g.beginPath(); let started = false; r.path.pts.forEach((p, i) => { if (i % 6) return; if ((r.kind === 'dirt' || r.kind === 'gravel') && pavedRoadAt(p.x, p.z, 4)) { started = false; return; } const [a, b] = point(p.x, p.z); if (started) g.lineTo(a, b); else { g.moveTo(a, b); started = true; } });
          const loose = r.kind === 'dirt' || r.kind === 'gravel';
          g.lineJoin = g.lineCap = 'round'; g.strokeStyle = loose ? '#5a4234' : C.majorEdge; g.lineWidth = 5 * K / z1; g.stroke(); g.strokeStyle = loose ? C.dirt : r.kind === 'highway' ? C.major : C.minor; g.lineWidth = (r.kind === 'highway' ? 3 : 2.5) * K / z1; g.stroke();
        }
      }
      // Baked desert routes stay findable at every zoom when their layer is on.
      if (trails) trailRoutes().forEach((route, i) => {
        const active = selected === `trail-${i}`;
        roadLine(route.pts, active ? '#102c33' : '#17424a', (active ? 9 : 5) * K, 1);
        roadLine(route.pts, active ? '#a9ffef' : '#53d2b7', (active ? 5.5 : 2.6) * K, 1);
        if (zoom < 3 && !active) return;
        const mid = route.pts[Math.floor(route.pts.length / 2)], [a, b] = point(mid.x, mid.z), r = (active ? 11 : 9) * K / z1;
        g.fillStyle = active ? '#b4fff0' : '#10343d'; g.strokeStyle = '#d6fff7'; g.lineWidth = 1.6 * K / z1;
        g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = active ? '#10343d' : '#fff'; g.font = `800 ${10 * K / z1}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.fillText(String(i + 1), a, b + 3.5 * K / z1);
      });
      // Repeat highway shields only where a named route is actually visible.
      if (zoom >= 3 && zoom <= 11) {
        const placed = new Map();
        for (const r of network) if (MAIN_ROADS.has(r.name) && r.pts?.length > 8) {
          const used = placed.get(r.name) || [];
          for (let i = 5; i < r.pts.length && used.length < 3; i += Math.max(8, Math.floor(r.pts.length / 14))) {
            const p = r.pts[i], [a, b] = point(p.x, p.z), sx = a * z1 + ox, sy = b * z1 + oy;
            if (sx < 250 || sx > vp.w - 65 || sy < 85 || sy > vp.h - 65 || used.some(q => Math.hypot(q[0] - sx, q[1] - sy) < 300)) continue;
            const iw = Math.max(34, r.name.length * 8 + 14) * K / z1, ih = 21 * K / z1;
            g.fillStyle = '#f8f7ed'; g.strokeStyle = '#41535e'; g.lineWidth = 2 * K / z1;
            g.beginPath(); g.roundRect(a - iw / 2, b - ih / 2, iw, ih, 5 * K / z1); g.fill(); g.stroke();
            g.fillStyle = '#263c49'; g.font = `800 ${12 * K / z1}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.fillText(r.name, a, b + 4 * K / z1);
            used.push([sx, sy]);
          }
          placed.set(r.name, used);
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
          const active = selected === `race-${c.id}`;
          g.beginPath(); c.line.forEach(([x, z], i) => { const [a, b] = point(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.lineJoin = g.lineCap = 'round'; g.setLineDash(active ? [] : [8 * K / z1, 5 * K / z1]); g.strokeStyle = active ? '#142832' : color; g.lineWidth = (active ? 9 : big ? 4 : 2.6) * K / z1; g.globalAlpha = 0.9; g.stroke(); if (active) { g.strokeStyle = '#fff1bd'; g.lineWidth = 5 * K / z1; g.stroke(); } g.globalAlpha = 1; g.setLineDash([]);
        }
        for (const c of raceCourses()) {
          const big = c.id === 'score-b1000', color = SERIES_COLOR[c.series] || C.score; if (zoom < 3 && !big) continue;
          const loop = c.kind === 'loop', s = c.start, f = c.finish || c.start;
          const flag = (p, txt, col) => { const [a, b] = point(p.x, p.z), r = (big ? 9 : 7) * K / z1; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2 * K / z1; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `800 ${(big ? 11 : 9) * K / z1}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.fillText(txt, a, b + 3.5 * K / z1); };
          if (s) flag(s, loop ? 'S/F' : 'S', '#2f9e5b'); if (!loop && f) flag(f, 'F', '#c4372d');
          if (s && (big || zoom >= 6)) label(c.name.toUpperCase() + (loop ? ' START/FINISH' : ' START') + (c.from ? ' · ' + c.from.toUpperCase() : ''), s.x, s.z - (big ? 600 : 400), color, 12);
          if (!loop && f && (big || zoom >= 6)) label(c.name.toUpperCase() + ' FINISH' + ((c.to || c.from) ? ' · ' + (c.to || c.from).toUpperCase() : ''), f.x, f.z - 600, color, 12);
        }
      }
      // cities and towns
      const occupied = [];
      for (const place of REAL_PLACES) {
        if (zoom < place.zoom || !meta) continue;
        const { x, z } = projectPlace(place.lat, place.lon, meta), [a, b] = point(x, z);
        const sx = a * z1 + ox, sy = b * z1 + oy, width = place.name.length * 7 * K + 13;
        if (sx < 8 || sx > vp.w - 8 || sy < 8 || sy > vp.h - 8) continue;
        const box = [sx + 4, sy - 13 * K, sx + 4 + width, sy + 4 * K];
        if (occupied.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue;
        occupied.push(box);
        g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 1.6 * K / z1; g.beginPath(); g.arc(a, b, 3.6 * K / z1, 0, 7); g.fill(); g.stroke();
        g.font = `700 ${12 * K / z1}px "Barlow Condensed", system-ui, sans-serif`; g.textAlign = 'left'; g.lineWidth = 3 * K / z1; g.strokeStyle = C.halo; g.strokeText(place.name, a + 6 * K / z1, b + 4 * K / z1); g.fillStyle = C.ink; g.fillText(place.name, a + 6 * K / z1, b + 4 * K / z1);
      }
      if (zoom >= 3) {
        for (const [key, site] of Object.entries(SITES)) if (discovered(game.home).has(key)) { const [a, b] = point(site.x, site.z); g.fillStyle = key === 'garage' ? '#f2a33a' : '#35b873'; g.strokeStyle = '#0b0e10'; g.lineWidth = 1.8 * K / z1; g.beginPath(); g.arc(a, b, 5.5 * K / z1, 0, 7); g.fill(); g.stroke(); if (zoom >= 5 || key === 'garage') label(SITE_NAMES[key] || key, site.x + 170, site.z - 100, '#2f3640', 13); }
      }
      if (zoom >= 3) for (const s of junctions()?.roadside?.sites || []) {   // gas stations (G) and rest stops (R)
        const [a, b] = point(s.x, s.z), r = 6.5 * K / z1; const mk = { gas: ['#f2a33a', 'G'], rest: ['#3a8fd8', 'R'], barn: ['#c0392b', 'B'], junk: ['#8e8e8e', 'J'], offroad: ['#e0661a', 'O'] }[s.type] || ['#3a8fd8', 'R']; g.fillStyle = mk[0]; g.strokeStyle = '#0b0e10'; g.lineWidth = 1.6 * K / z1; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = `800 ${9 * K / z1}px sans-serif`; g.textAlign = 'center'; g.fillText(mk[1], a, b + 3.2 * K / z1);
      }
      for (const v of standingVehicles()) if (!v.forSale) { const [a, b] = point(v.pose.x, v.pose.z); g.fillStyle = '#2aa9d8'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * K / z1; g.beginPath(); g.arc(a, b, 4.5 * K / z1, 0, Math.PI * 2); g.fill(); g.stroke(); }
      // the route and the waypoint
      const rt = routeNow(game.pos.x, game.pos.z, performance.now());
      if (rt) {
        g.beginPath(); rt.pts.forEach((p, i) => { const [a, b] = point(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.lineJoin = g.lineCap = 'round'; if (rt.straight) g.setLineDash([9 * K / z1, 7 * K / z1]); g.strokeStyle = '#521c42'; g.lineWidth = 9 * K / z1; g.stroke(); g.strokeStyle = C.pink; g.lineWidth = 5 * K / z1; g.stroke(); g.setLineDash([]);
        const [a, b] = point(rt.wp.x, rt.wp.z), r = 9 * K / z1; g.fillStyle = C.pink; g.strokeStyle = '#fff'; g.lineWidth = 2.4 * K / z1; g.beginPath(); g.arc(a, b - r * 1.6, r, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(a, b); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(a, b - r * 1.6, r * 0.38, 0, 7); g.fill();
      }
      const [a, b] = point(game.pos.x, game.pos.z), yaw = game.onFoot ? Math.atan2(game.face.x, game.face.z) : game.pose?.h || 0;
      g.translate(a, b); g.rotate(arrowRot(yaw)); g.fillStyle = '#ff4a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1.8 * K / z1;
      g.beginPath(); g.moveTo(0, -11 * K / z1); g.lineTo(7 * K / z1, 8 * K / z1); g.lineTo(0, 4 * K / z1); g.lineTo(-7 * K / z1, 8 * K / z1); g.closePath(); g.fill(); g.stroke(); g.restore();
      const nx = vp.w - 40; g.fillStyle = '#fff'; g.font = '800 18px "Barlow Condensed", sans-serif'; g.textAlign = 'left'; g.fillText('N', nx - 6, 112); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(nx, 122); g.lineTo(nx, 158); g.moveTo(nx - 7, 130); g.lineTo(nx, 122); g.lineTo(nx + 7, 130); g.stroke();
    });
    return () => { active = false; };
  }, [revision, races, trails, selected, vp, game.pos.x, game.pos.z, game.pose?.h, game.face.x, game.face.z, game.home]);
  const toCanvas = e => { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * vp.w, (e.clientY - r.top) / r.height * vp.h]; };
  const wheel = e => {
    e.preventDefault();
    const [px, py] = toCanvas(e), v = view.current, next = clamp(v.m * Math.exp(-e.deltaY * 0.0015), 1, Math.max(1, 24 * OLD / s0)), ratio = next / v.m;
    v.ox = px - (px - v.ox) * ratio; v.oy = py - (py - v.oy) * ratio; v.m = next; fit(v);
    redraw(n => n + 1);
  };
  const pointerDown = e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: view.current.ox, oy: view.current.oy, moved: false }; };
  const pointerMove = e => { const d = drag.current; if (!d) return; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true; const r = e.currentTarget.getBoundingClientRect(), v = view.current; v.ox = d.ox + (e.clientX - d.x) / r.width * vp.w; v.oy = d.oy + (e.clientY - d.y) / r.height * vp.h; fit(v); redraw(n => n + 1); };
  const pointerUp = e => {   // a click (not a drag) drops the waypoint there
    const d = drag.current; drag.current = null; if (!d || d.moved) return;
    const [px, py] = toCanvas(e), v = view.current, S = s0 * v.m, x = BOX.x0 + ((px - v.ox) / S) / WIDTH * (BOX.x1 - BOX.x0), z = BOX.z0 + ((py - v.oy) / S) / HEIGHT * (BOX.z1 - BOX.z0);
    const meta = border()?.meta;
    let name = 'Map marker';
    if (meta) for (const place of REAL_PLACES) { const p = projectPlace(place.lat, place.lon, meta); if (Math.hypot(x - p.x, z - p.z) < 750) { name = place.name; break; } }
    setWaypoint(x, z, name); redraw(n => n + 1);
  };
  const focusDestination = (key, destination, label) => {
    setWaypoint(destination.x, destination.z, label);
    setSelected(key);
    const v = view.current;
    v.m = Math.max(v.m, 6 * OLD / s0);
    const S = s0 * v.m, [a, b] = point(destination.x, destination.z);
    v.ox = vp.w / 2 - a * S; v.oy = vp.h / 2 - b * S; fit(v);
    redraw(n => n + 1);
  };
  const miles = meters => `${(meters / 1609.344).toFixed(1)} mi`;
  return <>
    <canvas ref={ref} width={vp.w} height={vp.h} className="map-canvas west-coast-map" onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; }} onContextMenu={e => { e.preventDefault(); clearWaypoint(); redraw(n => n + 1); }} aria-label="West coast map. Scroll to zoom, drag to pan, click to set a waypoint, right click to clear it." />
    <aside className="map-legend"><div className="lg-wp">{wp ? <><small>DESTINATION</small><b>{wp.label}</b><button onClick={() => { clearWaypoint(); setSelected(''); redraw(n => n + 1); }}>Clear route</button></> : <small>Choose a route below or click the map.</small>}</div>
      <section className="map-route-browser" aria-label="Routes and races"><h3>ROUTES &amp; RACES</h3>
        <label className="lg-toggle"><input type="checkbox" checked={trails} onChange={e => setTrails(e.target.checked)} /> Desert trails <span>{trailRoutes().length}</span></label>
        <label className="lg-toggle"><input type="checkbox" checked={races} onChange={e => setRaces(e.target.checked)} /> Race courses <span>{raceCourses().length}</span></label>
        <div className="map-route-list">
          {trails && trailRoutes().map((route, i) => {
            const a = route.pts[0], b = route.pts.at(-1), nearest = Math.hypot(game.pos.x - a.x, game.pos.z - a.z) <= Math.hypot(game.pos.x - b.x, game.pos.z - b.z) ? a : b;
            return <button key={`trail-${i}`} className={selected === `trail-${i}` ? 'selected' : ''} onClick={() => focusDestination(`trail-${i}`, nearest, `Desert trail ${String(i + 1).padStart(2, '0')}`)} title="Center the map and set a waypoint at the nearest trail entrance"><span className="map-route-number">{String(i + 1).padStart(2, '0')}</span><span>Desert trail {String(i + 1).padStart(2, '0')}<small>{miles(route.total)} · nearest entrance</small></span><span className="map-route-action">GO</span></button>;
          })}
          {races && raceCourses().map(course => <button key={course.id} className={selected === `race-${course.id}` ? 'selected' : ''} onClick={() => focusDestination(`race-${course.id}`, course.start, `${course.name} start`)} title="Center the map and set a waypoint at the race start"><span className={`map-route-number ${course.series?.toLowerCase()}`}>R</span><span>{course.name}<small>{course.series} · {miles((course.dirtLength || 0) + (course.pavedLength || 0))} · start</small></span><span className="map-route-action">GO</span></button>)}
        </div>
      </section>
      <details className="lg-details"><summary>MAP KEY &amp; LAYERS</summary><div className="lg-list">
        {LEGEND.map(([k, t]) => <div key={k} className="lg-row"><i className={`lg lg-${k}`} /><span>{t}</span></div>)}
      </div></details>
    </aside>
    <p className="hint map-hint">Scroll to zoom | drag to pan | click: set waypoint | right click: clear it</p></>;
}
