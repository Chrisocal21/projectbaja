import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SITES, height } from './county.js';
import { game, useGame, emit } from '../game/store.js';
import { junkWorld, isCleared, buildById, placeWhy } from '../game/home.js';

/** Grandpa's place around the garage: his trailer, the water tank and windmill, the junk you clear, and everything you build. */
const G = SITES.garage;
const M = ({ c, r = 0.85, m = 0, e, ei = 0, t, o = 1 }) => <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e} emissiveIntensity={ei} transparent={t} opacity={o} />;
const B = ({ p, s, c, r, m, rot, cast = true }) => <mesh position={p} rotation={rot} castShadow={cast} receiveShadow><boxGeometry args={s} /><M c={c} r={r} m={m} /></mesh>;
const Cyl = ({ p, a, c, r, m, rot }) => <mesh position={p} rotation={rot} castShadow receiveShadow><cylinderGeometry args={a} /><M c={c} r={r} m={m} /></mesh>;
const Tire = ({ p, rot = [Math.PI / 2, 0, 0] }) => <mesh position={p} rotation={rot} castShadow><torusGeometry args={[0.32, 0.14, 8, 16]} /><M c="#151515" r={0.95} /></mesh>;

function Trailer() {   // a faded 1960s single-wide on blocks, local x = -22.5
  return <group position={[-22.5, 0, 1]}>
    <B p={[0, 1.75, 0]} s={[3.4, 2.5, 11]} c="#d8d0b8" r={0.7} m={0.2} />
    <B p={[0, 1.45, 0]} s={[3.42, 0.5, 11.02]} c="#5f8f86" r={0.7} m={0.2} />
    <B p={[0, 3.05, 0]} s={[3.6, 0.15, 11.3]} c="#8a8d88" r={0.6} m={0.4} />
    {[-3.5, 0, 3.5].map(z => <B key={z} p={[1.72, 2.1, z]} s={[0.04, 0.8, 1.2]} c="#1b2629" r={0.2} cast={false} />)}
    <B p={[1.72, 1.6, -1.8]} s={[0.05, 1.9, 0.9]} c="#7a5c38" />
    {[[2.3, 0.2, -1.8], [2.3, 0.45, -1.8]].map((p, i) => <B key={i} p={p} s={[1, 0.25, 1.2 - i * 0.3]} c="#8f8a80" r={1} />)}
    {[-4.5, -1.5, 1.5, 4.5].map(z => [-1.2, 1.2].map(x => <B key={x + '' + z} p={[x, 0.25, z]} s={[0.4, 0.5, 0.4]} c="#8f8a80" r={1} />))}
    <B p={[3.4, 2.2, -1.8]} s={[2.4, 0.06, 2.4]} c="#a33a2e" rot={[0, 0, -0.15]} />
  </group>;
}
function Windmill() {
  const blades = useRef();
  useFrame((_, dt) => { if (blades.current) blades.current.rotation.z += dt * 1.6; });
  return <group position={[18, 0, 14]}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} p={[x * 0.6, 4.5, z * 0.6]} a={[0.05, 0.05, 9.1, 5]} c="#7c8083" m={0.6} rot={[z * -0.06, 0, x * 0.06]} />)}
    <group position={[0, 9.1, 0.3]}><group ref={blades}>{Array.from({ length: 12 }, (_, i) => <B key={i} p={[Math.cos(i * 0.52) * 0.9, Math.sin(i * 0.52) * 0.9, 0]} s={[1.5, 0.22, 0.02]} c="#9aa0a3" m={0.5} rot={[0, 0.3, i * 0.52]} />)}</group></group>
    <B p={[0, 9.1, -0.7]} s={[0.05, 0.6, 1.6]} c="#8a8d90" m={0.5} />
  </group>;
}
function Tank() {
  return <group position={[16, 0, -6]}>
    <Cyl p={[0, 2.6, 0]} a={[1.5, 1.5, 2.6, 18]} c="#7d8a86" m={0.5} r={0.6} />
    <mesh position={[0, 4.1, 0]} castShadow><coneGeometry args={[1.6, 0.6, 18]} /><M c="#6b7774" m={0.5} r={0.6} /></mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Cyl key={i} p={[x, 0.65, z]} a={[0.08, 0.08, 1.3, 6]} c="#5e4a36" />)}
  </group>;
}

