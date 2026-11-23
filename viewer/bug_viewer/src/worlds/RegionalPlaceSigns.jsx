import React, { useEffect, useMemo } from 'react';
import { useNearSites } from './drawDistance.js';
import { REAL_PLACES, projectPlace } from '../game/realPlaces.js';
import { highways, groundHeight } from './county.js';
import { border } from './border.js';
import { nearestRaceRoad, raceShoulder, approachRoadPoint } from './raceFixtures.js';
import { roadsideBoardTexture } from './raceSignTexture.js';

const MARKED = new Set(['Ensenada', 'San Quintín', 'Guerrero Negro', 'Santa Rosalía', 'Mulegé', 'Loreto', 'La Paz', 'Cabo San Lucas', 'Mexicali', 'San Felipe', 'Yuma', 'Ocotillo Wells', 'Plaster City', 'Tecate', 'Rosarito', 'Julian', 'Campo', 'Jacumba', 'Cataviña', 'El Rosario', 'Bahía de los Ángeles', 'Punta Prieta', 'San Ignacio', 'Ciudad Constitución', 'Los Barriles', 'San José del Cabo']);

function PlaceSign({ name, road, pose, approach = false }) {
  const map = useMemo(() => roadsideBoardTexture(name, approach ? 'ADELANTE' : road.toUpperCase()), [name, road, approach]);
  useEffect(() => () => map.dispose(), [map]);
  return <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.h, 0]}>
    {[-1.35, 1.35].map(x => <mesh key={x} position={[x, 1.6, 0]} castShadow><boxGeometry args={[0.1, 3.2, 0.1]} /><meshStandardMaterial color="#858075" metalness={0.5} roughness={0.7} /></mesh>)}
    <mesh position={[0, 2.65, 0.06]} castShadow><boxGeometry args={[3.4, 1.5, 0.09]} /><meshStandardMaterial map={map} roughness={0.86} /></mesh>
    <mesh position={[0, 2.65, -0.015]} castShadow><boxGeometry args={[3.48, 1.58, 0.05]} /><meshStandardMaterial color="#746f5f" metalness={0.25} roughness={0.9} /></mesh>
  </group>;
}

export default function RegionalPlaceSigns() {
  const signs = useMemo(() => {
    const network = highways(), land = border();
    if (!network || !land) return [];
    const paved = network.roads.filter(r => r.kind !== 'dirt' && r.kind !== 'ramp');
    return REAL_PLACES.filter(p => MARKED.has(p.name)).flatMap(place => {
      const at = projectPlace(place.lat, place.lon, land.meta);
      const road = nearestRaceRoad(at, paved, 900);
      const pose = road && raceShoulder(road, network, land.waterAt, groundHeight, 1, 5);
      if (!pose) return [];
      const signs = [{ name: place.name, road: road.road, pose: { ...pose, h: pose.h + Math.PI } }];
      const before = approachRoadPoint(road);
      const lead = before && raceShoulder(before, network, land.waterAt, groundHeight, 1, 5);
      if (lead && Math.hypot(lead.x - pose.x, lead.z - pose.z) > 100) signs.push({ name: place.name, road: road.road, pose: { ...lead, h: lead.h + Math.PI }, approach: true });
      return signs;
    });
  }, []);
  const near = useNearSites(useMemo(() => signs.map(s => ({ x: s.pose.x, z: s.pose.z })), [signs]));
  return <>{near.map(k => signs[k]).map(s => <PlaceSign key={s.name + (s.approach ? '-approach' : '')} {...s} />)}</>;
}
