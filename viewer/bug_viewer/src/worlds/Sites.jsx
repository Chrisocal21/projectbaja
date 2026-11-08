import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SITES, height } from './county.js';
import { game, useGame } from '../game/store.js';
import { GARAGE, BARN, BOULDERS, CACTI } from './siteData.js';
import { furniture } from '../game/loot.js';
import LotSite, { canvasTex, signTex, asphaltTex, rnd } from '../lot/CarLot.jsx';

export const wood = (base, dark, vertical = true, seed = 3) => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const n = 16; for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.16})`; vertical ? g.fillRect((i * w) / n, 0, 2, h) : g.fillRect(0, (i * h) / n, w, 2);
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.07})`; vertical ? g.fillRect((i * w) / n + 2, 0, w / n - 2, h) : g.fillRect(0, (i * h) / n + 2, w, h / n - 2);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = dark; g.globalAlpha = 0.1 + r() * 0.25; vertical ? g.fillRect(r() * w, r() * h, 1, 4 + r() * 22) : g.fillRect(r() * w, r() * h, 4 + r() * 22, 1); }
  g.globalAlpha = 1;
}, [1, 1]);
export const metalTex = (base, seed = 5) => canvasTex(256, 256, (g, w, h) => {
  const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { const x = (i * w) / 16, gr = g.createLinearGradient(x, 0, x + w / 16, 0); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0.16)'); g.fillStyle = gr; g.fillRect(x, 0, w / 16, h); }
  for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(120,56,24,0.3)'); gr.addColorStop(1, 'rgba(120,56,24,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(30,24,18,${r() * 0.18})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 8); }
}, [1, 1]);
const Box = ({ p, s, color = '#888', map, rough = 0.9, metal = 0, emissive, ei = 0, cast = true, rot }) =>
  <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} map={map} roughness={rough} metalness={metal} emissive={emissive} emissiveIntensity={ei} /></mesh>;
const Tire = ({ p, r = 0.38, w = 0.28, rim = '#9aa0a4', rot = [Math.PI / 2, 0, 0] }) => <group position={p} rotation={rot}>
  <mesh castShadow><cylinderGeometry args={[r, r, w, 20]} /><meshStandardMaterial color="#141414" roughness={0.95} /></mesh>
  <mesh position={[0, w * 0.52, 0]}><cylinderGeometry args={[r * 0.62, r * 0.62, 0.02, 18]} /><meshStandardMaterial color={rim} metalness={0.7} roughness={0.4} /></mesh></group>;

