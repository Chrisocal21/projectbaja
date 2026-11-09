import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from './store.js';
import { sizeOf, nameOfItem, held } from './items.js';
import { containers } from './loot.js';
import { height, groundHeight } from '../worlds/county.js';
/** items with a height (on a bench / shelf) are placed from the site's pad; floor items stand on the floor (garage slab, lot paving...) */
const itemY = it => ((it.y || 0) > 0.3 ? height(it.x, it.z) + it.y : groundHeight(it.x, it.z) + (it.y || 0));
import { ShellProp, sourceNameFor, WHEEL_MESH } from '../BuildModel.jsx';
import { bodyById } from '../build.js';
import { BUG } from '../rules/vehicles.js';
import ProcEngine from '../Engine.jsx';
import { useGLTF } from '@react-three/drei';
import { partById, wheelById, rimById } from '../build.js';
import { rimGeometry } from '../Rims.jsx';

const DIM = { 1: [0.34, 0.3, 0.4], 2: [0.5, 0.4, 0.62], 3: [0.72, 0.5, 0.86], 4: [0.9, 0.62, 1.05] };
const labels = new Map();
function labelTex(text) {
  if (labels.has(text)) return labels.get(text);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#e9dcb8'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#a33a2e'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#2a1d10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 30px system-ui,sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).length > 14 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  lines.push(cur); lines.slice(0, 3).forEach((l, i, a) => g.fillText(l, 128, 64 + (i - (a.length - 1) / 2) * 34));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; labels.set(text, t); return t;
}
const kraft = ['#b58b55', '#a9854f', '#c29a62', '#9c7a48'];

/** a cardboard crate stencilled with the part's name; its bottom sits at y = 0 */
function CrateBox({ item, scale = 1 }) {
  const s = sizeOf(item.kind, item.id), [w, h, d] = DIM[s], tex = useMemo(() => labelTex(nameOfItem(item)), [item.id, item.kind]);
  return <group scale={scale}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={kraft[item.uid % 4]} roughness={0.9} /></mesh>
    <mesh position={[0, h / 2, 0]}><boxGeometry args={[w + 0.01, 0.06, d + 0.01]} /><meshStandardMaterial color="#8a6a3c" roughness={0.9} /></mesh>
    <mesh position={[0, h / 2 + 0.02, d / 2 + 0.006]}><planeGeometry args={[w * 0.8, h * 0.62]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
    <mesh position={[0, h + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.7, d * 0.5]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
  </group>;
}

const clone = (scene, fix) => { const c = scene.clone(true); c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); fix?.(o); } }); return c; };
/** a part's own GLB, shrunk to fit its carry size if needed, standing on y = 0 */
function PartModel({ file, size }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const { obj, k, off } = useMemo(() => {
    const c = clone(scene), box = new THREE.Box3().setFromObject(c), sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const k = Math.min(1, Math.max(...DIM[size]) * 1.1 / Math.max(sz.x, sz.y, sz.z));
    return { obj: c, k, off: [-ctr.x * k, -box.min.y * k, -ctr.z * k] };
  }, [scene, size]);
  return <group position={off} scale={k}><primitive object={obj} /></group>;
}
/** a tire (optionally with the rim fitted) lying flat */
function TireItem({ file, rim }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const obj = useMemo(() => clone(scene, o => { o.material.metalness = 0; }), [scene]);
  return <group position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}><primitive object={obj} />{rim && <mesh geometry={rimGeometry(rim.style)}><meshStandardMaterial color={rim.defaultColor} metalness={0.45} roughness={0.6} side={THREE.DoubleSide} /></mesh>}</group>;
}
function RimItem({ rim }) {
  return <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={rimGeometry(rim.style)} castShadow><meshStandardMaterial color={rim.defaultColor} metalness={0.45} roughness={0.55} side={THREE.DoubleSide} /></mesh>;
}
/** a stock body piece (hood, door, seat, wheel...) cut out of the car's own model, lying on y = 0 */
function StockPiece({ match }) {
  const file = (bodyById[game.build?.body] || bodyById.classic).file, { scene } = useGLTF(`/models/${file}.glb`);
  const { obj, off } = useMemo(() => {
    const c = clone(scene), drop = [];
    c.traverse(o => { if (o.isMesh && !match.some(m => sourceNameFor(o).startsWith(m))) drop.push(o); });
    drop.forEach(o => o.parent.remove(o));
    const box = new THREE.Box3().setFromObject(c), ctr = box.getCenter(new THREE.Vector3());
    return { obj: c, off: [-ctr.x, -box.min.y, -ctr.z] };
  }, [scene, file, match.join('|')]);
  return <group position={off}><primitive object={obj} /></group>;
}
function Battery() {
  return <group>
    <mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.3, 0.22, 0.18]} /><meshStandardMaterial color="#1e1f22" roughness={0.6} /></mesh>
    <mesh position={[0, 0.225, 0]}><boxGeometry args={[0.3, 0.01, 0.18]} /><meshStandardMaterial color="#c9a227" roughness={0.5} /></mesh>
    {[[-0.1, '#c8372b'], [0.1, '#222']].map(([x, c]) => <mesh key={x} position={[x, 0.245, 0]}><cylinderGeometry args={[0.018, 0.018, 0.03, 10]} /><meshStandardMaterial color={c} metalness={0.5} /></mesh>)}
  </group>;
}
function StockItem({ id }) {
  if (id === 'engine') return <group position={[0, -0.2, 1.57]}><ProcEngine stockExhaust={false} /></group>;
  if (id === 'battery') return <Battery />;
  const slot = BUG.slots.find(s => s.id === id), body = bodyById[game.build?.body] || bodyById.classic;
  const match = id === 'wheel' ? [WHEEL_MESH.FL] : slot?.wheel ? [WHEEL_MESH[slot.wheel]] : (body.pieces || []).find(p => p.id === slot?.piece)?.match;
  if (!match) return null;
  return id === 'wheel' || slot?.wheel ? <group rotation={[0, 0, Math.PI / 2]} position={[0.31, 0.11, 0]}><StockPiece match={match} /></group> : <StockPiece match={match} />;
}

