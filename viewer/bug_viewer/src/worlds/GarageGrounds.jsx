// The ground round the garage: the slab's edge eases down to the yard (no 12 cm step), concrete ramps out of the roll-up doors, and a gravel
// drive from the front yard round the east side (between the shop and the camper) to the back doors, or at level 3 to the big east and west doors.
// The yard is levelled to the garage's height (county.js paints the pad), so garage-local y = 0 is the ground here. Basic boxes (ChatGPT polishes).
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { extension, doorGaps } from './garageLevels.js';
import { propertyTexture } from './propertyTextures.js';

export const SLAB_TOP = 0.12;
const EDGE = 0.9;   // how far out the slab's edge eases down to the ground
/** the slab's outline: Walt's slab and the office wing (county.js FLOORS) and, from level 1, the extension's slab behind them */
export const slabRect = level => { const e = extension(level); return { x0: -13.6, x1: 7.6, z0: e ? e.z0 - 0.6 : -6.6, z1: 6.6 }; };
const FRONT_APRON = { x0: -4.5, x1: 4.5, z1: 11.1 };

/** a sloped strip leaving an edge: along x (edge at constant z) or along z (edge at constant x); `s` is the outward direction, it drops `top` over `wd` */
function Ramp({ axis, at, a, b, s, wd, top = SLAB_TOP, color = '#fff', lift = 0 }) {
  const q = v => Math.max(0.5, Math.round(v / 3 * 2) / 2);   // texture repeats per ~3 m, rounded so ramps share textures
  const map = axis === 'z' ? propertyTexture(7, q(b - a), q(wd)) : propertyTexture(7, q(wd), q(b - a));
  const th = Math.atan(top / wd), len = b - a, mid = (a + b) / 2, slant = Math.hypot(wd, top);
  const p = axis === 'z' ? [mid, top / 2 - 0.012 + lift, at + (s * wd) / 2] : [at + (s * wd) / 2, top / 2 - 0.012 + lift, mid];
  const rot = axis === 'z' ? [s * th, 0, 0] : [0, 0, -s * th];
  const size = axis === 'z' ? [len, 0.024, slant] : [slant, 0.024, len];
  return <mesh position={p} rotation={rot} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} map={map} roughness={0.95} /></mesh>;
}
// Bake the connected gravel footprint once per layout. World-scale aggregate
// and wheel paths continue through the joins between lanes and door aprons.
function GravelDrive({ level }) {
  const drive = useMemo(() => {
    const lanes = [...driveRects(level), [-4.6, 4.6, FRONT_APRON.z1, 16]];
    const x0 = Math.min(...lanes.map(r => r[0])) - 1, x1 = Math.max(...lanes.map(r => r[1])) + 1;
    const z0 = Math.min(...lanes.map(r => r[2])) - 1, z1 = Math.max(...lanes.map(r => r[3])) + 1;
    const width = Math.ceil((x1 - x0) * 18), height = Math.ceil((z1 - z0) * 18);
    const pixels = new Uint8Array(width * height * 4);
    let seed = 1843;
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const x = x0 + (i + 0.5) / width * (x1 - x0), z = z1 - (j + 0.5) / height * (z1 - z0);
      let edge = -Infinity, wear = 0;
      for (const [left, right, back, front] of lanes) {
        const inside = Math.min(x - left, right - x, z - back, front - z);
        edge = Math.max(edge, inside);
        if (inside < 0) continue;
        const alongZ = front - back > right - left || back === FRONT_APRON.z1;
        const side = alongZ ? x - (left + right) / 2 : z - (back + front) / 2;
        const along = alongZ ? z : x;
        const rut = Math.abs(Math.abs(side + 0.12 * Math.sin(along * 0.48)) - 0.8);
        wear = Math.max(wear, (1 - THREE.MathUtils.smoothstep(rut, 0.09, 0.3)) * THREE.MathUtils.smoothstep(inside, 0, 0.9));
      }
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = seed / 4294967296, drift = Math.sin(x * 1.4 + Math.sin(z * 0.75)) * 0.15;
      const tone = (grain - 0.5) * (46 - 26 * wear) + drift * 22 - 18 * wear;
      const k = (j * width + i) * 4;
      pixels.set([169 + tone, 151 + tone, 123 + tone, 255 * THREE.MathUtils.smoothstep(edge + drift + grain * 0.22, -0.48, 0.36)], k);
    }
    const map = new THREE.DataTexture(pixels, width, height);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.needsUpdate = true;
    return { map, position: [(x0 + x1) / 2, 0.018, (z0 + z1) / 2], size: [x1 - x0, z1 - z0] };
  }, [level]);
  useEffect(() => () => drive.map.dispose(), [drive]);
  return <mesh position={drive.position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={drive.size} /><meshStandardMaterial map={drive.map} roughness={1} transparent depthWrite={false} />
  </mesh>;
}