/** one pile of junk (rendered until you clear it) */
function Junk({ kind }) {
  if (kind === 'tires') return <>{[[0, 0], [0.7, 0.2], [-0.5, 0.6], [0.2, 0.8]].map(([x, z], i) => [0, 1, 2].slice(0, 3 - (i % 2)).map(k => <Tire key={i + '' + k} p={[x, 0.15 + k * 0.28, z]} />))}</>;
  if (kind === 'scrap') return <><B p={[0, 0.3, 0]} s={[2.4, 0.6, 1.4]} c="#6b4a32" m={0.4} r={0.9} rot={[0, 0.3, 0.08]} /><B p={[0.6, 0.75, 0.2]} s={[1.6, 0.08, 1]} c="#7a7d80" m={0.6} rot={[0.4, 0.5, 0.2]} /><Cyl p={[-0.8, 0.8, -0.2]} a={[0.06, 0.06, 2, 6]} c="#4a3a2e" m={0.4} rot={[0, 0, 1.2]} /><B p={[0.2, 0.9, -0.4]} s={[0.9, 0.5, 0.06]} c="#8e5a3a" m={0.4} rot={[0.2, -0.6, 0.5]} /></>;
  if (kind === 'fridge') return <><B p={[0, 0.85, 0]} s={[0.8, 1.7, 0.75]} c="#d9d2bc" m={0.2} r={0.6} rot={[0, 0.4, 0.05]} /><B p={[0.55, 0.75, 0.25]} s={[0.05, 1.4, 0.7]} c="#cfc8b1" rot={[0, 1.2, 0]} /></>;
  if (kind === 'brush') return <>{[[0, 0, 0.8], [1, 0.4, 0.6], [-0.7, 0.6, 0.7], [0.3, -0.8, 0.5]].map(([x, z, s], i) => <mesh key={i} position={[x, s * 0.7, z]} castShadow><icosahedronGeometry args={[s, 1]} /><M c="#9a8456" r={1} t o={0.92} /></mesh>)}</>;
  if (kind === 'cans') return <>{Array.from({ length: 9 }, (_, i) => <Cyl key={i} p={[(i % 3) * 0.32 - 0.3, 0.17 + (i > 6 ? 0.34 : 0), Math.floor(i / 3) * 0.32 - 0.3]} a={[0.13, 0.13, 0.34, 10]} c={['#7a2f26', '#2f4a63', '#cfc8b8', '#3f6b3a'][i % 4]} m={0.5} r={0.5} />)}<mesh position={[0.4, 0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.7, 16]} /><meshBasicMaterial color="#120d08" transparent opacity={0.5} depthWrite={false} /></mesh></>;
  if (kind === 'papers') return <>{Array.from({ length: 6 }, (_, i) => <B key={i} p={[(i % 2) * 0.5 - 0.25, 0.2 + Math.floor(i / 2) * 0.32, (i % 3) * 0.1]} s={[0.45, 0.3, 0.6]} c={['#cfc4a4', '#bdb08c', '#d8ceb0'][i % 3]} r={1} rot={[0, i * 0.3, 0]} />)}</>;
  return <>{[[0, 0, 0], [0.62, 0, 0.1], [0.3, 0.5, 0.05], [-0.4, 0, 0.6], [-0.2, 0.45, 0.5]].map(([x, y, z], i) => <B key={i} p={[x, 0.25 + y, z]} s={[0.6, 0.5, 0.55]} c={['#a07c4a', '#8f6c3e', '#b08a58'][i % 3]} r={1} rot={[0, i * 0.4, (i % 2) * 0.1]} />)}</>;
}

