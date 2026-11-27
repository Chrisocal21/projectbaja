import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, useGame } from './store.js';
import { sizeOf, nameOfItem, held, toolInHand, dropPoint } from './items.js';
import ToolModel from './ToolModel.jsx';
import { stackCargo } from './cargoStack.js';
import DustyGoods from '../worlds/DustyGoods.jsx';
import SmallModel from './SmallModel.jsx';
import { smallItemFile } from './smallItemFiles.js';
import { UPGRADE_FIT } from '../rules/vehicles.js';
import { containers } from './loot.js';
import { height, groundHeight } from '../worlds/county.js';
/** items with a height (on a bench / shelf) are placed from the site's pad; floor items stand on the floor (garage slab, lot paving...) */
const itemY = it => ((it.y || 0) > 0.3 ? height(it.x, it.z) + it.y : groundHeight(it.x, it.z) + (it.y || 0));
import { ShellProp, sourceNameFor, WHEEL_MESH } from '../BuildModel.jsx';
import { bodyById } from '../build.js';
import { meshOnly } from '../meshMatch.js';
import { BUG, CAJON } from '../rules/vehicles.js';
import CajonItem from '../cajon/CajonItem.jsx';
import ProcEngine from '../Engine.jsx';
import { useGLTF } from '@react-three/drei';
import { partById, partFile, wheelById, rimById } from '../build.js';
import { rimGeometry, rimLook, RUBBER } from '../Rims.jsx';
import { carFitReady, carFitPlan } from './carSnap.js';
import { FEEL, restOf, carryScale, HOLD } from './restPose.js';   // fit feel pass (?feel=0 turns it off)

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
  const obj = useMemo(() => clone(scene, o => { o.material.metalness = 0; if (!o.material.map) { o.material.color.set(RUBBER); o.material.roughness = 0.95; } }), [scene]);
  return <group position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}><primitive object={obj} />{rim && <mesh geometry={rimGeometry(rim.style)}><meshStandardMaterial color={rim.defaultColor} {...rimLook(rim)} side={THREE.DoubleSide} /></mesh>}</group>;
}
function RimItem({ rim }) {
  return <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={rimGeometry(rim.style)} castShadow><meshStandardMaterial color={rim.defaultColor} {...rimLook(rim)} side={THREE.DoubleSide} /></mesh>;
}
/** a stock body piece (hood, door, seat, wheel...) cut out of the car's own model, lying on y = 0 */
function StockPiece({ match, rest = [0, 0] }) {
  const file = (bodyById[game.build?.body] || bodyById.classic).file, { scene } = useGLTF(`/models/${file}.glb`);
  const { obj, off } = useMemo(() => {
    const c = clone(scene), drop = [];
    c.traverse(o => { if (o.isMesh && !meshOnly(o, sourceNameFor(o), match)) drop.push(o); });
    drop.forEach(o => o.parent.remove(o));
    const tilt = new THREE.Group(); tilt.rotation.set(rest[0], 0, rest[1]); tilt.add(c); tilt.updateMatrixWorld(true);   // lie the way it would be left on the floor
    const box = new THREE.Box3().setFromObject(tilt), ctr = box.getCenter(new THREE.Vector3());
    return { obj: tilt, off: [-ctr.x, -box.min.y, -ctr.z] };
  }, [scene, file, match.join('|'), rest.join(',')]);
  return <group position={off}><primitive object={obj} /></group>;
}
function StockItem({ id }) {
  if (id === 'engine') return <group position={[0, -0.2, 1.57]}><ProcEngine stockExhaust={false} /></group>;
  const slot = BUG.slots.find(s => s.id === id), body = bodyById[game.build?.body] || bodyById.classic;
  const match = id === 'wheel' ? [WHEEL_MESH.FL] : slot?.wheel ? [WHEEL_MESH[slot.wheel]] : (body.pieces || []).find(p => p.id === slot?.piece)?.match;
  if (!match) return null;
  return id === 'wheel' || slot?.wheel ? <group rotation={[0, 0, Math.PI / 2]} position={[0.31, 0.11, 0]}><StockPiece match={match} /></group> : <StockPiece match={match} rest={FEEL ? restOf(slot?.piece) : undefined} />;
}

