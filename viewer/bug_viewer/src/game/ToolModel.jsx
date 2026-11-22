import { brushedFinish, matteFinish } from '../worlds/shopFinishes.js';
// First-person hand tools. Sizes are in metres, with the grip near the origin.
import React from 'react';
import * as THREE from 'three';
import { CANS } from '../finishJobs.js';

const metal = <meshStandardMaterial color="#aeb6ba" roughnessMap={brushedFinish} metalness={0.88} roughness={0.29} />;
const edge = <meshStandardMaterial color="#717d81" roughnessMap={brushedFinish} metalness={0.82} roughness={0.36} />;
const rubber = <meshStandardMaterial color="#25292b" roughnessMap={matteFinish} roughness={0.84} />;
const red = <meshStandardMaterial color="#a93228" roughnessMap={matteFinish} metalness={0.42} roughness={0.52} />;
const skin = <meshStandardMaterial color="#a9785b" roughness={0.92} />;
const sleeve = <meshStandardMaterial color="#474e4b" roughness={0.98} />;

const jaw = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.018, 0.078); s.lineTo(-0.048, 0.09); s.lineTo(-0.075, 0.126);
  s.lineTo(-0.066, 0.163); s.lineTo(-0.044, 0.175); s.lineTo(-0.038, 0.143);
  s.lineTo(-0.024, 0.128); s.lineTo(0.004, 0.133); s.lineTo(0.029, 0.16);
  s.lineTo(0.055, 0.146); s.lineTo(0.062, 0.111); s.lineTo(0.025, 0.084);
  s.lineTo(0.016, 0.07); s.closePath(); return s;
})();
const shank = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.015, -0.14); s.lineTo(-0.021, 0.086); s.lineTo(0.019, 0.086);
  s.lineTo(0.015, -0.14); s.closePath(); return s;
})();
const forged = { depth: 0.013, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, steps: 1 };

export function Wrench() {
  return <group rotation={[0, 0, -0.12]}>
    <mesh position={[0, 0, -0.0065]} castShadow><extrudeGeometry args={[shank, forged]} />{metal}</mesh>
    <mesh position={[0, 0, -0.0065]} castShadow><extrudeGeometry args={[jaw, forged]} />{metal}</mesh>
    <mesh position={[0, -0.145, 0]} castShadow><torusGeometry args={[0.032, 0.010, 10, 24]} />{metal}</mesh>
    <mesh position={[0, -0.145, -0.007]}><torusGeometry args={[0.023, 0.002, 6, 24]} />{edge}</mesh>
    <mesh position={[0, -0.025, 0.009]}><boxGeometry args={[0.026, 0.085, 0.001]} />{edge}</mesh>
  </group>;
}

export function Jack() {
  return <group position={[-0.12, -0.03, -0.05]}>
    <mesh position={[0, -0.055, 0]} castShadow><boxGeometry args={[0.22, 0.07, 0.46]} />{red}</mesh>
    <mesh position={[0, -0.015, -0.08]} castShadow><boxGeometry args={[0.13, 0.075, 0.25]} />{red}</mesh>
    {[-1, 1].flatMap(side => [-0.15, 0.15].map(z => <mesh key={side + ':' + z} position={[side * 0.12, -0.09, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.044, 0.044, 0.025, 14]} />{rubber}</mesh>))}
    <mesh position={[0, 0.038, -0.13]} rotation={[0.18, 0, 0]} castShadow><boxGeometry args={[0.085, 0.06, 0.23]} />{metal}</mesh>
    <mesh position={[0, 0.105, -0.17]} castShadow><cylinderGeometry args={[0.064, 0.064, 0.027, 18]} />{edge}</mesh>
    <mesh position={[0, 0.115, -0.17]} castShadow><cylinderGeometry args={[0.046, 0.046, 0.014, 18]} />{metal}</mesh>
    <mesh position={[0, 0.13, 0.19]} rotation={[0.35, 0, 0]} castShadow><cylinderGeometry args={[0.012, 0.014, 0.42, 10]} />{metal}</mesh>
    <mesh position={[0, 0.31, 0.26]} rotation={[0.35, 0, 0]} castShadow><cylinderGeometry args={[0.020, 0.020, 0.13, 10]} />{rubber}</mesh>
  </group>;
}