/** the real item: parts, tires and rims show their own models; everything else is a labelled crate. Bottom sits at y = 0. */
export function Crate({ item, scale = 1 }) {
  if (item.kind === 'junk') return <group scale={scale}>{item.id === 'engineblock' ? <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.55, 0.4, 0.42]} /><meshStandardMaterial color="#4d4a46" metalness={0.6} roughness={0.6} /></mesh> : item.id === 'crate' ? <mesh position={[0, 0.24, 0]} castShadow><boxGeometry args={[0.6, 0.48, 0.6]} /><meshStandardMaterial color="#8a6a44" roughness={0.9} /></mesh> : item.id === 'drum' ? <mesh position={[0, 0.44, 0]} castShadow><cylinderGeometry args={[0.29, 0.29, 0.88, 20]} /><meshStandardMaterial color={item.uid % 2 ? '#3d5a6e' : '#5a6b3a'} metalness={0.4} roughness={0.6} /></mesh> : <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.17, 0.4, 0.34]} /><meshStandardMaterial color="#a9281e" metalness={0.3} roughness={0.5} /></mesh>}</group>;
  if (item.kind === 'memento' && item.id === 'photo') return <group scale={scale}><PhotoSheet item={item} /></group>;   // a printed photo (PROPOSAL): the picture you posted, on paper
  if (item.kind === 'memento') return <group scale={scale}><mesh position={[0, item.wall ? 0 : 0.012, 0]} rotation={item.wall ? [0, 0, 0.04] : [-Math.PI / 2, 0, 0.2]} castShadow><planeGeometry args={[0.24, 0.32]} /><meshStandardMaterial color="#efe6cf" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;   // a sheet of paper, not a crate
  const crate = <CrateBox item={item} />;
  let body = null;
  if (item.kind === 'part' && partById[item.id]?.file) body = <PartModel file={partById[item.id].file} size={sizeOf(item.kind, item.id)} />;
  else if (item.kind === 'wheel' && wheelById[item.id]?.file) body = <TireItem file={wheelById[item.id].file} />;
  else if (item.kind === 'rim' && rimById[item.id]) body = <RimItem rim={rimById[item.id]} />;
  else if (item.kind === 'stock' && (item.id === 'engine' || item.id === 'battery' || item.id === 'wheel' || BUG.slots.some(s => s.id === item.id && (s.piece || s.wheel)))) body = <StockItem id={item.id} />;
  return <group scale={scale}>{body ? <React.Suspense fallback={crate}>{body}</React.Suspense> : crate}</group>;
}

