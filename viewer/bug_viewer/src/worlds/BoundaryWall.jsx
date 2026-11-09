// Faint blue-cyan grid wall at the map edge; invisible until you are within WALL_SHOW_DIST metres of it.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BOUNDARY_WALLS, WALL_HEIGHT, WALL_SHOW_DIST, WALL_COLOR } from './boundary.js';

const vert = 'varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
const frag = `varying vec3 vW; varying vec2 vUv; uniform vec3 uCol; uniform float uShow, uLen, uH;
void main(){
  float d = distance(cameraPosition.xz, vW.xz) ; d = min(d, abs(cameraPosition.y - vW.y) + d);
  float near = 1. - smoothstep(uShow * 0.35, uShow, d);
  vec2 g = vec2(vUv.x * uLen, vUv.y * uH) / 8.;
  vec2 f = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1. - min(min(f.x, f.y), 1.);
  float a = (0.07 + line * 0.55) * near * (1. - smoothstep(0.7, 1., vUv.y) * 0.6);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol, a);
}`;
export default function BoundaryWall() {
  const walls = useMemo(() => BOUNDARY_WALLS.map(w => {
    const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0), mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(WALL_COLOR) }, uShow: { value: WALL_SHOW_DIST }, uLen: { value: len }, uH: { value: WALL_HEIGHT } },
    });
    return { w, len, mat, ry: -Math.atan2(w.z1 - w.z0, w.x1 - w.x0) };
  }), []);
  return <>{walls.map(({ w, len, mat, ry }) => (
    <mesh key={w.id} material={mat} position={[(w.x0 + w.x1) / 2, WALL_HEIGHT / 2 - 5, (w.z0 + w.z1) / 2]} rotation={[0, ry, 0]} frustumCulled={false}>
      <planeGeometry args={[len, WALL_HEIGHT]} />
    </mesh>))}</>;
}