// Panel finishing tools (simple stand-in shapes, Claude art pass later)
function Grinder() {
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.2, 14]} />{red}</mesh>
    <mesh position={[0, 0.14, 0]} castShadow><boxGeometry args={[0.07, 0.07, 0.08]} />{metal}</mesh>
    <mesh position={[0.06, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.055, 0.055, 0.006, 20]} />{edge}</mesh>
    <mesh position={[0, -0.1, 0.06]} rotation={[0.5, 0, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />{rubber}</mesh>
  </group>;
}
function SprayCan({ id }) {
  const color = CANS[id]?.[1] || '#888';
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.17, 16]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.45} /></mesh>
    <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[0.02, 0.032, 0.03, 16]} />{metal}</mesh>
    <mesh position={[0, 0.125, 0]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.025, 10]} />{rubber}</mesh>
  </group>;
}
function Buffer() {
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0.0, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.025, 22]} /><meshStandardMaterial color="#e6d8a0" roughness={0.95} /></mesh>
    <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 0.07, 16]} />{red}</mesh>
    <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, 0.1, 10]} />{rubber}</mesh>
  </group>;
}
function HoseNozzle() {
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0.0, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.16, 12]} />{red}</mesh>
    <mesh position={[0, 0.11, 0]} castShadow><cylinderGeometry args={[0.012, 0.02, 0.06, 12]} />{metal}</mesh>
    <mesh position={[0, -0.1, 0]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.1, 10]} />{rubber}</mesh>
  </group>;
}

function Gauge() {
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.03, 20]} />{metal}</mesh>
    <mesh position={[0, 0.04, 0.016]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.004, 20]} /><meshStandardMaterial color="#f1efe6" roughness={0.6} /></mesh>
    <mesh position={[0, -0.04, 0]} castShadow><cylinderGeometry args={[0.012, 0.014, 0.1, 10]} />{edge}</mesh>
  </group>;
}
function AirChuck() {
  return <group rotation={[0, 0, -0.1]}>
    <mesh position={[0, 0.0, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />{red}</mesh>
    <mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.012, 0.016, 0.05, 12]} />{metal}</mesh>
    <mesh position={[0, -0.1, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.1, 10]} />{rubber}</mesh>
  </group>;
}

function Limb({ from, to, base, tip, material }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={q} castShadow><cylinderGeometry args={[tip, base, delta.length(), 10]} />{material}</mesh>;
}

function Hand({ jack }) {
  const grip = jack ? [-0.11, 0.28, 0.21] : [0.005, -0.07, 0.025];
  const wrist = jack ? [0.02, 0.16, 0.08] : [0.08, -0.20, -0.01];
  return <group>
    <Limb from={[0.29, -0.44, -0.13]} to={wrist} base={0.064} tip={0.050} material={sleeve} />
    <Limb from={wrist} to={grip} base={0.048} tip={0.043} material={skin} />
    <mesh position={grip} castShadow><sphereGeometry args={[0.058, 12, 10]} />{skin}</mesh>
    {[-0.025, 0.004, 0.032].map((x, i) => <Limb key={i} from={[grip[0] + x, grip[1] + 0.005, grip[2] + 0.036]} to={[grip[0] + x * 0.7, grip[1] - 0.049, grip[2] - 0.017]} base={0.013} tip={0.010} material={skin} />)}
    <Limb from={[grip[0] - 0.05, grip[1], grip[2] + 0.02]} to={[grip[0] - 0.016, grip[1] + 0.032, grip[2] - 0.03]} base={0.019} tip={0.014} material={skin} />
  </group>;
}

export default function ToolModel({ id }) {
  const jack = id === 'jack';
  const tool = jack ? <Jack /> : id === 'grinder' ? <Grinder /> : id === 'buffer' ? <Buffer /> : id === 'hose' ? <HoseNozzle /> : id === 'gauge' ? <Gauge /> : id === 'airchuck' ? <AirChuck /> : CANS[id] ? <SprayCan id={id} /> : <Wrench />;
  return <group>{tool}<Hand jack={jack} /></group>;
}
