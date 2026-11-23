import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { raceCourses, groundHeight, highways } from './county.js';
import { border } from './border.js';
import { pointsAlong, mileMarkers } from './raceCourses.js';
import MergedStatic from './MergedStatic.jsx';
import { nearestRaceRoad, raceShoulder } from './raceFixtures.js';
import { raceSignTexture, roadsideBoardTexture } from './raceSignTexture.js';

const CHECKPOINT_EVERY = 1200, NEAR = 900;

export function RouteSign({ name, series, finish = false, town = '' }) {
  const wood = series === 'MDR';
  const map = useMemo(() => raceSignTexture(name, series, finish, undefined, town), [name, series, finish, town]);
  useEffect(() => () => map.dispose(), [map]);
  return <>
    {[-1.35, 1.35].map(x => <mesh key={x} position={[x, 1.65, 0]} castShadow><boxGeometry args={[wood ? 0.18 : 0.11, 3.3, wood ? 0.18 : 0.11]} /><meshStandardMaterial color={wood ? '#796244' : '#807d72'} metalness={wood ? 0 : 0.5} roughness={0.8} /></mesh>)}
    <mesh position={[0, 2.7, 0.07]} castShadow><boxGeometry args={[3.4, 1.55, 0.09]} /><meshStandardMaterial map={map} roughness={0.86} /></mesh>
    <mesh position={[0, 2.7, -0.015]} castShadow><boxGeometry args={[3.48, 1.63, 0.05]} /><meshStandardMaterial color={wood ? '#6e593e' : '#746f5f'} metalness={wood ? 0 : 0.25} roughness={0.9} /></mesh>
  </>;
}

function WarningPost() {
  return <>
    <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.045, 0.055, 2.7, 6]} /><meshStandardMaterial color="#867d68" metalness={0.35} roughness={0.8} /></mesh>
    <mesh position={[0, 2.55, 0.07]} rotation={[0, 0, Math.PI / 4]} castShadow><boxGeometry args={[0.76, 0.76, 0.07]} /><meshStandardMaterial color="#b96831" roughness={0.88} /></mesh>
    <mesh position={[0, 2.55, 0.115]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.61, 0.61, 0.015]} /><meshStandardMaterial color="#c47a3a" roughness={0.8} /></mesh>
  </>;
}

function CourseMarkers({ course, network }) {
  const group = useRef(), { camera } = useThree(), tick = useRef(0);
  const marks = useMemo(() => {
    const dirt = network.roads.filter(r => r.course === course.id);
    const allRoads = network.roads.filter(r => r.kind !== 'ramp');
    const waterAt = (x, z) => border().waterAt(x, z);
    const startRoad = nearestRaceRoad(course.start, dirt, 150) || nearestRaceRoad(course.start, allRoads, 400);
    const finishRoad = course.kind === 'point' && (nearestRaceRoad(course.finish, dirt, 150) || nearestRaceRoad(course.finish, allRoads, 400));
    const start = startRoad && raceShoulder(startRoad, network, waterAt, groundHeight);
    const finish = finishRoad && raceShoulder(finishRoad, network, waterAt, groundHeight);
    const warnings = dirt.flatMap((road, ri) => pointsAlong(road.pts.map(p => [p.x, p.z]), CHECKPOINT_EVERY)
      .map(p => raceShoulder({ ...p, half: road.style.half }, network, waterAt, groundHeight, ri % 2 ? -1 : 1)).filter(Boolean));
    return { start, finish, warnings, all: [start, finish, ...warnings].filter(Boolean) };
  }, [course, network]);
  useFrame(() => {
    if (tick.current++ % 20 || !group.current) return;
    const { x, z } = camera.position;
    group.current.visible = marks.all.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < NEAR * NEAR);
  });
  if (!marks.all.length) return null;
  return <group ref={group} visible={false}><MergedStatic>
    {marks.start && <group position={[marks.start.x, marks.start.y, marks.start.z]} rotation={[0, marks.start.h, 0]}><RouteSign name={course.name} series={course.series} town={course.from} /></group>}
    {marks.finish && <group position={[marks.finish.x, marks.finish.y, marks.finish.z]} rotation={[0, marks.finish.h, 0]}><RouteSign name={course.name} series={course.series} finish town={course.to || course.from} /></group>}
    {marks.warnings.map((p, i) => <group key={i} position={[p.x, p.y, p.z]} rotation={[0, p.h, 0]}><WarningPost /></group>)}
  </MergedStatic></group>;
}

/** the race-mile boards along a route, like the real races have: the course name, "MILE 12 · 31 LEFT", on the shoulder facing the driver. Only the ones within 700 m are built. */
function MileMarkers({ course, network }) {
  const { camera } = useThree(), tick = useRef(0), cache = useRef(new Map()), [shown, setShown] = React.useState([]);
  const marks = useMemo(() => {
    const waterAt = (x, z) => border().waterAt(x, z);
    return mileMarkers(course.line).map(m => {
      const q = network.near(m.x, m.z), half = q && q.d < 40 ? q.road.style.half : 5;
      const at = raceShoulder({ ...m, half }, network, waterAt, groundHeight, 1, 2);
      return at ? { ...m, ...at, h: m.h + Math.PI } : null;   // turned to face the driver
    }).filter(Boolean);
  }, [course, network]);
  useEffect(() => () => { for (const t of cache.current.values()) t.dispose(); cache.current.clear(); }, []);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 1) return; tick.current = 0;
    const { x, z } = camera.position, next = marks.filter(m => (m.x - x) ** 2 + (m.z - z) ** 2 < 700 * 700);
    if (next.length !== shown.length || next.some((m, i) => m !== shown[i])) setShown(next);
  });
  const wood = course.series === 'MDR';
  return <>{shown.map(m => {
    const key = course.id + m.mile; let map = cache.current.get(key);
    if (!map) { map = roadsideBoardTexture(course.name, `MILE ${m.mile} · ${m.left} LEFT`, wood); cache.current.set(key, map); }
    return <group key={key} position={[m.x, m.y, m.z]} rotation={[0, m.h, 0]} scale={0.62}>
      {[-1.35, 1.35].map(x => <mesh key={x} position={[x, 1.65, 0]} castShadow><boxGeometry args={[wood ? 0.18 : 0.11, 3.3, wood ? 0.18 : 0.11]} /><meshStandardMaterial color={wood ? '#796244' : '#807d72'} metalness={wood ? 0 : 0.5} roughness={0.8} /></mesh>)}
      <mesh position={[0, 2.7, 0.07]} castShadow><boxGeometry args={[3.4, 1.55, 0.09]} /><meshStandardMaterial map={map} roughness={0.86} /></mesh>
      <mesh position={[0, 2.7, -0.015]}><boxGeometry args={[3.48, 1.63, 0.05]} /><meshStandardMaterial color={wood ? '#6e593e' : '#746f5f'} roughness={0.9} /></mesh>
    </group>;
  })}</>;
}

export default function RaceMarkers() {
  const courses = useMemo(() => raceCourses(), []), network = useMemo(() => highways(), []);
  return network ? <>{courses.map(course => <React.Fragment key={course.id}><CourseMarkers course={course} network={network} /><MileMarkers course={course} network={network} /></React.Fragment>)}</> : null;
}
