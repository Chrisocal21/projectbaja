// One draw-distance for everything that isn't terrain. Past DETAIL_RADIUS only the ground (and so the mountains) is drawn, hazed by the fog,
// like a photo of the distance: no signs, poles, reflectors, scenery or roads out there, which is what the frame time was going on.
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game } from '../game/store.js';

export const DETAIL_RADIUS = 650;

/** the indices of `sites` ({x, z}) within `radius` of you, re-checked as you move (a few times a second, only when you've moved 25 m). Stable between checks. */
export function useNearSites(sites, radius = DETAIL_RADIUS) {
  const { camera } = useThree(), last = useRef({ x: 1e9, z: 1e9, t: 0 }), [near, setNear] = useState(() => []);
  useFrame((_, dt) => {
    const l = last.current; l.t += dt; if (l.t < 0.4) return; l.t = 0;
    const p = game.onFoot ? camera.position : game.pos; if (!p || Math.hypot(p.x - l.x, p.z - l.z) < 25) return;
    l.x = p.x; l.z = p.z;
    const r2 = radius * radius, idx = [];
    for (let i = 0; i < sites.length; i++) { const dx = sites[i].x - p.x, dz = sites[i].z - p.z; if (dx * dx + dz * dz < r2) idx.push(i); }
    setNear(idx);
  });
  return near;
}