/** The player's garage: concrete slab, roller door, workbench, parts shelves, an engine on a stand. Local +z = the door. */
function Garage() {
  useGame();
  const { w, d, door } = GARAGE, t = 0.2, H = 4.6, power = game.home?.power;
  const metal = useMemo(() => { const m = metalTex('#7b8b86'); m.repeat.set(3, 1); return m; }, []);
  const roof = useMemo(() => metalTex('#59615f', 9), []);
  const sign = useMemo(() => signTex([["WALT'S GARAGE", 66, '#f2c14e'], ['repairs · welding · est. 1968', 32, '#cfd8d6']], '#1c2a2e', '#fff', '#f2c14e'), []);
  const bench = useMemo(() => wood('#8a6a44', '#3a2a18', false, 4), []);
  return <group>
    <Box p={[0, 0.06, 0]} s={[w * 2 + 1.2, 0.12, d * 2 + 1.2]} color="#8a8b87" rough={1} cast={false} />
    <Box p={[0, 0.07, d + 2.6]} s={[door * 2 + 2, 0.1, 5]} color="#85867f" rough={1} cast={false} />
    <Box p={[0, H / 2, -d]} s={[w * 2, H, t]} color="#fff" map={metal} /><Box p={[-w, H / 2, 0]} s={[t, H, d * 2]} color="#fff" map={metal} /><Box p={[w, H / 2, 0]} s={[t, H, d * 2]} color="#fff" map={metal} />
    <Box p={[-(w + door) / 2, H / 2, d]} s={[w - door, H, t]} color="#fff" map={metal} /><Box p={[(w + door) / 2, H / 2, d]} s={[w - door, H, t]} color="#fff" map={metal} />
    <Box p={[0, (H + 3.7) / 2, d]} s={[door * 2, H - 3.7, t]} color="#fff" map={metal} />
    <Box p={[0, 3.62, d - 0.15]} s={[door * 2, 0.35, 0.3]} color="#2c3234" metal={0.4} />
    <Box p={[0, H + 0.2, 0]} s={[w * 2 + 0.8, 0.28, d * 2 + 0.8]} color="#fff" map={roof} />
    <mesh position={[0, H + 0.75, d + 0.2]}><boxGeometry args={[6, 1.15, 0.12]} /><meshStandardMaterial map={sign} roughness={0.7} /></mesh>
    {/* workbench along the back wall, tools on a pegboard above it */}
    <Box p={[-3, 0.92, -d + 0.8]} s={[5.2, 0.12, 1.1]} color="#fff" map={bench} />
    {[-5.4, -0.6].map(x => <Box key={x} p={[x, 0.45, -d + 0.8]} s={[0.12, 0.9, 1]} color="#3b3f42" metal={0.5} />)}
    <Box p={[-3, 0.35, -d + 0.8]} s={[5, 0.7, 0.9]} color="#a33a2e" rough={0.6} metal={0.3} />
    <Box p={[-3, 2.0, -d + 0.14]} s={[5.4, 1.5, 0.06]} color="#8b8f8a" />
    {Array.from({ length: 14 }, (_, i) => <Box key={i} p={[-5.4 + i * 0.36, 2.0 + ((i * 7) % 5) * 0.2 - 0.35, -d + 0.22]} s={[0.07, 0.38 + (i % 3) * 0.1, 0.05]} color={['#c9ccd0', '#d84a38', '#e8b43a', '#3a3f44'][i % 4]} metal={0.6} rough={0.4} cast={false} />)}
    {/* engine on a stand */}
    <group position={[4.8, 0, -4.8]}><Box p={[0, 0.5, 0]} s={[1.2, 0.08, 0.9]} color="#444" metal={0.5} /><Box p={[0, 0.9, 0]} s={[0.95, 0.7, 0.7]} color="#5a5d60" metal={0.7} rough={0.5} />
      {[-0.28, 0.28].map(x => <Box key={x} p={[x, 1.32, 0]} s={[0.28, 0.2, 0.62]} color="#6c7073" metal={0.6} rough={0.5} />)}</group>
    {/* left shelves: tires + rims; right shelves: boxes */}
    {[0.55, 1.45, 2.35].map((y, i) => <group key={i}>
      <Box p={[-w + 0.5, y, -0.2]} s={[0.8, 0.06, 7.4]} color="#4a4f52" metal={0.5} />
      <Box p={[w - 0.5, y, -0.9]} s={[0.8, 0.06, 6.6]} color="#4a4f52" metal={0.5} />
    </group>)}
    {[-3.4, 3.2].map(z => [-w + 0.1, w - 0.1].map((x, k) => <Box key={z + '' + k} p={[x, 1.4, z]} s={[0.08, 2.8, 0.08]} color="#d9962f" metal={0.4} />))}
    {[-3.2, -1.7, -0.2, 1.3, 2.8].map((z, i) => <Tire key={i} p={[-w + 0.5, 0.95 + (i % 2) * 0.9, z]} r={0.36 + (i % 3) * 0.03} rim={['#9aa0a4', '#d9962f', '#2b2b2b', '#b8bcc0', '#cf3e2f'][i]} rot={[0, 0, Math.PI / 2]} />)}
    {[-3.8, -2.2, -0.6, 1.0, 2.2].map((z, i) => <Box key={i} p={[w - 0.5, 0.78 + (i % 3) * 0.9, z - 0.6]} s={[0.55, 0.36, 0.55 + (i % 2) * 0.3]} color={['#c8a46a', '#b58b55', '#a9854f'][i % 3]} rough={1} />)}
    <Tire p={[5.3, 0.14, -2.6]} rot={[0, 0, 0]} /><Tire p={[5.3, 0.42, -2.6]} rot={[0, 0, 0]} rim="#cf3e2f" />
    <mesh position={[1.4, 0.13, -1.4]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.1, 20]} /><meshBasicMaterial color="#17120d" transparent opacity={0.35} depthWrite={false} /></mesh>
    {[-3.5, 3.5].map(x => <mesh key={x} position={[x, H - 0.18, 0]}><boxGeometry args={[0.18, 0.08, 6.2]} /><meshStandardMaterial color={power ? '#fff6dc' : '#6d6a62'} emissive="#fff0c0" emissiveIntensity={power ? 1.4 : 0} /></mesh>)}
    <pointLight position={[0, H - 0.8, 0]} intensity={power ? 32 : 6} distance={20} decay={1.6} color={power ? '#ffeccc' : '#b9a98a'} />
    {/* grandpa's letter on the bench */}
    <mesh position={[-2.6, 0.985, -5.25]} rotation={[-Math.PI / 2, 0, 0.2]}><planeGeometry args={[0.24, 0.32]} /><meshStandardMaterial color="#efe6cf" roughness={0.9} /></mesh>
    {/* the main breaker panel (press E) */}
    <Box p={[w - 0.16, 1.5, -1.2]} s={[0.12, 0.7, 0.5]} color="#5b6266" metal={0.5} rough={0.5} />
    <Box p={[w - 0.23, 1.55, -1.2]} s={[0.04, 0.12, 0.05]} color={power ? '#3fbf5a' : '#c8372b'} emissive={power ? '#3fbf5a' : '#c8372b'} ei={0.8} cast={false} />
  </group>;
}

