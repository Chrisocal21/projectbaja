import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural parts and mounting hardware. Everything is built in body space (metres, +Z forward, +X left, y up from the ground)
 * from tubes, boxes and discs, merged per material so a whole accessory is one or two draw calls.
 */
const Y = new THREE.Vector3(0, 1, 0), V = (x, y, z) => new THREE.Vector3(x, y, z);
const place = (g, pos, quat = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1)) => { g.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scale)); return g; };
const tube = (a, b, r = 0.02, mat = 'dark') => { const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 10); return { mat, g: place(g, a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize())) }; };
const cone = (a, b, r0, r1, mat = 'chrome') => { const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r1, r0, d.length(), 14, 1, true); return { mat, g: place(g, a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize())) }; };
const box = (c, s, mat = 'dark', rot = [0, 0, 0]) => ({ mat, g: place(new THREE.BoxGeometry(...s), V(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot))) });
const zDisc = (c, r, t, mat = 'dark') => ({ mat, g: place(new THREE.CylinderGeometry(r, r, t, 20), V(...c), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2)) });
const mirrorX = items => items.flatMap(f => [f(1), f(-1)]);

const PROC = {
  // ---------- lights ----------
  LIGHT_BumperPods: () => mirrorX([s => [zDisc([0.3 * s, 0.67, 1.9], 0.07, 0.1), zDisc([0.3 * s, 0.67, 1.955], 0.058, 0.012, 'led'), tube(V(0.3 * s, 0.6, 1.9), V(0.3 * s, 0.5, 1.88), 0.014), box([0.3 * s, 0.5, 1.88], [0.09, 0.02, 0.07])]]).flat(),
  LIGHT_CubePods: () => mirrorX([s => [box([0.52 * s, 0.64, 1.88], [0.09, 0.09, 0.09]), box([0.52 * s, 0.64, 1.935], [0.075, 0.075, 0.012], 'led'), tube(V(0.52 * s, 0.6, 1.88), V(0.52 * s, 0.5, 1.86), 0.013), box([0.52 * s, 0.49, 1.86], [0.09, 0.02, 0.07])]]).flat(),
  LIGHT_RearBar: () => [box([0, 1.0, -2.1], [0.78, 0.045, 0.045]), box([0, 1.0, -2.128], [0.74, 0.03, 0.01], 'ledRed'), ...mirrorX([s => [tube(V(0.36 * s, 1.0, -2.1), V(0.36 * s, 0.92, -2.1), 0.014), box([0.36 * s, 0.915, -2.1], [0.07, 0.015, 0.06])]]).flat()],
  // ---------- roof ----------
  ROOF_JerryCans: () => [0, 1].flatMap(i => {
    const x = (i ? 1 : -1) * 0.2, mat = i ? 'canOlive' : 'canRed';
    return [box([x, 2.04, -0.5], [0.17, 0.4, 0.34], mat), box([x, 2.045, -0.5], [0.17, 0.06, 0.2], mat), zDisc([x, 2.27, -0.4], 0.028, 0.03, 'dark'), box([x, 2.25, -0.58], [0.05, 0.03, 0.1], mat)];
  }).concat([box([0, 2.04, -0.5 + 0.0], [0.5, 0.012, 0.04, ], 'rubber'), box([0, 2.04, -0.66], [0.5, 0.012, 0.04], 'rubber')]),
  ROOF_Antenna: () => [tube(V(0.5, 1.83, -0.8), V(0.5, 3.0, -0.8), 0.006, 'dark'), box([0.5, 1.84, -0.8], [0.07, 0.03, 0.07]), box([0.6, 2.92, -0.8], [0.2, 0.12, 0.004], 'flag')],
  // ---------- underbody ----------
  GUARD_SkidPlate: () => [box([0, 0.27, 0.3], [1.0, 0.02, 1.5], 'alu'), box([-0.5, 0.29, 0.3], [0.02, 0.05, 1.5], 'alu'), box([0.5, 0.29, 0.3], [0.02, 0.05, 1.5], 'alu'), ...[-0.35, 0.35].flatMap(x => [-0.3, 0.3, 0.9].map(z => ({ mat: 'dark', g: place(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8), V(x, 0.258, z)) })))],
  GUARD_MudFlaps: r => { const rad = 0.38 * (r?.scale || 1) + 0.1; return [1, -1].flatMap(side => [1.19 - rad, -1.19 - rad].flatMap(z => [box([0.78 * side, 0.43, z], [0.014, 0.22, 0.24], 'rubber'), box([0.78 * side, 0.55, z], [0.02, 0.025, 0.25], 'dark')])); },
  // ---------- exhaust ----------
  EXH_SidePipes: () => mirrorX([s => [
    tube(V(0.46 * s, 0.64, -1.55), V(0.64 * s, 0.5, -1.35), 0.034, 'chrome'), tube(V(0.64 * s, 0.5, -1.35), V(0.7 * s, 0.46, -1.0), 0.034, 'chrome'),
    tube(V(0.7 * s, 0.46, -1.0), V(0.7 * s, 0.46, 0.35), 0.036, 'chrome'), cone(V(0.7 * s, 0.46, 0.35), V(0.7 * s, 0.46, 0.6), 0.036, 0.06),
    box([0.745 * s, 0.5, -0.3], [0.012, 0.035, 1.1], 'alu'), tube(V(0.7 * s, 0.46, -0.8), V(0.7 * s, 0.38, -0.8), 0.008), tube(V(0.7 * s, 0.46, 0.1), V(0.7 * s, 0.38, 0.1), 0.008),
  ]]).flat(),
  EXH_Megaphone: () => mirrorX([s => [
    tube(V(0.16 * s, 0.66, -1.42), V(0.2 * s, 0.6, -1.85), 0.033, 'chrome'), tube(V(0.2 * s, 0.6, -1.85), V(0.2 * s, 0.58, -2.05), 0.036, 'chrome'),
    cone(V(0.2 * s, 0.58, -2.05), V(0.2 * s, 0.58, -2.34), 0.036, 0.11), zDisc([0.2 * s, 0.58, -1.95], 0.05, 0.02, 'dark'),
  ]]).flat(),
  // ---------- hardware for existing parts ----------
  roofRackFeet: () => [[-0.5, -0.85], [0.5, -0.85], [-0.5, 0.1], [0.5, 0.1]].flatMap(([x, z]) => [box([x, 1.515, z], [0.1, 0.02, 0.1]), ...[-1, 1].map(k => ({ mat: 'chrome', g: place(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 8), V(x + 0.03 * k, 1.53, z + 0.03 * k)) }))]),
  lightBarPosts: () => mirrorX([s => [tube(V(0.36 * s, 1.52, 0.32), V(0.36 * s, 1.4, 0.32), 0.016), box([0.36 * s, 1.395, 0.32], [0.1, 0.014, 0.08]), tube(V(0.45 * s, 1.55, 0.32), V(0.52 * s, 1.5, 0.2), 0.012), box([0.52 * s, 1.495, 0.2], [0.07, 0.014, 0.07])]]).flat(),
  engineMounts: () => [tube(V(-0.5, 0.5, -1.7), V(0.5, 0.5, -1.7), 0.024), ...mirrorX([s => [tube(V(0.5 * s, 0.5, -1.7), V(0.55 * s, 0.76, -1.9), 0.018), tube(V(0.4 * s, 0.5, -1.7), V(0.52 * s, 0.46, -1.9), 0.018), box([0.4 * s, 0.5, -1.7], [0.08, 0.05, 0.1], 'alu')]]).flat()],
};
export const hasProc = id => !!PROC[id];