/** the real item: parts, tires and rims show their own models; everything else is a labelled crate. Bottom sits at y = 0. */
export function Crate({ item, scale = 1 }) {
  const file = smallItemFile(item);
  if (file) return <group scale={scale}><SmallModel file={file} id={item.id} count={item.n} /></group>;
  if (item.kind === 'memento' && item.id === 'photo') return <group scale={scale}><PhotoSheet item={item} /></group>;   // a printed photo (PROPOSAL): the picture you posted, on paper
  if (item.kind === 'memento') return <group scale={scale}><mesh position={[0, item.wall ? 0 : 0.012, 0]} rotation={item.wall ? [0, 0, 0.04] : [-Math.PI / 2, 0, 0.2]} castShadow><planeGeometry args={[0.24, 0.32]} /><meshStandardMaterial color="#efe6cf" roughness={0.9} side={THREE.DoubleSide} /></mesh></group>;   // a sheet of paper, not a crate
  const crate = <CrateBox item={item} />;
  let body = null;
  if (item.kind === 'part' && partById[item.id]) {
    const part = partById[item.id];
    const asset = partFile(part, game.build?.body) || Object.values(part.bodies || {})[0];
    if (asset) body = <PartModel file={asset === 'proc' ? 'KIT_' + part.id : asset} size={sizeOf(item.kind, item.id)} />;
  }
  else if (item.kind === 'wheel' && wheelById[item.id]?.file) body = <TireItem file={wheelById[item.id].file} />;
  else if (item.kind === 'rim' && rimById[item.id]) body = <RimItem rim={rimById[item.id]} />;
  else if (item.kind === 'tire') body = wheelById[item.id]?.file ? <TireItem file={wheelById[item.id].file} /> : <SmallModel file="PROP_WornTire" />;
  else if (item.kind === 'stock' && (item.from === 'cajon' ? item.id === 'wheel' : CAJON.slots.some(s => s.id === item.id && !s.wheel))) body = <CajonItem id={item.id} />;   // an El Cajon part (or a wheel taken off one) shows its own model
  else if (item.kind === 'stock' && (item.id === 'engine' || item.id === 'battery' || item.id === 'wheel' || BUG.slots.some(s => s.id === item.id && (s.piece || s.wheel)))) body = <StockItem id={item.id} />;
  return <group scale={scale}>{body ? <React.Suspense fallback={crate}>{body}</React.Suspense> : crate}</group>;
}

/** every searchable container in the world; the ones far from you (roadside stops are kilometres apart) are not drawn */
function Containers() {
  useGame();
  const refs = useRef([]), { camera } = useThree(), tick = useRef(0);
  useFrame(() => {
    if (tick.current++ % 15) return;
    for (let i = 0; i < containers.length; i++) { const g = refs.current[i]; if (g) g.visible = Math.hypot(containers[i].x - camera.position.x, containers[i].z - camera.position.z) < 260; }
  });
  return containers.map((c, i) => <group key={c.id} ref={el => { refs.current[i] = el; }} position={[c.x, c.y, c.z]} rotation={[0, c.wry, 0]}><Container type={c.type} open={!!game.boxes[c.id]?.searched} /></group>);
}

/** the wrench or the jack, whichever the work needs (both are cheap, so the right one is just switched on) */
function ToolSwitch({ idRef }) {
  const [id, setId] = React.useState('wrench'); const ref = React.useRef();
  useFrame(() => { const want = ref.current?.parent?.userData.id; if (want && want !== id) setId(want); });
  return <group ref={ref}><ToolModel id={id} /></group>;
}

