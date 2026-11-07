import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { applyGroundDetail, kindOf } from './groundDetail.js';
import { SIZE, height, surface, isRoad, circuit, pitLane, dirtRoad, offroad, spawns, startLine, baseHeight, townRoads, trails } from './testcenter.js';
import Sites from './Sites.jsx';

const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const tex = (w, h, draw, repeatY = 1) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1, repeatY); return t;
};
const blurred = (g, px, fn) => { g.save(); g.filter = `blur(${px}px)`; fn(); g.restore(); };
const dots = (g, r, w, h, n, colors, smin, smax, alpha = 1) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = alpha * (0.4 + r() * 0.6); g.fillStyle = colors[Math.floor(r() * colors.length)]; const s = smin + r() * (smax - smin); g.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.8)); }
  g.globalAlpha = 1;
};
const blotches = (g, r, w, h, n, lightA, darkA, size) => {   // big soft tonal patches: patched, weathered, uneven surface
  blurred(g, size * 0.35, () => { for (let i = 0; i < n; i++) { const l = r() > 0.5; g.fillStyle = l ? `rgba(255,255,255,${lightA * r()})` : `rgba(0,0,0,${darkA * r()})`; g.beginPath(); g.ellipse(r() * w, r() * h, size * (0.5 + r()), size * (0.4 + r() * 1.2), r() * 3, 0, 6.3); g.fill(); } });
};
const crack = (g, r, x, y, len, a, wid = 1) => {   // random-walk crack with side branches
  g.strokeStyle = `rgba(10,10,12,${a})`; g.lineWidth = wid; g.beginPath(); g.moveTo(x, y); let ang = r() * 6.3;
  for (let i = 0; i < len; i++) { ang += (r() - 0.5) * 0.9; x += Math.cos(ang) * 6; y += Math.sin(ang) * 6; g.lineTo(x, y); if (r() < 0.08) { const sx = x, sy = y; g.stroke(); crack(g, r, sx, sy, Math.floor(len * 0.4), a * 0.8, wid * 0.8); g.beginPath(); g.moveTo(sx, sy); } }
  g.stroke();
};
const wrapDraw = (g, w, h, fn) => { for (const dy of [-h, 0, h]) { g.save(); g.translate(0, dy); fn(); g.restore(); } };   // draw across the tile seam so it tiles invisibly

