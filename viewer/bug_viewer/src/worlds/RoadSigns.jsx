import React, { useMemo } from 'react';
import { ROAD_BY, height } from './county.js';
import { game, useGame } from '../game/store.js';
import { signTex } from '../lot/CarLot.jsx';

// Signs that lead folks off Highway 9 to the garage. Their lamp (and the one above the garage's own sign) is the OPEN light:
// it is on only while the garage is open for business (home.js: toggleOpen). Nothing else about the lighting means "open".
const mill = ROAD_BY.mill.path.pts, drive = ROAD_BY.drive.path.pts;
const at = (pts, s) => pts[Math.min(pts.length - 1, Math.max(0, Math.round(s / 0.5)))];
/** a point beside the road: `side` metres to the right of the direction of travel (dir 1 = along the path, -1 = against it), facing back toward oncoming traffic */
const beside = (p, side, dir = 1) => ({ x: p.x + p.tz * side * dir, z: p.z - p.tx * side * dir, ry: Math.atan2(-p.tx * dir, -p.tz * dir) });

const Plate = ({ w, h, tex, open, lit = 0.4 }) => <group>
  <mesh castShadow><boxGeometry args={[w, h, 0.08]} /><meshStandardMaterial color="#2c2f31" roughness={0.8} metalness={0.3} /></mesh>
  <mesh position={[0, 0, 0.045]}><planeGeometry args={[w - 0.08, h - 0.08]} /><meshStandardMaterial map={tex} roughness={0.7} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={open ? lit : 0} /></mesh>
</group>;

/** one sign: two posts, the plate, and the OPEN / CLOSED tag under it with a lamp on top */
function Sign({ x, z, ry, w = 2.6, h = 1.3, face, tag, open, post = 2.9 }) {
  const y = height(x, z);
  return <group position={[x, y, z]} rotation={[0, ry, 0]}>
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 - 0.15), post / 2, -0.06]} castShadow><cylinderGeometry args={[0.05, 0.06, post, 6]} /><meshStandardMaterial color="#4a3b2c" roughness={0.9} /></mesh>)}
    <group position={[0, post - h / 2 - 0.1, 0]}><Plate w={w} h={h} tex={face} open={open} /></group>
    <group position={[0, post - h - 0.1 - 0.3, 0]}><Plate w={w * 0.5} h={0.5} tex={tag} open={open} lit={1.6} /></group>
    <mesh position={[0, post + 0.12, 0.2]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#ffe4ae" emissive="#ffc577" emissiveIntensity={open ? 3 : 0} /></mesh>
  </group>;
}

export default function RoadSigns() {
  useGame();
  const open = !!(game.home?.open && game.home?.power);
  const T = useMemo(() => ({
    big: signTex([["WALT'S GARAGE", 70, '#803c29'], ['REPAIR · WELDING · SALVAGE', 28, '#59422e'], ['2 MILES →', 48, '#2f4a63']], '#d4bd8d', '#74583b', '#a28a62'),
    next: signTex([["WALT'S GARAGE", 62, '#803c29'], ['AHEAD · KEEP GOING', 34, '#59422e']], '#d4bd8d', '#74583b', '#a28a62'),
    left: signTex([["WALT'S GARAGE", 62, '#803c29'], ['← TURN LEFT', 40, '#2f4a63']], '#d4bd8d', '#74583b', '#a28a62'),
    right: signTex([["WALT'S GARAGE", 62, '#803c29'], ['TURN RIGHT →', 40, '#2f4a63']], '#d4bd8d', '#74583b', '#a28a62'),
    park: signTex([["WALT'S GARAGE", 62, '#803c29'], ['PARK ANYWHERE · COME ON IN', 28, '#59422e']], '#d4bd8d', '#74583b', '#a28a62'),
    on: signTex([['OPEN', 110, '#ff6a45']], '#1a0f0f', '#ff6a45', '#7a2a1c'),
    off: signTex([['CLOSED', 84, '#5a4c4c']], '#161313', '#5a4c4c', '#2a2323'),
  }), []);
  const tag = open ? T.on : T.off;
  const turn = useMemo(() => { const p = mill.reduce((b, q) => (Math.abs(q.x) < Math.abs(b.x) ? q : b), mill[0]); return { p, right: -p.tx > 0 }; }, []);
  const jct = mill[0];
  return <group>
    {/* the big board on Highway 9: two faces in a V, angled at traffic coming either way */}
    {[-1, 1].map(s => { const x = jct.x - 17, z = jct.z + s * 6; return <Sign key={s} x={x} z={z} ry={Math.PI / 2 - s * 0.75} w={6} h={3} face={T.big} tag={tag} open={open} post={5.2} />; })}
    {/* Old Mill Road, heading in from the highway */}
    {[170, 430, 690].map(s => { const b = beside(at(mill, s), 7.5); return <Sign key={s} {...b} face={T.next} tag={tag} open={open} />; })}
    {/* the turn onto grandpa's driveway */}
    {(() => { const b = beside(at(mill, Math.max(0, turn.p.s - 40)), 7.5); return <Sign {...b} face={turn.right ? T.right : T.left} tag={tag} open={open} />; })()}
    {/* at the foot of the driveway, facing folks driving in (the path runs away from the garage, so drivers come the other way: dir -1) */}
    {(() => { const b = beside(at(drive, 40), 9, -1); return <Sign {...b} face={T.park} tag={tag} open={open} />; })()}
  </group>;
}