/** boxes lying around the world, plus the box in the player's hands */
export default function Items() {
  useGame();
  const heldRef = useRef(), { camera } = useThree();
  const loose = game.items.filter(i => i.loc === 'world'), hand = held();
  useFrame(() => {
    const g = heldRef.current; if (!g) return;
    g.visible = game.onFoot && !!held();
    if (!g.visible) return;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    g.position.copy(camera.position).addScaledVector(fwd, 0.85).addScaledVector(right, 0.22); g.position.y -= 0.5;
    g.rotation.set(0, camera.rotation.y, 0);
  });
  return <>
    {loose.filter(it => it.kind === 'shell').map(it => <group key={it.uid} position={[it.x, groundHeight(it.x, it.z) + 0.02, it.z]} rotation={[0, it.ry || 0, 0]}><React.Suspense fallback={null}><ShellProp bodyId={it.id} /></React.Suspense></group>)}
    {loose.filter(it => it.kind !== 'shell').map(it => <group key={it.uid} position={[it.x, itemY(it), it.z]} rotation={[0, it.ry ?? it.uid * 1.7, 0]}><Crate item={it} /></group>)}
    {containers.map(c => <group key={c.id} position={[c.x, c.y, c.z]} rotation={[0, c.wry, 0]}><Container type={c.type} open={!!game.boxes[c.id]?.searched} /></group>)}
    <group ref={heldRef} visible={false}>{hand && <Crate item={hand} scale={0.75} />}</group>
  </>;
}

const CAB = [[-0.3, 0.62, -0.6], [0.3, 0.62, -0.6], [0, 0.95, -0.6], [0, 0.62, -1.15]];
const TRUCK_CAB = [[0.35, 1.05, 0.55], [-0.35, 1.05, 0.55], [0, 1.35, 0.55]];   // (model turned 180 deg: nose is +z)
/** what a vehicle is carrying: the Bug's cab and roof rack, a truck's cab and bed. Rendered inside the vehicle so it moves with it. */
export function Cargo({ veh }) {
  useGame();
  const v = veh || game.active, mine = game.items.filter(i => i.loc === 'car' && i.spot !== 'grid' && (i.veh || 'bug') === v);   // (spot 'grid' = placed on a cargo surface: drawn by placement/VehicleCargo.jsx)
  if (v !== 'bug') {   // truck: crates stand in two rows on the bed floor
    let row = [0, 0];
    return <>{mine.map((it, i) => { const [w, , d] = DIM[sizeOf(it.kind, it.id)]; if (it.spot === 'cab') return <group key={it.uid} position={TRUCK_CAB[i % 3]}><Crate item={it} scale={0.7} /></group>;
      const side = row[0] <= row[1] ? 0 : 1, z = -(1.35 + row[side] + d / 2); row[side] += d + 0.06; return <group key={it.uid} position={[side ? 0.42 : -0.42, 0.98, z]}><Crate item={it} /></group>; })}</>;
  }
  const cab = mine.filter(i => i.spot === 'cab'), roof = mine.filter(i => i.spot === 'roof');
  let z = -0.5;
  return <>
    {cab.map((it, i) => <group key={it.uid} position={CAB[i % 4]}><Crate item={it} scale={0.8} /></group>)}
    {roof.map(it => { const d = DIM[sizeOf(it.kind, it.id)][2] * 0.85, p = z + d / 2; z += d + 0.05; return <group key={it.uid} position={[0, 1.66, p]}><Crate item={it} scale={0.85} /></group>; })}
  </>;
}

