import React, { Suspense, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { activeBuild } from './game/lights.js';
import { wearMods, FRESH, onLanding, onBottomOut, onHit, drive, effects, clues } from './wear.js';
import { bugAsleep } from './game/home.js';
import { startFuel, tankOf, burn, throttleCap, gaugeWord } from './rules/fuel.js';
import { useFrame, useThree } from '@react-three/fiber';
import { game, useGame, say } from './game/store.js';
import { exitHit } from './game/regions.js';
import { lookScale } from './game/settings.js';
import PerfHud from './game/PerfHud.jsx';
import Governor from './game/Governor.jsx';
import Discoveries from './game/Discoveries.jsx';
import GameObjects from './game/GameObjects.jsx';
import { applyGroundDetail, kindOf } from './worlds/groundDetail.js';
import * as THREE from 'three';
import { WORLD, TERRAIN_SEGMENTS, smooth, terrainHeight, terrainVertexHeight } from './terrain.js';
import * as TC from './worlds/testcenter.js';
import TestCenterScene from './worlds/TestCenter.jsx';
import * as CO from './worlds/county.js';
import CountyScene from './worlds/County.jsx';
import BorderScene from './worlds/Border.jsx';
import { border, loadBorder } from './worlds/border.js';
import DayNightSky from './worlds/DayNightSky.jsx';
import { sunDirection } from './worlds/clock.js';
import { clockHour, SUN_FOLLOW } from './game/clock.js';
import { propObstacles } from './game/home.js';
import { TRUNKS } from './worlds/biomes/trunks.js';
import { vehicleType, standingVehicles } from './game/fleet.js';
import TruckModel from './Truck.jsx';
import BuildModel from './BuildModel.jsx';
import CajonModel, { CajonCar } from './cajon/CajonModel.jsx';
import { defOf } from './game/projects.js';
import Walker from './game/Walker.jsx';
import RaceMarkers from './worlds/RaceMarkers.jsx';
import Items, { Cargo } from './game/Items.jsx';
import DeliveryTruck from './game/DeliveryTruck.jsx';
import { lightsLit } from './game/lights.js';
import VehicleCargo from './placement/VehicleCargo.jsx';   // vehicle cargo placement (Stage 3)
import { PLACEMENT } from './placement/flag.js';
import { OBSTACLES as SITE_OBSTACLES, BUG_SPOT, GARAGE_DRIVE } from './worlds/siteData.js';
import { STEP, createVehicleState, buildWheelRig, updateSuspensionVisual, wheelSteerAngle } from './suspension.js';
import { SURFACE_DATA, STD_ROLL, pressureEffect, TIRE } from './vehiclePhysics.js';
import { pad } from './game/gamepad.js';
import { createDust, dustiness } from './dust.js';
import { updateAudio, thump, clunk } from './audio.js';
import { steerAssist, speedFov, steerStep, steerRate } from './handling.js';
import { createRuts, rutDepth } from './ruts.js';
import { BUGGY } from './handlingProfiles.js';
import { createBody, stepBody, readBody, uprightBody, suspensionSpec } from './rigid.js';   // the car is one rigid body: see rigid.js

// ---------- terrain ----------
const STEER_FADE = 0.026;   // was 0.004 -> 0.02 -> 0.035: at 100 km/h the max wheel angle is about 0.35 rad (PROPOSAL, tune by feel)
const YAW_DAMP = 0.3;       // was 0.12: more yaw damping = fewer wobbles when you turn and let go
const HALF = WORLD / 2 - 6;  // drivable limit
export { terrainHeight } from './terrain.js';

// ---------- ground types: grip (mu), rolling resistance multiplier (rr), colour ----------
// grip and rolling resistance now come from catalog/physics.json (real coefficients; rr here = rrCoef / the sim's standard 0.03)
const SURF_COLOR = { dirt: '#a98c5a', sand: '#d6bd86', rock: '#7d7568', mud: '#5a4630' };
const SURF = Object.fromEntries(Object.keys(SURF_COLOR).map(k => [k, { name: SURFACE_DATA[k].name, mu: SURFACE_DATA[k].grip, rr: SURFACE_DATA[k].rrCoef / STD_ROLL, color: SURF_COLOR[k] }]));
for (const [k, v] of Object.entries(SURF)) v.key = k;
export function surfaceAt(x, z) {
  const h = terrainHeight(x, z);
  const slope = Math.abs(terrainHeight(x + 1, z) - h) + Math.abs(terrainHeight(x, z + 1) - h);
  const n = Math.sin(x * 0.013 + 1) * Math.cos(z * 0.011) + 0.5 * Math.sin(z * 0.021 - x * 0.009);
  if (Math.hypot(x, z) < 30) return SURF.dirt;
  if (slope > 0.9) return SURF.rock;
  if (h < -2.4 && n > -0.2) return SURF.mud;
  if (n > 0.4) return SURF.dirt;
  return SURF.sand;
}

function Terrain() {
  const geo = useMemo(() => {
    const seg = TERRAIN_SEGMENTS;
    const g = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3), kind = new Float32Array(pos.count * 2);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = terrainVertexHeight(i % (seg + 1), Math.floor(i / (seg + 1)));
      pos.setY(i, y);
      const slope = Math.abs(terrainHeight(x + 1, z) - y) + Math.abs(terrainHeight(x, z + 1) - y);
      const noise = (Math.sin(x * 1.7) * Math.sin(z * 1.9) * 0.025 + Math.sin(x * 0.23 + z * 0.17) * Math.sin(z * 0.31 - x * 0.11) * 0.05 + Math.sin(x * 4.1) * Math.sin(z * 3.7) * 0.012);
      kind.set(kindOf(surfaceAt(x, z)), i * 2);
      c.set(surfaceAt(x, z).color).multiplyScalar(1 - Math.min(0.35, slope * 0.25));
      c.offsetHSL(0, 0, noise);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aGround', new THREE.BufferAttribute(kind, 2));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => applyGroundDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { grain: 0.34, bump: 0.8, macro: 0.2, perVertex: true }), []);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

const ITEMS = (() => {
    let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const r = [], c = [];
    for (let i = 0; i < 260; i++) {
      const x = (rnd() - 0.5) * WORLD * 0.95, z = (rnd() - 0.5) * WORLD * 0.95;
      if (Math.hypot(x, z) < 18) continue;
      (rnd() < 0.65 ? r : c).push({ x, z, s: 0.5 + rnd() * 1.6, r: rnd() * 6 });
    }
    return { r, c };
})();
// solid obstacles (x, z, radius) the car collides with
const SHOW_SCENERY = false;   // rocks + cacti off for testing (flip to true to bring them back, collisions included)
const OBSTACLES = !SHOW_SCENERY ? [] : [...ITEMS.r.map(p => [p.x, p.z, p.s * 1.1, terrainHeight(p.x, p.z) + p.s * 0.95]),
  ...ITEMS.c.map(p => [p.x, p.z, 0.3 * p.s + 0.15, terrainHeight(p.x, p.z) + p.s * 2])];

function Scenery() {
  const rocks = useRef(), cacti = useRef();
  const items = ITEMS;
  useEffect(() => {
    const m = new THREE.Object3D();
    items.r.forEach((p, i) => { m.position.set(p.x, terrainHeight(p.x, p.z) + p.s * 0.25, p.z); m.scale.set(p.s, p.s * 0.7, p.s * 1.2); m.rotation.set(0, p.r, 0); m.updateMatrix(); rocks.current.setMatrixAt(i, m.matrix); });
    items.c.forEach((p, i) => { m.position.set(p.x, terrainHeight(p.x, p.z) + p.s, p.z); m.scale.set(0.35 * p.s, p.s * 2, 0.35 * p.s); m.rotation.set(0, p.r, 0); m.updateMatrix(); cacti.current.setMatrixAt(i, m.matrix); });
    rocks.current.instanceMatrix.needsUpdate = cacti.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <>
    <instancedMesh ref={rocks} args={[null, null, items.r.length]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#8a8377" roughness={0.95} /></instancedMesh>
    <instancedMesh ref={cacti} args={[null, null, items.c.length]} castShadow><cylinderGeometry args={[0.6, 0.8, 1, 14]} /><meshStandardMaterial color="#5f7a43" roughness={0.9} /></instancedMesh>
  </>;
}

// ---------- vehicle ----------
export const DEFAULT_DIMS = {
  wheelbase: 2.38, track: 1.5, cabEye: [0.31, 1.32, -0.15], lift: 0, bellyHeight: 0.28, offroad: true, handling: BUGGY,
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({
    name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19],
  })),
};
// cab eye: driver's eye in vehicle space (steering wheel is at x=+0.3, z=0.25..0.5) — tune per model
const PARK = { Space: true };
const MAX_SPEED = 32;        // m/s (~115 km/h)
const ACCEL = 11, BRAKE = 22, DRAG = 0.012, ROLL_RES = 0.9, G = 9.81;

function useKeys() {
  const keys = useRef({});
  useEffect(() => {
    const dn = e => {
      keys.current[e.code] = true;
      if (e.code === 'KeyR' && !e.repeat && !game.flyMode) keys.current.reset = true;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = e => { keys.current[e.code] = false; };
    const blur = () => { keys.current = {}; };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  return keys;
}


// ---- race: drive the gates in order, fastest lap is saved ----
const GATES = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 2, r = 85 + (i % 2) * 25; return [Math.cos(a) * r, Math.sin(a) * r]; });
const bestKey = 'baja-best-lap';
const readBest = () => { try { return +localStorage.getItem(bestKey) || 0; } catch { return 0; } };
const newRace = () => ({ next: 0, t: 0, running: false, laps: 0, last: 0, best: readBest(), flash: 0 });

function Gates({ race }) {
  const mats = useRef([]);
  useFrame(() => { mats.current.forEach((m, i) => { if (!m) return; const on = i === race.current.next; m.color.set(on ? '#ffd23f' : '#3a6ea5'); m.opacity = on ? 0.95 : 0.35; }); });
  return <>{GATES.map(([x, z], i) => <mesh key={i} position={[x, terrainHeight(x, z) + 3.2, z]} rotation={[0, Math.atan2(-x, -z) + Math.PI / 2, 0]}>
    <torusGeometry args={[3.4, 0.28, 8, 28]} /><meshBasicMaterial ref={m => (mats.current[i] = m)} transparent depthWrite={false} /></mesh>)}</>;
}

/** two headlight beams on the front of the vehicle (L). Real lights only while on, so the shader only pays for them then. */
function Headlights({ dims }) {
  useGame();
  // Two spotlights, always mounted: adding or removing a light changes every material's shader and froze the game for seconds when you pressed L.
  // Off is intensity 0 (the shaders were built at load); the mode only changes how the two beams are set.
  const { head, bar } = lightsLit();
  const fl = dims.mounts?.find(m => m.name === 'FL'), fz = fl ? fl.center[2] : 1.5, dir = fz >= 0 ? 1 : -1, z = fz + dir * 0.9, spread = (dims.track || 1.6) * 0.32;
  const targets = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
  const beam = bar && head ? { y: 1.2, zz: dir * 0.9, color: '#f4f6ff', intensity: 520, distance: 150, angle: 0.48, ahead: 40 }   // headlights + roof bar together
    : bar ? { y: 1.5, zz: dir * 0.4, color: '#eaf3ff', intensity: 420, distance: 150, angle: 0.42, ahead: 45 }                       // roof bar only: cool white, high, long
    : head ? { y: 0.75, zz: z, color: '#fff1d0', intensity: 300, distance: 90, angle: 0.5, ahead: 22 }                                  // headlights
    : { y: 0.75, zz: z, color: '#fff1d0', intensity: 0, distance: 90, angle: 0.5, ahead: 22 };
  return <>{[-1, 1].map((side, i) => <React.Fragment key={side}>
    <spotLight position={[side * spread * (bar ? 0.7 : 1), beam.y, beam.zz]} target={targets[i]} color={beam.color} intensity={beam.intensity} distance={beam.distance} decay={1.4} angle={beam.angle} penumbra={0.55} />
    <primitive object={targets[i]} position={[side * spread * 0.6, -0.5, beam.zz + dir * beam.ahead]} />
  </React.Fragment>)}</>;
}

function Vehicle({ children, hud, dims, race, sun }) {
  const world = useContext(WorldCtx), HALF = world.half, GATES = world.gates;
  const spawnState = () => { const st = createVehicleState(); st.rb = null; st.x = world.spawn.x; st.z = world.spawn.z; st.h = world.spawn.h; st.y = world.height(st.x, st.z) + 0.3; return st; };
  const WHEELBASE = dims.wheelbase, CAB_EYE = dims.cabEye;
  const MAXV = dims.topSpeed || 40, ACC = ACCEL * (dims.accelMul || 1), DRG = 0.3 * ACC / (MAXV * MAXV);   // top speed and power come from the build (engine + exhaust mods)
  const group = useRef();
  const keys = useKeys();
  const { camera, gl } = useThree();
  const look = useRef({ yaw: 0, pitch: 0.28, dist: 9, drag: false, idle: 0 });
  const s = useRef(null);
  const shake = useRef(0);   // camera kick from hard landings and bottoming out
  const dustFx = useMemo(() => createDust(), []), dustAcc = useRef([0, 0, 0, 0]), dustTouch = useRef([true, true, true, true]);
  useEffect(() => () => dustFx.dispose(), [dustFx]);
  const sprayAcc = useRef([0, 0, 0, 0]);
  const rutFx = useMemo(() => createRuts(), []), rutLast = useRef([null, null, null, null]);
  useEffect(() => () => rutFx.dispose(), [rutFx]);
  if (!s.current) {
    s.current = spawnState();
    const at = game.keepPose && (game.spawnAt || game.pose);   // a vehicle swap carries its own spawn spot: the car you just left is still writing game.pose every frame until it unmounts
    if (at) { Object.assign(s.current, { x: at.x, z: at.z, h: at.h, y: world.height(at.x, at.z) + 0.5 }); game.keepPose = false; game.spawnAt = null; }
  }
  useEffect(() => {   // number keys teleport between test-center areas
    const tp = e => { if (!game.dev || game.paused) return; const w = world.spawns.find(p => e.code === 'Digit' + p.key || e.code === p.code); if (!w) return; Object.assign(s.current, spawnState(), { x: w.x, z: w.z, h: w.h, y: world.height(w.x, w.z) + 0.5 }); camPos.current.set(w.x - Math.sin(w.h) * 10, 4, w.z - Math.cos(w.h) * 10); };
    window.addEventListener('keydown', tp); return () => window.removeEventListener('keydown', tp);
  }, [world]);
  useEffect(() => { window.__baja = s.current; }, []);   // telemetry hook for tests
  useEffect(() => {   // arriving in a new region: appear at its arrival spot with the speed you had
    const a = game.arrive; if (!a || a.done) return; a.done = true;
    Object.assign(s.current, spawnState(), { x: a.x, z: a.z, h: a.h, y: world.height(a.x, a.z) + 0.5, v: a.v || 0 }); camPos.current.set(a.x - Math.sin(a.h) * 10, 4, a.z - Math.cos(a.h) * 10);
    game.arrive = null; game.travelling = false;
  }, [world.id]);
  const cab = useRef(false), wasFoot = useRef(false);
  const fly = useRef({ active: false, yaw: 0, pitch: 0 });
  const rig = useRef(null);
  const camPos = useRef(new THREE.Vector3(0, 4, -16));

  useEffect(() => {
    rig.current = buildWheelRig(group.current, dims.mounts);   // once per car: the rig re-parents wheel meshes, so wheel/steering changes re-create the car (vehKey)
    console.info(`[drive] rigged ${rig.current.wheels.length} visible wheels`);
  }, []);

  useEffect(() => {
    camera.far = world.far || 700; camera.fov = 60; camera.near = 0.1; camera.updateProjectionMatrix();
    return () => { camera.far = 100; camera.fov = 43; camera.near = 0.05; camera.updateProjectionMatrix(); };
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement, l = look.current;
    const lock = () => { if (!game.paused && document.pointerLockElement !== el) { try { const r = el.requestPointerLock(); r?.catch?.(() => {}); } catch {} } };
    const move = e => { if (document.pointerLockElement !== el) return; const [kx, ky] = lookScale(); if (game.flyMode) { fly.current.yaw -= e.movementX * 0.003 * kx; fly.current.pitch = Math.max(-1.48, Math.min(1.48, fly.current.pitch - e.movementY * 0.003 * ky)); return; } l.yaw -= e.movementX * 0.004 * kx; l.yaw = Math.atan2(Math.sin(l.yaw), Math.cos(l.yaw)); l.pitch = Math.max(-0.1, Math.min(1.3, l.pitch + e.movementY * 0.004 * ky)); l.idle = 0; };
    const wheel = e => { e.preventDefault(); l.dist = Math.max(4, Math.min(22, l.dist * (1 + e.deltaY * 0.001))); };
    const cabKey = e => { if (e.code === 'KeyC' && !e.repeat) { cab.current = !cab.current; l.yaw = 0; l.pitch = 0.28; l.idle = 0; } };
    window.addEventListener('keydown', cabKey);
    lock();                                   // works right after the Drive click (recent user gesture)
    const key = e => { if (e.code !== 'Escape' && e.code !== 'KeyP') lock(); };
    window.addEventListener('keydown', key);  // any key re-captures if the browser refused / Esc was pressed
    el.addEventListener('pointerdown', lock); window.addEventListener('mousemove', move);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', lock); window.removeEventListener('mousemove', move); window.removeEventListener('keydown', key); window.removeEventListener('keydown', cabKey); el.removeEventListener('wheel', wheel); if (document.pointerLockElement === el) document.exitPointerLock(); };
  }, [gl]);

  // A car you have walked away from and that has fully settled does not need physics: the suspension samples the real-map ground about 1,500 times per frame
  // (4 wheels x 4 passes x 39 points, each a costly height query), which was ~40% of the frame while you stood in the yard. It wakes the moment you get in
  // or anything moves it (the test is "same place as last step", so a teleport, fly mode or a push all wake it).
  function simGuarded(dt) {
    const st = s.current, r = st.rest, near = r && Math.abs(r.x - st.x) < 1e-3 && Math.abs(r.z - st.z) < 1e-3 && Math.abs(r.h - st.h) < 1e-3 && Math.abs(r.y - st.y) < 0.02;   // a parked Bug still creeps a few cm: "the same place" is within 2 cm
    if (game.onFoot && !fly.current.active && near && r.n >= 20 && !st.air && !st.rolled) return;
    sim(dt);
    const still = game.onFoot && Math.abs(st.v) < 0.02 && Math.abs(st.lateralV) < 0.02 && Math.abs(st.yr) < 0.01 && Math.abs(st.vy) < 0.3 && !st.air && !st.rolled;
    st.rest = still && near ? { ...r, n: r.n + 1 } : { x: st.x, z: st.z, h: st.h, y: st.y, n: 0 };
  }
  const sim = dt => {   // one fixed physics step
    const k = game.onFoot ? PARK : keys.current, st = s.current;   // a parked car sits on its handbrake
    { const ex = !game.travelling && !game.onFoot && exitHit(world.id, st.x, st.z, game.dev); if (ex) { game.travelling = true; game.arrive = { ...ex.arrive, v: st.v, to: ex.to }; window.dispatchEvent(new CustomEvent('baja-travel', { detail: { to: ex.to } })); } }   // region exit (game/regions.js): drive into it and the next region loads
    const tr = dims.tire || { mu: 1, rr: 1, surf: {} }, sf0 = world.surface(st.x, st.z), psiFx = pressureEffect(game.home?.tirePsi ?? TIRE.streetPsi, sf0.key), tmu = sf0.mu * psiFx.grip * tr.mu * (tr.surf[sf0.gk || sf0.key] ?? 1) * 1.5;   // 1.5 = base off-road tire grip (was 1.25: more grip, Nov 21); psiFx: tire pressure (physics.json)
    const wade = world.waterDepth ? Math.min(1.2, world.waterDepth(st.x, st.z)) : 0; st.wade = wade;   // in a creek or river: water drags the car and the tires slip
    const sf = { name: wade > 0.05 ? 'Water crossing' : sf0.name, mu: tmu * (1 - 0.4 * Math.min(1, wade / 0.4)), rr: sf0.rr * psiFx.rr * tr.rr * (1 + 6 * Math.min(1, wade / 0.5)) }, grip = tmu / 0.7; st.surface = sf.name; st.sfKey = sf0.key; st.sfColor = sf0.color; const v0 = st.v;
    if (k.reset && st.rolled && st.rb) { uprightBody(st.rb, dims); k.reset = false; st.rolledT = 0; }   // R on a rolled car: the crew stands it back up where it lies
    if (k.reset) {
      Object.assign(st, spawnState()); race.current = newRace(); k.reset = false;
      rig.current.wheels.forEach(w => { w.spin.rotation.x = 0; });
      camPos.current.set(0, 4, -16);
    }

    const WEAR = (game.home.wear ||= {}), wr = (WEAR[game.active] ||= FRESH()), wfx = effects(wr), wmods = wearMods(activeBuild());   // wear (wear.js): worn shocks, tires, alignment and engine change how the car drives
    if (!game.onFoot) { drive(wr, dt, { speed: st.v, rough: sf0.key === 'asphalt' ? 0 : 0.5, hot: !!st.engHot, wading: st.wade || 0 }, wmods); st.clueT = (st.clueT ?? 20) - dt; if (st.clueT <= 0) { st.clueT = 45; const c = clues(wr, game.home?.tirePsi ?? 30)[0]; if (c) say(c); } }
    if (wade > 0.05) st.wetT = 7; else if (st.wetT > 0) { st.wetT -= dt; if (st.wetT <= 0) say('The brakes have dried out and bite again.'); }   // wet brakes: weak for a few seconds after a crossing (fades back in)
    const wetK = st.wetT > 0 ? 1 - 0.6 * Math.min(1, st.wetT / 3) : 1;
    const throttle0 = bugAsleep() ? 0 : Math.max(-1, Math.min(1, (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + pad.throttle));   // grandma's Bug won't pull until she's fired once
    st.deep = wade > 0.7 ? (st.deep || 0) + dt : Math.max(0, (st.deep || 0) - dt * 0.5);   // deep water: the engine drowns after a moment, then restarts when you are out and it has dried (a few seconds)
    if (st.deep > 1.2 && !(st.drown > 0) && !game.onFoot) { st.drown = 4; const W0 = game.home.wear[game.active]; if (W0) W0.engine = Math.min(1, W0.engine + 0.03); say('Water in the intake: the engine drowned. Get out of the deep water and give it a few seconds.'); }
    if (st.drown > 0 && wade < 0.5) st.drown -= dt;
    // fuel (rules/fuel.js): driving burns the tank; empty leaves a limp throttle so you are never stranded; the pump fills it
    const FUEL = (game.home.fuel ||= {}), fid = game.active; if (typeof FUEL[fid] !== 'number') FUEL[fid] = startFuel(fid);
    if (!game.onFoot && !bugAsleep()) FUEL[fid] = Math.max(0, FUEL[fid] - burn(throttle0, dt));
    const fcap = tankOf(fid), flow = FUEL[fid] / fcap, fword = gaugeWord(FUEL[fid], fcap);
    if (bugAsleep()) { st.fuelEmpty = false; st.fuelLow = false; } else if (fword === 'EMPTY' && !st.fuelEmpty) { st.fuelEmpty = true; say('Out of fuel: she is running on fumes. Limp to a pump and fill up.'); }
    else if (fword === 'LOW' && !st.fuelLow) { st.fuelLow = true; say('The fuel is getting low.'); }
    if (flow > 0.2) { st.fuelLow = false; st.fuelEmpty = false; } else if (fword !== 'EMPTY') st.fuelEmpty = false;
    const throttle = (st.drown > 0 ? 0 : throttle0) * (game.onFoot ? 1 : throttleCap(FUEL[fid])); st.thr = throttle;
    const steerIn = Math.max(-1, Math.min(1, (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0) + (game.onFoot ? 0 : pad.steer)));   // keyboard, or the controller stick (analog)
    // --- steering: the wheel angle fades with speed; what the car does with it is up to the tires ---
    const maxSteer = 0.7 / (1 + Math.abs(st.v) * STEER_FADE);
    st.aid = (st.aid || 0) + ((game.onFoot ? 0 : steerAssist(st.lateralV, st.v, steerIn)) - (st.aid || 0)) * Math.min(1, dt * 3.5);   // the catch-a-slide help, smoothed so it can't ring against the car
    st.steer = steerStep(st.steer, steerIn * maxSteer + st.aid, dt, steerRate(steerIn !== 0, st.v, pad.on && !game.onFoot && Math.abs(pad.steer) > 0, psiFx.steerLag));   // hands on the wheel: limited turning rate, eased, no overshoot
    // --- the car is one rigid body (rigid.js): spring-damper wheels, friction-circle tires, a shell that lies on the ground when it rolls ---
    if (!st.rb) st.rb = createBody(dims, st);
    const rb = st.rb;
    stepBody(rb, dims, { throttle, brake: !!k.Space, steer: st.steer + (game.onFoot ? 0 : wfx.pull) }, { height: world.height, mu: sf.mu * wfx.grip, rr: sf.rr, ACC: ACC * wfx.power, MAXV, DRG, diff: game.home?.diff, damp: wfx.damp, dampC: wfx.dampC, gripC: wfx.gripC, rrC: wfx.rrC, brake: wetK }, dt);
    if (game.onFoot && rb.contacts >= 3 && rb.vel.length() < 0.15 && rb.w.length() < 0.15) { rb.vel.set(0, 0, 0); rb.w.set(0, 0, 0); }   // parked: sit still
    if (wade > 0.05 && world.waterFlow && !game.onFoot) { const fl = world.waterFlow(st.x, st.z); if (fl) { const a = 1.6 * fl.k * Math.min(1, wade / 0.5) * dt; rb.vel.x += fl.x * a; rb.vel.z += fl.z * a; } }   // the current pushes the car downstream (rivers harder than creeks)
    readBody(rb, st);
    // landings and bottoming out: feedback now, and a running tally the wear system will read (game.home.stress)
    { const landed = st.wasAir && !st.air, imp = landed ? Math.max(0, -(st.prevVy || 0)) : 0, full = suspensionSpec(dims).compression;
      st.cool = Math.max(0, (st.cool || 0) - dt);
      if (imp > 4.5 && !game.onFoot) { WEAR[game.active] = onHit(onLanding(wr, imp, wmods), { imp, corner: (rb.wheels || []).reduce((a, w) => (!a || w.travel > a.travel ? w : a), null)?.name, rock: sf0.key === 'rock', pinch: psiFx.pinch }); thump(imp);   // a hard hit can blow the damper or puncture the tire at that corner
         st.impact = imp; st.impactT = 1.3; shake.current = Math.min(1, Math.max(shake.current, imp / 11)); game.home = { ...game.home, stress: { ...(game.home.stress || {}), landings: ((game.home.stress || {}).landings || 0) + 1, hardest: Math.max((game.home.stress || {}).hardest || 0, +imp.toFixed(1)) } }; }
      const bottom = rb.travel.some(t => t > full * 0.96);
      if (bottom && !st.cool && !game.onFoot) { WEAR[game.active] = onBottomOut(WEAR[game.active] || wr, wmods); clunk(); st.cool = 0.5; st.bottomT = 1.0; shake.current = Math.max(shake.current, 0.35); game.home = { ...game.home, stress: { ...(game.home.stress || {}), bottomOuts: ((game.home.stress || {}).bottomOuts || 0) + 1 } }; }
      st.impactT = Math.max(0, (st.impactT || 0) - dt); st.bottomT = Math.max(0, (st.bottomT || 0) - dt);
      st.wasAir = st.air; st.prevVy = st.vy; }
    const fx = Math.sin(st.h), fz = Math.cos(st.h), rx = fz, rz = -fx, ox = st.x, oz = st.z, ov = st.v;
    // solid rocks and cacti: two body circles (nose + tail) pushed out of every obstacle, speed killed on impact
    for (const off of [WHEELBASE * 0.4, -WHEELBASE * 0.4]) for (const [ox, oz, or, top] of [...world.obstacles, ...(world.trunks ? world.trunks(st.x, st.z) : [])]) {
      if (st.y + dims.bellyHeight > top) continue;
      const cx = st.x + fx * off, cz = st.z + fz * off, dx = cx - ox, dz = cz - oz, min = or + 0.85;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-4) {
        st.x += (dx / d) * (min - d); st.z += (dz / d) * (min - d);
        if (st.v * (fx * dx + fz * dz) < 0) st.v *= 0.25;   // moving towards the obstacle
      }
    }
    { const bd = world.bounds || { x0: -HALF, x1: HALF, z0: -HALF, z1: HALF }; st.x = Math.max(bd.x0, Math.min(bd.x1, st.x)); st.z = Math.max(bd.z0, Math.min(bd.z1, st.z)); }   // (county: a rectangle, the south side is open: worlds/world.js DRIVE)

    if (st.x !== ox || st.z !== oz) { rb.c.x += st.x - ox; rb.c.z += st.z - oz; }   // pushed out of a rock or the map edge
    if (ov !== st.v && Math.abs(ov) > 1e-3) { const f = st.v / ov; rb.vel.x *= f; rb.vel.z *= f; }
    if ((st.upY < 0.5 || st.rolled) && Math.hypot(st.v, st.lateralV) < 1.2 && rb.w.length() < 1) {   // lying still on its side or roof: the crew stands it back up after a moment
      st.rolledT = (st.rolledT || 0) + dt;
      if (st.rolledT > 3) { uprightBody(rb, dims); st.rolledT = 0; }
    } else st.rolledT = 0;
    const g = group.current;
    g.position.set(st.x, st.y, st.z);
    g.quaternion.copy(st.rb.q);
    if (!game.onFoot) {
      if (world.id === 'county') { const [dx, dy, dz] = sunDirection(clockHour()); sun.current.position.set(st.x + dx * SUN_FOLLOW, st.y + dy * SUN_FOLLOW, st.z + dz * SUN_FOLLOW); }
      else sun.current.position.set(st.x + 30, st.y + 45, st.z + 20);
      sun.current.target.position.set(st.x, st.y, st.z);
      sun.current.target.updateMatrixWorld();
    }
    if (rig.current) {
      for (const w of rig.current.wheels) {
        w.steer.position.copy(st.wheels.find(h => h.name === w.name).hub);
        w.spin.rotation.x += st.v / w.r * dt;
        w.steer.rotation.y = wheelSteerAngle(st.steer, w.name, dims);
      }
      if (rig.current.suspension) updateSuspensionVisual(rig.current.suspension, st.wheels);
      if (rig.current.wheel) rig.current.wheel.rotation.z = -st.steer * 3.5;
    }

    // --- chase camera (mouse orbit; eases back behind the car when idle) ---
    const l = look.current;
    if (game.onFoot) { wasFoot.current = true; } else {
    if (wasFoot.current) { wasFoot.current = false; l.yaw = 0; l.pitch = 0.28; camera.rotation.order = 'XYZ'; camPos.current.copy(camera.position); }
    if (pad.on && (pad.lookX || pad.lookY)) { const [kx, ky] = lookScale(); l.yaw -= pad.lookX * dt * 2.8 * kx; l.yaw = Math.atan2(Math.sin(l.yaw), Math.cos(l.yaw)); l.pitch = Math.max(-0.1, Math.min(1.3, l.pitch + pad.lookY * dt * 1.8 * ky)); l.idle = 0; }   // right stick orbits the camera like the mouse
    { l.idle += dt; if (l.idle > 2.5) { l.yaw -= l.yaw * Math.min(1, dt * 2.5); l.pitch += (0.28 - l.pitch) * Math.min(1, dt * 2.5); } }
    const wantFov = cab.current ? 78 + Math.min(10, Math.max(0, Math.abs(st.v) - 12) * 0.3) : speedFov(60, st.v);   // wider with speed
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    if (cab.current) {
      // cab view: head sits at the driver's eye, mouse turns your head, eases back to straight ahead
      l.yaw = Math.max(-2.2, Math.min(2.2, l.yaw)); l.pitch = Math.max(-0.5, Math.min(1.0, l.pitch));
      group.current.updateMatrixWorld(true);
      camera.position.copy(group.current.localToWorld(new THREE.Vector3(...CAB_EYE)));
      const head = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(l.pitch - 0.28), l.yaw + Math.PI, 0, 'YXZ'));
      camera.quaternion.copy(group.current.quaternion).multiply(head);
      camPos.current.copy(camera.position);
    } else {
    const ang = st.h + Math.PI + l.yaw;                       // direction from car to camera
    const d = l.dist + Math.min(4, Math.abs(st.v) * 0.1), cp = Math.cos(l.pitch);
    const dH = d * cp, rx = camPos.current.x - st.x, rz = camPos.current.z - st.z, kk = Math.min(1, dt * 10);
    let ca = Math.atan2(rx, rz), cd = Math.hypot(rx, rz);   // where the camera is now, as an angle and distance round the car
    if (cd < 0.5) { ca = ang; cd = dH; }
    let da = ang - ca; da = Math.atan2(Math.sin(da), Math.cos(da));   // shortest way round (a straight blend would cut through the car and flip the view)
    ca += da * kk; cd += (dH - cd) * kk;
    const ty = Math.max(st.y + 1.4 + Math.sin(l.pitch) * d, world.height(st.x + Math.sin(ang) * dH, st.z + Math.cos(ang) * dH) + 1.0);
    camPos.current.set(st.x + Math.sin(ca) * cd, camPos.current.y + (ty - camPos.current.y) * kk, st.z + Math.cos(ca) * cd);
    camPos.current.y = Math.max(camPos.current.y, world.height(camPos.current.x, camPos.current.z) + 0.8);
    camera.position.copy(camPos.current);
    if (shake.current > 0.01) { const k = shake.current * 0.28; camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; camera.position.z += (Math.random() - 0.5) * k; shake.current *= Math.max(0, 1 - dt * 5); }
    camera.lookAt(st.x, st.y + 1.2, st.z);
    }
    }

    const rc = race.current;
    if (!rc.running && Math.abs(st.v) > 1) rc.running = true;
    if (rc.running) rc.t += dt;
    const [gx, gz] = GATES.length ? GATES[rc.next] : [1e9, 1e9];
    if (GATES.length && Math.hypot(st.x - gx, st.z - gz) < 7) {
      rc.next++;
      if (rc.next >= GATES.length) {
        rc.next = 0; rc.laps++; rc.last = rc.t; rc.flash = 4;
        if (!rc.best || rc.t < rc.best) { rc.best = rc.t; try { localStorage.setItem(bestKey, String(rc.t)); } catch {} }
        rc.t = 0;
      }
    }
    rc.flash = Math.max(0, rc.flash - dt);
    const f = n => (n ? n.toFixed(1) + 's' : '--');
    game.speed = st.v;
    { const st = s.current; updateAudio({ on: !game.onFoot && !game.paused && !game.travelling, rpm: st.rpm, throttle: st.thr || 0, speed: st.v, slip: Math.min(1, st.slip || 0), loose: dustiness(st.sfKey), air: st.air, wade: st.wade || 0 }); }
    if (hud.current) { const html = game.onFoot ? '' : `<b>${Math.round(Math.abs(st.v) * 2.23694)}</b><i>MPH</i><small>top ${Math.round(MAXV * 2.23694)} · FUEL ${Math.round(FUEL[game.active] ?? 0)} L${gaugeWord(FUEL[game.active] ?? 0, tankOf(game.active)) ? ' ' + gaugeWord(FUEL[game.active] ?? 0, tankOf(game.active)) : ''} · ${st.surface}${st.slip > 0.14 ? ' · SLIDING' : ''}${st.air ? ' · AIRBORNE' : ''}${st.rolled ? ' · ROLLED (R to stand it up)' : ''}${st.impactT > 0 ? (st.impact > 8 ? ' · HARD LANDING' : ' · LANDED') : ''}${st.bottomT > 0 ? ' · BOTTOMED OUT' : ''}${st.wade > 0.05 ? ' · WADING ' + Math.round(st.wade * 100) + ' cm' : st.wetT > 0 ? ' · WET BRAKES' : ''}${st.drown > 0 ? ' · ENGINE DROWNED' : ''}${st.gear ? ' · G' + st.gear + ' ' + Math.round(st.rpm / 100) * 100 + ' rpm' : ''}${st.engHot ? (st.engDerate < 1 ? ' · ENGINE OVERHEATING: LOSING POWER' : ' · ENGINE HOT: ease off, keep moving for air') : ''}` + (GATES.length ? `  |  Gate ${rc.next + 1}/${GATES.length}  ${rc.t.toFixed(1)}s  |  Best ${f(rc.best)}${rc.flash > 0 ? `  |  LAP ${f(rc.last)}${rc.last === rc.best ? ' NEW BEST!' : ''}` : ''}` : `  |  ${world.area(st.x, st.z)}${game.dev ? '  |  keys 0-9 - = [ ] teleport' : ''}`) + '</small>'; if (hud.current.__h !== html) { hud.current.__h = html; hud.current.innerHTML = html; } }
  };
  // fixed 120 Hz physics: frame-rate independent springs/tires; at most 5 catch-up steps per frame (no spiral of death)
  const acc = useRef(0);
  useFrame((_, rawDt) => {
    if (!rig.current || game.paused) return;
    if (game.carTo) { const t = game.carTo; game.carTo = null; Object.assign(s.current, spawnState(), { x: t.x, z: t.z, h: t.h, y: world.height(t.x, t.z) + 0.5, v: 0 }); camPos.current.set(t.x - Math.sin(t.h) * 10, 4, t.z - Math.cos(t.h) * 10); }   // Admin > Teleport: bring the car along while you are on foot
    if (game.teleportTo && !game.onFoot) { const t = game.teleportTo; game.teleportTo = null; Object.assign(s.current, spawnState(), { x: t.x, z: t.z, h: t.h, y: world.height(t.x, t.z) + 0.5, v: 0 }); camPos.current.set(t.x - Math.sin(t.h) * 10, 4, t.z - Math.cos(t.h) * 10); }   // Admin > Races: go to a course
    if (game.flyMode) {
      const f = fly.current, dt = Math.min(rawDt, 0.05);
      if (!f.active) {
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        f.yaw = Math.atan2(dir.x, dir.z); f.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
        camera.position.y = Math.max(camera.position.y + 12, world.height(camera.position.x, camera.position.z) + 15);
        f.active = true; acc.current = 0;
      }
      const k = keys.current, forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      const side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const rise = (k.Space || k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0);
      const speed = (k.ShiftLeft || k.ShiftRight ? 240 : 65) * dt / Math.max(1, Math.hypot(forward, side, rise));
      const cp = Math.cos(f.pitch);
      camera.position.x += (Math.sin(f.yaw) * cp * forward - Math.cos(f.yaw) * side) * speed;
      camera.position.z += (Math.cos(f.yaw) * cp * forward + Math.sin(f.yaw) * side) * speed;
      camera.position.y += (Math.sin(f.pitch) * forward + rise) * speed;
      const bounds = world.bounds;
      if (bounds) { camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.x0, bounds.x1); camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.z0, bounds.z1); }
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, world.height(camera.position.x, camera.position.z) + 2, 1500);
      camera.lookAt(camera.position.x + Math.sin(f.yaw) * cp, camera.position.y + Math.sin(f.pitch), camera.position.z + Math.cos(f.yaw) * cp);
      game.flyYaw = f.yaw;
      const [sx, sy, sz] = sunDirection(clockHour());
      sun.current.position.set(camera.position.x + sx * SUN_FOLLOW, camera.position.y + sy * SUN_FOLLOW, camera.position.z + sz * SUN_FOLLOW);
      sun.current.target.position.copy(camera.position); sun.current.target.updateMatrixWorld();
      game.pos.x = camera.position.x; game.pos.z = camera.position.z;
      return;
    }
    if (fly.current.active) {
      fly.current.active = false; acc.current = 0;
      game.flyYaw = null;
      if (!game.onFoot) {
        camPos.current.set(s.current.x - Math.sin(s.current.h) * 9, s.current.y + 4, s.current.z - Math.cos(s.current.h) * 9);
        camera.position.copy(camPos.current); look.current.yaw = 0; look.current.pitch = 0.28;
      }
    }
    // every frame advances the physics by exactly its own time, in 1-5 equal sub-steps of at most 1.2/120 s: no leftover time, so the car and camera move smoothly at any refresh rate (a fixed 120 Hz step against a 144 Hz screen made them judder)
    { const t0 = performance.now(), dtF = Math.min(rawDt, 0.1), n = Math.min(5, Math.max(1, Math.ceil(dtF / (STEP * 1.2)))), hStep = Math.min(dtF / n, STEP * 1.6); acc.current = 0; for (let i = 0; i < n; i++) simGuarded(hStep); window.__simStat = { n, ms: performance.now() - t0 }; }   // __simStat: physics cost this frame, for the FPS counter
    if (!game.onFoot) { game.pos.x = s.current.x; game.pos.z = s.current.z; }
    game.pose = { x: s.current.x, z: s.current.z, h: s.current.h };
    // dust: puffs behind the tires scaled by speed, sliding and landings, tinted to the ground (dust.js)
    { const st = s.current, dtD = Math.min(rawDt, 0.1); dustFx.update(dtD);
      if (st.wheels && st.rb && group.current) {
        const wading = (st.wade || 0) > 0.05, dust = wading ? 0 : dustiness(st.sfKey), sp = Math.hypot(st.v, st.lateralV), slide = Math.min(1, (st.slip || 0) / 0.3), rate = dust * (sp > 2 ? Math.min(1, sp / 22) * 16 + slide * 40 : 0);
        group.current.updateMatrixWorld(true); const c = DUST_C.set(st.sfColor || '#a98c5a').lerp(DUST_W, 0.55), v = st.rb.vel;
        st.wheels.forEach((w, i) => {
          const was = dustTouch.current[i]; dustTouch.current[i] = w.touching;
          if (!w.touching) { rutLast.current[i] = null; }
          if (wading && w.touching && sp > 1) { sprayAcc.current[i] += (6 + sp * 2.2) * dtD; while (sprayAcc.current[i] >= 1) { sprayAcc.current[i] -= 1; const q = group.current.localToWorld(DUST_P.copy(w.hub)); dustFx.emit(q.x + (Math.random() - 0.5) * 0.5, world.height(q.x, q.z) + st.wade * 0.6, q.z + (Math.random() - 0.5) * 0.5, v.x * 0.35 + (Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 2.6, v.z * 0.35 + (Math.random() - 0.5) * 2.4, WATER_C, 0.35, 1.5 + Math.min(1, sp / 20), 0.4, 0.9); } }
          if (!w.touching || dust <= 0) { dustAcc.current[i] = 0; return; }
          const p = group.current.localToWorld(DUST_P.copy(w.hub)); p.y -= 0.3;
          if (!was) for (let k = 0; k < 7; k++) dustFx.emit(p.x, p.y, p.z, v.x * 0.2 + (Math.random() - 0.5) * 3, 0.8 + Math.random() * 1.6, v.z * 0.2 + (Math.random() - 0.5) * 3, c, 0.7, 3.2, 0.26 * Math.min(1, dust), 1.6);   // landing puff
          { const depth = rutDepth(st.sfKey), hard = Math.min(1, (st.slip || 0) / 0.3), want = depth + (depth === 0 ? hard * 0.5 : 0);   // paved ground only marks when sliding hard
            if (want > 0.2 && (sp > 1.5 || hard > 0.1)) {
              const gy = world.height(p.x, p.z), L = rutLast.current[i];
              if (!L) rutLast.current[i] = { x: p.x, z: p.z };
              else { const dx = p.x - L.x, dz = p.z - L.z, d = Math.hypot(dx, dz);
                if (d > 0.5) { const e = 1, nx = -(world.height(p.x + e, p.z) - world.height(p.x - e, p.z)) / (2 * e), nz = -(world.height(p.x, p.z + e) - world.height(p.x, p.z - e)) / (2 * e), tone = Math.max(0.28, 0.62 - 0.22 * want - 0.18 * hard);
                  rutFx.stamp(p.x, gy, p.z, dx / d, dz / d, nx, 1, nz, 0.3 + 0.1 * hard, Math.min(1.6, d * 1.04), DUST_R.set(st.sfColor || '#a98c5a').multiplyScalar(tone)); rutLast.current[i] = { x: p.x, z: p.z }; } }
            } else rutLast.current[i] = null; }
          dustAcc.current[i] += rate * dtD;
          while (dustAcc.current[i] >= 1) { dustAcc.current[i] -= 1; const big = 0.5 + Math.min(1, sp / 30) * 0.9 + slide * 0.6;
            dustFx.emit(p.x + (Math.random() - 0.5) * 0.4, p.y, p.z + (Math.random() - 0.5) * 0.4, v.x * 0.3 + (Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 1.4, v.z * 0.3 + (Math.random() - 0.5) * 1.6, c, 0.5 * big, 2.4 * big + 0.8, Math.min(0.24, 0.08 + 0.12 * dust), 1.1 + Math.min(1, sp / 30) * 0.9); }
        });
      } }
  });

  return <><primitive object={dustFx.points} /><primitive object={rutFx.mesh} /><group ref={group}>{children}<Headlights dims={dims} /><Cargo />{world.id === 'county' && <VehicleCargo veh={game.active} host={PLACEMENT} />}</group></>;
}
const WATER_C = new THREE.Color('#d6ecf7'), DUST_R = new THREE.Color(), DUST_C = new THREE.Color(), DUST_W = new THREE.Color('#ffffff'), DUST_P = new THREE.Vector3();

const OPEN_WORLD = { id: 'open', obstacles: OBSTACLES, height: terrainHeight, surface: surfaceAt, half: HALF, spawn: { x: 0, z: -8, h: 0 }, gates: GATES, spawns: [], area: () => 'Open desert' };
const TEST_WORLD = { id: 'test', height: TC.height, surface: TC.surface, half: TC.HALF_DRIVE, get spawn() { return game.start === 'lot' ? BUG_SPOT : game.start === 'garage' ? GARAGE_DRIVE : { x: 0, z: 0, h: Math.PI / 2 }; }, gates: [], spawns: TC.spawns, area: TC.areaAt, obstacles: SITE_OBSTACLES };
/** circles of the vehicles parked around the county (and the one for sale on Al's lot) */
const vehicleCircles = (pose, len) => { const n = len > 4.5 ? 4 : 3, out = []; for (let k = 0; k < n; k++) { const o = (k / (n - 1) - 0.5) * (len - 2.2); out.push([pose.x + Math.sin(pose.h) * o, pose.z + Math.cos(pose.h) * o, 1.2, CO.height(pose.x, pose.z) + 1.6]); } return out; };
let obsCache = { key: '', list: [] };
const COUNTY_WORLD = {
  id: 'county', trunks: (x, z) => { const a = TRUNKS.near(x, z), b = CO.wildTrunksNear(x, z); return b.length ? [...a, ...b] : a; }, waterDepth: CO.waterDepthAt, waterFlow: CO.waterFlowAt, height: CO.groundHeight, surface: CO.surface, half: CO.HALF_DRIVE, bounds: CO.DRIVE_BOUNDS, far: 5200, gates: [], spawns: CO.spawns, area: CO.areaAt,
  get spawn() { return GARAGE_DRIVE; },
  get obstacles() {
    const key = `${game.propsV || 0}|${game.props.length}|${(game.projects || []).length}|${game.active}|${Object.keys(game.fleet).join(',')}|${game.job?.id || ''}`;
    if (obsCache.key !== key) obsCache = { key, list: [...SITE_OBSTACLES, ...propObstacles(), ...standingVehicles().flatMap(v => vehicleCircles(v.pose, vehicleType(v.id).length)), ...(game.projects || []).flatMap(p => vehicleCircles(p.pose, defOf(p).length)), ...(game.job ? vehicleCircles(game.job, 5.1) : [])] };
    return obsCache.list;
  },
};
const SKIP_MATRICES = () => {};
/** draws its children only while you are within `r` metres (projects far away cost nothing: no draw calls, no shadow pass) */
function Near({ x, z, r = 140, children, ...props }) {
  const g = useRef();
  useFrame(() => {
    const o = g.current; if (!o) return;
    const on = Math.hypot(game.pos.x - x, game.pos.z - z) < r;
    o.visible = on;
    // hidden is not free: three still walks every child to update its matrix each frame (a project car is ~200 objects). While away, skip the subtree entirely.
    if (!on) { if (o.updateMatrixWorld !== SKIP_MATRICES) o.updateMatrixWorld = SKIP_MATRICES; }
    else if (o.updateMatrixWorld === SKIP_MATRICES) { delete o.updateMatrixWorld; o.matrixWorldNeedsUpdate = true; }   // back in range: the prototype method again, and a full refresh
  });
  return <group ref={g} {...props}>{children}</group>;
}
/** every vehicle that is not the one you are using: parked where you left it, or waiting on Al's lot */
function Fleet() {
  useGame();
  return <>{standingVehicles().map(v => <group key={v.id} position={[v.pose.x, CO.groundHeight(v.pose.x, v.pose.z), v.pose.z]} rotation={[0, v.pose.h, 0]}>
    <Suspense fallback={null}>{v.id === 'bug' ? (game.build && <BuildModel build={game.build} drive />) : v.id === 'cajon' ? <CajonCar /> : <TruckModel />}</Suspense>
    <Cargo veh={v.id} />
    {!v.forSale && <VehicleCargo veh={v.id} />}
  </group>)}
  {(game.projects || []).map(p => <Near key={'p' + p.uid} x={p.pose.x} z={p.pose.z} position={[p.pose.x, CO.groundHeight(p.pose.x, p.pose.z), p.pose.z]} rotation={[0, p.pose.h, 0]}>   {/* donor wrecks and other projects: each has its own parts (game/projects.js) */}
    <Suspense fallback={null}>{p.def === 'cajon' ? <CajonModel build={p.build} drive vehId={'p' + p.uid} uid={p.uid} /> : <BuildModel build={p.build} drive vehId={'p' + p.uid} />}</Suspense>
  </Near>)}</>;
}
/** the real border slice (docs/WORLD_MAP.md, dev only while it is built): everything comes from worlds/border.js once loaded */
const BORDER_WORLD = {
  id: 'border', height: (x, z) => border().heightAt(x, z), surface: (x, z) => border().surfaceAt(x, z), half: 60000, far: 6500, gates: [], spawns: [], obstacles: [],
  get bounds() { return border().bounds; }, get spawn() { return { x: 0, z: 0, h: 0 }; }, area: () => 'Imperial Valley (real map, dev)',
};
const WorldCtx = createContext(OPEN_WORLD);

export default function DriveWorld({ children, hud, dims = DEFAULT_DIMS, worldId = 'test', bodyId, vehKey }) {
  if (worldId === 'border' && !border()) throw loadBorder();   // Suspense: wait for the real map file
  const world = worldId === 'county' ? COUNTY_WORLD : worldId === 'border' ? BORDER_WORLD : worldId === 'test' ? TEST_WORLD : OPEN_WORLD;
  const race = useRef(newRace());
  const sun = useRef();
  return <WorldCtx.Provider value={world}>
    {world.id === 'county' || world.id === 'border' ? <DayNightSky sun={sun} /> : <>
      {world.id === 'open' && <><color attach="background" args={['#cfd9e0']} /><fog attach="fog" args={['#cfd9e0', 80, 380]} /></>}
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#dfeaff', '#8a6e45', 1.1]} />
      <directionalLight ref={sun} position={[30, 45, 20]} color="#ffffff" intensity={2.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}
        shadow-camera-near={1} shadow-camera-far={120} shadow-normalBias={0.025} />
    </>}
    {world.id === 'open' ? <><Terrain />{SHOW_SCENERY && <Scenery />}<Gates race={race} /></> : world.id === 'county' ? <CountyScene /> : world.id === 'border' ? <BorderScene /> : <TestCenterScene />}
    <GameObjects kind={world.id} height={world.height} bodyId={bodyId} />
    <Vehicle key={vehKey} hud={hud} dims={dims} race={race} sun={sun}>{children}</Vehicle>
    {world.id === 'county' && <Walker world={world} sun={sun} />}
    {world.id === 'county' && CO.raceCourses().length > 0 && <RaceMarkers />}
    {world.id === 'county' && <Items />}{world.id === 'county' && <DeliveryTruck />}
    {world.id === 'county' && <Fleet />}
    <PerfHud />
    <Governor />
    {world.id === 'county' && <Discoveries />}
  </WorldCtx.Provider>;
}
