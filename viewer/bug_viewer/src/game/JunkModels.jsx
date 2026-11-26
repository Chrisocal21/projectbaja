// Stand-in models for the loose junk (kind 'junk': oil drum, jerry can, wooden crate, engine block). Plain three.js shapes put together so each one
// reads as the real thing you can use or take apart, until real models exist. Each one stands on y = 0, about the size the old box was.
import React from 'react';
import * as THREE from 'three';

const M = (color, metalness = 0, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const mat = {
  steelDark: M('#2b2d30', 0.6, 0.5), rust: M('#7a4a2a', 0.3, 0.9), cap: M('#9a9c9e', 0.8, 0.35),
  can: M('#b02a1c', 0.35, 0.45), canDark: M('#7d1d14', 0.35, 0.5),
  wood: M('#a07a4c', 0, 0.9), woodDark: M('#7c5a34', 0, 0.92), woodEnd: M('#8d6a40', 0, 0.9), nail: M('#55585b', 0.7, 0.5),
  iron: M('#5a5853', 0.55, 0.65), ironDark: M('#3e3c38', 0.55, 0.7), alu: M('#a3a5a2', 0.6, 0.5), belt: M('#1d1d1d', 0, 0.9),
};
const DRUM_COL = [M('#3d5a6e', 0.45, 0.55), M('#5a6b3a', 0.45, 0.55)];
const DRUM_STRIPE = M('#d8c9a2', 0.2, 0.7);

const Box = ({ p, s, m, r }) => <mesh position={p} rotation={r} material={m} castShadow receiveShadow><boxGeometry args={s} /></mesh>;
const Cyl = ({ p, a, m, r, seg = 20 }) => <mesh position={p} rotation={r} material={m} castShadow receiveShadow><cylinderGeometry args={a} /></mesh>;

/** a 55-gallon steel drum: rolled rims, two rolling hoops, a painted band, two bungs on the lid, a bit of rust at the foot */
function Drum({ uid = 0 }) {
  const body = DRUM_COL[uid % 2], R = 0.29, H = 0.88;
  return <group>
    <Cyl p={[0, H / 2, 0]} a={[R, R, H, 28]} m={body} />
    {[0.012, H - 0.012].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat.steelDark} castShadow><torusGeometry args={[R, 0.014, 6, 28]} /></mesh>)}
    {[H * 0.33, H * 0.66].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={body} castShadow><torusGeometry args={[R + 0.004, 0.012, 6, 28]} /></mesh>)}
    <Cyl p={[0, H * 0.5, 0]} a={[R + 0.002, R + 0.002, 0.09, 28]} m={DRUM_STRIPE} />
    <Cyl p={[0, 0.05, 0]} a={[R + 0.003, R + 0.003, 0.07, 28]} m={mat.rust} />
    <Cyl p={[0, H + 0.002, 0]} a={[R - 0.01, R - 0.01, 0.004, 28]} m={mat.steelDark} />
    <Cyl p={[0.16, H + 0.012, 0.04]} a={[0.035, 0.035, 0.02, 12]} m={mat.cap} />
    <Cyl p={[-0.17, H + 0.01, -0.03]} a={[0.02, 0.02, 0.016, 10]} m={mat.cap} />
  </group>;
}

/** a 20 L jerry can: the stamped X on both sides, the three-bar handle and the spout cap */
function JerryCan() {
  const W = 0.17, H = 0.4, D = 0.34;
  return <group>
    <Box p={[0, H / 2 - 0.02, 0]} s={[W, H - 0.04, D]} m={mat.can} />
    <Box p={[0, H - 0.03, -0.03]} s={[W - 0.03, 0.03, D - 0.08]} m={mat.can} />
    {[-1, 1].map(sx => [0.62, -0.62].map(a => <Box key={sx + ':' + a} p={[sx * (W / 2 + 0.004), H / 2 - 0.02, 0]} s={[0.008, 0.022, Math.hypot(H, D) * 0.72]} r={[a, 0, 0]} m={mat.canDark} />))}
    {[-1, 1].map(sx => <Box key={'e' + sx} p={[sx * (W / 2 + 0.003), H / 2 - 0.02, 0]} s={[0.006, H - 0.1, D - 0.06]} m={mat.canDark} />)}
    {[-0.1, -0.03, 0.04].map(z => <Box key={z} p={[0, H + 0.02, z]} s={[0.02, 0.05, 0.022]} m={mat.canDark} />)}
    <Box p={[0, H + 0.05, -0.03]} s={[0.022, 0.018, 0.17]} m={mat.canDark} />
    <Cyl p={[0, H + 0.0, 0.12]} a={[0.03, 0.03, 0.06, 12]} m={mat.can} r={[0.35, 0, 0]} />
    <Cyl p={[0, H + 0.03, 0.135]} a={[0.034, 0.034, 0.025, 12]} m={mat.cap} r={[0.35, 0, 0]} />
  </group>;
}