const M = ({ c, r = 0.6, m = 0 }) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
/** toolbox / tool chest / cardboard box / wooden crate; `open` once it has been searched */
function Container({ type, open }) {
  if (type === 'car') return null;   // grandpa's race car draws itself (worlds/Home.jsx)
  if (type === 'toolbox') return <group>
    <mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.56, 0.22, 0.26]} /><M c="#b3261e" r={0.45} m={0.5} /></mesh>
    <group position={[0, 0.22, -0.13]} rotation={[open ? -1.9 : 0, 0, 0]}><mesh position={[0, 0.03, 0.13]} castShadow><boxGeometry args={[0.57, 0.06, 0.27]} /><M c="#c22d24" r={0.45} m={0.5} /></mesh></group>
    {!open && <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.24, 0.03, 0.03]} /><M c="#222" m={0.6} /></mesh>}
  </group>;
  if (type === 'drawer') return <group>
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow><boxGeometry args={[0.72, 1, 0.5]} /><M c="#a32a22" r={0.5} m={0.45} /></mesh>
    {[0.2, 0.42, 0.64, 0.86].map((y, i) => <mesh key={y} position={[0, y, 0.255 + (open && i === 3 ? 0.3 : 0)]}><boxGeometry args={[0.66, 0.18, open && i === 3 ? 0.5 : 0.02]} /><M c="#8c221b" r={0.5} m={0.45} /></mesh>)}
    {[0.2, 0.42, 0.64, 0.86].map((y, i) => <mesh key={'h' + y} position={[0, y, 0.275 + (open && i === 3 ? 0.55 : 0)]}><boxGeometry args={[0.3, 0.025, 0.025]} /><M c="#ccc" m={0.8} r={0.3} /></mesh>)}
  </group>;
  if (type === 'box') return <group>
    <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[0.55, 0.4, 0.5]} /><M c="#b08a58" r={0.95} /></mesh>
    {[-1, 1].map(sd => <mesh key={sd} position={[sd * 0.14, 0.4, 0]} rotation={[0, 0, open ? sd * 2.2 : 0]}><boxGeometry args={[0.27, 0.01, 0.5]} /><M c="#a47f50" r={0.95} /></mesh>)}
  </group>;
  return <group>
    <mesh position={[0, 0.43, 0]} castShadow receiveShadow><boxGeometry args={[0.92, 0.86, 0.92]} /><M c="#8a6a42" r={0.95} /></mesh>
    {[0.1, 0.43, 0.76].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.95, 0.09, 0.95]} /><M c="#6e5233" r={0.95} /></mesh>)}
    <mesh position={open ? [0.62, 0.45, 0] : [0, 0.89, 0]} rotation={open ? [0, 0, 1.35] : [0, 0, 0]} castShadow><boxGeometry args={[0.96, 0.06, 0.96]} /><M c="#7a5c38" r={0.95} /></mesh>
  </group>;
}

function PhotoSheet({ item }) {
  const src = (game.home?.photos || []).find(p => p.id === item.pid)?.img;
  const tex = useMemo(() => { if (!src) return null; const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; return t; }, [src]);
  const rot = item.wall ? [0, 0, 0.02] : [-Math.PI / 2, 0, 0.3], y = item.wall ? 0 : 0.012;
  return <group position={[0, y, 0]} rotation={rot}>
    <mesh castShadow><planeGeometry args={[0.34, 0.26]} /><meshStandardMaterial color="#f4f0e6" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0, 0.003]}><planeGeometry args={[0.3, 0.2]} />{tex ? <meshBasicMaterial map={tex} side={THREE.DoubleSide} /> : <meshStandardMaterial color="#777" />}</mesh>
  </group>;
}