const barnShape = (w, wallH, ridge, door, doorH) => {
  const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, wallH); s.lineTo(0, ridge); s.lineTo(-w, wallH); s.lineTo(-w, 0);
  if (door) { const h = new THREE.Path(); h.moveTo(-door, 0); h.lineTo(-door, doorH); h.lineTo(door, doorH); h.lineTo(door, 0); h.lineTo(-door, 0); s.holes.push(h); }
  return s;
};

/** A weathered red barn with a hayloft: hay bales, barrels, crates (loot) and a lantern. */
function Barn() {
  const { w, d, door } = BARN, wallH = 5, ridge = 8.8, run = Math.hypot(w, ridge - wallH), ang = Math.atan2(ridge - wallH, w);
  const planks = useMemo(() => { const m = wood('#8f3b2d', '#2a0d08', true, 6); m.repeat.set(2, 1); return m; }, []);
  const roofMap = useMemo(() => metalTex('#7d8584', 12), []);
  const gableF = useMemo(() => new THREE.ExtrudeGeometry(barnShape(w, wallH, ridge, door, 4.2), { depth: 0.25, bevelEnabled: false }), [w, door]);
  const gableB = useMemo(() => new THREE.ExtrudeGeometry(barnShape(w, wallH, ridge), { depth: 0.25, bevelEnabled: false }), [w]);
  const hay = useMemo(() => canvasTex(128, 128, (g, W, Hh) => { const r = rnd(8); g.fillStyle = '#c9a45a'; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 1400; i++) { g.strokeStyle = ['#e0c07a', '#a9863f', '#d4b36c'][i % 3]; g.beginPath(); const x = r() * W, y = r() * Hh; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 6); g.stroke(); } g.fillStyle = '#5a4a28'; g.fillRect(W * 0.28, 0, 3, Hh); g.fillRect(W * 0.7, 0, 3, Hh); }, [1, 1]), []);
  const bale = (p, ry = 0, key) => <Box key={key} p={p} s={[1.5, 0.75, 0.8]} color="#fff" map={hay} rot={[0, ry, 0]} rough={1} />;
  return <group>
    {[[-w, 0, 'x'], [w, 0, 'x']].map(([x], i) => <Box key={i} p={[x, wallH / 2, 0]} s={[0.25, wallH, d * 2]} color="#fff" map={planks} />)}
    <mesh geometry={gableB} position={[0, 0, -d - 0.25]} castShadow receiveShadow><meshStandardMaterial map={planks} roughness={0.95} /></mesh>
    <mesh geometry={gableF} position={[0, 0, d]} castShadow receiveShadow><meshStandardMaterial map={planks} roughness={0.95} /></mesh>
    {[-1, 1].map(sd => <group key={sd} position={[sd * w * 0.5, (wallH + ridge) / 2 + 0.2, 0]} rotation={[0, 0, -sd * ang]}><Box p={[0, 0, 0]} s={[run + 0.9, 0.18, d * 2 + 1]} color="#fff" map={roofMap} metal={0.35} rough={0.6} /></group>)}
    {/* doors: open sliding panels + trim */}
    {[-1, 1].map(sd => <Box key={sd} p={[sd * (door + 0.9), 2.1, d + 0.45]} s={[1.8, 4.2, 0.12]} color="#fff" map={planks} />)}
    {[-1, 1].map(sd => [0.15, 4.2].map(y => <Box key={sd + '' + y} p={[sd * (door + 0.9), y, d + 0.52]} s={[1.9, 0.16, 0.08]} color="#e8e2d2" cast={false} />))}
    <Box p={[0, 4.3, d + 0.15]} s={[door * 2 + 0.5, 0.18, 0.3]} color="#e8e2d2" cast={false} />
    <mesh position={[0, 7.2, d + 0.3]} rotation={[0, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshStandardMaterial color="#1c1410" /></mesh>
    {/* hayloft */}
    <Box p={[0, 3.55, -d / 2 - 0.5]} s={[w * 2 - 0.4, 0.18, d - 1]} color="#fff" map={planks} />
    {[-w + 0.6, w - 0.6].map(x => [-d + 1, -d / 2 - 0.5, -1].map((z, k) => <Box key={x + '' + k} p={[x, 1.75, z]} s={[0.22, 3.5, 0.22]} color="#5b3a22" />))}
    {[[-5.6, -d + 1.6], [-4.0, -d + 1.6], [-5.6, -d + 3.2]].map(([x, z], i) => bale([x, 4.05, z], i, 'l' + i))}
    <Box p={[0, 4.4, -d / 2 + 0.2]} s={[w * 2 - 0.6, 0.08, 0.1]} color="#4a2f1b" />
    {/* ground-floor bales, barrels, tools */}
    {bale([-6.6, 0.4, -8.5], 0.1, 'a')}{bale([-6.5, 0.4, -6.6], -0.05, 'b')}{bale([-6.55, 1.17, -7.6], 0.08, 'c')}{bale([-6.5, 0.4, -4.4], 0.2, 'd')}
    {bale([6.4, 0.4, -9], 1.6, 'e')}{bale([6.5, 0.4, -7.1], 1.5, 'f')}{bale([6.5, 1.17, -8], 1.57, 'g')}
    {[[5.9, 4.5], [-6, 6.5], [-6.2, 7.8]].map(([x, z], i) => <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.45, 0.45, 1.1, 14]} /><meshStandardMaterial color={['#6e3a24', '#2f4a63', '#6b6f3a'][i]} metalness={0.4} roughness={0.7} /></mesh>)}
    <Box p={[0, 0.5, -d + 0.8]} s={[2.4, 1, 0.8]} color="#6b4a2a" rough={1} />
    <mesh position={[-1.2, 0.012, -2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.4, 20]} /><meshBasicMaterial color="#6e5a3a" transparent opacity={0.35} depthWrite={false} /></mesh>
    <group position={[0, 5.2, -2]}><mesh><cylinderGeometry args={[0.16, 0.16, 0.34, 10]} /><meshStandardMaterial color="#ffd48a" emissive="#ffb35a" emissiveIntensity={2} /></mesh></group>
    <pointLight position={[0, 4.6, -2]} intensity={55} distance={22} decay={1.5} color="#ffc27a" />
    <pointLight position={[0, 2.5, 6]} intensity={22} distance={14} decay={1.6} color="#ffe0b0" />
  </group>;
}

