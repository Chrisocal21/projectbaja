// The tools you hold while working on the car: a combination wrench and a floor jack, built from plain shapes (no model file needed).
// Items.jsx shows one in your hand whenever you carry a tool or are bolting a part on, and turns it while the hold bar fills.
import React from 'react';

const steel = <meshStandardMaterial color="#b9bec4" metalness={0.85} roughness={0.32} />;
const dark = <meshStandardMaterial color="#2a2d31" metalness={0.5} roughness={0.55} />;
const red = <meshStandardMaterial color="#b3261e" metalness={0.4} roughness={0.5} />;

/** an open-end / box-end wrench, about 26 cm: lies along +y with the open jaw at the top */
function Wrench() {
  return <group>
    <mesh castShadow><boxGeometry args={[0.028, 0.2, 0.01]} />{steel}</mesh>
    <mesh position={[0, 0.115, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.01, 18]} />{steel}</mesh>
    <mesh position={[0, 0.138, 0]}><boxGeometry args={[0.026, 0.04, 0.012]} />{dark}</mesh>
    <mesh position={[0, -0.115, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.026, 0.009, 8, 18]} />{steel}</mesh>
  </group>;
}
/** a small trolley jack: base, post, lifting pad and a handle */
function Jack() {
  return <group scale={0.6}>
    <mesh position={[0, 0.04, 0]} castShadow><boxGeometry args={[0.22, 0.08, 0.5]} />{red}</mesh>
    <mesh position={[0, 0.17, -0.12]} castShadow><boxGeometry args={[0.1, 0.18, 0.12]} />{red}</mesh>
    <mesh position={[0, 0.3, -0.12]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.03, 14]} />{dark}</mesh>
    <mesh position={[0, 0.12, 0.42]} rotation={[0.35, 0, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.62, 8]} />{dark}</mesh>
  </group>;
}
export default function ToolModel({ id }) { return id === 'jack' ? <Jack /> : <Wrench />; }