/** things the player has built on the property (build mode) */
export function PropModel({ id, ghost = false, ok = true }) {
  const g = ghost ? { t: true, o: 0.5 } : {};
  const col = c => (ghost ? (ok ? '#5be08a' : '#e0503a') : c);
  const P = ({ p, s, c, rot }) => <mesh position={p} rotation={rot} castShadow={!ghost}><boxGeometry args={s} /><M c={col(c)} {...g} /></mesh>;
  const C = ({ p, a, c, rot }) => <mesh position={p} rotation={rot} castShadow={!ghost}><cylinderGeometry args={a} /><M c={col(c)} {...g} /></mesh>;
  switch (id) {
    case 'fenceWood': return <>{[-1.5, 0, 1.5].map(x => <P key={x} p={[x, 0.6, 0]} s={[0.12, 1.2, 0.12]} c="#6e5034" />)}{[0.35, 0.85].map(y => <P key={y} p={[0, y, 0]} s={[3, 0.12, 0.05]} c="#8a6a44" />)}</>;
    case 'fenceChain': return <>{[-1.5, 1.5].map(x => <C key={x} p={[x, 0.95, 0]} a={[0.04, 0.04, 1.9, 6]} c="#8a8d90" />)}<P p={[0, 0.95, 0]} s={[3, 1.8, 0.02]} c="#a7abad" /></>;
    case 'gate': return <>{[-2, 2].map(x => <P key={x} p={[x, 0.7, 0]} s={[0.18, 1.4, 0.18]} c="#5e4a36" />)}{[0.4, 0.75, 1.1].map(y => <P key={y} p={[0, y, 0]} s={[3.8, 0.08, 0.06]} c="#9aa0a3" />)}<P p={[0, 0.75, 0]} s={[3.8, 0.06, 0.06]} c="#9aa0a3" rot={[0, 0, 0.18]} /></>;
    case 'floodlight': return <><C p={[0, 3, 0]} a={[0.08, 0.1, 6, 8]} c="#7c8083" /><P p={[0, 6.1, 0.2]} s={[0.7, 0.35, 0.3]} c="#e8e6dc" />{!ghost && <pointLight position={[0, 5.6, 1]} intensity={60} distance={26} decay={1.5} color="#fff2d6" />}</>;
    case 'yardRack': return <>{[-1, 1].flatMap(x => [-0.4, 0.4].map(z => <P key={x + '' + z} p={[x, 1.1, z]} s={[0.08, 2.2, 0.08]} c="#2f5f9e" />))}{[0.3, 1.1, 1.9].map(y => <P key={y} p={[0, y, 0]} s={[2.1, 0.06, 0.9]} c="#d9962f" />)}</>;
    case 'toolChest': return <><P p={[0, 0.55, 0]} s={[1.2, 1.0, 0.55]} c="#b3261e" />{[0.25, 0.5, 0.75].map(y => <P key={y} p={[0, y, 0.28]} s={[1.1, 0.02, 0.02]} c="#ddd" />)}<P p={[0, 1.1, 0]} s={[1.0, 0.25, 0.5]} c="#c22d24" /></>;
    case 'lift': return <>{[-1.5, 1.5].map(x => <P key={x} p={[x, 1.9, 0]} s={[0.35, 3.8, 0.45]} c="#c8372b" />)}<P p={[0, 3.8, 0]} s={[3.4, 0.2, 0.3]} c="#c8372b" />{[-1.5, 1.5].map(x => <P key={'a' + x} p={[x * 0.55, 0.35, 0]} s={[1.3, 0.1, 0.18]} c="#555" rot={[0, x > 0 ? 0.5 : -0.5, 0]} />)}</>;
    case 'engineStand': return <><P p={[0, 0.06, 0]} s={[1, 0.08, 0.8]} c="#444" /><C p={[0, 0.5, 0]} a={[0.05, 0.05, 0.9, 6]} c="#c8372b" /><P p={[0.25, 0.9, 0]} s={[0.4, 0.1, 0.1]} c="#c8372b" /></>;
    case 'computer': return <><P p={[0, 0.74, 0]} s={[1.6, 0.06, 0.8]} c="#6b4a2a" />{[-0.7, 0.7].map(x => <P key={x} p={[x, 0.37, 0]} s={[0.08, 0.74, 0.7]} c="#4a3a2a" />)}<P p={[0.1, 1.0, -0.1]} s={[0.5, 0.42, 0.42]} c="#d8d2bc" /><P p={[0.1, 1.0, 0.12]} s={[0.36, 0.28, 0.01]} c="#123" /><P p={[-0.4, 0.8, 0.1]} s={[0.45, 0.04, 0.16]} c="#d8d2bc" /></>;
    case 'couch': return <><P p={[0, 0.25, 0]} s={[2, 0.4, 0.85]} c="#6b5a3a" /><P p={[0, 0.65, -0.35]} s={[2, 0.6, 0.18]} c="#6b5a3a" />{[-0.95, 0.95].map(x => <P key={x} p={[x, 0.5, 0]} s={[0.18, 0.5, 0.85]} c="#5a4a30" />)}</>;
    case 'neon': return <><P p={[0, 1.6, 0]} s={[1.4, 0.55, 0.06]} c="#1a1010" />{!ghost && <mesh position={[0, 1.6, 0.04]}><planeGeometry args={[1.2, 0.4]} /><meshStandardMaterial color="#ff4a6a" emissive="#ff2a5a" emissiveIntensity={2.4} /></mesh>}<C p={[0, 0.65, 0]} a={[0.04, 0.04, 1.3, 6]} c="#555" /></>;
    case 'flamingo': return <><C p={[0, 0.35, 0]} a={[0.015, 0.015, 0.7, 4]} c="#222" /><mesh position={[0, 0.8, 0]} scale={[0.6, 0.45, 1]} castShadow={!ghost}><sphereGeometry args={[0.25, 10, 8]} /><M c={col('#ff6fa8')} {...g} /></mesh><C p={[0, 1.05, 0.12]} a={[0.03, 0.03, 0.4, 5]} c="#ff6fa8" rot={[0.4, 0, 0]} /></>;
    case 'gnome': return <><C p={[0, 0.5, 0]} a={[0.3, 0.45, 1, 10]} c="#3a5fb0" /><mesh position={[0, 1.15, 0]} castShadow={!ghost}><sphereGeometry args={[0.3, 10, 8]} /><M c={col('#f1c9a0')} {...g} /></mesh><mesh position={[0, 1.65, 0]} castShadow={!ghost}><coneGeometry args={[0.32, 0.8, 10]} /><M c={col('#c8372b')} {...g} /></mesh></>;
    case 'dinosaur': return <><P p={[0, 3, 0]} s={[2.2, 2.4, 6]} c="#5c8a4a" /><P p={[0, 5.6, 3.4]} s={[1.2, 1.2, 2.4]} c="#5c8a4a" rot={[-0.5, 0, 0]} /><P p={[0, 6.6, 4.8]} s={[1.3, 1.1, 1.8]} c="#5c8a4a" /><P p={[0, 2.5, -4.6]} s={[0.9, 0.9, 4]} c="#5c8a4a" rot={[0.25, 0, 0]} />{[[-0.8, 1.6], [0.8, 1.6], [-0.8, -1.6], [0.8, -1.6]].map(([x, z], i) => <P key={i} p={[x, 0.9, z]} s={[0.7, 1.8, 0.8]} c="#4f7a3e" />)}</>;
    case 'tireStack': return <>{[0, 1, 2, 3].map(k => <mesh key={k} position={[0, 0.15 + k * 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!ghost}><torusGeometry args={[0.32, 0.14, 8, 16]} /><M c={col('#151515')} {...g} /></mesh>)}</>;
    case 'drum': return <C p={[0, 0.45, 0]} a={[0.3, 0.3, 0.9, 14]} c="#2f5d86" />;
    case 'picnic': return <><P p={[0, 0.74, 0]} s={[1.8, 0.06, 0.8]} c="#8a6a44" />{[-0.6, 0.6].map(z => <P key={z} p={[0, 0.45, z]} s={[1.8, 0.05, 0.28]} c="#8a6a44" />)}{[-0.7, 0.7].map(x => <P key={x} p={[x, 0.37, 0]} s={[0.08, 0.74, 1.4]} c="#6e5034" />)}</>;
    case 'grill': return <><mesh position={[0, 0.85, 0]} castShadow={!ghost}><sphereGeometry args={[0.32, 12, 8]} /><M c={col('#222')} {...g} /></mesh>{[-1, 1].map(x => <C key={x} p={[x * 0.18, 0.4, 0]} a={[0.02, 0.02, 0.8, 4]} c="#444" />)}</>;
    case 'carSpot': return <><mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 5.5]} /><M c={col('#8f877a')} r={1} {...g} /></mesh>{[-1.5, 1.5].map(x => <mesh key={x} position={[x, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 5.5]} /><M c={col('#e8e6dc')} {...g} /></mesh>)}</>;
    default: return <P p={[0, 0.5, 0]} s={[1, 1, 1]} c="#888" />;
  }
}