/** a slatted wooden crate: corner posts, three slats a side with gaps, a planked lid, nail heads */
function WoodCrate() {
  const S = 0.6, H = 0.48, t = 0.022, post = 0.045, n = 3, gap = (H - 0.02) / n;
  const sides = [[0, S / 2, 0], [0, -S / 2, 0], [S / 2, 0, Math.PI / 2], [-S / 2, 0, Math.PI / 2]];
  return <group>
    <Box p={[0, 0.015, 0]} s={[S - 0.02, 0.03, S - 0.02]} m={mat.woodDark} />
    {sides.map(([x, z, ry], i) => Array.from({ length: n }, (_, k) => <Box key={i + ':' + k} p={[x, 0.02 + gap * (k + 0.5), z]} s={[S, gap - 0.03, t]} r={[0, ry, 0]} m={(i + k) % 2 ? mat.wood : mat.woodEnd} />))}
    {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => <Box key={a + ':' + b} p={[a * (S / 2 - post / 2 + 0.006), H / 2, b * (S / 2 - post / 2 + 0.006)]} s={[post, H, post]} m={mat.woodDark} />)}
    {[-0.2, 0, 0.2].map((x, i) => <Box key={'l' + i} p={[x, H + t / 2, 0]} s={[0.18, t, S + 0.01]} m={i === 1 ? mat.woodEnd : mat.wood} />)}
    {[-1, 1].map(z => <Box key={'c' + z} p={[0, H + t + 0.008, z * 0.22]} s={[S - 0.02, 0.016, 0.06]} m={mat.woodDark} />)}
    {[-0.2, 0, 0.2].flatMap(x => [-1, 1].map(z => <Cyl key={x + ':' + z} p={[x, H + t + 0.018, z * 0.22]} a={[0.007, 0.007, 0.004, 6]} m={mat.nail} />))}
  </group>;
}

/** a bare cast-iron inline-four block: the block, a head and valve cover on top, the oil pan, the bellhousing flange at one end, the crank pulley and belt at the other */
function EngineBlock() {
  return <group>
    <Box p={[0, 0.06, 0]} s={[0.5, 0.1, 0.26]} m={mat.ironDark} />
    <Box p={[0, 0.06, 0]} s={[0.44, 0.03, 0.3]} m={mat.ironDark} />
    <Box p={[0, 0.22, 0]} s={[0.55, 0.22, 0.34]} m={mat.iron} />
    {[-0.19, -0.065, 0.065, 0.19].map(x => <Box key={x} p={[x, 0.22, 0.175]} s={[0.09, 0.18, 0.012]} m={mat.ironDark} />)}
    <Box p={[0, 0.36, 0]} s={[0.53, 0.06, 0.3]} m={mat.iron} />
    <Box p={[0, 0.415, 0]} s={[0.48, 0.05, 0.22]} m={mat.alu} />
    <Cyl p={[0.1, 0.45, 0]} a={[0.022, 0.022, 0.03, 10]} m={mat.steelDark} />
    {[-0.18, -0.06, 0.06, 0.18].map(x => <Box key={'p' + x} p={[x, 0.33, -0.17]} s={[0.06, 0.04, 0.05]} m={mat.ironDark} />)}
    <Box p={[-0.3, 0.2, 0]} s={[0.04, 0.36, 0.42]} m={mat.ironDark} />
    <Cyl p={[0.3, 0.12, 0]} a={[0.07, 0.07, 0.04, 20]} m={mat.ironDark} r={[0, 0, Math.PI / 2]} />
    <mesh position={[0.31, 0.2, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.belt} castShadow><torusGeometry args={[0.1, 0.01, 6, 20]} /></mesh>
    <Cyl p={[0.3, 0.3, 0.07]} a={[0.045, 0.045, 0.035, 16]} m={mat.cap} r={[0, 0, Math.PI / 2]} />
  </group>;
}

export function JunkModel({ item }) {
  return item.id === 'engineblock' ? <EngineBlock /> : item.id === 'crate' ? <WoodCrate /> : item.id === 'drum' ? <Drum uid={item.uid} /> : <JerryCan />;
}
