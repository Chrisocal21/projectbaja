import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { HM_SIZE, TERRAIN, REAL } from './world.js';
import { WaterSheet } from './Border.jsx';
import { border, SEA_Y } from './border.js';   // (old-square effects keep the old size: the macro colour map and the scatter)
import { SIZE, HALF, height, surface, isRoad, onCore, baseHeight, biomeMasks, washAt, reliefAt, ROADS, TRAILS, ROAD_HALF, SIGNS, SITES, circuit, pitLane, dirtStrip, offroad, startLine, toWorld, highways } from './county.js';
import { applyGroundDetail } from './groundDetail.js';
import { terrainMaterial, LAYER_OF } from './terrainMaterial.js';
import Desert from './Desert.jsx';
import { Ribbon, tex, rnd, blotches, dots, crack, wrapDraw, blurred, circuitTex, pitTex, dirtTex, looseTex, labelTex, checkerTex } from './TestCenter.jsx';
import Sites, { Mesas } from './Sites.jsx';
import { TOWN } from './siteData.js';
import { signTex } from '../lot/CarLot.jsx';
import Home from './Home.jsx';
import Flora from './Flora.jsx';
import BiomeScene from './biomes/Biomes.jsx';
import BoundaryWall from './BoundaryWall.jsx';
import { game } from '../game/store.js';