// ribbon textures: u across the road, v along it (one tile = `tile` metres)
const circuitTex = () => tex(512, 768, (g, w, h) => {
  const r = rnd(7), M = w / 15;   // px per metre across (road is 15 m wide)
  g.fillStyle = '#3a3d41'; g.fillRect(0, 0, w, h);
  blotches(g, r, w, h, 70, 0.07, 0.16, 70);
  dots(g, r, w, h, 26000, ['#55585c', '#2b2d30', '#6a6d71', '#46484c', '#7a7d80'], 1, 2.4, 0.5);
  const curb = 2 * M, lineW = 0.2 * M;
  // rubbered-in racing line (two soft bands) + marbles of loose rubber beside it
  blurred(g, 10, () => { g.fillStyle = 'rgba(6,6,7,0.5)'; for (const cx of [0.34, 0.66]) g.fillRect(w * cx - 0.55 * M, 0, 1.1 * M, h); });
  dots(g, r, w, h, 3200, ['#1a1a1c', '#2a2a2d'], 1, 3, 0.65);
  g.globalCompositeOperation = 'destination-over'; g.globalCompositeOperation = 'source-over';
  // tyre marks, braking streaks
  for (let k = 0; k < 8; k++) { const x0 = w * (0.25 + r() * 0.5), y0 = r() * h; blurred(g, 1.2, () => { g.strokeStyle = `rgba(8,8,9,${0.18 + r() * 0.2})`; g.lineWidth = 3 + r() * 3; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 30 * (r() - 0.5), y0 + 90, x0 + 60 * (r() - 0.5), y0 + 180, x0 + 70 * (r() - 0.5), y0 + 280); g.stroke(); }); }
  // oil drips + repair patches + tar snakes + cracks
  for (let k = 0; k < 6; k++) { const x = w * (0.2 + r() * 0.6), y = r() * h, rad = 14 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(5,5,6,0.5)'); gr.addColorStop(1, 'rgba(5,5,6,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let k = 0; k < 3; k++) { const x = w * (0.25 + r() * 0.4), y = r() * (h - 160), pw = 70 + r() * 80, ph = 90 + r() * 90; blurred(g, 4, () => { g.fillStyle = 'rgba(30,32,35,0.28)'; g.fillRect(x, y, pw, ph); }); }
  for (let k = 0; k < 5; k++) { const x = w * (0.2 + r() * 0.6); let y = r() * h; g.strokeStyle = 'rgba(15,15,16,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 14; i++) g.lineTo(x + (r() - 0.5) * 22, y += 14 + r() * 10); g.stroke(); g.strokeStyle = 'rgba(110,112,116,0.25)'; g.lineWidth = 1; g.stroke(); }
  wrapDraw(g, w, h, () => { for (let k = 0; k < 9; k++) crack(g, r, w * (0.15 + r() * 0.7), r() * h, 14 + Math.floor(r() * 18), 0.55); });
  // kerbs: red/white blocks with grit, shading and sand blown onto the outer edge
  for (let k = 0; k < 8; k++) for (const side of [0, 1]) {
    const x = side ? w - curb : 0, y = (k * h) / 8; g.fillStyle = k % 2 ? '#e4e3dc' : '#bd2f28'; g.fillRect(x, y, curb, h / 8);
    const sh = g.createLinearGradient(x, 0, x + curb, 0); sh.addColorStop(side ? 0 : 1, 'rgba(0,0,0,0.0)'); sh.addColorStop(side ? 1 : 0, 'rgba(0,0,0,0.28)'); g.fillStyle = sh; g.fillRect(x, y, curb, h / 8);
  }
  dots(g, r, curb, h, 2600, ['#00000040', '#ffffff30', '#6b2a24'], 1, 3, 0.6); g.save(); g.translate(w - curb, 0); dots(g, r, curb, h, 2600, ['#00000040', '#ffffff30', '#6b2a24'], 1, 3, 0.6); g.restore();
  for (const side of [0, 1]) { const x = side ? w - 0.5 * M : 0; blurred(g, 5, () => { g.fillStyle = 'rgba(190,170,130,0.55)'; g.fillRect(x, 0, 0.5 * M, h); }); }
  // edge lines, worn and dirty
  g.fillStyle = '#ecebe4'; g.fillRect(curb + 3, 0, lineW, h); g.fillRect(w - curb - 3 - lineW, 0, lineW, h);
  g.globalCompositeOperation = 'destination-out'; dots(g, r, w, h, 0, ['#000'], 1, 2); g.globalCompositeOperation = 'source-over';
  dots(g, r, w, h, 3500, ['#3a3d41', '#4a4d51'], 1, 3, 0.7);
});
const pitTex = () => tex(512, 512, (g, w, h) => {
  const r = rnd(11);
  g.fillStyle = '#8d8e8a'; g.fillRect(0, 0, w, h); blotches(g, r, w, h, 50, 0.1, 0.18, 55);
  dots(g, r, w, h, 20000, ['#a3a49f', '#74756f', '#b4b5b0', '#666762'], 1, 2.2, 0.5);
  g.strokeStyle = 'rgba(40,40,38,0.7)'; g.lineWidth = 2.5; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(0, i * h / 2 + 1); g.lineTo(w, i * h / 2 + 1); g.stroke(); }   // slab joints
  g.strokeStyle = 'rgba(40,40,38,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  for (let k = 0; k < 5; k++) { const x = r() * w, y = r() * h, rad = 20 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(25,22,18,0.4)'); gr.addColorStop(1, 'rgba(25,22,18,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  wrapDraw(g, w, h, () => { for (let k = 0; k < 4; k++) crack(g, r, r() * w, r() * h, 10 + Math.floor(r() * 12), 0.5); });
  g.fillStyle = '#e8c21a'; g.fillRect(w * 0.04, 0, w * 0.025, h); g.fillRect(w * 0.935, 0, w * 0.025, h);
  dots(g, r, w, h, 2500, ['#8d8e8a', '#74756f'], 1, 3, 0.7);
});