/** boxes lying around the world, plus the box in the player's hands */
export default function Items() {
  useGame();
  const heldRef = useRef(), markRef = useRef(), toolRef = useRef(), toolId = useRef('wrench'), { camera } = useThree();
  const loose = game.items.filter(i => i.loc === 'world' && i.kind !== 'mat'), hand = held();
  useFrame(() => {
    // the tool in your hand: the one you carry out, or the one this part needs while it snaps onto the car; it turns while the hold bar fills
    { const t = toolRef.current; if (t) {
      const tool = toolInHand(), fit = carFitPlan(), kind = fit?.it.kind, need = fit ? (kind === 'wheel' || kind === 'rim' ? 'jack' : (kind === 'part' && UPGRADE_FIT[partById[fit.it.id]?.slot]?.tool) || 'wrench') : game.holdBar ? 'wrench' : null;   // the tool this part needs; any hold-click work shows at least the wrench
      const id = tool?.id || need; t.visible = game.onFoot && !!id && !game.buildMode;
      if (t.visible) {
        if (toolId.current !== id) { toolId.current = id; t.userData.id = id; }
        const working = !!game.holdBar, now = performance.now() / 1000;
        const turn = working ? Math.sin(now * 11) * 0.3 : Math.sin(now * 1.4) * 0.025;
        const offset = id === 'jack' ? new THREE.Vector3(0.4, -0.31, -0.72) : new THREE.Vector3(0.34, -0.27, -0.72);
        if (working) offset.z -= 0.13;
        t.position.copy(camera.position).add(offset.applyQuaternion(camera.quaternion));
        t.quaternion.copy(camera.quaternion); t.rotateX(-0.18); t.rotateY(-0.12); t.rotateZ(-0.33 + turn);
        t.scale.setScalar(id === 'jack' ? 1.25 : 1.75);
      } } }
    // the ground marker: where what you hold will land when you put it down (like a build ghost), sized to its footprint
    { const m = markRef.current, h = held(); if (m) { m.visible = game.onFoot && !!h && h.kind !== 'tool' && !game.buildMode && !carFitReady();
      if (m.visible) { const d = dropPoint(), dm = DIM[sizeOf(h.kind, h.id)] || DIM[2]; m.position.set(d.x, groundHeight(d.x, d.z) + 0.04, d.z); m.rotation.set(0, d.ry, 0); m.scale.set(dm[0], 1, dm[2]); } } }
    const g = heldRef.current; if (!g) return;
    g.visible = game.onFoot && !!held() && held().kind !== 'tool' && !carFitReady();   // when it fits the car, it "snaps": the part leaves your hands and its glowing spot on the car is the preview
    if (!g.visible) return;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    if (!FEEL) { g.position.copy(camera.position).addScaledVector(fwd, 0.85).addScaledVector(right, 0.22); g.position.y -= 0.5; g.rotation.set(0, camera.rotation.y, 0); return; }
    // carry pose: shrunk to fit your arms, low and to the right, tipped toward you (sized once the model has loaded)
    g.scale.setScalar(1); g.updateMatrixWorld(true);   // measure at natural size every frame: the part may still be loading (crate stand-in), and one box is cheap
    const sz = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); g.scale.setScalar(carryScale(Math.max(sz.x, sz.y, sz.z)));
    const flat = new THREE.Vector3(fwd.x, 0, fwd.z).normalize(), side = new THREE.Vector3(flat.z * -1, 0, flat.x);   // forward and right on the ground
    g.position.copy(camera.position).addScaledVector(flat, HOLD.forward).addScaledVector(side, HOLD.right); g.position.y -= HOLD.down;
    g.rotation.order = 'YXZ'; g.rotation.set(HOLD.tilt, camera.rotation.y + HOLD.turn, 0);
  });
  return <>
    {loose.filter(it => it.kind === 'shell').map(it => <group key={it.uid} position={[it.x, groundHeight(it.x, it.z) + 0.02, it.z]} rotation={[0, it.ry || 0, 0]}><React.Suspense fallback={null}><ShellProp bodyId={it.id} /></React.Suspense></group>)}
    {loose.filter(it => it.kind !== 'shell').map(it => <group key={it.uid} position={[it.x, itemY(it), it.z]} rotation={[0, it.ry ?? it.uid * 1.7, 0]}><Crate item={it} /></group>)}
    <Containers />
    <DustyGoods Item={Crate} />
    <MatFinds />
    <group ref={heldRef} visible={false}>{hand && hand.kind !== 'tool' && <Crate item={hand} scale={FEEL ? 1 : 0.75} />}</group>
    <group ref={markRef} visible={false}><mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#f2a33a" transparent opacity={0.28} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh><lineSegments rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}><edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} /><lineBasicMaterial color="#ffd28e" /></lineSegments></group>
    <group ref={toolRef} visible={false}><ToolSwitch idRef={toolId} /></group>
  </>;
}

