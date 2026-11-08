// Baja County's day/night cycle: ticks the clock, then turns it into the sky, fog and sun. Mounted once, for the
// 'county' world only (the dev test worlds keep their fixed daylight — see DriveWorld.jsx). The clock itself (game.clock)
// is advanced imperatively every frame so it costs nothing; this component only re-renders a few times a second,
// which is plenty smooth for something that takes 18 real minutes to complete one lap.
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { tickClock, clockHour } from '../game/clock.js';
import { dayPhase, goldenPhase, sunPosition } from './clock.js';

const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();

export default function DayNightSky({ sun }) {
  const [, force] = useState(0), acc = useRef(0);
  useFrame((_, dt) => {
    tickClock(Math.min(dt, 0.25));
    acc.current += dt;
    if (acc.current > 0.15) { acc.current = 0; force(n => n + 1); }   // re-render a few times a second, not every frame
  });
  const h = clockHour(), day = dayPhase(h), night = 1 - day, gold = goldenPhase(h), pos = sunPosition(h);
  const sunColor = mix('#fff6ea', '#ffa15c', gold);
  const skyTint = mix('#dfeaff', '#141c30', night), groundTint = mix('#8a6e45', '#0f0d14', night);
  const fogColor = mix('#d9c6a9', '#0b1322', night);
  return <>
    <Sky distance={9000} sunPosition={pos} turbidity={7} rayleigh={1.6} mieCoefficient={0.008} mieDirectionalG={0.85} />
    <fog attach="fog" args={[fogColor, 420 - 380 * night, 4300 - 3700 * night]} />
    <ambientLight intensity={0.15 + 0.35 * day} />
    <hemisphereLight args={[skyTint, groundTint, 0.3 + 0.45 * day]} />
    <directionalLight ref={sun} position={pos} color={sunColor} intensity={0.08 + 2.6 * day} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-36} shadow-camera-right={36} shadow-camera-top={36} shadow-camera-bottom={-36} shadow-camera-near={1} shadow-camera-far={120} shadow-normalBias={0.025} />
  </>;
}