/** Unpaved road: wheel ruts, compacted centre ridge, stones, grass fringe, ragged feathered edges. loose = deeper ruts and more rock. */
const trackTex = loose => () => tex(512, 1280, (g, w, h) => {
  const r = rnd(loose ? 23 : 17), M = w / 10;
  const base = loose ? '#876744' : '#a68a5c', light = loose ? ['#9b7a53', '#7a5c3b', '#b09068'] : ['#bba070', '#94784c', '#c9b185', '#8a6f46'];
  g.fillStyle = base; g.fillRect(0, 0, w, h); blotches(g, r, w, h, 120, 0.1, 0.2, 60);
  dots(g, r, w, h, 36000, light, 1, 3, 0.55);
  // soil texture streaks along the direction of travel
  blurred(g, 1.5, () => { for (let i = 0; i < 700; i++) { g.strokeStyle = r() > 0.5 ? 'rgba(255,240,210,0.07)' : 'rgba(40,25,10,0.09)'; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 20 + r() * 50); g.stroke(); } });
  const rut = (cx, wid, a) => { wrapDraw(g, w, h, () => blurred(g, wid * 0.35, () => { g.strokeStyle = `rgba(45,30,14,${a})`; g.lineWidth = wid; g.beginPath(); for (let y = 0; y <= h; y += 16) { const x = cx + Math.sin(y * 0.011 + cx) * 7 + Math.sin(y * 0.037) * 3; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); })); };
  const sep = 0.78 * M, wid = (loose ? 0.8 : 0.6) * M;
  rut(w / 2 - sep, wid, loose ? 0.55 : 0.42); rut(w / 2 + sep, wid, loose ? 0.55 : 0.42);
  blurred(g, 9, () => { g.fillStyle = 'rgba(225,205,165,0.2)'; g.fillRect(w / 2 - 0.35 * M, 0, 0.7 * M, h); });   // crown between the ruts
  dots(g, r, w, h, 2200, ['#2e1e0e', '#3c2a16'], 1, 2.4, 0.5);
  // stones with a drop shadow
  for (let i = 0; i < (loose ? 800 : 420); i++) { const x = r() * w, y = r() * h, s = 1 + r() * (loose ? 3.6 : 2.6); g.fillStyle = 'rgba(30,20,10,0.3)'; g.beginPath(); g.ellipse(x + 1.2, y + 1.2, s, s * 0.8, 0, 0, 6.3); g.fill(); g.fillStyle = ['#a89a84', '#857a69', '#948772', '#675f53'][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(x, y, s, s * 0.8, r() * 3, 0, 6.3); g.fill(); }
  wrapDraw(g, w, h, () => { for (let k = 0; k < 8; k++) crack(g, r, r() * w, r() * h, 8 + Math.floor(r() * 10), 0.28); });
  // grass/scrub fringe, then feather the edges into the terrain
  for (const side of [0, 1]) for (let i = 0; i < 900; i++) { const x = side ? w - r() * 0.07 * w : r() * 0.07 * w, y = r() * h; g.fillStyle = ['#6e7a3c', '#5a6632', '#8a8a4c', '#4f5a2c'][Math.floor(r() * 4)]; g.globalAlpha = 0.5 + r() * 0.4; g.fillRect(x, y, 1.5, 4 + r() * 6); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out';
  for (const side of [0, 1]) { const x0 = side ? w : 0, x1 = side ? w * 0.84 : w * 0.16, gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(side ? w * 0.84 : 0, 0, w * 0.16, h); }
  for (let i = 0; i < 2600; i++) { const side = r() > 0.5, x = side ? w - r() * 0.12 * w : r() * 0.12 * w; g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; g.fillRect(x, r() * h, 2 + r() * 5, 2 + r() * 6); }
  g.globalCompositeOperation = 'source-over';
});
const dirtTex = trackTex(false), looseTex = trackTex(true);

function Ribbon({ path, half, makeTexture, tile, lift = 0.012, step = 2, segs = 6, hide = null, feather = false, detail = {} }) {
  const geo = useMemo(() => {
    const pts = path.pts.filter((_, i) => i % step === 0); if (path.closed) pts.push({ ...path.pts[0], s: path.total });
    const pos = [], uv = [], idx = [];
    pts.forEach((p, k) => {
      const nx = p.tz, nz = -p.tx;
      for (let j = 0; j <= segs; j++) {
        const d = (j / segs * 2 - 1) * half, x = p.x + nx * d, z = p.z + nz * d;
        pos.push(x, height(x, z) + lift, z); uv.push(j / segs, p.s / tile);
        if (k && j && !(hide && (hide(p) || hide(pts[k - 1])))) { const a = (k - 1) * (segs + 1) + j - 1, b = a + 1, c = k * (segs + 1) + j - 1, e = c + 1; idx.push(a, c, b, b, c, e); }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }, [path, half, tile, lift, step, segs]);
  const map = useMemo(() => makeTexture(), [makeTexture]);
  const mat = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ map, roughness: 0.93, transparent: feather, depthWrite: !feather, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), detail), [map, feather]);
  return <mesh geometry={geo} material={mat} receiveShadow renderOrder={feather ? 1 : 0} />;
}

function Terrain() {
  const geo = useMemo(() => {
    const seg = 400, g = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), kind = new Float32Array(pos.count * 2), c = new THREE.Color(), r = rnd(3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
      const slope = Math.abs(height(x + 1.5, z) - y) + Math.abs(height(x, z + 1.5) - y);
      const edge = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - 330) / 60);
      kind.set(kindOf(surface(x, z)), i * 2);
      c.set(surface(x, z).color).multiplyScalar(1 - Math.min(0.4, slope * 0.22));
      if (edge > 0) c.lerp(new THREE.Color('#7b6a52'), Math.min(0.7, edge));
      c.offsetHSL(Math.sin(x * 0.011 + z * 0.007) * 0.012, Math.sin(x * 0.017 - z * 0.013) * 0.05, (Math.sin(x * 0.23 + z * 0.17) * Math.sin(z * 0.31 - x * 0.11) * 0.07) + Math.sin(x * 0.041 + z * 0.036) * 0.035 + (r() - 0.5) * 0.05);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aGround', new THREE.BufferAttribute(kind, 2)); g.computeVertexNormals(); return g;
  }, []);
  const mat = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { grain: 0.5, bump: 1.15, macro: 0.32, perVertex: true }), []);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

