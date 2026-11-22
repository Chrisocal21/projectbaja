import React, { useMemo } from 'react';
import { REAL_PLACES, projectPlace } from '../game/realPlaces.js';
import { highways, groundHeight } from './county.js';
import { border } from './border.js';
import { ranchFenceSites } from './roadsideFences.js';

const RURAL = new Set(['San Quintín', 'Guerrero Negro', 'Mulegé', 'Loreto', 'San Felipe', 'Todos Santos']);

export default function RegionalRanchFences() {
  const sites = useMemo(() => {
    const land = border();
    return ranchFenceSites(REAL_PLACES.filter(p => RURAL.has(p.name)), p => projectPlace(p.lat, p.lon, land.meta), highways(), land.waterAt, groundHeight);
  }, []);
  return <>{sites.map(site => <group key={site.name}>
    {site.posts.map((p, i) => <mesh key={i} position={[p.x, p.y + 0.8, p.z]} castShadow><boxGeometry args={[0.14, 1.6, 0.14]} /><meshStandardMaterial color="#876b4d" roughness={1} /></mesh>)}
    {[0, 1].flatMap(i => [0.55, 1.12].map(level => {
      const a = site.posts[i], b = site.posts[i + 1], midX = (a.x + b.x) / 2, midZ = (a.z + b.z) / 2;
      return <mesh key={i + ':' + level} position={[midX, (a.y + b.y) / 2 + level, midZ]} rotation={[0, site.h, 0]} castShadow><boxGeometry args={[0.08, 0.07, 18]} /><meshStandardMaterial color="#796147" roughness={1} /></mesh>;
    }))}
  </group>)}</>;
}
