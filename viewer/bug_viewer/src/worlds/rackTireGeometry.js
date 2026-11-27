import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Axle along y, centred. Tread stays inside the requested diameter and width. */
export function rackTireGeometry(dia, width) {
  const r = dia / 2, h = width / 2;
  const profile = [[0.50,-0.88],[0.65,-1],[0.88,-0.94],[0.97,-0.73],[0.97,0.73],[0.88,0.94],[0.65,1],[0.50,0.88],[0.50,-0.88]];
  const casing = new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x*r,y*h)), 48);
  const pieces = [];
  for (let i = 0; i < 36; i++) for (let row = -1; row <= 1; row++) {
    const a = (i + (row === 0 ? 0.5 : 0)) * Math.PI * 2 / 36;
    const g = new THREE.BoxGeometry(r * 0.11, width * 0.25, r * 0.025);
    g.rotateZ(row * 0.22); g.translate(0, row * width * 0.28, r * 0.984);
    g.rotateY(a); pieces.push(g);
  }
  const tread = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  // Five ventilation holes are modelled through each steel dish.
  const shape = new THREE.Shape(); shape.absarc(0, 0, r * 0.50, 0, Math.PI * 2, false);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, hole = new THREE.Path();
    hole.absarc(Math.cos(a)*r*.31, Math.sin(a)*r*.31, r*.075, 0, Math.PI*2, true); shape.holes.push(hole);
  }
  const dishes = [-1,1].map(side => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: r*.035, bevelEnabled: false, curveSegments: 12 });
    g.rotateX(Math.PI/2); g.translate(0, side*(h*.82), 0); return g;
  });
  const hub = mergeGeometries(dishes); dishes.forEach(g => g.dispose());
  return { casing, tread, hub };
}