const labelTex = (text, sub, color = '#1d2a2f') => tex(512, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c14e'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
  g.fillStyle = '#fff'; g.font = 'bold 66px sans-serif'; g.textAlign = 'center'; g.fillText(text, w / 2, 120); g.fillStyle = '#9fc0c8'; g.font = '38px sans-serif'; g.fillText(sub, w / 2, 190);
});
const checkerTex = () => tex(128, 16, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#fff' : '#111'; g.fillRect(x * 8, y * 8, 8, 8); } });

function Props() {
  const tyres = useRef(), shrubs = useRef();
  const { tyrePts, shrubPts } = useMemo(() => {
    const tp = [], r = rnd(11);
    circuit.pts.forEach((p, i) => { if (i % 10 === 0 && Math.abs(p.k) > 0.012) { const side = p.k > 0 ? -1 : 1, d = 11.2 * side; tp.push([p.x + p.tz * d, p.z - p.tx * d]); } });
    const sp = []; let tries = 0;
    while (sp.length < 260 && tries++ < 4000) { const x = (r() - 0.5) * 700, z = (r() - 0.5) * 700; if (!isRoad(x, z) && Math.hypot(x, z) > 60 && baseHeight(x, z) < 6) sp.push([x, z, 0.5 + r() * 1.1, r()]); }
    return { tyrePts: tp, shrubPts: sp };
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D();
    tyrePts.forEach(([x, z], i) => { for (let k = 0; k < 2; k++) { o.position.set(x, height(x, z) + 0.2 + k * 0.4, z); o.rotation.set(0, i, 0); o.updateMatrix(); tyres.current.setMatrixAt(i * 2 + k, o.matrix); } });
    tyres.current.instanceMatrix.needsUpdate = true;
    shrubPts.forEach(([x, z, s, v], i) => { o.position.set(x, height(x, z) + s * 0.35, z); o.scale.set(s, s * (0.7 + v * 0.4), s); o.rotation.set(0, v * 6, 0); o.updateMatrix(); shrubs.current.setMatrixAt(i, o.matrix); });
    shrubs.current.instanceMatrix.needsUpdate = true;
  }, [tyrePts, shrubPts]);
  const signs = useMemo(() => spawns.filter(s => s.key !== '0').map(s => ({ ...s, map: labelTex(s.name.toUpperCase(), `press ${s.key} to teleport`) })), []);
  const sf = startLine, sy = height(sf.x, sf.z);
  const checker = useMemo(checkerTex, []), pit = [-200, height(-200, -304), -304];
  return <>
    <instancedMesh ref={tyres} args={[null, null, tyrePts.length * 2]} castShadow><cylinderGeometry args={[0.38, 0.38, 0.38, 14]} /><meshStandardMaterial color="#1b1b1c" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={shrubs} args={[null, null, shrubPts.length]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#68703f" roughness={1} /></instancedMesh>

    {/* start / finish line + gantry */}
    <mesh position={[sf.x, sy + 0.09, sf.z]} rotation={[-Math.PI / 2, 0, -sf.h + Math.PI / 2]}><planeGeometry args={[13, 1.2]} /><meshStandardMaterial map={checker} /></mesh>
    <group position={[sf.x, sy, sf.z]} rotation={[0, sf.h, 0]}>
      {[-8, 8].map(x => <mesh key={x} position={[x, 3.5, 0]} castShadow><boxGeometry args={[0.5, 7, 0.5]} /><meshStandardMaterial color="#d9dadb" metalness={0.4} roughness={0.5} /></mesh>)}
      <mesh position={[0, 7, 0]} castShadow><boxGeometry args={[17, 1.6, 0.6]} /><meshStandardMaterial map={labelTex('BAJA TEST CENTER', 'START / FINISH')} /></mesh>
    </group>
    {/* pit building + grandstand */}
    <mesh position={[-200, 3, -322]} castShadow receiveShadow><boxGeometry args={[170, 6, 12]} /><meshStandardMaterial color="#cfd1cf" roughness={0.8} /></mesh>
    <mesh position={[-200, 6.2, -320]} castShadow><boxGeometry args={[176, 0.5, 18]} /><meshStandardMaterial color="#394047" /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[-200, 0.7 + i * 1.1, -258 + i * 2.2]} castShadow receiveShadow><boxGeometry args={[70, 1.4, 4]} /><meshStandardMaterial color={['#6e7e86', '#8c9aa1', '#6e7e86', '#8c9aa1'][i]} /></mesh>)}
    {/* area signs around the plaza */}
    {signs.map((s, i) => { const a = (i / signs.length) * Math.PI * 2 + 0.6, x = Math.cos(a) * 40, z = Math.sin(a) * 40; return <group key={s.key} position={[x, 0, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
      <mesh position={[-1.9, 1.5, 0]} castShadow><boxGeometry args={[0.2, 3, 0.2]} /><meshStandardMaterial color="#555" /></mesh><mesh position={[1.9, 1.5, 0]} castShadow><boxGeometry args={[0.2, 3, 0.2]} /><meshStandardMaterial color="#555" /></mesh>
      <mesh position={[0, 3.1, 0]} castShadow><boxGeometry args={[4.4, 2.2, 0.2]} /><meshStandardMaterial map={s.map} /></mesh></group>; })}
  </>;
}

export default function TestCenterScene() {
  return <>
    <Sky distance={4500} sunPosition={[200, 140, 120]} turbidity={5} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
    <fog attach="fog" args={['#cdd8de', 160, 650]} />
    <Terrain />
    <Ribbon path={circuit} half={7.5} tile={24} makeTexture={circuitTex} detail={{ grain: 0.2, bump: 0.35, macro: 0.1 }} />
    <Ribbon path={pitLane} half={4.6} tile={9.2} makeTexture={pitTex} detail={{ grain: 0.2, bump: 0.3, macro: 0.08 }} step={1} lift={0.012} segs={2} />
    <Ribbon path={dirtRoad} half={4.6} tile={25} makeTexture={dirtTex} feather detail={{ grain: 0.4, bump: 0.7, macro: 0.15 }} lift={0.012} segs={4} />
    <Ribbon path={offroad} half={5} tile={25} makeTexture={looseTex} feather detail={{ grain: 0.45, bump: 0.85, macro: 0.15 }} lift={0.012} segs={4} hide={p => { const f = p.s / offroad.total; return (f > 0.715 && f < 0.825) || (f > 0.875 && f < 0.965); }} />
    {townRoads.map((p, i) => <Ribbon key={'t' + i} path={p} half={3.6} tile={25} makeTexture={dirtTex} feather detail={{ grain: 0.42, bump: 0.8, macro: 0.15 }} lift={0.014} segs={4} />)}
    {trails.map((p, i) => <Ribbon key={'r' + i} path={p} half={2.6} tile={22} makeTexture={looseTex} feather detail={{ grain: 0.5, bump: 1, macro: 0.15 }} lift={0.014} segs={4} />)}
    <Props />
    <Sites />
  </>;
}
