import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { raceCourses, groundHeight } from './county.js';
import { pointsAlong } from './raceCourses.js';
import MergedStatic from './MergedStatic.jsx';

// What you see of a race course (worlds/raceCourses.js): a start arch, a finish arch on point-to-point races, and an orange flag post every
// CHECKPOINT_EVERY metres along the route. Each course is baked into a few meshes (MergedStatic) and only drawn while you are near it.
const CHECKPOINT_EVERY = 1200, NEAR = 900;
const white = '#eeeae0', black = '#15181a', orange = '#DC652D', green = '#2f9e44';

const Box = ({ p, s, c }) => <mesh position={p} castShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={0.8} /></mesh>;
/** an arch across the track at the group's origin: two posts, a beam, and a checkered strip */
function Arch({ stripe }) {
  return <>
    <Box p={[-6.2, 3.2, 0]} s={[0.5, 6.4, 0.5]} c="#3a3d40" /><Box p={[6.2, 3.2, 0]} s={[0.5, 6.4, 0.5]} c="#3a3d40" />
    <Box p={[0, 6.2, 0]} s={[13.4, 0.5, 0.5]} c="#3a3d40" />
    {Array.from({ length: 12 }, (_, i) => <Box key={i} p={[-5.5 + i, 5.55, 0.3]} s={[0.98, 0.8, 0.06]} c={i % 2 ? black : stripe} />)}
  </>;
}
function Flag() { return <><Box p={[0, 1.6, 0]} s={[0.1, 3.2, 0.1]} c="#d8d8d8" /><Box p={[0.5, 2.8, 0]} s={[0.9, 0.55, 0.05]} c={orange} /></>; }

function CourseMarkers({ c }) {
  const g = useRef(), { camera } = useThree(), tick = useRef(0);
  const marks = useMemo(() => {
    const flags = pointsAlong(c.line, CHECKPOINT_EVERY).map(p => ({ ...p, y: groundHeight(p.x, p.z), side: 5.5 }));
    const s = { x: c.start.x, z: c.start.z, h: c.start.h, y: groundHeight(c.start.x, c.start.z) };
    const f = c.kind === 'point' ? { x: c.finish.x, z: c.finish.z, h: c.line.length > 1 ? Math.atan2(c.line.at(-1)[0] - c.line.at(-2)[0], c.line.at(-1)[1] - c.line.at(-2)[1]) : 0, y: groundHeight(c.finish.x, c.finish.z) } : null;
    return { flags, s, f, all: [...flags, s, ...(f ? [f] : [])] };
  }, [c]);
  useFrame(() => {   // only while you are near any of it
    if (tick.current++ % 20 || !g.current) return;
    const { x, z } = camera.position; g.current.visible = marks.all.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < NEAR * NEAR);
  });
  return <group ref={g} visible={false}><MergedStatic>
    <group position={[marks.s.x, marks.s.y, marks.s.z]} rotation={[0, marks.s.h, 0]}><Arch stripe={white} /></group>
    {marks.f && <group position={[marks.f.x, marks.f.y, marks.f.z]} rotation={[0, marks.f.h, 0]}><Arch stripe={green} /></group>}
    {marks.flags.map((p, i) => <group key={i} position={[p.x + Math.cos(p.h) * p.side, p.y, p.z - Math.sin(p.h) * p.side]} rotation={[0, p.h, 0]}><Flag /></group>)}
  </MergedStatic></group>;
}
export default function RaceMarkers() {
  const list = useMemo(() => raceCourses(), []);
  return <>{list.map(c => <CourseMarkers key={c.id} c={c} />)}</>;
}