const priceTex = () => canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#1c2a34'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8372b'; g.fillRect(0, 0, w, 150); g.fillStyle = '#fff'; g.font = '800 62px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('DUSTY', w / 2, 70); g.fillText('FUEL', w / 2, 132);
  g.font = '800 27px sans-serif'; g.fillStyle = '#9fc0c8'; ['REGULAR', 'PLUS', 'DIESEL'].forEach((t, i) => { g.fillStyle = '#9fc0c8'; g.textAlign = 'left'; g.fillText(t, 20, 220 + i * 90); g.fillStyle = '#ffd23f'; g.textAlign = 'right'; g.fillText(['3.89', '4.29', '4.55'][i], w - 20, 220 + i * 90); });
}, [1, 1]);

/** Dusty Fuel: canopy over two pump islands, a corner store, and a price pylon. Local +z = the pumps. */
function GasStation() {
  const sign = useMemo(() => signTex([['DUSTY FUEL & GO', 62, '#fff'], ['cold drinks · ice · parts', 34, '#ffd23f']], '#b02f26', '#fff', '#ffd23f'), []);
  const price = useMemo(priceTex, []);
  const asphalt = useMemo(() => { const t = asphaltTex(); t.repeat.set(5, 5); return t; }, []);
  const Pump = ({ x }) => <group position={[x, 0, 6.2]}>
    <Box p={[0, 0.1, 0]} s={[1.3, 0.2, 4.4]} color="#9a9a94" rough={1} />
    <Box p={[0, 0.95, 0]} s={[0.8, 1.7, 0.55]} color="#d9d6cc" rough={0.5} metal={0.2} /><Box p={[0, 1.2, 0.285]} s={[0.55, 0.4, 0.02]} color="#0c1f1a" emissive="#5bd8a0" ei={0.9} cast={false} />
    <Box p={[0, 1.75, 0]} s={[0.85, 0.28, 0.6]} color="#c8372b" rough={0.5} /><Box p={[0.36, 0.95, 0.1]} s={[0.1, 0.5, 0.1]} color="#222" />
  </group>;
  return <group>
    <mesh position={[0, 0.045, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[19.5, 40]} /><meshStandardMaterial map={asphalt} roughness={0.95} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} /></mesh>
    {/* store */}
    <Box p={[0, 2, -12]} s={[16, 4, 7]} color="#d8cfb4" rough={0.95} /><Box p={[0, 4.15, -12]} s={[16.6, 0.3, 7.6]} color="#7a2f26" />
    <Box p={[0, 1.7, -8.46]} s={[9, 2.2, 0.08]} color="#17262b" emissive="#8fd2e0" ei={0.45} rough={0.2} cast={false} /><Box p={[-5.6, 1.1, -8.46]} s={[1.2, 2.2, 0.1]} color="#4a2f1b" />
    <Box p={[0, 3.35, -8.35]} s={[7, 1, 0.1]} color="#fff" cast={false} />
    <mesh position={[0, 3.35, -8.29]}><planeGeometry args={[6.8, 0.9]} /><meshStandardMaterial map={sign} roughness={0.7} emissive="#ffffff" emissiveIntensity={0.25} /></mesh>
    {/* canopy */}
    <Box p={[0, 5.4, 4.5]} s={[16, 0.5, 10]} color="#e8e6dc" rough={0.7} /><Box p={[0, 5.4, 9.55]} s={[16.2, 0.62, 0.12]} color="#c8372b" /><Box p={[0, 5.4, -0.55]} s={[16.2, 0.62, 0.12]} color="#c8372b" />
    {[-7, 7].map(x => [0.8, 8.2].map(z => <Box key={x + '' + z} p={[x, 2.6, z]} s={[0.45, 5.2, 0.45]} color="#d8d6ce" metal={0.2} rough={0.6} />))}
    {[-3.6, 3.6].map(x => <Box key={x} p={[x, 5.12, 6.2]} s={[1.6, 0.06, 5]} color="#fff6dc" emissive="#fff0c0" ei={1.6} cast={false} />)}
    <Pump x={-3.6} /><Pump x={3.6} />
    <pointLight position={[0, 4.6, 5]} intensity={40} distance={16} decay={1.6} color="#fff0d0" />
    {/* pylon + clutter */}
    <group position={[12.5, 0, 12]}><Box p={[0, 3.5, 0]} s={[0.4, 7, 0.4]} color="#555a5e" metal={0.5} /><mesh position={[0, 6.3, 0.22]}><boxGeometry args={[2.4, 4.4, 0.18]} /><meshStandardMaterial map={price} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.6} /></mesh></group>
    <group position={[12, 0, -4]}>{[0, 1, 2].map(i => <mesh key={i} position={[0, 0.45 + i * 0.01, i * 0.9]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.9, 14]} /><meshStandardMaterial color={['#c8372b', '#2f5d86', '#bdbdb4'][i]} metalness={0.4} roughness={0.6} /></mesh>)}</group>
    <group position={[-13, 0, -10]}><Box p={[0, 1.1, 0]} s={[2.2, 2.2, 1.6]} color="#2f6a4a" metal={0.3} rough={0.7} /><Box p={[0, 2.3, 0]} s={[2.3, 0.16, 1.7]} color="#244f38" /></group>
    {[[-9, -5], [-9, -3.9], [-9, -2.8]].map(([x, z], i) => <Tire key={i} p={[x, 0.2 + i * 0.4, z]} rot={[Math.PI / 2, 0, 0]} />)}
    <group position={[10, 0, 8]}><mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, 1.2, 12]} /><meshStandardMaterial color="#d8d6ce" metalness={0.4} /></mesh><mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.28, 12, 8]} /><meshStandardMaterial color="#d8d6ce" /></mesh></group>
  </group>;
}

