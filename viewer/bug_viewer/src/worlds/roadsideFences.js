import { nearestRaceRoad, approachRoadPoint } from './raceFixtures.js';

/** Short rural fence runs set back from the mapped road and level enough to sit naturally. */
export function ranchFenceSites(places, project, network, waterAt, heightAt) {
  const paved = network.roads.filter(r => r.kind !== 'dirt' && r.kind !== 'ramp');
  const out = [];
  for (const place of places) {
    const hit = nearestRaceRoad(project(place), paved, 900);
    const before = hit && approachRoadPoint(hit, 180);
    if (!before) continue;
    const side = -1, offset = before.half + 20;
    const nx = Math.cos(before.h) * side, nz = -Math.sin(before.h) * side;
    const tx = Math.sin(before.h), tz = Math.cos(before.h);
    const x = before.x + nx * offset, z = before.z + nz * offset;
    const ends = [-18, 0, 18].map(d => ({ x: x + tx * d, z: z + tz * d }));
    if (ends.some(p => waterAt(p.x, p.z) != null || network.isNear(p.x, p.z, 8))) continue;
    const heights = ends.map(p => heightAt(p.x, p.z));
    if (Math.max(...heights) - Math.min(...heights) > 2.5) continue;
    out.push({ name: place.name, x, z, h: before.h, posts: ends.map((p, i) => ({ ...p, y: heights[i] })) });
  }
  return out;
}
