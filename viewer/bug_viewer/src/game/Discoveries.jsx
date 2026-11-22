import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game } from './store.js';
import { buildDiscoverables, foundNow } from './discoveries.js';
import { setDiscoverables, discoverables, foundMap, markFound } from './explorer.js';
import { REAL_PLACES, projectPlace } from './realPlaces.js';
import { SITES, junctions, raceCourses } from '../worlds/county.js';
import { border } from '../worlds/border.js';
import { wreckSites } from './roadsideLoot.js';
import { WRECKS } from './projects.js';
import { gasBrand, gasIndexes } from '../worlds/brands.js';

// Names for the places already in the game (see docs/CANON.md; nothing new is invented): the garage and the places the county map is built around.
const PLACE_NAMES = { garage: "Walt's Garage", lot: "Honest Al's", gas: "Dusty's Fuel", barn: 'Hollis Farm barn', warehouse: 'The warehouse', proving: 'Proving Grounds', shack1: 'Canyon shack', shack2: 'Old shack', shack3: 'Far shack' };

/** Builds this world's list of things to find, and notices when you reach one. Renders nothing. */
export default function Discoveries() {
  const { camera } = useThree(), tick = useRef(0);
  useEffect(() => {
    const meta = border()?.meta, sites = junctions()?.roadside?.sites || [], idx = gasIndexes(sites);
    const towns = meta ? REAL_PLACES.map(p => ({ name: p.name, ...projectPlace(p.lat, p.lon, meta) })) : [];
    setDiscoverables(buildDiscoverables({
      towns, places: Object.entries(PLACE_NAMES).filter(([k]) => SITES[k]).map(([k, name]) => ({ id: k, name, x: SITES[k].x, z: SITES[k].z })),
      stops: sites.map((s, i) => (idx[i] >= 0 ? { ...s, name: `${gasBrand(idx[i]).name} station` } : s)), wrecks: wreckSites(sites).map((w, k) => ({ id: w.site, name: WRECKS[k % WRECKS.length].name, x: w.x, z: w.z })),
      courses: raceCourses(),
    }));
    return () => setDiscoverables([]);
  }, []);
  useFrame((_, dt) => {
    tick.current += dt; if (tick.current < 0.7 || game.paused) return; tick.current = 0;
    const p = game.onFoot ? camera.position : game.pos; if (!p || game.dev) return;
    markFound(foundNow(discoverables(), foundMap(), p.x, p.z));
  });
  return null;
}