/** a run-down steel warehouse: 24 x 16 m, roll door open in +z, broken skylights. Pallet racks + benches come from loot.js */
function Warehouse() {
  const W = 12, D = 8, H = 6.5, t = 0.2, door = 4.2;
  const metal = useMemo(() => { const m = metalTex('#8a8f86', 21); m.repeat.set(5, 1.4); return m; }, []);
  const roof = useMemo(() => { const m = metalTex('#6c706b', 23); m.repeat.set(4, 3); return m; }, []);
  const gable = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-W, H - 0.05); sh.lineTo(W, H - 0.05); sh.lineTo(0, H + 1.05); sh.lineTo(-W, H - 0.05); return new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); }, []);
  const sign = useMemo(() => signTex([['SALVAGE & SURPLUS', 54, '#e8dcb0'], ['closed · keep out', 32, '#c8372b']], '#2c3234', '#fff', '#8a8f86'), []);
  return <group>
    <Box p={[0, 0.06, 0]} s={[W * 2, 0.12, D * 2]} color="#7e7f7a" rough={1} cast={false} />
    <Box p={[0, H / 2, -D]} s={[W * 2, H, t]} color="#fff" map={metal} /><Box p={[-W, H / 2, 0]} s={[t, H, D * 2]} color="#fff" map={metal} /><Box p={[W, H / 2, 0]} s={[t, H, D * 2]} color="#fff" map={metal} />
    <Box p={[-(W + door) / 2, H / 2, D]} s={[W - door, H, t]} color="#fff" map={metal} /><Box p={[(W + door) / 2, H / 2, D]} s={[W - door, H, t]} color="#fff" map={metal} />
    <Box p={[0, (H + 4.6) / 2, D]} s={[door * 2, H - 4.6, t]} color="#fff" map={metal} /><Box p={[0, 4.4, D - 0.2]} s={[door * 2, 0.45, 0.4]} color="#3a3f42" metal={0.4} />
    {[-1, 1].map(sd => <Box key={sd} p={[sd * W * 0.5, H + 0.35, 0]} s={[W + 0.4, 0.2, D * 2 + 0.6]} color="#fff" map={roof} rot={[0, 0, -sd * 0.1]} />)}
    {[-D - 0.1, D - 0.1].map(z => <mesh key={z} geometry={gable} position={[0, 0, z]}><meshStandardMaterial map={metal} side={THREE.DoubleSide} roughness={0.9} /></mesh>)}
    {[-6, 0, 6].map(x => <mesh key={x} position={[x, H + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 6]} /><meshStandardMaterial color="#c8d4c8" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>)}
    {[-8, -3, 3, 8].map((x, i) => <Box key={x} p={[x, 4.6, D + 0.12]} s={[2, 1, 0.05]} color={i % 2 ? '#1c2326' : '#2c383c'} rough={0.3} cast={false} />)}
    <mesh position={[0, 5.6, D + 0.13]}><planeGeometry args={[6.5, 1.2]} /><meshStandardMaterial map={sign} roughness={0.8} /></mesh>
    {/* clutter: drums, pallets, a dead engine block, tire pile */}
    {[[-3, 5.5], [-2.2, 6.1], [-3.7, 6.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.36, 0.36, 1.0, 14]} /><meshStandardMaterial color={['#2f5d86', '#6e3a24', '#3f6b3a'][i]} metalness={0.4} roughness={0.7} /></mesh>)}
    {[[10.5, 6.5], [-9.5, -4]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>{[0, 1, 2].map(k => <Box key={k} p={[0, 0.08 + k * 0.15, 0]} s={[1.2, 0.12, 1.0]} color="#9c7a48" rough={1} />)}</group>)}
    {[0, 1, 2, 3, 4].map(k => <Tire key={k} p={[10.6 + (k % 2) * 0.3, 0.6 + k * 0.28, -6]} rot={[0, 0, 0]} />)}
    <pointLight position={[0, H - 1, 0]} intensity={60} distance={30} decay={1.5} color="#e8eadc" />
  </group>;
}