/** the drive: rects [x0, x1, z0, z1] in garage-local metres */
export function driveRects(level) {
  const e = extension(level); if (!e) return [];
  const out = [], zb = e.z0 - 0.6, east = [9, 13];
  const back = doorGaps(level, 'back');
  if (back.length) { const z0 = zb - 5; out.push([Math.min(...back.map(g => g[0])) - 1, east[1], z0, zb - 0.6], [east[0], east[1], z0, 12]); }
  for (const [a, b] of doorGaps(level, 'east')) out.push([7.6, east[1], a - 0.4, b + 0.4], [east[0], east[1], a - 0.4, 12]);
  for (const [a, b] of doorGaps(level, 'west')) out.push([-21.5, -13.6, a - 0.4, b + 0.4], [-21.5, -17.8, a - 0.4, 12]);
  return out;
}

export default function GarageGrounds({ level }) {
  const r = slabRect(level), e = extension(level), A = FRONT_APRON;
  const edge = (props, k) => <Ramp key={k} wd={EDGE} color="#e8e4dc" {...props} />;
  return <group>
    {/* the slab's edge: back, both sides, the front either side of the front apron, and the apron's own three sides */}
    {edge({ axis: 'z', at: r.z0, a: r.x0 - EDGE, b: r.x1 + EDGE, s: -1 }, 'b')}
    {edge({ axis: 'x', at: r.x0, a: r.z0, b: r.z1, s: -1 }, 'w')}
    {edge({ axis: 'x', at: r.x1, a: r.z0, b: r.z1, s: 1 }, 'e')}
    {edge({ axis: 'z', at: r.z1, a: r.x0 - EDGE, b: A.x0, s: 1 }, 'f0')}
    {edge({ axis: 'z', at: r.z1, a: A.x1, b: r.x1 + EDGE, s: 1 }, 'f1')}
    {edge({ axis: 'x', at: A.x0, a: r.z1, b: A.z1, s: -1 }, 'a0')}
    {edge({ axis: 'x', at: A.x1, a: r.z1, b: A.z1, s: 1 }, 'a1')}
    {edge({ axis: 'z', at: A.z1, a: A.x0 - EDGE, b: A.x1 + EDGE, s: 1 }, 'a2')}
    {/* concrete ramps out of the roll-up doors, gentler than the edge (they sit just above it) */}
    {e && doorGaps(level, 'back').map(([a, b]) => <Ramp key={`rb${a}`} axis="z" at={r.z0} a={a - 0.5} b={b + 0.5} s={-1} wd={4} color="#f2efe8" lift={0.006} />)}
    {e && doorGaps(level, 'east').map(([a, b]) => <Ramp key={`re${a}`} axis="x" at={r.x1} a={a - 0.5} b={b + 0.5} s={1} wd={4} color="#f2efe8" lift={0.006} />)}
    {e && doorGaps(level, 'west').map(([a, b]) => <Ramp key={`rw${a}`} axis="x" at={r.x0} a={a - 0.5} b={b + 0.5} s={-1} wd={4} color="#f2efe8" lift={0.006} />)}
    <GravelDrive level={level} />
  </group>;
}
