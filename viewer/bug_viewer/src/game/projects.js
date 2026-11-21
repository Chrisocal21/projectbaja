// Restorable vehicles that are not the one you drive: donor wrecks and the El Cajon. Each has its OWN parts state (a build), a place in the world
// and the same strip-and-fit rules as the Bug (rules/restore.js takes the definition and the build, so it works on any of them).
//   game.projects = [{ uid, name, def: 'bug' | 'cajon', build, pose: { x, z, h } }]   saved with the game (an optional key: old saves just have none)
//   game.work     = the restorable vehicle you are standing at right now (set every frame by Walker): { id, active, def, build, pose, zone, lx, lz }
// Ids: the Bug is 'bug'; a project is 'p' + its uid. A project's build says which vehicle it is (build.def) so the rules never have to guess.
import { game, save } from './store.js';
import { SITES, toWorld, junctions } from '../worlds/county.js';
import { wreckSites } from './roadsideLoot.js';
import { defaultBuild, normalize } from '../build.js';
import { vehicleType } from './fleet.js';
import { BUG, VEHICLES } from '../rules/vehicles.js';

export const projectId = p => 'p' + p.uid;
export const defOf = p => VEHICLES[p?.def] || BUG;

/** the donors (PROPOSAL: placed just outside each site's levelled pad; what is missing is what is not worth taking back). Parts they still hold are real parts you can take. */
export const DONORS = [
  { name: "'68 Bug (body donor)", site: 'barn', lx: 28, lz: 0, ry: 0.5,   // the farm's rusting shell: panels, seats and glass, but no engine or wheels
    stripped: ['engine', 'battery', 'wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'], hidden: [] },
  { name: "'70 Bug (running-gear donor)", site: 'warehouse', lx: 28, lz: 0, ry: -0.4,   // behind the salvage warehouse: engine, battery and wheels, but the body is picked clean
    stripped: [], hidden: ['hoodPanel', 'doorL', 'doorR', 'windshield', 'fenderFL', 'fenderFR', 'frontBumperP', 'rearBumperP', 'seatDriver', 'seatPassenger', 'seatBack', 'headlights', 'dash', 'steering'] },
];

/** seed the donors once per save (home.projectsV); safe to call on every load */
export function ensureProjects() {
  if ((game.home.projectsV || 0) >= 1) return;
  const made = DONORS.map((d, i) => {
    const s = SITES[d.site], [x, z] = toWorld(s, d.lx, d.lz);
    return { uid: i + 1, name: d.name, def: 'bug', build: normalize({ ...defaultBuild(), stripped: d.stripped, hidden: d.hidden }), pose: { x, z, h: s.rot + d.ry } };
  });
  game.projects = [...(game.projects || []), ...made.filter(m => !(game.projects || []).some(p => p.uid === m.uid))];
  game.home = { ...game.home, projectsV: Math.max(1, game.home.projectsV || 0) };
  save();
}

/** wrecks at the roadside rest areas (once per save, home.projectsV 2): three kinds, so a long drive turns up a different mix of parts each time */
export const WRECKS = [
  { name: "'63 Bug (shell, seats and glass)", stripped: ['engine', 'battery', 'wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'], hidden: ['windshield', 'headlights', 'dash', 'steering'] },
  { name: "'72 Bug (engine and battery)", stripped: ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'], hidden: ['hoodPanel', 'doorL', 'doorR', 'windshield', 'fenderFL', 'fenderFR', 'frontBumperP', 'rearBumperP', 'seatDriver', 'seatPassenger', 'seatBack', 'headlights', 'dash', 'steering'] },
  { name: "'65 Bug (wheels, no motor)", stripped: ['engine', 'battery'], hidden: ['hoodPanel', 'doorL', 'doorR', 'fenderFL', 'fenderFR', 'frontBumperP', 'rearBumperP', 'seatBack', 'headlights'] },
];
export function ensureRoadsideWrecks() {
  if ((game.home.projectsV || 0) >= 2) return;
  game.home = { ...game.home, projectsV: 2 };
  const spots = wreckSites(junctions()?.roadside?.sites || []);
  spots.forEach((w, k) => { const d = WRECKS[k % WRECKS.length]; addProject({ uid: nextProjectUid(), name: d.name, def: 'bug', build: normalize({ ...defaultBuild(), stripped: d.stripped, hidden: d.hidden }), pose: { x: w.x, z: w.z, h: w.h } }); });
  save();
}

/** a uid no project has used (donors are 1 and 2) */
export const nextProjectUid = () => (game.projects || []).reduce((m, p) => Math.max(m, p.uid), 0) + 1;
/** add a project to the world (one save write is the caller's: wrap in transact when other state changes with it) */
export function addProject(p) { game.projects = [...(game.projects || []), p]; return p; }

/** the Bug as a work vehicle (it can be the active one or parked while another is driven) */
function bugVehicle() {
  if (!game.build || !(game.owned.has('car:bug') || game.dev)) return null;
  const t = vehicleType('bug'), pose = game.active === 'bug' ? game.pose : game.fleet.bug?.pose;
  return pose ? { id: 'bug', active: game.active === 'bug', def: BUG, build: game.build, pose, width: t.width, length: t.length } : null;
}
/** every restorable vehicle in the world that can be worked on, with where it is and its parts */
export const workVehicles = () => [bugVehicle(), ...(game.projects || []).map(p => { const d = defOf(p); return { id: projectId(p), active: false, uid: p.uid, name: p.name, def: d, build: p.build, pose: p.pose, width: d.width, length: d.length }; })].filter(Boolean);

/** change a project's parts (the Bug's build lives in game.build and is changed by main.jsx as before) */
export function setProjectBuild(uid, nb) { game.projects = game.projects.map(p => (p.uid === uid ? { ...p, build: nb } : p)); }

/** which covers (hood, lid, doors) are open on a project: not saved, they shut again when you leave (like the Bug's) */
export const projectOpen = uid => ((game.projectOpen ||= {})[uid] ||= new Set());
