import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { wrecks } from '../game/loot.js';
import { SCENERY_WRECKS } from '../game/roadsideLoot.js';
import { HM_SIZE, TERRAIN, REAL } from './world.js';
import { WaterSheet } from './Border.jsx';
import { border, SEA_Y } from './border.js';   // (old-square effects keep the old size: the macro colour map and the scatter)
import { SIZE, HALF, height, surface, isRoad, onCore, baseHeight, biomeMasks, washAt, reliefAt, badlandReliefAt, ROADS, TRAILS, ROAD_HALF, SIGNS, SITES, circuit, pitLane, dirtStrip, offroad, startLine, toWorld, highways, junctions, pavedRoadAt } from './county.js';
import { applyGroundDetail } from './groundDetail.js';
import { terrainMaterial, LAYER_OF } from './terrainMaterial.js';
import Desert from './Desert.jsx';
import { Ribbon, tex, rnd, blotches, dots, crack, wrapDraw, blurred, circuitTex, pitTex, dirtTex, looseTex, labelTex, checkerTex } from './TestCenter.jsx';
import Sites, { Mesas } from './Sites.jsx';
import { TOWN } from './siteData.js';
import { signTex } from '../lot/CarLot.jsx';
import { GAS_BRANDS } from './brands.js';
import { stationLayout } from './stationLayout.js';
import { shopName, isShop } from './shopSites.js';
import { SHOP_SIGN } from './shopLayout.js';
import { planStreetLights } from './streetLights.js';
import { REAL_PLACES, projectPlace } from '../game/realPlaces.js';
import Home from './Home.jsx';
import ShopWorkEffects from '../game/ShopWorkEffects.jsx';
import RegionalUtilityPoles from './RegionalUtilityPoles.jsx';
import RegionalPlaceSigns from './RegionalPlaceSigns.jsx';
import RegionalRoadReflectors from './RegionalRoadReflectors.jsx';
import RegionalCurveWarnings from './RegionalCurveWarnings.jsx';
import RegionalRanchFences from './RegionalRanchFences.jsx';
import Flora from './Flora.jsx';
import BiomeScene from './biomes/Biomes.jsx';
import BoundaryWall from './BoundaryWall.jsx';
import { game } from '../game/store.js';
import RealScenery from './RealScenery.jsx';
import { perfStart, perfEnd } from '../game/perfMetrics.js';
import { clockHour } from '../game/clock.js';
import { dayPhase } from './clock.js';
import { DETAIL_RADIUS } from './drawDistance.js';
import WildScenery, { ValleyTrees } from './WildScenery.jsx';
import { coverLite, valleyAt } from './cover.js';
import { CROPS, vnoise } from './groundCover.js';