/** the ghost of what you are about to build, ~4 m in front of you, snapped to a half-metre grid */
function Ghost() {
  useGame();
  const ref = useRef(), { camera } = useThree();
  const item = game.buildMode ? buildById[game.buildMode.item] : null;
  useFrame(() => {
    if (!item || !ref.current) return;
    const d = 4 + (item.len || 0) * 0.5, x = Math.round((camera.position.x + game.face.x * d) * 2) / 2, z = Math.round((camera.position.z + game.face.z * d) * 2) / 2;
    const ry = game.buildMode.ry || 0, why = placeWhy(item, x, z);
    ref.current.position.set(x, height(x, z), z); ref.current.rotation.set(0, ry, 0);
    if (game.buildMode.x !== x || game.buildMode.z !== z || game.buildMode.why !== why) { game.buildMode = { ...game.buildMode, x, z, why }; emit(); }
  });
  if (!item) return null;
  return <group ref={ref}><PropModel id={item.id} ghost ok={!game.buildMode.why} /></group>;
}

export default function Home() {
  useGame();
  const props = game.props;
  const junk = useMemo(() => junkWorld, []);
  return <>
    <group position={[G.x, G.y, G.z]} rotation={[0, G.rot, 0]}><Trailer /><Windmill /><Tank /></group>
    {junk.filter(j => !isCleared(j.id)).map(j => <group key={j.id} position={[j.x, height(j.x, j.z) + (j.inside ? 0.12 : 0), j.z]} rotation={[0, j.lx * 0.7, 0]}><Junk kind={j.kind} /></group>)}
    {props.map(p => <group key={p.uid} position={[p.x, height(p.x, p.z), p.z]} rotation={[0, p.ry || 0, 0]}><PropModel id={p.id} /></group>)}
    <Ghost />
  </>;
}
void THREE;
