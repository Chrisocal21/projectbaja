import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { SIZE, height, surface, isRoad, circuit, pitLane, dirtRoad, offroad, spawns, startLine, baseHeight } from './testcenter.js';

const rnd = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const tex = (w, h, draw, repeatY = 1) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1, repeatY); return t;
};
const speckle = (g, w, h, base, amt, n) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rnd(7);
  for (let i = 0; i < n; i++) { const v = Math.floor((r() - 0.5) * amt); g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
};

// ribbon textures: u across the road, v along it (one tile = `len` metres)
const circuitTex = () => tex(256, 512, (g, w, h) => {
  speckle(g, w, h, '#3d4044', 70, 26000);
  const curb = w * (1 / 7.5), line = w * 0.04;
  for (let k = 0; k < 4; k++) for (const side of [0, 1]) { g.fillStyle = k % 2 ? '#e9e9e4' : '#c0322b'; g.fillRect(side ? w - curb : 0, k * h / 4, curb, h / 4); }
  g.fillStyle = '#ecebe4'; g.fillRect(curb + 3, 0, line, h); g.fillRect(w - curb - 3 - line, 0, line, h);
  g.fillStyle = 'rgba(15,15,15,0.35)'; g.fillRect(w * 0.3, 0, w * 0.08, h); g.fillRect(w * 0.62, 0, w * 0.08, h);   // rubbered-in racing line
});
const dirtTex = () => tex(256, 512, (g, w, h) => {
  speckle(g, w, h, '#a8885a', 90, 30000);
  g.fillStyle = 'rgba(70,50,28,0.35)'; g.fillRect(w * 0.30, 0, w * 0.09, h); g.fillRect(w * 0.61, 0, w * 0.09, h);
  g.fillStyle = 'rgba(190,175,150,0.55)'; g.fillRect(0, 0, w * 0.12, h); g.fillRect(w * 0.88, 0, w * 0.12, h);
});
const looseTex = () => tex(256, 512, (g, w, h) => { speckle(g, w, h, '#8c6b44', 100, 30000); g.fillStyle = 'rgba(50,35,20,0.3)'; g.fillRect(w * 0.32, 0, w * 0.08, h); g.fillRect(w * 0.6, 0, w * 0.08, h); });
const pitTex = () => tex(256, 256, (g, w, h) => {
  speckle(g, w, h, '#8f908c', 40, 12000); g.fillStyle = '#6f706c'; g.fillRect(0, h - 3, w, 3);
  g.fillStyle = '#e8c21a'; g.fillRect(w * 0.04, 0, w * 0.03, h); g.fillRect(w * 0.93, 0, w * 0.03, h);
});

function Ribbon({ path, half, makeTexture, tile, lift = 0.07, step = 2, segs = 6, hide = null }) {
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
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial map={map} roughness={0.92} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>;
}

function Terrain() {
  const geo = useMemo(() => {
    const seg = 400, g = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), r = rnd(3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
      const slope = Math.abs(height(x + 1.5, z) - y) + Math.abs(height(x, z + 1.5) - y);
      const edge = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - 330) / 60);
      c.set(surface(x, z).color).multiplyScalar(1 - Math.min(0.4, slope * 0.22));
      if (edge > 0) c.lerp(new THREE.Color('#7b6a52'), Math.min(0.7, edge));
      c.offsetHSL(0, 0, (Math.sin(x * 0.23 + z * 0.17) * Math.sin(z * 0.31 - x * 0.11) * 0.04) + (r() - 0.5) * 0.03);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>;
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
    <Ribbon path={circuit} half={7.5} tile={12} makeTexture={circuitTex} />
    <Ribbon path={pitLane} half={4.6} tile={8} makeTexture={pitTex} step={1} lift={0.06} segs={2} />
    <Ribbon path={dirtRoad} half={4.6} tile={12} makeTexture={dirtTex} lift={0.05} segs={4} />
    <Ribbon path={offroad} half={5} tile={14} makeTexture={looseTex} lift={0.05} segs={4} hide={p => { const f = p.s / offroad.total; return (f > 0.715 && f < 0.825) || (f > 0.875 && f < 0.965); }} />
    <Props />
  </>;
}
