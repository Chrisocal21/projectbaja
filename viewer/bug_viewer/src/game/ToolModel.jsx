// First-person hand tools. Sizes are in metres, with the grip near the origin.
import React from 'react';
import * as THREE from 'three';
import SmallModel from './SmallModel.jsx';
import { smallItemFile } from './smallItemFiles.js';

const skin = <meshStandardMaterial color="#a9785b" roughness={0.92} />;
const sleeve = <meshStandardMaterial color="#474e4b" roughness={0.98} />;

function ToolAtGrip({ id }) {
  const jack = id === 'jack';
  const file = smallItemFile({ kind: 'tool', id }) || 'TOOL_Wrench';
  return <group position={jack ? [-.11,.28,.21] : [.005,-.07,.025]}><SmallModel file={file} id={id} inHand /></group>;
}

export const Wrench = () => <ToolAtGrip id="wrench" />;
export const Jack = () => <ToolAtGrip id="jack" />;

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
  return <group><ToolAtGrip id={id} /><Hand jack={jack} /></group>;
}