/** a tumbledown plank shack (5.2 x 4.4 m), doorway in +z */
function Shack() {
  const planks = useMemo(() => { const m = wood('#7a6a58', '#2a2018', true, 31); m.repeat.set(1.4, 1); return m; }, []);
  const roof = useMemo(() => metalTex('#6f5a48', 33), []);
  const W = 2.6, D = 2.2, H = 2.6, door = 1.15;
  return <group>
    <Box p={[0, 0.05, 0]} s={[W * 2, 0.1, D * 2]} color="#6e5c48" rough={1} cast={false} />
    <Box p={[0, H / 2, -D]} s={[W * 2, H, 0.15]} color="#fff" map={planks} /><Box p={[-W, H / 2, 0]} s={[0.15, H, D * 2]} color="#fff" map={planks} /><Box p={[W, H / 2, 0]} s={[0.15, H, D * 2]} color="#fff" map={planks} />
    <Box p={[-(W + door) / 2, H / 2, D]} s={[W - door, H, 0.15]} color="#fff" map={planks} /><Box p={[(W + door) / 2, H / 2, D]} s={[W - door, H, 0.15]} color="#fff" map={planks} />
    <Box p={[0, H - 0.25, D]} s={[door * 2, 0.5, 0.15]} color="#fff" map={planks} />
    <Box p={[0, H + 0.25, 0.1]} s={[W * 2 + 0.6, 0.08, D * 2 + 0.9]} color="#fff" map={roof} rot={[0.12, 0, 0.03]} />
    <Box p={[door + 0.75, 1.05, D + 0.55]} s={[1.0, 2.0, 0.06]} color="#fff" map={planks} rot={[0, -1.2, 0]} />
    <pointLight position={[0, H - 0.4, 0]} intensity={10} distance={8} decay={1.6} color="#ffd9a0" />
  </group>;
}