// ---------------- terrain: 20 x 20 tiles; every tile has a coarse mesh, tiles near you get a fine one ----------------
const TILE = 300, NT = SIZE / TILE, LO = 24, HI = 120, HI_IN = 430, HI_OUT = 640;
const MOUNTAIN = new THREE.Color('#8a6a4e'), HIGH = new THREE.Color('#9c7c5e');
const PAVED = new Set(['asphalt', 'concrete', 'curb']), BIO_GROUND = new Set(['meadow', 'dryGrass', 'forestFloor']);   // biome ground keeps its own colours (no desert mountain tint)
function tileGeometry(ix, iz, seg) {
  const x0 = -HALF + ix * TILE, z0 = -HALF + iz * TILE, step = TILE / seg, n = seg + 1, P = n + 2;
  const H = new Float32Array(P * P);   // heights on a grid padded by one ring, for normals across tile edges
  for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) H[j * P + i] = height(x0 + (i - 1) * step, z0 + (j - 1) * step);
  const count = n * n + 4 * n, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const w0 = new Float32Array(count * 4), w1 = new Float32Array(count * 4), misc = new Float32Array(count * 2), w = new Float32Array(8);
  const c = new THREE.Color(), r = rnd(ix * 31 + iz * 7 + 3);
  const put = (k, i, j, drop) => {
    const x = x0 + i * step, z = z0 + j * step, h = H[(j + 1) * P + i + 1];
    const dx = (H[(j + 1) * P + i + 2] - H[(j + 1) * P + i]) / (2 * step), dz = (H[(j + 2) * P + i + 1] - H[j * P + i + 1]) / (2 * step), l = Math.hypot(dx, 1, dz);
    pos.set([x, h - drop, z], k * 3); nor.set([-dx / l, 1 / l, -dz / l], k * 3);
    const sf = surface(x, z), slope = Math.abs(dx) + Math.abs(dz), paved = PAVED.has(sf.key), core = onCore(x, z);
    // ground layers: the surface's own, plus bare rock on steep ground and sand drifted into the washes (natural ground only)
    w.fill(0); w[LAYER_OF[sf.key] ?? 1] = 1;
    if (!core) {
      const rock = Math.min(0.9, Math.max(0, (slope - 0.35) / 0.5)); if (rock > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - rock; w[5] += rock; }
      const sand = sf.key === 'scrub' || sf.key === 'dirt' ? washAt(x, z) * 0.7 : 0; if (sand > 0) { for (let q = 0; q < 8; q++) w[q] *= 1 - sand; w[0] += sand; }
    }
    w0.set([w[0], w[1], w[2], w[3]], k * 4); w1.set([w[4], w[5], w[6], w[7]], k * 4);
    misc.set([sf.key === 'playa' ? 1 : sf.key === 'mud' ? 0.6 : 0, core || paved ? 0 : reliefAt(x, z)], k * 2);
    c.set(sf.color).multiplyScalar(1 - Math.min(0.3, slope * 0.25));
    if (h > 30 && !core && !BIO_GROUND.has(sf.key)) c.lerp(h > 110 ? HIGH : MOUNTAIN, Math.min(0.6, (h - 30) / 90));
    c.offsetHSL(Math.sin(x * 0.011 + z * 0.007) * 0.01, Math.sin(x * 0.017 - z * 0.013) * 0.04, Math.sin(x * 0.041 + z * 0.036) * 0.03 + (r() - 0.5) * 0.03);
    col.set([c.r, c.g, c.b], k * 3);
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) put(j * n + i, i, j, 0);
  // skirts: every edge vertex again, 4 m lower, so a fine tile next to a coarse one never shows a crack
  const edges = [[i => [i, 0]], [i => [i, seg]], [j => [0, j]], [j => [seg, j]]];
  edges.forEach(([f], e) => { for (let t = 0; t < n; t++) { const [i, j] = f(t); put(n * n + e * n + t, i, j, 4); } });
  const idx = [];
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * n + i, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e); }
  edges.forEach(([f], e) => { for (let t = 0; t < seg; t++) { const [i0, j0] = f(t), [i1, j1] = f(t + 1), a = j0 * n + i0, b = j1 * n + i1, sa = n * n + e * n + t, sb = sa + 1; idx.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aW0', new THREE.BufferAttribute(w0, 4)); g.setAttribute('aW1', new THREE.BufferAttribute(w1, 4)); g.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
  g.setIndex(idx); g.computeBoundingSphere(); return g;
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
  const group = useRef(), { camera } = useThree(), tiles = useRef(new Map());
  const mat = useMemo(() => terrainMaterial({ size: HM_SIZE, half: HM_SIZE / 2 }), []);
  useEffect(() => () => { tiles.current.forEach(t => { t.lo.geometry.dispose(); t.hi?.geometry.dispose(); }); tiles.current.clear(); }, []);
  useFrame(() => {
    const p = game.onFoot ? camera.position : game.pos, g = group.current, map = tiles.current;
    const cx = Math.floor((p.x + HALF) / TILE), cz = Math.floor((p.z + HALF) / TILE), R = Math.ceil(R_LO / TILE), ctr = (i, j) => [-HALF + (i + 0.5) * TILE, -HALF + (j + 0.5) * TILE];
    let built = 0, hiBuilt = false;
    for (let ring = 0; ring <= R && built < 8; ring++) for (let iz = cz - ring; iz <= cz + ring && built < 8; iz++) for (let ix = cx - ring; ix <= cx + ring && built < 8; ix++) {
      if (Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== ring) continue;
      const [tx, tz] = ctr(ix, iz), d = Math.max(0, Math.hypot(tx - p.x, tz - p.z) - TILE * 0.7); if (d > R_LO) continue;
      const k = ix + ',' + iz; let t = map.get(k);
      if (!t) { const lo = new THREE.Mesh(tileGeometry(ix, iz, d < 1500 ? LO : LO_REAL), mat); lo.receiveShadow = true; g.add(lo); map.set(k, t = { ix, iz, lo, hi: null }); built++; }
      if (!t.hi && !hiBuilt && d < R_HI) { const hi = new THREE.Mesh(tileGeometry(ix, iz, HI), mat); hi.receiveShadow = true; g.add(hi); t.hi = hi; t.lo.visible = false; hiBuilt = true; built += 4; }
    }
    if (built) return;
    for (const [k, t] of map) {
      const [tx, tz] = ctr(t.ix, t.iz), d = Math.max(0, Math.hypot(tx - p.x, tz - p.z) - TILE * 0.7);
      if (t.hi && d > HI_OUT) { g.remove(t.hi); t.hi.geometry.dispose(); t.hi = null; t.lo.visible = true; }
      if (d > R_DROP) { g.remove(t.lo); t.lo.geometry.dispose(); if (t.hi) { g.remove(t.hi); t.hi.geometry.dispose(); } map.delete(k); }
    }
  });
  return <group ref={group} />;
}

// ---------------- road textures ----------------
/** 2-lane blacktop: worn asphalt, yellow double centre line, white edge lines, gravel shoulders feathered into the desert (u across 8.8 m) */
const blacktop = (center = 'double') => () => tex(512, 1024, (g, w, h) => {
  const r = rnd(center === 'double' ? 51 : 53), M = w / 8.8;
  g.fillStyle = '#9b917f'; g.fillRect(0, 0, w, h); dots(g, r, w, h, 9000, ['#b0a690', '#8a806e', '#77705f'], 1, 3, 0.6);
  const a0 = (8.8 - 7.2) / 2 * M;
  g.fillStyle = '#3c3f43'; g.fillRect(a0, 0, w - 2 * a0, h);
  g.save(); g.beginPath(); g.rect(a0, 0, w - 2 * a0, h); g.clip();
  blotches(g, r, w, h, 60, 0.06, 0.16, 70); dots(g, r, w, h, 26000, ['#55585c', '#2b2d30', '#6a6d71', '#46484c'], 1, 2.4, 0.5);
  blurred(g, 10, () => { g.fillStyle = 'rgba(6,6,7,0.32)'; for (const cx of [0.3, 0.42, 0.58, 0.7]) g.fillRect(w * cx - 0.4 * M, 0, 0.8 * M, h); });
  wrapDraw(g, w, h, () => { for (let k = 0; k < 10; k++) crack(g, r, a0 + r() * (w - 2 * a0), r() * h, 12 + Math.floor(r() * 16), 0.5); });
  for (let k = 0; k < 4; k++) { const x = a0 + r() * (w - 2 * a0 - 90), y = r() * (h - 200); blurred(g, 3, () => { g.fillStyle = 'rgba(22,24,26,0.35)'; g.fillRect(x, y, 60 + r() * 60, 100 + r() * 120); }); }
  g.restore();
  const line = (x, wid, col, dash) => { g.fillStyle = col; if (!dash) g.fillRect(x - wid / 2, 0, wid, h); else for (let y = 0; y < h; y += h / 4) g.fillRect(x - wid / 2, y, wid, h / 8); };
  line(a0 + 0.25 * M, 0.12 * M, '#e8e6dc'); line(w - a0 - 0.25 * M, 0.12 * M, '#e8e6dc');
  if (center === 'double') { line(w / 2 - 0.1 * M, 0.1 * M, '#d8b23a'); line(w / 2 + 0.1 * M, 0.1 * M, '#d8b23a'); } else line(w / 2, 0.12 * M, '#e8e6dc', true);
  dots(g, r, w, h, 4000, ['#3c3f43', '#4a4d51'], 1, 3, 0.6);   // wear the paint
  g.globalCompositeOperation = 'destination-out';
  for (const side of [0, 1]) { const gr = g.createLinearGradient(side ? w : 0, 0, side ? w - a0 * 0.9 : a0 * 0.9, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(side ? w - a0 : 0, 0, a0, h); }
  g.globalCompositeOperation = 'source-over';
});
const highwayTex = blacktop('double'), streetTex = blacktop('dashed');
const ROAD_LOOK = {
  highway: { makeTexture: highwayTex, tile: 30, segs: 6, feather: true, detail: { grain: 0.2, bump: 0.35, macro: 0.1 } },
  street: { makeTexture: streetTex, tile: 30, segs: 6, feather: true, detail: { grain: 0.2, bump: 0.35, macro: 0.1 } },
  gravel: { makeTexture: dirtTex, tile: 25, segs: 4, feather: true, detail: { grain: 0.45, bump: 0.8, macro: 0.15 } },
  dirt: { makeTexture: dirtTex, tile: 25, segs: 4, feather: true, detail: { grain: 0.42, bump: 0.8, macro: 0.15 } },
};

/** ?realmap: the real highways (county.js highways()), drawn in 400 m pieces only near the player; two shared materials */
const HW_VIEW = 1800, HW_PIECE = 100;
function hwPieceGeometry({ r, a, b }) {
  const segs = 6, half = r.style.half + 0.8, pos = [], uv = [], idx = [];
  for (let k = a; k <= b; k++) {
    const p = r.pts[k], nx = p.tz, nz = -p.tx, row = k - a;
    for (let j = 0; j <= segs; j++) {
      const d = (j / segs * 2 - 1) * half, x = p.x + nx * d, z = p.z + nz * d;
      pos.push(x, height(x, z) + 0.018, z); uv.push(j / segs, p.s / 30);
      if (row && j) { const i0 = (row - 1) * (segs + 1) + j - 1, i1 = i0 + 1, i2 = row * (segs + 1) + j - 1, i3 = i2 + 1; idx.push(i0, i2, i1, i1, i2, i3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function HighwayRibbons() {
  const H = highways(), group = useRef(), { camera } = useThree(), pieces = useRef(new Map()), tick = useRef(1);
  const mats = useMemo(() => {
    const mk = makeTexture => applyGroundDetail(new THREE.MeshStandardMaterial({ map: makeTexture(), roughness: 0.93, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), { grain: 0.2, bump: 0.35, macro: 0.1 });
    return { major: mk(streetTex), secondary: mk(highwayTex) };
  }, []);
  const list = useMemo(() => {
    const out = [];
    H.roads.forEach((r, ri) => { for (let a = 0; a < r.pts.length - 1; a += HW_PIECE) { const b = Math.min(r.pts.length - 1, a + HW_PIECE), m = r.pts[(a + b) >> 1]; out.push({ key: ri + ':' + a, r, a, b, cx: m.x, cz: m.z, rad: (b - a) * 2 }); } });
    return out;
  }, [H]);
  useEffect(() => () => { pieces.current.forEach(m => m.geometry.dispose()); pieces.current.clear(); }, []);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.2) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos, g = group.current, map = pieces.current; let built = 0;
    for (const s of list) {
      const d = Math.hypot(s.cx - p.x, s.cz - p.z) - s.rad, have = map.get(s.key);
      if (d < HW_VIEW && !have && built < 6) { const m = new THREE.Mesh(hwPieceGeometry(s), mats[s.r.kind] || mats.secondary); m.receiveShadow = true; m.renderOrder = 1; g.add(m); map.set(s.key, m); built++; }
      else if (d > HW_VIEW + 400 && have) { g.remove(have); have.geometry.dispose(); map.delete(s.key); }
    }
    if (built === 6) tick.current = 0.2;   // more to build: come straight back next frame
  });
  return <group ref={group} />;
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
    <instancedMesh ref={bush} args={[null, null, bushes.length]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={yucca} args={[null, null, yuccas.length]} castShadow><coneGeometry args={[0.7, 2, 7]} /><meshStandardMaterial color="#56663a" roughness={1} flatShading /></instancedMesh>
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

export default function CountyScene() {
  const { camera } = useThree();
  useEffect(() => { camera.far = 5200; camera.updateProjectionMatrix(); }, [camera]);
  return <>
    {/* sky, fog, sun and the day/night cycle are DriveWorld.jsx's DayNightSky, so the drive and on-foot cameras share one clock */}
    {REAL ? <><StreamTerrain /><WaterSheet bit={1} y={SEA_Y} color="#2f7fa0" /><WaterSheet bit={2} y={border().lakeY} color="#4f8f9a" /></> : <Terrain />}
    {ROADS.map((r, i) => { const look = ROAD_LOOK[r.kind]; return <Ribbon key={'r' + i} path={r.path} half={ROAD_HALF[r.kind]} heightFn={height} {...look} lift={0.014 + (r.kind === 'highway' ? 0.004 : 0)} />; })}
    {REAL && <HighwayRibbons />}
    {TRAILS.map((t, i) => <Ribbon key={'t' + i} path={t.path} half={2.8} tile={22} makeTexture={looseTex} feather detail={{ grain: 0.5, bump: 1, macro: 0.15 }} lift={0.014} segs={4} heightFn={height} />)}
    <Ribbon path={circuit} half={7.5} tile={24} makeTexture={circuitTex} detail={{ grain: 0.2, bump: 0.35, macro: 0.1 }} heightFn={height} />
    <Ribbon path={pitLane} half={4.6} tile={9.2} makeTexture={pitTex} detail={{ grain: 0.2, bump: 0.3, macro: 0.08 }} step={1} lift={0.012} segs={2} heightFn={height} />
    <Ribbon path={dirtStrip} half={4.6} tile={25} makeTexture={dirtTex} feather detail={{ grain: 0.4, bump: 0.7, macro: 0.15 }} lift={0.012} segs={4} heightFn={height} />
    <Ribbon path={offroad} half={5} tile={25} makeTexture={looseTex} feather detail={{ grain: 0.45, bump: 0.85, macro: 0.15 }} lift={0.012} segs={4} heightFn={height} hide={p => { const f = p.s / offroad.total; return (f > 0.715 && f < 0.825) || (f > 0.875 && f < 0.965); }} />
    <Poles />
    {SIGNS.map(([x, z, ry, lines], i) => <RoadSign key={i} x={x} z={z} ry={ry} lines={lines} />)}
    <Scrub />
    {!REAL && <BiomeScene />}
    <BoundaryWall />
    <React.Suspense fallback={null}><Flora /></React.Suspense>
    <React.Suspense fallback={null}><Desert /></React.Suspense>
    {TOWN.map((b, i) => <Storefront key={i} b={b} />)}
    <Proving />
    <Sites />
    <Home />
    {!REAL && <Mesas d0={3500} dr={700} sc={4} n={30} />}
  </>;
}
void toWorld;