const MATS = {
  dark: new THREE.MeshStandardMaterial({ color: '#26292b', metalness: 0.55, roughness: 0.45 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }),
  alu: new THREE.MeshStandardMaterial({ color: '#8b9096', metalness: 0.7, roughness: 0.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
  led: new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#fff1b8', emissiveIntensity: 1.4, roughness: 0.3 }),
  ledRed: new THREE.MeshStandardMaterial({ color: '#ff3b2e', emissive: '#ff2a1a', emissiveIntensity: 1.2, roughness: 0.3 }),
  canRed: new THREE.MeshStandardMaterial({ color: '#b3392a', roughness: 0.6, metalness: 0.2 }),
  canOlive: new THREE.MeshStandardMaterial({ color: '#59602f', roughness: 0.6, metalness: 0.2 }),
  flag: new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.8, side: THREE.DoubleSide }),
};

const cache = {};
function buildProc(id, r) {
  const items = PROC[id](r).filter(Boolean), byMat = {};
  for (const it of items) { const g = it.g.index ? it.g : it.g; (byMat[it.mat] ||= []).push(g); }
  return Object.fromEntries(Object.entries(byMat).map(([m, gs]) => [m, mergeGeometries(gs.map(g => { g = g.index ? g : g; g.deleteAttribute('uv'); return g; }), false)]));
}
/** Procedural accessory or mount, optionally sized from the resolved build (`r.scale` = tire scale for mud flaps). */
export function ProcPart({ id, r }) {
  const key = id === 'GUARD_MudFlaps' ? `${id}-${(r?.scale || 1).toFixed(2)}` : id;
  const groups = useMemo(() => cache[key] || (cache[key] = buildProc(id, r)), [key]);
  return <group name={`Proc_${id}`}>{Object.entries(groups).map(([m, g]) => <mesh key={m} geometry={g} material={MATS[m]} castShadow receiveShadow />)}</group>;
}