/** workbenches and pallet racks that loot sits on */
function Furniture() {
  const top = useMemo(() => wood('#7d5f3d', '#33220f', false, 41), []);
  return <>{furniture.map((f, i) => <group key={i} position={[f.x, f.y, f.z]} rotation={[0, f.wry, 0]}>
    {f.type === 'bench' ? <>
      <Box p={[0, 0.92, 0]} s={[f.len, 0.08, 0.8]} color="#fff" map={top} />
      {[-1, 1].map(sd => <Box key={sd} p={[sd * (f.len / 2 - 0.12), 0.45, 0]} s={[0.1, 0.9, 0.7]} color="#4a4f52" metal={0.4} />)}
      <Box p={[0, 0.25, 0]} s={[f.len - 0.3, 0.05, 0.7]} color="#5b4630" />
    </> : <>
      {[-1, 1].flatMap(sd => [-0.45, 0.45].map(z => <Box key={sd + '' + z} p={[sd * (f.len / 2 - 0.05), 1.3, z]} s={[0.1, 2.6, 0.1]} color="#2f5f9e" metal={0.5} />))}
      {[0.1, 1.55].map(y => <Box key={y} p={[0, y, 0]} s={[f.len, 0.07, 1.0]} color="#d9962f" metal={0.4} />)}
    </>}
  </group>)}</>;
}

function Placed({ site, children }) { return <group position={[site.x, site.y, site.z]} rotation={[0, site.rot, 0]}>{children}</group>; }