const CAB = [[-0.3, 0.62, -0.6], [0.3, 0.62, -0.6], [0, 0.95, -0.6], [0, 0.62, -1.15], [-0.3, 0.62, -1.15], [0.3, 0.62, -1.15]];   // the last three: the back seat
const TRUCK_CAB = [[0.35, 1.05, 0.55], [-0.35, 1.05, 0.55], [0, 1.35, 0.55], [0.35, 1.35, 0.55]];   // (model turned 180 deg: nose is +z)
const PICKUP_LOAD = { cab: TRUCK_CAB, bedY: 0.98, bedZ: 1.35 };
/** the El Cajon (measured from the model, bed floor y 0.60 from the cab wall z -0.75 back to the tailgate z -2.45; the bench seat top is ~0.95): crates on the passenger half of the seat, then the bed */
const CAJON_LOAD = { cab: [[-0.4, 1.05, -0.1], [0, 1.05, -0.1], [-0.4, 1.35, -0.1], [0, 1.35, -0.1]], bedY: 0.6, bedZ: 0.8 };
/** how far a row of cargo runs before the next one starts on top (m) */
const BED_RUN = 1.7, ROOF_RUN = 1.5;
/** what a vehicle is carrying: the Bug's cab and roof rack, a truck's cab and bed. Rendered inside the vehicle so it moves with it. */
export function Cargo({ veh }) {
  useGame();
  const v = veh || game.active, mine = game.items.filter(i => i.loc === 'car' && i.spot !== 'grid' && (i.veh || 'bug') === v);   // (spot 'grid' = placed on a cargo surface: drawn by placement/VehicleCargo.jsx)
  if (v !== 'bug') {   // truck: crates stand in two rows on the bed floor, stacking when the floor is full. A cab shows only what fits on the seat
    const L = v === 'cajon' ? CAJON_LOAD : PICKUP_LOAD;   // where this truck's cab seat and bed floor are
    const cab = mine.filter(i => i.spot === 'cab').slice(0, L.cab.length), bed = stackCargo(mine.filter(i => i.spot !== 'cab').map(it => ({ it, d: DIM[sizeOf(it.kind, it.id)][2] })), BED_RUN, 0.06).filter(p => p.layer < 3);
    return <>{cab.map((it, i) => <group key={it.uid} position={L.cab[i]}><Crate item={it} scale={0.7} /></group>)}
      {bed.map(({ it, side, along, layer }) => <group key={it.uid} position={[side ? 0.42 : -0.42, L.bedY + layer * 0.34, -(L.bedZ + along)]}><Crate item={it} /></group>)}</>;
  }
  const cab = mine.filter(i => i.spot === 'cab').slice(0, CAB.length), roof = stackCargo(mine.filter(i => i.spot === 'roof').map(it => ({ it, d: DIM[sizeOf(it.kind, it.id)][2] * 0.7 })), ROOF_RUN, 0.05).filter(p => p.layer < 2);   // the rest is stored, just not drawn
  return <>
    {cab.map((it, i) => <group key={it.uid} position={CAB[i]}><Crate item={it} scale={0.8} /></group>)}
    {roof.map(({ it, side, along, layer }) => <group key={it.uid} position={[side ? 0.27 : -0.27, 1.66 + layer * 0.24, along - 0.7]}><Crate item={it} scale={0.7} /></group>)}
  </>;
}

const containerModels = { toolbox: 'PROP_Toolbox', drawer: 'PROP_Drawers', box: 'PROP_Carton', crate: 'JUNK_Crate' };
function Container({ type, open }) {
  const file = containerModels[type];
  if (!file) return null;
  return <group scale={type === 'crate' ? [1.55, 1.78, 1.55] : 1}><SmallModel file={file} open={open} /></group>;
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

/** bundles of wood and scrap lying out in the world (game/matFinds.js): only drawn near the camera */
function MatFinds() {
  useGame();
  const list = game.items.filter(i => i.loc === 'world' && i.kind === 'mat'), refs = useRef([]), { camera } = useThree();
  useFrame(() => { for (let i = 0; i < list.length; i++) { const g = refs.current[i]; if (g) g.visible = Math.hypot(list[i].x - camera.position.x, list[i].z - camera.position.z) < 200; } });
  return list.map((it, i) => <group key={it.uid} ref={g => (refs.current[i] = g)} position={[it.x, itemY(it), it.z]} rotation={[0, it.ry || 0, 0]}><Crate item={it} /></group>);
}