// ---------------- terrain: 20 x 20 tiles; every tile has a coarse mesh, tiles near you get a fine one ----------------
const TILE = 300, NT = SIZE / TILE, LO = 24, HI = 120, HI_IN = 430, HI_OUT = 640;
const MOUNTAIN = new THREE.Color('#8a6a4e'), HIGH = new THREE.Color('#9c7c5e');
const SHORE = new THREE.Color('#d6c19f'), SILT = new THREE.Color('#d9c9ac'), CLAY = new THREE.Color('#a68162');
const BASIN = new THREE.Color('#c4b28d'), SOUTH = new THREE.Color('#a46a4b');
const CROP_COL = Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, new THREE.Color(c.ground)])), GREEN_TINT = new THREE.Color('#7d8c4a'), DRY_TINT_G = new THREE.Color('#b8a679');
const PAVED = new Set(['asphalt', 'concrete', 'curb']), BIO_GROUND = new Set(['meadow', 'dryGrass', 'forestFloor']);   // biome ground keeps its own colours (no desert mountain tint)
/** time slice for tile building: the generator below gives the frame back whenever this deadline passes (Infinity = run straight through) */
const BUDGET = { until: Infinity };
function tileGeometry(ix, iz, seg) { const prev = BUDGET.until; BUDGET.until = Infinity; try { return tileGen(ix, iz, seg).next().value; } finally { BUDGET.until = prev; } }   // all at once (the fixed test world)
function* tileGen(ix, iz, seg) {   // the same tile, built in slices so streaming never freezes a frame
  const started = perfStart();
  const x0 = -HALF + ix * TILE, z0 = -HALF + iz * TILE, step = TILE / seg, n = seg + 1, P = n + 2;
  const H = new Float32Array(P * P);   // heights on a grid padded by one ring, for normals across tile edges
  for (let j = 0; j < P; j++) { for (let i = 0; i < P; i++) H[j * P + i] = height(x0 + (i - 1) * step, z0 + (j - 1) * step); if (performance.now() >= BUDGET.until) yield; }
  const count = n * n + 4 * n, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const w0 = new Float32Array(count * 4), w1 = new Float32Array(count * 4), misc = new Float32Array(count * 2), w = new Float32Array(8);
  const c = new THREE.Color(), r = rnd(ix * 31 + iz * 7 + 3);
  const put = (k, i, j, drop) => {
    const x = x0 + i * step, z = z0 + j * step, h = H[(j + 1) * P + i + 1];
    // The padded height grid already contains both neighbours. Reuse it for
    // normals instead of four more world-height queries at every vertex.
    const dx = (H[(j + 1) * P + i + 2] - H[(j + 1) * P + i]) / (2 * step);
    const dz = (H[(j + 2) * P + i + 1] - H[j * P + i + 1]) / (2 * step);
    const l = Math.hypot(dx, 1, dz);
    pos.set([x, h - drop, z], k * 3); nor.set([-dx / l, 1 / l, -dz / l], k * 3);
    const sf = surface(x, z), slope = Math.abs(dx) + Math.abs(dz), paved = PAVED.has(sf.key), core = onCore(x, z);
    // ground layers: the surface's own, plus bare rock on steep ground and sand drifted into the washes (natural ground only)
    w.fill(0); w[LAYER_OF[sf.key] ?? 1] = 1;
    if (!core) {
      const rock = Math.min(0.9, Math.max(0, (slope - 0.35) / 0.5)); if (rock > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - rock; w[5] += rock; }
      const sand = sf.key === 'scrub' || sf.key === 'dirt' ? washAt(x, z) * 0.7 : 0; if (sand > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - sand; w[0] += sand; }
    }
    const region = REAL && !core ? border().regionAt(x, z) : null;
    const shore = region && sf.key !== 'water' ? region.coast : 0;
    if (region && sf.key !== 'water' && sf.key !== 'rock' && !paved) {
      const south = region.south * 0.45;
      for (let q = 0; q < 8; q++) w[q] *= 1 - south;
      w[3] += south;
    }
    if (shore > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - shore; w[0] += shore; }
    // what grows here (worlds/groundCover.js): crop fields in the valley, greener washes, grassy ground where the grass layer grows thick
    const cv = paved || sf.key === 'water' ? null : coverLite(x, z, sf.key, slope, core);
    if (cv && (cv.crop || cv.green > 0.08)) {
      const g = cv.crop ? (CROPS[cv.crop].grass ? 0.85 : 0) * cv.valley : Math.min(0.6, cv.green * 0.7), d = cv.crop && !CROPS[cv.crop].grass ? 0.8 * cv.valley : 0;
      if (g > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - g; w[6] += g; }
      if (d > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - d; w[2] += d; }   // plowed / fallow: bare dirt
    }
    w0.set([w[0], w[1], w[2], w[3]], k * 4); w1.set([w[4], w[5], w[6], w[7]], k * 4);
    misc.set([sf.key === 'playa' ? 1 : sf.key === 'mud' ? 0.6 : 0, core || paved ? 0 : reliefAt(x, z)], k * 2);
    c.set(sf.color).multiplyScalar(1 - Math.min(0.3, slope * 0.25));
    if (region && sf.key !== 'water' && !paved) { c.lerp(BASIN, region.basin * 0.22); c.lerp(SOUTH, region.south * 0.26); }
    if (shore > 0) c.lerp(SHORE, shore * 0.75);
    if (h > 30 && !core && !BIO_GROUND.has(sf.key)) {
      c.lerp(MOUNTAIN, Math.min(0.6, (h - 30) / 90));
      c.lerp(HIGH, THREE.MathUtils.smoothstep(h, 80, 160) * 0.24);
    }
    if (region && !paved) {
      const relief = badlandReliefAt(x, z);
      if (relief < 0) c.lerp(SILT, Math.min(0.65, -relief * 0.32));
      if (relief > 0) {
        const band = 0.5 + 0.5 * Math.sin(h * 0.94 + x * 0.009 - z * 0.012);
        c.lerp(CLAY, Math.min(1, relief / 5) * (0.15 + 0.27 * band));
      }
    }
    if (cv?.crop) { c.lerp(CROP_COL[cv.crop], cv.valley * 0.85); c.multiplyScalar(0.94 + vnoise(x, z, 11, 3) * 0.12); }   // a little light and dark across each field
    else if (cv) { c.lerp(GREEN_TINT, cv.green * 0.45); c.lerp(DRY_TINT_G, cv.dry * 0.15); }
    c.offsetHSL(Math.sin(x * 0.011 + z * 0.007) * 0.01, Math.sin(x * 0.017 - z * 0.013) * 0.04, Math.sin(x * 0.041 + z * 0.036) * 0.03 + (r() - 0.5) * 0.03);
    col.set([c.r, c.g, c.b], k * 3);
  };
  for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) put(j * n + i, i, j, 0); if (performance.now() >= BUDGET.until) yield; }
  // skirts: every edge vertex again, 4 m lower, so a fine tile next to a coarse one never shows a crack
  const edges = [[i => [i, 0]], [i => [i, seg]], [j => [0, j]], [j => [seg, j]]];
  edges.forEach(([f], e) => { for (let t = 0; t < n; t++) { const [i, j] = f(t); put(n * n + e * n + t, i, j, 24); } });
  const idx = [];
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * n + i, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e); }
  edges.forEach(([f], e) => { for (let t = 0; t < seg; t++) { const [i0, j0] = f(t), [i1, j1] = f(t + 1), a = j0 * n + i0, b = j1 * n + i1, sa = n * n + e * n + t, sb = sa + 1; idx.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aW0', new THREE.BufferAttribute(w0, 4)); g.setAttribute('aW1', new THREE.BufferAttribute(w1, 4)); g.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
  g.setIndex(idx); g.computeBoundingSphere(); perfEnd(seg === HI ? 'terrain fine tile' : 'terrain coarse tile', started); return g;
}

function Terrain() {
  const group = useRef(), { camera } = useThree();
  const mat = useMemo(() => terrainMaterial({ size: HM_SIZE, half: HM_SIZE / 2 }), []);
  const tiles = useMemo(() => {
    const out = [];
    for (let iz = 0; iz < NT; iz++) for (let ix = 0; ix < NT; ix++) {
      const tcx = -HALF + (ix + 0.5) * TILE, tcz = -HALF + (iz + 0.5) * TILE; if (tcx < TERRAIN.x0 || tcx > TERRAIN.x1 || tcz < TERRAIN.z0 || tcz > TERRAIN.z1) continue;   // outside the built part of the world
      const lo = new THREE.Mesh(tileGeometry(ix, iz, LO), mat); lo.receiveShadow = true;
      out.push({ ix, iz, cx: -HALF + (ix + 0.5) * TILE, cz: -HALF + (iz + 0.5) * TILE, lo, hi: null });
    }
    return out;
  }, [mat]);
  useEffect(() => { const g = group.current; tiles.forEach(t => g.add(t.lo)); return () => tiles.forEach(t => { g.remove(t.lo); t.lo.geometry.dispose(); if (t.hi) { g.remove(t.hi); t.hi.geometry.dispose(); } }); }, [tiles]);
  const clock = useRef(0);
  useFrame((_, dt) => {
    clock.current += dt; if (clock.current < 0.15 && tiles.some(t => t.hi)) return; clock.current = 0;
    const px = game.onFoot ? camera.position.x : game.pos.x, pz = game.onFoot ? camera.position.z : game.pos.z;
    let want = null, wd = 1e9;
    for (const t of tiles) {
      const d = Math.max(0, Math.hypot(px - t.cx, pz - t.cz) - TILE * 0.7);
      if (t.hi && d > HI_OUT) { group.current.remove(t.hi); t.hi.geometry.dispose(); t.hi = null; t.lo.visible = true; }
      if (!t.hi && d < HI_IN && d < wd) { want = t; wd = d; }
    }
    if (want) { const m = new THREE.Mesh(tileGeometry(want.ix, want.iz, HI), mat); m.receiveShadow = true; want.hi = m; group.current.add(m); want.lo.visible = false; }   // one fine tile per tick: no long hitch
  });
  return <group ref={group} />;
}

/** ?realmap: the world is the real border slice (40 x 53 km), so tiles are built only near the player and dropped behind (same tiles as above) */
const R_LO = 4500, R_HI = 430, R_DROP = 5600, LO_REAL = 12;
function StreamTerrain() {
  const group = useRef(), { camera } = useThree(), tiles = useRef(new Map()), jobs = useRef([]);
  const mat = useMemo(() => terrainMaterial({ size: HM_SIZE, half: HM_SIZE / 2 }), []);
  useEffect(() => () => { tiles.current.forEach(t => { t.lo?.geometry.dispose(); t.hi?.geometry.dispose(); }); tiles.current.clear(); jobs.current = []; }, []);
  useFrame(() => {
    const started = perfStart();
    const p = game.onFoot ? camera.position : game.pos, g = group.current, map = tiles.current, q = jobs.current;
    // tile geometry is built in slices of about 4 ms a frame (a fine tile is hundreds of ms in one go: that was the hitch at speed)
    for (let i = q.length - 1; i >= 0; i--) { const j = q[i]; if (j.t && Math.hypot(j.cx - p.x, j.cz - p.z) > R_DROP) { q.splice(i, 1); if (j.hi) j.t.hiJob = false; else map.delete(j.k); } }   // after a teleport: forget the tiles queued around the old spot
    const urgent = q.some(j => j.near);   // ground near you is still missing (just arrived, or fast): spend more of the frame on it than the usual 4 ms, then fall back
    const t0 = performance.now(); BUDGET.until = t0 + (urgent ? 11 : 4);
    while (q.length && performance.now() < BUDGET.until) { const j = q[0], r = j.gen.next(); if (r.done) { q.shift(); j.done(r.value); } }
    BUDGET.until = Infinity;
    const viewRadius = Math.min(R_LO, 800 + 3700 * dayPhase(clockHour())); // fog ends at 600 m at night, 4300 m by day
    const cx = Math.floor((p.x + HALF) / TILE), cz = Math.floor((p.z + HALF) / TILE), R = Math.ceil(viewRadius / TILE), ctr = (i, j) => [-HALF + (i + 0.5) * TILE, -HALF + (j + 0.5) * TILE];
    let queued = 0, hiQueued = q.some(j => j.hi);
    const more = () => q.length + queued < (urgent ? 8 : 3);   // keep a short queue: nearest tiles first, new ones only as the old ones finish
    const order = (t, geo, key, hi) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; if (map.get(key) !== t) { geo.dispose(); return; } g.add(m); if (hi) { t.hi = m; t.hiJob = false; if (t.lo) t.lo.visible = false; } else { t.lo = m; t.loJob = false; if (t.hi) m.visible = false; } };
    for (let ring = 0; ring <= R && more(); ring++) for (let iz = cz - ring; iz <= cz + ring && more(); iz++) for (let ix = cx - ring; ix <= cx + ring && more(); ix++) {
      if (Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== ring) continue;
      const [tx, tz] = ctr(ix, iz), d = Math.max(0, Math.hypot(tx - p.x, tz - p.z) - TILE * 0.7); if (d > viewRadius) continue;
      const k = ix + ',' + iz; let t = map.get(k);
      if (!t) { t = { ix, iz, lo: null, hi: null, loJob: true, hiJob: false }; map.set(k, t); const tt = t; q.push({ gen: tileGen(ix, iz, d < 1500 ? LO : LO_REAL), done: geo => order(tt, geo, k, false), t: tt, k, cx: tx, cz: tz, near: d < 700 }); queued++; }
      if (!t.hi && !t.hiJob && !hiQueued && d < R_HI) { t.hiJob = true; hiQueued = true; const tt = t; q.push({ hi: true, gen: tileGen(ix, iz, HI), done: geo => order(tt, geo, k, true), t: tt, k, cx: tx, cz: tz }); queued++; }
    }
    if (queued) { perfEnd('terrain stream frame', started); return; }
    for (const [k, t] of map) {
      const [tx, tz] = ctr(t.ix, t.iz), d = Math.max(0, Math.hypot(tx - p.x, tz - p.z) - TILE * 0.7);
      if (t.hi && d > HI_OUT) { g.remove(t.hi); t.hi.geometry.dispose(); t.hi = null; if (t.lo) t.lo.visible = true; }
      if (d > R_DROP) { if (t.lo) { g.remove(t.lo); t.lo.geometry.dispose(); } if (t.hi) { g.remove(t.hi); t.hi.geometry.dispose(); } map.delete(k); continue; }
      if (t.lo) t.lo.visible = d <= viewRadius && !t.hi;
      if (t.hi) t.hi.visible = d <= viewRadius;
    }
    perfEnd('terrain stream frame', started);
  });
  return <group ref={group} />;
}

// ---------------- road textures ----------------
/** 2-lane blacktop: worn asphalt, painted lines and dusty dirt edges (u across 8.8 m) */
export const blacktop = (center = 'double') => () => tex(512, 1024, (g, w, h) => {
  const r = rnd(center === 'double' ? 51 : 53), M = w / 8.8;
  g.fillStyle = '#927653'; g.fillRect(0, 0, w, h); dots(g, r, w, h, 9000, ['#b49a70', '#735d42', '#6b5842'], 1, 3, 0.6);
  const a0 = (8.8 - 7.2) / 2 * M;
  g.fillStyle = '#494947'; g.fillRect(a0, 0, w - 2 * a0, h);
  g.save(); g.beginPath(); g.rect(a0, 0, w - 2 * a0, h); g.clip();
  blotches(g, r, w, h, 60, 0.06, 0.16, 70); dots(g, r, w, h, 26000, ['#5e5d58', '#353635', '#77736b', '#51514e'], 1, 2.4, 0.5);
  blurred(g, 10, () => { g.fillStyle = 'rgba(15,14,13,0.22)'; for (const cx of [0.3, 0.42, 0.58, 0.7]) g.fillRect(w * cx - 0.4 * M, 0, 0.8 * M, h); });
  wrapDraw(g, w, h, () => { for (let k = 0; k < 10; k++) crack(g, r, a0 + r() * (w - 2 * a0), r() * h, 12 + Math.floor(r() * 16), 0.5); });
  for (let k = 0; k < 3; k++) { const x = a0 + r() * (w - 2 * a0 - 90), y = r() * (h - 200); blurred(g, 6, () => { g.fillStyle = 'rgba(22,24,26,0.18)'; g.fillRect(x, y, 60 + r() * 60, 100 + r() * 120); }); }
  // Windblown dust and aggregate collect at the edges, leaving the wheel paths cleaner.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? a0 : w - a0;
    const dust = g.createLinearGradient(edge, 0, edge - side * 0.55 * M, 0);
    dust.addColorStop(0, 'rgba(176,146,102,0.26)'); dust.addColorStop(1, 'rgba(176,146,102,0)');
    g.fillStyle = dust; g.fillRect(side < 0 ? edge : edge - 0.55 * M, 0, 0.55 * M, h);
    for (let k = 0; k < 650; k++) { g.fillStyle = r() > 0.5 ? '#aa9473' : '#88795e'; g.globalAlpha = 0.08 + r() * 0.2;
      g.fillRect(edge - side * r() * 0.5 * M, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.globalAlpha = 1;
  }
  // Thin sealed cracks run with the traffic rather than across the whole road.
  wrapDraw(g, w, h, () => { for (let k = 0; k < 8; k++) {
    const x = a0 + M * (0.8 + r() * 5.6), y = r() * h;
    g.strokeStyle = 'rgba(17,18,18,0.32)'; g.lineWidth = 1.5 + r(); g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + (r() - 0.5) * 12, y + 70, x + (r() - 0.5) * 16, y + 140, x + (r() - 0.5) * 12, y + 220); g.stroke();
  } });
  g.restore();
  const line = (x, wid, col, dash) => { g.fillStyle = col; if (!dash) g.fillRect(x - wid / 2, 0, wid, h); else for (let y = 0; y < h; y += h / 4) g.fillRect(x - wid / 2, y, wid, h / 8); };
  if (center !== 'blank') { line(a0 + 0.25 * M, 0.12 * M, '#e8e6dc'); line(w - a0 - 0.25 * M, 0.12 * M, '#e8e6dc'); }
  if (center === 'double') { line(w / 2 - 0.1 * M, 0.1 * M, '#d8b23a'); line(w / 2 + 0.1 * M, 0.1 * M, '#d8b23a'); } else if (center !== 'none' && center !== 'blank') line(w / 2, 0.12 * M, '#e8e6dc', true);
  // Small dark chips dull the painted edges without cutting holes through the mesh.
  if (center !== 'blank') for (const x of [a0 + 0.25 * M, w - a0 - 0.25 * M]) for (let k = 0; k < 170; k++) {
    g.fillStyle = k % 3 ? '#77746b' : '#434441'; g.globalAlpha = 0.2 + r() * 0.45;
    g.fillRect(x - 0.05 * M + (r() - 0.5) * 3, r() * h, 1 + r() * 3, 2 + r() * 9);
  }
  g.globalAlpha = 1;
  dots(g, r, w, h, 4000, ['#3c3f43', '#4a4d51'], 1, 3, 0.6);   // wear the paint
  g.globalCompositeOperation = 'destination-out';
  for (const side of [0, 1]) { const gr = g.createLinearGradient(side ? w : 0, 0, side ? w - a0 * 0.9 : a0 * 0.9, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(side ? w - a0 : 0, 0, a0, h); }
  g.globalCompositeOperation = 'source-over';
});
// Junction UVs use world coordinates, so this texture must tile in both directions.
// The ribbon texture has transparent shoulders and lengthwise wear bands; tiling it
// across an intersection made the repeating pale stripes in the road surface.
const junctionTex = () => tex(512, 512, (g, w, h) => {
  const r = rnd(57);
  g.fillStyle = '#474a4d'; g.fillRect(0, 0, w, h);
  blotches(g, r, w, h, 45, 0.045, 0.08, 55);
  dots(g, r, w, h, 18000, ['#55585c', '#2b2d30', '#6a6d71', '#46484c'], 1, 2.4, 0.45);
  wrapDraw(g, w, h, () => { for (let k = 0; k < 12; k++) crack(g, r, r() * w, r() * h, 8 + Math.floor(r() * 12), 0.3); });
});
const highwayTex = blacktop('double'), streetTex = blacktop('dashed'), rampTex = blacktop('none');
export const shoulderTex = () => tex(256, 512, (g, w, h) => {
  const r = rnd(71);
  g.fillStyle = '#a28b67'; g.fillRect(0, 0, w, h);
  blotches(g, r, w, h, 55, 0.07, 0.13, 35);
  dots(g, r, w, h, 9000, ['#c1aa80', '#79684e', '#b39a70', '#665844'], 1, 3.5, 0.6);
  // Parallel scuffs and scattered stones break up the compacted dirt strip.
  for (const x of [w * 0.28, w * 0.58]) {
    g.strokeStyle = 'rgba(88,74,55,0.16)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 9, h * 0.3, x - 8, h * 0.7, x + 3, h); g.stroke();
  }
  dots(g, r, w, h, 420, ['#d1bd94', '#675d4b', '#8f7a5d'], 3, 7, 0.42);
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(w * 0.72, 0, w, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade; g.fillRect(w * 0.72, 0, w * 0.28, h); g.globalCompositeOperation = 'source-over';
});
const ROAD_LOOK = {
  highway: { makeTexture: highwayTex, tile: 30, segs: 6, feather: true, detail: { grain: 0.2, bump: 0.35, macro: 0.1 } },
  street: { makeTexture: streetTex, tile: 30, segs: 6, feather: true, detail: { grain: 0.2, bump: 0.35, macro: 0.1 } },
  gravel: { makeTexture: dirtTex, tile: 25, segs: 4, feather: true, detail: { grain: 0.45, bump: 0.8, macro: 0.15 } },
  dirt: { makeTexture: dirtTex, tile: 25, segs: 4, feather: true, detail: { grain: 0.42, bump: 0.8, macro: 0.15 } },
};

/** ?realmap: the real highways (county.js highways()), drawn in 400 m pieces only near the player; two shared materials */
const HW_VIEW = DETAIL_RADIUS, HW_PIECE = 100;   // roads vanish with the rest of the scenery, not at the horizon
/** far pieces (lod 1) use every 3rd point and 2 strips across instead of 6: about a ninth of the triangles, and you cannot tell from 450 m */
const hwRows = (a, b, lod) => { const ks = []; for (let k = a; k < b; k += lod ? 3 : 1) ks.push(k); ks.push(b); return ks; };
function ribbonWidthAt(road, point) {
  if (road.fadeEnd) return THREE.MathUtils.smoothstep(road.total - point.s, 0, 24);
  if (road.kind === 'ramp') return THREE.MathUtils.smoothstep(Math.min(point.s, road.total - point.s), 0, 65);
  return 1;
}
function hwPieceGeometry({ r, a, b }, H, clearCrossings = true, lod = 0) {
  const segs = lod ? 2 : 6, half = r.style.half + (r.kind === 'ramp' ? 0.4 : 0.8), pos = [], uv = [], idx = [];
  const crossings = [];
  const ks = hwRows(a, b, lod);
  for (let row = 0; row < ks.length; row++) {
    const k = ks[row], prev = r.pts[ks[row - 1]];
    const p = r.pts[k], nx = p.tz, nz = -p.tx;
    const dirtHidden = r.kind === 'dirt' && row && H.pavedAt(p.x, p.z, 1) && H.pavedAt(prev.x, prev.z, 1);
    const merge = ribbonWidthAt(r, p);
    for (let j = 0; j <= segs; j++) {
      const d = (j / segs * 2 - 1) * half * merge, x = p.x + nx * d, z = p.z + nz * d;
      pos.push(x, height(x, z) + (r.kind === 'major' ? 0.034 : r.kind === 'secondary' ? 0.028 : 0.020) + (1 - r.index / H.roads.length) * 0.004, z); uv.push(j / segs, p.s / 30);
      // Paved junction patches are disabled below. Keep both asphalt ribbons
      // continuous; the road draw order resolves their overlap at crossings.
      if (row && j && !dirtHidden) { const i0 = (row - 1) * (segs + 1) + j - 1, i1 = i0 + 1, i2 = row * (segs + 1) + j - 1, i3 = i2 + 1; idx.push(i0, i2, i1, i1, i2, i3); }
    }
    if (row) crossings.push(clearCrossings && (H.crossingDistance(p.x, p.z, r) < 13 || H.crossingDistance(prev.x, prev.z, r) < 13));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (r.kind === 'dirt') g.addGroup(0, idx.length, 0);
  for (let i = 0; r.kind !== 'dirt' && i < crossings.length;) {
    let j = i + 1; while (j < crossings.length && crossings[j] === crossings[i]) j++;
    g.addGroup(i * segs * 6, (j - i) * segs * 6, crossings[i] ? 1 : 0); i = j;
  }
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function hwShoulderGeometry({ r, a, b }, H) {
  const bands = 4, pos = [], uv = [], idx = [];
  const edge = r.style.half + (r.kind === 'ramp' ? 0.4 : 0.8);
  const width = r.kind === 'major' ? 3.6 : r.kind === 'ramp' ? 1.8 : 2.8;
  for (const side of [-1, 1]) {
    const base = pos.length / 3;
    for (let k = a; k <= b; k++) {
      const p = r.pts[k], nx = p.tz, nz = -p.tx, row = k - a;
      const dirtHidden = r.kind === 'dirt' && (H.pavedAt(p.x, p.z, 7) || (row && H.pavedAt(r.pts[k - 1].x, r.pts[k - 1].z, 7)));
      const merge = ribbonWidthAt(r, p);
      const before = r.pts[Math.max(0, k - 10)], after = r.pts[Math.min(r.pts.length - 1, k + 10)];
      const bend = Math.atan2(before.tx * after.tz - before.tz * after.tx, before.tx * after.tx + before.tz * after.tz);
      const outside = r.kind !== 'dirt' && r.kind !== 'ramp' && side * Math.sign(bend) > 0 && H.crossingDistance(p.x, p.z, r) > 35;
      const verge = width + (outside ? THREE.MathUtils.smoothstep(Math.abs(bend), 0.12, 0.5) * 1.1 : 0);
      for (let j = 0; j <= bands; j++) {
        const t = j / bands, d = side * (edge - 0.45 + verge * t) * merge;
        const x = p.x + nx * d, z = p.z + nz * d;
        pos.push(x, height(x, z) + 0.025, z); uv.push(t, p.s / 18);
        if (row && j && !dirtHidden) { const a0 = base + (row - 1) * (bands + 1) + j - 1, b0 = a0 + 1, c0 = base + row * (bands + 1) + j - 1, d0 = c0 + 1;
          if (side > 0) idx.push(a0, c0, b0, b0, c0, d0); else idx.push(a0, b0, c0, b0, d0, c0); }
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function HighwayRibbons({ connections }) {
  const H = highways(), group = useRef(), { camera } = useThree(), pieces = useRef(new Map()), tick = useRef(1);
  const mats = useMemo(() => {
    const mk = makeTexture => applyGroundDetail(new THREE.MeshStandardMaterial({ map: makeTexture(), roughness: 0.93, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), { grain: 0.2, bump: 0.35, macro: 0.1 });
    return { major: mk(streetTex), secondary: mk(highwayTex), ramp: mk(rampTex), dirt: mk(dirtTex), shoulder: applyGroundDetail(new THREE.MeshStandardMaterial({ map: shoulderTex(), roughness: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { grain: 0.45, bump: 0.7, macro: 0.15 }) };
  }, []);
  const list = useMemo(() => {
    const out = [];
    H.roads.forEach((r, ri) => { for (let a = 0; a < r.pts.length - 1; a += HW_PIECE) {
      const b = Math.min(r.pts.length - 1, a + HW_PIECE);
      let spans = [[a, b]];
      for (const [lo, hi] of connections?.hidden.get(r) || []) {
        spans = spans.flatMap(([from, to]) => hi < from || lo > to ? [[from, to]] : [[from, Math.min(to, lo - 1)], [Math.max(from, hi + 1), to]]);
      }
      spans.forEach(([from, to], part) => {
        if (to <= from) return;
        const m = r.pts[(from + to) >> 1]; out.push({ key: ri + ':' + a + ':' + part, r, a: from, b: to, cx: m.x, cz: m.z, rad: (to - from) * 2 });
      });
    } });
    return out;
  }, [H, connections]);
  useEffect(() => () => { pieces.current.forEach(piece => piece.children.forEach(m => m.geometry.dispose())); pieces.current.clear(); }, []);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.2) return; tick.current = 0;
    const started = perfStart();
    const p = game.onFoot ? camera.position : game.pos, g = group.current, map = pieces.current; let built = 0;
    const view = Math.min(HW_VIEW, 600 + 700 * dayPhase(clockHour()));
    for (const s of list) {
      const d = Math.hypot(s.cx - p.x, s.cz - p.z) - s.rad, have = map.get(s.key);
      const lod = d > 380 ? 1 : 0;   // far: coarse road, no shoulder strip (a piece is rebuilt in detail when you get within 350 m)
      if (have && have.userData.lod && d < 300 && built < 6) { g.remove(have); have.children.forEach(m => m.geometry.dispose()); map.delete(s.key); built++; }
      if (d < view && !map.has(s.key) && built < 6) {
        const piece = new THREE.Group(); piece.userData.lod = lod;
        if (!lod) { const shoulder = new THREE.Mesh(hwShoulderGeometry(s, H), mats.shoulder); shoulder.receiveShadow = true; shoulder.renderOrder = -1; piece.add(shoulder); }
        const road = new THREE.Mesh(hwPieceGeometry(s, H, false, lod), mats[s.r.kind] || mats.secondary);
        road.receiveShadow = true; road.renderOrder = (s.r.kind === 'major' ? 4 : s.r.kind === 'secondary' ? 3 : s.r.kind === 'ramp' ? 2 : 1) + (1 - s.r.index / H.roads.length); piece.add(road);
        g.add(piece); map.set(s.key, piece); built++;
      }
      else if (d > view + 150 && have) { g.remove(have); have.children.forEach(m => m.geometry.dispose()); map.delete(s.key); }
    }
    if (built === 6) tick.current = 0.2;   // more to build: come straight back next frame
    perfEnd('road stream frame', started);
  });
  return <group ref={group} />;
}

/** One continuous paved surface per node, sampled against the graded ground. */
/** shows its children only while the player is within r metres of a grid cell ('ix,iz' of `size` m): far junctions cost no draw calls */
function NearGate({ cell, size, r, children }) {
  const g = useRef(), { camera } = useThree(), tick = useRef(0), [ix, iz] = cell.split(',').map(Number), cx = (ix + 0.5) * size, cz = (iz + 0.5) * size;
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.3 || !g.current) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos; g.current.visible = Math.hypot(p.x - cx, p.z - cz) < r + size * 0.71;
  });
  return <group ref={g}>{children}</group>;
}
function HighwayJunctionSurfaces({ connections }) {
  const chunks = useMemo(() => {
    const groups = new Map();
    for (const node of connections.junctions) {
      const key = `${Math.floor(node.center.x / 800)},${Math.floor(node.center.z / 800)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(node);
    }
    return [...groups].map(([key, nodes]) => {
    const collector = (lift, texCoord = p => [p.x / 12, p.z / 12]) => {
      const pos = [], uv = [], idx = [];
      const vertex = p => { pos.push(p.x, height(p.x, p.z) + lift, p.z); uv.push(...texCoord(p)); };
      const emit = (a, b, c) => { const i = pos.length / 3; vertex(a); vertex(b); vertex(c); if ((b.x-a.x)*(c.z-a.z) > (b.z-a.z)*(c.x-a.x)) idx.push(i, i+2, i+1); else idx.push(i, i+1, i+2); };
      const build = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
      return { emit, build };
    };
    const crossing = collector(0.045), mouth = collector(0.06, p => [p.u, p.v]), mouthShoulder = collector(0.035, p => [p.u, p.v]);
    for (const node of nodes.filter(n => n.kind !== 'tee')) {
      const at = (p, t) => ({ x: node.center.x + (p.x - node.center.x) * t, z: node.center.z + (p.z - node.center.z) * t });
      for (let i = 0; i < node.polygon.length; i++) {
        const p = node.polygon[i], q = node.polygon[(i + 1) % node.polygon.length];
        const rings = Math.max(2, Math.ceil(Math.max(Math.hypot(p.x - node.center.x, p.z - node.center.z), Math.hypot(q.x - node.center.x, q.z - node.center.z)) / 3));
        for (let ring = 0; ring < rings; ring++) {
          const a = at(p, ring / rings), b = at(p, (ring + 1) / rings);
          const c = at(q, ring / rings), d = at(q, (ring + 1) / rings);
          if (ring) crossing.emit(a, b, c);
          crossing.emit(c, b, d);
        }
      }
    }
    for (const node of nodes.filter(n => n.kind === 'tee')) for (const leg of node.legs.filter(l => !node.mainRoads.includes(l.road))) {
      const overlap = 1.5, length = Math.hypot(leg.p.x - node.center.x, leg.p.z - node.center.z) + overlap;
      const rows = Math.max(2, Math.ceil(length / 2));
      const at = (t, side) => {
        const width = leg.half + 2.2 * (1 - t) ** 2;
        return { x: node.center.x + (leg.p.x - node.center.x) * t + leg.outward.x * overlap * t + leg.normal.x * width * side,
          z: node.center.z + (leg.p.z - node.center.z) * t + leg.outward.z * overlap * t + leg.normal.z * width * side,
          u: (1 + side * (leg.dir === -1 ? 1 : -1)) / 2, v: ((leg.p.s ?? 0) + leg.dir * (overlap + (t - 1) * length)) / 30 };
      };
      for (let row = 0; row < rows; row++) for (let col = 0; col < 4; col++) {
        const a = at(row / rows, col / 2 - 1), b = at((row + 1) / rows, col / 2 - 1);
        const c = at(row / rows, (col + 1) / 2 - 1), d = at((row + 1) / rows, (col + 1) / 2 - 1);
        mouth.emit(a, b, c); mouth.emit(c, b, d);
      }
      const shoulderWidth = leg.road.kind === 'major' ? 3.6 : 2.8;
      const edgeAt = (t, side, u) => {
        const width = leg.half + 2.2 * (1 - t) ** 2, lateral = side * (width - 0.45 + shoulderWidth * u);
        return { x: node.center.x + (leg.p.x - node.center.x) * t + leg.outward.x * overlap * t + leg.normal.x * lateral,
          z: node.center.z + (leg.p.z - node.center.z) * t + leg.outward.z * overlap * t + leg.normal.z * lateral,
          u, v: ((leg.p.s ?? 0) + leg.dir * (overlap + (t - 1) * length)) / 18 };
      };
      for (const side of [-1, 1]) for (let row = 0; row < rows; row++) for (let col = 0; col < 3; col++) {
        const a = edgeAt(row / rows, side, col / 3), b = edgeAt((row + 1) / rows, side, col / 3);
        const c = edgeAt(row / rows, side, (col + 1) / 3), d = edgeAt((row + 1) / rows, side, (col + 1) / 3);
        if (side > 0) { mouthShoulder.emit(a, b, c); mouthShoulder.emit(c, b, d); }
        else { mouthShoulder.emit(a, c, b); mouthShoulder.emit(c, d, b); }
      }
    }
    return { key, geometry: crossing.build(), mouthGeometry: mouth.build(), mouthShoulderGeometry: mouthShoulder.build() };
    });
  }, [connections]);
  const material = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ map: junctionTex(), roughness: 0.93, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { grain: 0.2, bump: 0.35, macro: 0.1 }), []);
  const mouthMaterial = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ map: blacktop('blank')(), roughness: 0.93, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { grain: 0.2, bump: 0.35, macro: 0.1 }), []);
  const shoulderMaterial = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ map: shoulderTex(), roughness: 1, transparent: true, depthWrite: false }), { grain: 0.45, bump: 0.7, macro: 0.15 }), []);
  useEffect(() => () => {
    for (const { geometry, mouthGeometry, mouthShoulderGeometry } of chunks) {
      geometry.dispose(); mouthGeometry.dispose(); mouthShoulderGeometry.dispose();
    }
    material.map?.dispose(); material.dispose(); mouthMaterial.map?.dispose(); mouthMaterial.dispose(); shoulderMaterial.map?.dispose(); shoulderMaterial.dispose();
  }, [chunks, material, mouthMaterial, shoulderMaterial]);
  return <>{chunks.map(({ key, geometry, mouthGeometry, mouthShoulderGeometry }) => <NearGate key={key} cell={key} size={800} r={1500}>
    {mouthShoulderGeometry.index.count > 0 && <mesh geometry={mouthShoulderGeometry} material={shoulderMaterial} renderOrder={-2} receiveShadow />}
    {mouthGeometry.index.count > 0 && <mesh geometry={mouthGeometry} material={mouthMaterial} renderOrder={0} receiveShadow />}
    {geometry.index.count > 0 && <mesh geometry={geometry} material={material} renderOrder={3} receiveShadow />}
  </NearGate>)}</>;
}

/** ?realmap: STOP signs, street lights and dead-end signs at the real junctions (worlds/junctions.js); all instanced, one draw call per part */
function HighwayFurniture() {
  const list = useMemo(() => junctions().furniture.filter(f => !pavedRoadAt(f.x, f.z, 1.2)), []);
  const poles = useRef(), plates = useRef(), heads = useRef(), arms = useRef();
  const by = useMemo(() => ({ stop: list.filter(f => f.type === 'stop'), deadend: list.filter(f => f.type === 'deadend'), light: list.filter(f => f.type === 'light') }), [list]);
  useEffect(() => {
    const o = new THREE.Object3D(), col = new THREE.Color(); let np = 0, nq = 0, nh = 0, na = 0;
    const put = (mesh, i, x, y, z, ry, sx = 1, sy = 1, sz = 1) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
    for (const f of by.stop) { const y = height(f.x, f.z); put(poles.current, np++, f.x, y + 1.3, f.z, 0, 1, 2.6, 1); put(plates.current, nq, f.x + Math.sin(f.ry) * 0.06, y + 2.5, f.z + Math.cos(f.ry) * 0.06, f.ry); plates.current.setColorAt(nq++, col.set('#b3262b')); }
    for (const f of by.deadend) { const y = height(f.x, f.z); put(poles.current, np++, f.x, y + 1.1, f.z, 0, 1, 2.2, 1); put(plates.current, nq, f.x + Math.sin(f.ry) * 0.06, y + 2.2, f.z + Math.cos(f.ry) * 0.06, f.ry, 1.1, 1.1, 1); plates.current.setColorAt(nq++, col.set('#e0b020')); }
    for (const f of by.light) { const y = height(f.x, f.z); put(poles.current, np++, f.x, y + 4.5, f.z, 0, 1.4, 9, 1.4); put(arms.current, na++, f.x, y + 8.9, f.z, f.ry, 1, 1, 1); put(heads.current, nh++, f.x + 0.9, y + 8.8, f.z, f.ry, 1, 1, 1); }
    for (const m of [poles, plates, heads, arms]) { m.current.instanceMatrix.needsUpdate = true; if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true; }
  }, [by]);
  const nStopDead = by.stop.length + by.deadend.length, nAll = nStopDead + by.light.length;
  return <>
    <instancedMesh ref={poles} args={[null, null, Math.max(1, nAll)]} frustumCulled={false}><cylinderGeometry args={[0.04, 0.05, 1, 6]} /><meshStandardMaterial color="#7d8083" metalness={0.5} roughness={0.6} /></instancedMesh>
    <instancedMesh ref={plates} args={[null, null, Math.max(1, nStopDead)]} frustumCulled={false}><cylinderGeometry args={[0.45, 0.45, 0.04, 8, 1]} onUpdate={g => g.rotateX(Math.PI / 2)} /><meshStandardMaterial roughness={0.5} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, Math.max(1, by.light.length)]} frustumCulled={false}><boxGeometry args={[0.07, 0.07, 1.8]} /><meshStandardMaterial color="#7d8083" metalness={0.5} roughness={0.6} /></instancedMesh>
    <instancedMesh ref={heads} args={[null, null, Math.max(1, by.light.length)]} frustumCulled={false}><boxGeometry args={[0.5, 0.14, 0.26]} /><meshStandardMaterial color="#dcd8c4" emissive="#ffd58a" emissiveIntensity={0.25} /></instancedMesh>
  </>;
}

// ---------------- rest areas + gas stations along the real highways (worlds/roadside.js, PROPOSAL: no collision yet) ----------------
// parts are boxes in the place's own frame: x across, y up, z toward the road: [x, y, z, w, h, d, colour]
function RoadsidePlaces() {
  const mesh = useRef();
  const sites = useMemo(() => junctions().roadside.sites, []);
  const layouts = useMemo(() => sites.map(stationLayout), [sites]);
  const n = layouts.reduce((a, l) => a + l.parts.length, 0);
  useEffect(() => {
    const base = new THREE.Matrix4(), part = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (const [si, s] of sites.entries()) {
      const y = height(s.x, s.z); q.setFromEuler(e.set(0, s.ry, 0)); base.compose(new THREE.Vector3(s.x, y, s.z), q, one);
      for (const [x, py, z, w, h, d, c] of layouts[si].parts) { part.compose(new THREE.Vector3(x, py + height(s.x + x*Math.cos(s.ry) + z*Math.sin(s.ry), s.z - x*Math.sin(s.ry) + z*Math.cos(s.ry)) - y, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); mesh.current.setMatrixAt(k, base.clone().multiply(part)); mesh.current.setColorAt(k++, col.set(c)); }
    }
    mesh.current.instanceMatrix.needsUpdate = true; if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [sites, layouts]);
  return <instancedMesh ref={mesh} args={[null, null, Math.max(1, n)]} frustumCulled={false} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>;
}
/** the name board on every barn, junkyard and off-road store (worlds/shopSites.js names, shopLayout.js spots); drawn only within 900 m */
function ShopSigns() {
  const list = useMemo(() => (junctions().roadside.sites || []).filter(isShop).map(s => ({ s, l: stationLayout(s), tex: null })), []), { camera } = useThree(), refs = useRef([]), tick = useRef(0);
  const mats = useMemo(() => list.map(({ s }) => { const [bg, fg, ac] = SHOP_SIGN[s.type]; return new THREE.MeshStandardMaterial({ map: signTex([[shopName(s).toUpperCase(), 64, fg]], bg, fg, ac), roughness: 0.6 }); }), [list]);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.5) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    list.forEach(({ s }, i) => { const g = refs.current[i]; if (g) g.visible = Math.hypot(s.x - p.x, s.z - p.z) < DETAIL_RADIUS; });
  });
  return <>{list.map(({ s, l }, i) => { const { sign } = l.spots;
    return <group key={i} ref={el => (refs.current[i] = el)} position={[s.x, height(s.x, s.z), s.z]} rotation={[0, s.ry, 0]} visible={false}>
      <mesh position={[sign.x, sign.y, sign.z]} material={mats[i]}><planeGeometry args={[sign.w, sign.h]} /></mesh>
    </group>; })}</>;
}
/** the brand on every highway gas station (worlds/brands.js: two knock-offs, never Dusty's): a pole sign by the road and a sign on the store front; drawn only within 900 m */
function GasBrandSigns() {
  const sites = useMemo(() => junctions().roadside.sites, []), layouts = useMemo(() => sites.map(stationLayout), [sites]), { camera } = useThree(), refs = useRef([]), tick = useRef(0);
  const mats = useMemo(() => GAS_BRANDS.map(b => new THREE.MeshStandardMaterial({ map: signTex([[b.name, 104, b.fg], [b.sub, 34, b.accent]], b.bg, b.fg, b.accent), roughness: 0.6 })), []);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.5) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos;
    sites.forEach((s, i) => { const g = refs.current[i]; if (g) g.visible = Math.hypot(s.x - p.x, s.z - p.z) < DETAIL_RADIUS; });
  });
  return <>{sites.map((s, i) => { const l = layouts[i]; if (l.brand < 0) return null; const m = mats[l.brand], { sign, storeSign } = l.spots;
    return <group key={i} ref={el => (refs.current[i] = el)} position={[s.x, height(s.x, s.z), s.z]} rotation={[0, s.ry, 0]} visible={false}>
      <mesh position={[sign.x, sign.y, sign.z]} material={m}><planeGeometry args={[sign.w, sign.h]} /></mesh>
      <mesh position={[storeSign.x, storeSign.y, storeSign.z]} material={m}><planeGeometry args={[storeSign.w, storeSign.h]} /></mesh>
    </group>; })}</>;
}
// ---------------- dressing wrecks at the roadside stops (the Salvage Road blockout pickup and step van; game/roadsideLoot.js sceneryWrecks) ----------------
/** one model's ~100 parts baked into a single upright mesh (the files are Z-up with vertex colours): one draw call per wreck */
function useMergedWreck(file) {
  const { scene } = useGLTF(file);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const list = [];
    scene.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      g.deleteAttribute('uv'); g.deleteAttribute('uv1'); g.deleteAttribute('tangent');
      const c0 = g.getAttribute('color'), n = g.getAttribute('position').count, rgb = new Float32Array(n * 3).fill(0.55);   // (the files store 8-bit RGBA; flatten to float RGB so every part merges)
      if (c0) for (let i = 0; i < n; i++) { rgb[i * 3] = c0.getX(i); rgb[i * 3 + 1] = c0.getY(i); rgb[i * 3 + 2] = c0.getZ(i); }
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); g.deleteAttribute('normal');
      list.push(g.index ? g.toNonIndexed() : g);
    });
    const merged = mergeGeometries(list);
    merged.rotateX(-Math.PI / 2);   // Z up -> Y up
    merged.computeVertexNormals();   // (the files have none: flat shaded)
    merged.computeBoundingBox(); merged.translate(0, -merged.boundingBox.min.y, 0);
    merged.computeBoundingSphere();
    return merged;
  }, [scene]);
}
function WreckKind({ kind, list }) {
  const geo = useMergedWreck(SCENERY_WRECKS[kind].file), refs = useRef([]), { camera } = useThree(), tick = useRef(0);
  useFrame(() => {   // only the ones near you are drawn
    if (tick.current++ % 20) return;
    list.forEach((w, i) => { const m = refs.current[i]; if (m) m.visible = Math.hypot(w.x - camera.position.x, w.z - camera.position.z) < 500; });
  });
  return list.map((w, i) => <mesh key={w.site} ref={el => { refs.current[i] = el; }} geometry={geo} position={[w.x, height(w.x, w.z) - 0.05, w.z]} rotation={[0, w.yaw, 0]} castShadow receiveShadow>
    <meshStandardMaterial vertexColors roughness={0.9} metalness={0.15} /></mesh>);
}
function RoadsideWrecks() {
  const byKind = useMemo(() => { const m = {}; for (const w of wrecks) (m[w.kind] ||= []).push(w); return m; }, []);
  return <React.Suspense fallback={null}>{Object.entries(byKind).map(([k, list]) => <WreckKind key={k} kind={k} list={list} />)}</React.Suspense>;
}
function RoadsideDriveways() {
  const sites = useMemo(() => junctions().roadside.sites, []);
  const geo = useMemo(() => {
    const pos = [], idx = [];
    for (const s of sites) {
      const rest = s.type === 'rest', front = rest ? 20 : 16, width = rest ? 13 : 16;
      const sin = Math.sin(s.ry), cos = Math.cos(s.ry);
      const end = rest ? 38 : 29, rows = Math.ceil((end + front) / 2), cols = 12, base = pos.length / 3;
      for (let row = 0; row <= rows; row++) {
        const distance = -front + (end + front) * row / rows;
        const half = width - (width - 4) * THREE.MathUtils.smoothstep(distance, front - 6, front + 4)
          + 1.5 * THREE.MathUtils.smoothstep(distance, end - 5, end);
        for (let col = 0; col <= cols; col++) {
          const side = half * (2 * col / cols - 1);
          const x = s.x + sin * distance + cos * side, z = s.z + cos * distance - sin * side;
          pos.push(x, height(x, z) + 0.045, z);
          if (row && col) {
            const d = base + row * (cols + 1) + col, a = d - cols - 2;
            idx.push(a, d-1, a+1, a+1, d-1, d);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }, [sites]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} renderOrder={2} receiveShadow><meshStandardMaterial color="#48494a" roughness={0.94} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>;
}

// ---------------- street lights: around gas stations and rest stops, junctions and towns (worlds/streetLights.js); the lamps glow at night ----------------
function StreetLights() {
  const poles = useRef(), arms = useRef(), heads = useRef(), mat = useRef(), tick = useRef(0);
  const lights = useMemo(() => {
    const lit = [];
    for (const s of junctions()?.roadside?.sites || []) lit.push({ x: s.x, z: s.z, r: 240 });
    for (const f of junctions()?.furniture || []) if (f.type === 'stop') lit.push({ x: f.x, z: f.z, r: 110 });
    const meta = border()?.meta;
    if (meta) for (const p of REAL_PLACES) if (p.zoom <= 3) { const q = projectPlace(p.lat, p.lon, meta); lit.push({ x: q.x, z: q.z, r: 700 }); }
    return planStreetLights((highways()?.roads || []).filter(r => r.kind === 'major' || r.kind === 'secondary'), lit);
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D();
    lights.forEach((l, i) => {
      const y = height(l.x, l.z), dx = Math.sin(l.ry), dz = Math.cos(l.ry);
      o.position.set(l.x, y + 4.2, l.z); o.rotation.set(0, l.ry, 0); o.updateMatrix(); poles.current.setMatrixAt(i, o.matrix);
      o.position.set(l.x + dx * 1.3, y + 8.3, l.z + dz * 1.3); o.updateMatrix(); arms.current.setMatrixAt(i, o.matrix);
      o.position.set(l.x + dx * 2.5, y + 8.2, l.z + dz * 2.5); o.updateMatrix(); heads.current.setMatrixAt(i, o.matrix);
    });
    for (const m of [poles, arms, heads]) m.current.instanceMatrix.needsUpdate = true;
  }, [lights]);
  useFrame((_, dt) => {   // the lamps come on as the light goes
    tick.current += dt; if (tick.current < 1) return; tick.current = 0;
    if (mat.current) mat.current.emissiveIntensity = 3.2 * Math.max(0, Math.min(1, 1 - dayPhase(clockHour()) * 1.6));
  });
  if (!lights.length) return null;
  return <>
    <instancedMesh ref={poles} args={[null, null, lights.length]} frustumCulled={false} castShadow><cylinderGeometry args={[0.1, 0.15, 8.4, 6]} /><meshStandardMaterial color="#6f7478" metalness={0.5} roughness={0.6} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, lights.length]} frustumCulled={false}><boxGeometry args={[0.1, 0.1, 2.7]} /><meshStandardMaterial color="#6f7478" metalness={0.5} roughness={0.6} /></instancedMesh>
    <instancedMesh ref={heads} args={[null, null, lights.length]} frustumCulled={false}><boxGeometry args={[0.55, 0.14, 1.0]} /><meshStandardMaterial ref={mat} color="#d9d6c8" emissive="#ffe2a0" emissiveIntensity={0} roughness={0.5} /></instancedMesh>
  </>;
}

// ---------------- roadside: telephone poles, signs ----------------
function Poles() {
  const poles = useRef(), arms = useRef();
  const pts = useMemo(() => {
    const out = [];
    for (const [ri, off] of [[0, 9.5], [2, -7.5], [1, -8.5]]) { const p = ROADS[ri].path.pts; for (let i = 0; i < p.length; i += 80) { const q = p[i], x = q.x + q.tz * off, z = q.z - q.tx * off; if (Math.abs(x) < HALF - 120 && Math.abs(z) < HALF - 120) out.push([x, z, q.h]); } }
    return out;
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D();
    pts.forEach(([x, z, h], i) => {
      const y = height(x, z);
      o.position.set(x, y + 4.5, z); o.rotation.set(0.02 * Math.sin(i), h, 0.03 * Math.cos(i * 1.7)); o.updateMatrix(); poles.current.setMatrixAt(i, o.matrix);
      o.position.set(x, y + 8.4, z); o.rotation.set(0, h + Math.PI / 2, 0); o.updateMatrix(); arms.current.setMatrixAt(i, o.matrix);
    });
    poles.current.instanceMatrix.needsUpdate = arms.current.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return <>
    <instancedMesh ref={poles} args={[null, null, pts.length]} castShadow><cylinderGeometry args={[0.13, 0.17, 9, 7]} /><meshStandardMaterial color="#5e4a36" roughness={1} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, pts.length]} castShadow><boxGeometry args={[0.12, 0.12, 2.2]} /><meshStandardMaterial color="#54412f" roughness={1} /></instancedMesh>
  </>;
}
function RoadSign({ x, z, ry, lines }) {
  const map = useMemo(() => signTex(lines.map((l, i) => [l, i ? 34 : 54, i ? '#e8efe8' : '#fff']), '#1f5a3a', '#fff', '#e8efe8'), [lines.join('|')]);
  const y = height(x, z);
  return <group position={[x, y, z]} rotation={[0, ry, 0]}>
    {[-1.2, 1.2].map(o => <mesh key={o} position={[o, 1.4, 0]} castShadow><boxGeometry args={[0.1, 2.8, 0.1]} /><meshStandardMaterial color="#8a8d90" metalness={0.6} roughness={0.5} /></mesh>)}
    <mesh position={[0, 2.5, 0.06]} castShadow><boxGeometry args={[3.2, 1.6, 0.06]} /><meshStandardMaterial map={map} roughness={0.6} /></mesh>
  </group>;
}

// ---------------- scenery that you drive through: scrub bushes, joshua-ish yuccas ----------------
function Scrub() {
  const bush = useRef(), yucca = useRef();
  const { bushes, yuccas } = useMemo(() => {
    const r = rnd(97), b = [], y = [];
    for (let t = 0; b.length < 4200 && t < 120000; t++) {
      const x = (r() - 0.5) * (HM_SIZE - 200), z = (r() - 0.5) * (HM_SIZE - 200); if (isRoad(x, z) || Math.hypot(x, z) < 40) continue;
      const m = biomeMasks(x, z); if (m.bio > 0.05 || m.lake > 0.2 || m.pg > 0.7 || m.town > 0.6 || baseHeight(x, z) > 40 || (m.dunes > 0.5 && r() < 0.9)) continue;
      if (Object.values(SITES).some(s => Math.hypot(x - s.x, z - s.z) < s.r + 4)) continue;
      (r() < 0.07 && m.canyon < 0.3 ? y : b).push([x, z, 0.4 + r() * 0.9, r(), m.farm]);
    }
    return { bushes: b, yuccas: y };
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color();
    bushes.forEach(([x, z, s, v, farm], i) => { o.position.set(x, height(x, z) + s * 0.3, z); o.scale.set(s, s * (0.55 + v * 0.4), s); o.rotation.set(0, v * 6, 0); o.updateMatrix(); bush.current.setMatrixAt(i, o.matrix); bush.current.setColorAt(i, c.setHSL(0.15 + v * 0.07 - farm * 0.02, 0.22 + v * 0.15, 0.27 + v * 0.1)); });
    yuccas.forEach(([x, z, s, v], i) => { o.position.set(x, height(x, z) + 1.6 * s, z); o.scale.set(s * 1.2, s * 1.6, s * 1.2); o.rotation.set(0.1 * v, v * 6, 0.1 * (1 - v)); o.updateMatrix(); yucca.current.setMatrixAt(i, o.matrix); });
    bush.current.instanceMatrix.needsUpdate = bush.current.instanceColor.needsUpdate = yucca.current.instanceMatrix.needsUpdate = true;
  }, [bushes, yuccas]);
  return <>
    <instancedMesh ref={bush} args={[null, null, bushes.length]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={yucca} args={[null, null, yuccas.length]}><coneGeometry args={[0.7, 2, 7]} /><meshStandardMaterial color="#56663a" roughness={1} flatShading /></instancedMesh>
  </>;
}

// ---------------- Dry Wells storefronts ----------------
function Storefront({ b }) {
  const map = useMemo(() => signTex([[b.name, b.name.length > 12 ? 50 : 62, '#fff'], [b.sub, 30, '#ffd23f']], b.trim, '#fff', '#ffd23f'), [b.name]);
  const y = height(b.x, b.z);
  return <group position={[b.x, y, b.z]} rotation={[0, b.rot, 0]}>
    <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color={b.color} roughness={0.95} /></mesh>
    <mesh position={[0, b.h + 0.6, b.d / 2 - 0.1]} castShadow><boxGeometry args={[b.w, 1.2, 0.2]} /><meshStandardMaterial color={b.color} roughness={0.95} /></mesh>
    <mesh position={[0, b.h + 0.6, b.d / 2 + 0.02]}><planeGeometry args={[b.w * 0.86, 1.05]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>
    <mesh position={[0, 2.95, b.d / 2 + 0.9]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[b.w, 0.08, 1.9]} /><meshStandardMaterial color={b.trim} roughness={0.8} /></mesh>
    <mesh position={[-b.w * 0.18, 1.5, b.d / 2 + 0.03]}><planeGeometry args={[b.w * 0.42, 1.7]} /><meshStandardMaterial color="#18252a" emissive="#8fc4d0" emissiveIntensity={0.25} roughness={0.15} /></mesh>
    <mesh position={[b.w * 0.25, 1.1, b.d / 2 + 0.03]}><planeGeometry args={[1.1, 2.2]} /><meshStandardMaterial color="#4a2f1b" roughness={0.8} /></mesh>
    <mesh position={[0, 0.08, b.d / 2 + 1.1]} receiveShadow><boxGeometry args={[b.w, 0.16, 2.2]} /><meshStandardMaterial color="#8c8a82" roughness={1} /></mesh>
  </group>;
}

// ---------------- the Proving Grounds: gantry, grandstand, HQ ----------------
function Proving() {
  const checker = useMemo(checkerTex, []), gantry = useMemo(() => labelTex('BAJA PROVING GROUNDS', 'START / FINISH'), []);
  const hq = useMemo(() => signTex([['PROVING GROUNDS', 58, '#fff'], ['test division · est. 1971', 30, '#ffd23f']], '#2c3234', '#fff', '#ffd23f'), []);
  const sf = startLine, sy = height(sf.x, sf.z), PG = SITES.proving;
  const pit = pitLane.pts[Math.floor(pitLane.pts.length / 2)];
  return <>
    <mesh position={[sf.x, sy + 0.09, sf.z]} rotation={[-Math.PI / 2, 0, -sf.h + Math.PI / 2]}><planeGeometry args={[13, 1.2]} /><meshStandardMaterial map={checker} /></mesh>
    <group position={[sf.x, sy, sf.z]} rotation={[0, sf.h, 0]}>
      {[-8, 8].map(x => <mesh key={x} position={[x, 3.5, 0]} castShadow><boxGeometry args={[0.5, 7, 0.5]} /><meshStandardMaterial color="#b9bbbc" metalness={0.4} roughness={0.6} /></mesh>)}
      <mesh position={[0, 7, 0]} castShadow><boxGeometry args={[17, 1.6, 0.6]} /><meshStandardMaterial map={gantry} /></mesh>
    </group>
    <mesh position={[pit.x, height(pit.x, pit.z) + 3, pit.z - 18]} castShadow receiveShadow><boxGeometry args={[150, 6, 12]} /><meshStandardMaterial color="#b9b6ad" roughness={0.9} /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[sf.x, height(sf.x, sf.z + 27) + 0.7 + i * 1.1, sf.z + 27 + i * 2.2]} castShadow receiveShadow><boxGeometry args={[60, 1.4, 4]} /><meshStandardMaterial color={['#6e7e86', '#8c9aa1'][i % 2]} roughness={0.9} /></mesh>)}
    <group position={[PG.x, PG.y, PG.z]} rotation={[0, PG.rot, 0]}>
      {[[0, -14, 12, 0.25], [-6, -10, 0.25, 8], [6, -10, 0.25, 8]].map(([x, z, w, d], i) => <mesh key={i} position={[x, 2.4, z]} castShadow receiveShadow><boxGeometry args={[w, 4.8, d]} /><meshStandardMaterial color="#c7c2b4" roughness={0.95} /></mesh>)}
      {[-4.1, 4.1].map(x => <mesh key={x} position={[x, 2.4, -6]} castShadow receiveShadow><boxGeometry args={[3.8, 4.8, 0.25]} /><meshStandardMaterial color="#c7c2b4" roughness={0.95} /></mesh>)}
      <mesh position={[0, 3.6, -6]} castShadow><boxGeometry args={[4.4, 2.4, 0.25]} /><meshStandardMaterial color="#c7c2b4" roughness={0.95} /></mesh>
      <mesh position={[0, 4.95, -10]} castShadow><boxGeometry args={[12.8, 0.3, 8.8]} /><meshStandardMaterial color="#4a4f52" roughness={0.8} /></mesh>
      <mesh position={[0, 5.9, -5.8]}><planeGeometry args={[7, 1.5]} /><meshStandardMaterial map={hq} roughness={0.7} /></mesh>
      <pointLight position={[0, 4, -10]} intensity={18} distance={12} decay={1.6} color="#e8eadc" />
    </group>
  </>;
}

/** the county's own roads and trails (ROADS, TRAILS, the circuit): each is one mesh that was drawn all the time, so a road 2 km away showed on the horizon. Same range as the highway pieces. */
function FarGate({ path, children }) {
  const g = useRef(), { camera } = useThree(), tick = useRef(1);
  const box = useMemo(() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of path.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); } return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.hypot(x1 - x0, z1 - z0) / 2 }; }, [path]);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.5 || !g.current) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos, view = Math.min(HW_VIEW, 600 + 700 * dayPhase(clockHour()));
    g.current.visible = Math.hypot(p.x - box.cx, p.z - box.cz) - box.r < view;
  });
  return <group ref={g}>{children}</group>;
}
const GRibbon = props => <FarGate path={props.path}><Ribbon {...props} /></FarGate>;

export default function CountyScene() {
  const { camera } = useThree();
  // Continuous paved ribbons own crossings. Trimming them for inferred junctions
  // exposed the dirt layer wherever a junction patch did not cover the exact cut.
  const roadConnections = null;
  useEffect(() => { camera.far = 5200; camera.updateProjectionMatrix(); }, [camera]);
  return <>
    {/* sky, fog, sun and the day/night cycle are DriveWorld.jsx's DayNightSky, so the drive and on-foot cameras share one clock */}
    {REAL ? <><StreamTerrain /><WaterSheet bit={1} y={SEA_Y} color="#2f7fa0" /><WaterSheet bit={2} y={border().lakeY} color="#4f8f9a" /></> : <Terrain />}
    {ROADS.map((r, i) => { const look = ROAD_LOOK[r.kind], dirt = r.kind === 'dirt' || r.kind === 'gravel'; return <GRibbon key={'r' + i} path={r.path} half={ROAD_HALF[r.kind]} heightFn={height} {...look} hide={dirt ? p => pavedRoadAt(p.x, p.z, ROAD_HALF[r.kind] + 1) : null} lift={0.014 + (r.kind === 'highway' ? 0.004 : 0)} />; })}
    {REAL && <HighwayRibbons connections={roadConnections} />}
    {roadConnections && <HighwayJunctionSurfaces connections={roadConnections} />}
    {REAL && <HighwayFurniture />}
    {REAL && <RoadsidePlaces />}
    {REAL && <GasBrandSigns />}
    {REAL && <ShopSigns />}
    {REAL && <StreetLights />}
    {REAL && <RoadsideWrecks />}
    {REAL && <RoadsideDriveways />}
    {TRAILS.map((t, i) => <GRibbon key={'t' + i} path={t.path} half={2.8} tile={22} makeTexture={looseTex} feather detail={{ grain: 0.5, bump: 1, macro: 0.15 }} lift={0.014} segs={4} heightFn={height} hide={p => pavedRoadAt(p.x, p.z, 4)} />)}
    <GRibbon path={circuit} half={7.5} tile={24} makeTexture={circuitTex} detail={{ grain: 0.2, bump: 0.35, macro: 0.1 }} heightFn={height} />
    <GRibbon path={pitLane} half={4.6} tile={9.2} makeTexture={pitTex} detail={{ grain: 0.2, bump: 0.3, macro: 0.08 }} step={1} lift={0.012} segs={2} heightFn={height} />
    <GRibbon path={dirtStrip} half={4.6} tile={25} makeTexture={dirtTex} feather detail={{ grain: 0.4, bump: 0.7, macro: 0.15 }} lift={0.012} segs={4} heightFn={height} hide={p => pavedRoadAt(p.x, p.z, 6)} />
    <GRibbon path={offroad} half={5} tile={25} makeTexture={looseTex} feather detail={{ grain: 0.45, bump: 0.85, macro: 0.15 }} lift={0.012} segs={4} heightFn={height} hide={p => { const f = p.s / offroad.total; return (f > 0.715 && f < 0.825) || (f > 0.875 && f < 0.965) || pavedRoadAt(p.x, p.z, 6); }} />
    <Poles />
    {REAL && <RegionalUtilityPoles />}
    {REAL && <RegionalPlaceSigns />}
    {REAL && <RegionalRoadReflectors />}
    {REAL && <RegionalCurveWarnings />}
    {REAL && <RegionalRanchFences />}
    {SIGNS.map(([x, z, ry, lines], i) => <RoadSign key={i} x={x} z={z} ry={ry} lines={lines} />)}
    <Scrub />
    {!REAL && <BiomeScene />}
    <BoundaryWall />
    <React.Suspense fallback={null}><Flora /></React.Suspense>
    {REAL && <WildScenery />}
    <React.Suspense fallback={null}><Desert /></React.Suspense>
    {REAL && <React.Suspense fallback={null}><RealScenery heightAt={height} surfaceAt={surface} regionAt={border().regionAt} roadAt={(x, z) => highways().near(x, z)} avoid={(x, z) => onCore(x, z) || isRoad(x, z) || highways().isNear(x, z, 9) || valleyAt(x, z) > 0.35} /></React.Suspense>}
    {REAL && <ValleyTrees />}
    {TOWN.map((b, i) => <Storefront key={i} b={b} />)}
    <Proving />
    <Sites />
    <Home />
    <ShopWorkEffects />
    {!REAL && <Mesas d0={3500} dr={700} sc={4} n={30} />}
  </>;
}
void toWorld;