/** boulders + cacti scattered over the open desert (the same positions the car and the walker collide with) */
function Scenery() {
  const rocks = useRef(), cacti = useRef(), arms = useRef();
  const armList = useMemo(() => CACTI.filter(c => c.arms), []);
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color();
    BOULDERS.forEach((b, i) => { o.position.set(b.x, height(b.x, b.z) + b.s * 0.38, b.z); o.scale.set(b.s * 1.2, b.s * (0.7 + b.k * 0.35), b.s * (0.9 + b.k * 0.3)); o.rotation.set(b.k * 0.4, b.ry, b.k * 0.3); o.updateMatrix(); rocks.current.setMatrixAt(i, o.matrix); rocks.current.setColorAt(i, c.setHSL(0.08 + b.k * 0.03, 0.18 + b.k * 0.12, 0.34 + b.k * 0.22)); });
    rocks.current.instanceMatrix.needsUpdate = true; rocks.current.instanceColor.needsUpdate = true;
    CACTI.forEach((p, i) => { o.position.set(p.x, height(p.x, p.z) + p.s, p.z); o.scale.set(0.34 * p.s, p.s * 2, 0.34 * p.s); o.rotation.set(0, p.ry, 0); o.updateMatrix(); cacti.current.setMatrixAt(i, o.matrix); });
    armList.forEach((p, i) => { o.position.set(p.x + Math.cos(p.ry) * 0.5 * p.s, height(p.x, p.z) + p.s * 1.5, p.z + Math.sin(p.ry) * 0.5 * p.s); o.scale.set(0.2 * p.s, p.s * 0.8, 0.2 * p.s); o.rotation.set(0, p.ry, Math.PI / 2 * 0.0); o.updateMatrix(); arms.current.setMatrixAt(i, o.matrix); });
    cacti.current.instanceMatrix.needsUpdate = arms.current.instanceMatrix.needsUpdate = true;
  }, [armList]);
  return <>
    <instancedMesh ref={rocks} args={[null, null, BOULDERS.length]} castShadow receiveShadow><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={cacti} args={[null, null, CACTI.length]} castShadow><cylinderGeometry args={[0.6, 0.8, 1, 10]} /><meshStandardMaterial color="#5a7a45" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={arms} args={[null, null, armList.length]} castShadow><cylinderGeometry args={[0.6, 0.7, 1, 8]} /><meshStandardMaterial color="#5a7a45" roughness={0.9} /></instancedMesh>
  </>;
}

/** big banded mesas far beyond the drivable map */
export function Mesas({ d0 = 470, dr = 120, sc = 1, n = 16 }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.55, 1, 1, 9, 8, false); const pos = g.attributes.position, col = [], c = new THREE.Color();
    const bands = ['#a5683f', '#b9825a', '#8e5333', '#c79568', '#9c6040'];
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.5, band = Math.floor(y * 9) % bands.length; c.set(bands[(band + (y > 0.98 ? 1 : 0)) % bands.length]); col.push(c.r, c.g, c.b); const a = Math.atan2(pos.getZ(i), pos.getX(i)); pos.setX(i, pos.getX(i) * (1 + 0.12 * Math.sin(a * 3 + y * 5))); pos.setZ(i, pos.getZ(i) * (1 + 0.12 * Math.cos(a * 2 + y * 4))); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  const list = useMemo(() => { const r = rnd(41); return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + r() * 0.3, d = d0 + r() * dr; return [Math.cos(a) * d, Math.sin(a) * d, (70 + r() * 90) * sc, (40 + r() * 70) * sc]; }); }, [d0, dr, sc, n]);
  return <>{list.map(([x, z, w, h], i) => <mesh key={i} geometry={geo} position={[x, h / 2 - 10, z]} scale={[w, h, w * 0.8]} rotation={[0, i, 0]}><meshStandardMaterial vertexColors roughness={1} flatShading /></mesh>)}</>;
}

export default function Sites() {
  return <>
    <Placed site={SITES.lot}><LotSite /></Placed>
    <Placed site={SITES.garage}><Garage /></Placed>
    <Placed site={SITES.barn}><Barn /></Placed>
    <Placed site={SITES.gas}><GasStation /></Placed>
    <Placed site={SITES.warehouse}><Warehouse /></Placed>
    <Placed site={SITES.shack1}><Shack /></Placed>
    <Placed site={SITES.shack2}><Shack /></Placed>
    <Placed site={SITES.shack3}><Shack /></Placed>
    <Furniture />
    <Scenery />
  </>;
}
