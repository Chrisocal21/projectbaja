import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD, TERRAIN_SEGMENTS, smooth, terrainHeight, terrainVertexHeight } from './terrain.js';
import { STEP, createVehicleState, buildWheelRig, stepSuspension, updateSuspensionVisual, wheelSteerAngle } from './suspension.js';

// ---------- terrain ----------
const HALF = WORLD / 2 - 6;  // drivable limit
export { terrainHeight } from './terrain.js';

// ---------- ground types: grip (mu), rolling resistance multiplier (rr), colour ----------
const SURF = {
  dirt: { name: 'Packed dirt', mu: 0.72, rr: 1.0, color: '#a98c5a' },
  sand: { name: 'Loose sand', mu: 0.45, rr: 2.2, color: '#d6bd86' },
  rock: { name: 'Rock', mu: 0.85, rr: 0.8, color: '#7d7568' },
  mud:  { name: 'Mud', mu: 0.30, rr: 3.0, color: '#5a4630' },
};
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
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = terrainVertexHeight(i % (seg + 1), Math.floor(i / (seg + 1)));
      pos.setY(i, y);
      const slope = Math.abs(terrainHeight(x + 1, z) - y) + Math.abs(terrainHeight(x, z + 1) - y);
      const noise = (Math.sin(x * 1.7) * Math.sin(z * 1.9) * 0.025 + Math.sin(x * 0.23 + z * 0.17) * Math.sin(z * 0.31 - x * 0.11) * 0.05 + Math.sin(x * 4.1) * Math.sin(z * 3.7) * 0.012);
      c.set(surfaceAt(x, z).color).multiplyScalar(1 - Math.min(0.35, slope * 0.25));
      c.offsetHSL(0, 0, noise);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>;
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
const OBSTACLES = [...ITEMS.r.map(p => [p.x, p.z, p.s * 1.1, terrainHeight(p.x, p.z) + p.s * 0.95]),
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
  wheelbase: 2.38, track: 1.5, cabEye: [0.31, 1.32, -0.15], lift: 0, bellyHeight: 0.28, offroad: true,
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({
    name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19],
  })),
};
// cab eye: driver's eye in vehicle space (steering wheel is at x=+0.3, z=0.25..0.5) — tune per model
const MAX_SPEED = 32;        // m/s (~115 km/h)
const ACCEL = 11, BRAKE = 22, DRAG = 0.012, ROLL_RES = 0.9, G = 9.81;

function useKeys() {
  const keys = useRef({});
  useEffect(() => {
    const dn = e => {
      keys.current[e.code] = true;
      if (e.code === 'KeyR' && !e.repeat) keys.current.reset = true;
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

function Vehicle({ children, hud, dims, race, sun }) {
  const WHEELBASE = dims.wheelbase, CAB_EYE = dims.cabEye;
  const group = useRef();
  const keys = useKeys();
  const { camera, gl } = useThree();
  const look = useRef({ yaw: 0, pitch: 0.28, dist: 9, drag: false, idle: 0 });
  const s = useRef(createVehicleState());
  const cab = useRef(false);
  const rig = useRef(null);
  const camPos = useRef(new THREE.Vector3(0, 4, -16));

  useEffect(() => {
    rig.current = buildWheelRig(group.current, dims.mounts);
    console.info(`[drive] rigged ${rig.current.wheels.length} visible wheels`);
  }, [dims]);

  useEffect(() => {
    camera.far = 700; camera.fov = 60; camera.near = 0.1; camera.updateProjectionMatrix();
    return () => { camera.far = 100; camera.fov = 43; camera.near = 0.05; camera.updateProjectionMatrix(); };
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement, l = look.current;
    const lock = () => { if (document.pointerLockElement !== el) { try { const r = el.requestPointerLock(); r?.catch?.(() => {}); } catch {} } };
    const move = e => { if (document.pointerLockElement !== el) return; l.yaw -= e.movementX * 0.004; l.pitch = Math.max(-0.1, Math.min(1.3, l.pitch + e.movementY * 0.004)); l.idle = 0; };
    const wheel = e => { e.preventDefault(); l.dist = Math.max(4, Math.min(22, l.dist * (1 + e.deltaY * 0.001))); };
    const cabKey = e => { if (e.code === 'KeyC' && !e.repeat) { cab.current = !cab.current; l.yaw = 0; l.pitch = 0.28; l.idle = 0; } };
    window.addEventListener('keydown', cabKey);
    lock();                                   // works right after the Drive click (recent user gesture)
    const key = e => { if (e.code !== 'Escape') lock(); };
    window.addEventListener('keydown', key);  // any key re-captures if the browser refused / Esc was pressed
    el.addEventListener('pointerdown', lock); window.addEventListener('mousemove', move);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', lock); window.removeEventListener('mousemove', move); window.removeEventListener('keydown', key); window.removeEventListener('keydown', cabKey); el.removeEventListener('wheel', wheel); if (document.pointerLockElement === el) document.exitPointerLock(); };
  }, [gl]);

  const sim = dt => {   // one fixed physics step
    const k = keys.current, st = s.current;
    const tr = dims.tire || { mu: 1, rr: 1, surf: {} }, sf0 = surfaceAt(st.x, st.z), tmu = sf0.mu * tr.mu * (tr.surf[sf0.key] ?? 1) * 1.25;   // 1.25 = base off-road tire grip
    const sf = { name: sf0.name, mu: tmu, rr: sf0.rr * tr.rr }, grip = tmu / 0.7; st.surface = sf.name; const v0 = st.v;
    if (k.reset) {
      Object.assign(st, createVehicleState()); race.current = newRace(); k.reset = false;
      rig.current.wheels.forEach(w => { w.spin.rotation.x = 0; });
      camPos.current.set(0, 4, -16);
    }

    const throttle = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const steerIn = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
    let fx = Math.sin(st.h), fz = Math.cos(st.h);
    let rx = fz, rz = -fx;

    // --- longitudinal (only with traction) ---
    if (!st.air) {
      const rearContact = st.wheels.length ? st.wheels.filter(w => w.name.startsWith('R') && w.touching).length / 2 : 1;
      if (throttle > 0) st.v += ACCEL * rearContact * Math.min(1.1, grip) * (1 - Math.max(0, st.v) / MAX_SPEED) * dt;
      else if (throttle < 0) st.v += (st.v > 0.5 ? -BRAKE * Math.min(1, grip) : -ACCEL * rearContact * 0.6) * dt;
      if (k.Space) st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), BRAKE * Math.min(1, grip) * dt);
      if (!throttle) st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), ROLL_RES * sf.rr * dt);
      st.v -= st.v * Math.abs(st.v) * DRAG * dt;
      // gravity along slope
      const e = 0.6;
      const slope = (terrainHeight(st.x + fx * e, st.z + fz * e) - terrainHeight(st.x - fx * e, st.z - fz * e)) / (2 * e);
      st.v -= G * slope / Math.sqrt(1 + slope * slope) * dt;
      st.v = Math.max(-9, Math.min(MAX_SPEED * 1.4, st.v));

      // --- steering ---
      const maxSteer = 0.58 / (1 + Math.abs(st.v) * 0.06);
      st.steer += (steerIn * maxSteer - st.steer) * Math.min(1, dt * 7);

      // --- tires: dynamic bicycle model with a shared friction circle (rear-engine, so the rear carries ~58% of the weight) ---
      const L = WHEELBASE, ca = 0.58 * L, cb = L - ca, MASS = 1000, IZ = MASS * ca * cb * 2.2, mu = sf.mu;
      const dN = MASS * (st.ax || 0) * 0.6 / L;                                   // longitudinal weight transfer
      const Nf = st.wheels.length ? st.wheels.filter(w => w.name.startsWith('F')).reduce((sum, w) => sum + w.load, 0)
        : Math.max(500, MASS * G * cb / L - dN);
      const Nr = st.wheels.length ? st.wheels.filter(w => w.name.startsWith('R')).reduce((sum, w) => sum + w.load, 0)
        : Math.max(500, MASS * G * ca / L + dN);
      const accelCmd = throttle > 0 ? ACCEL * Math.min(1.1, grip) : 0;
      const brakeCmd = (throttle < 0 && st.v > 0.5 ? BRAKE : 0) + (k.Space ? BRAKE : 0);
      const uxF = Math.min(0.95, brakeCmd * MASS * 0.65 / Math.max(1, mu * Nf));
      const uxR = k.Space ? 0.93 : Math.min(0.95, (accelCmd + brakeCmd * 0.35) * MASS / Math.max(1, mu * Nr));   // handbrake locks the rear
      const capF = mu * Nf * Math.sqrt(1 - uxF * uxF), capR = mu * Nr * Math.sqrt(1 - uxR * uxR);
      const tire = (alpha, cap) => -cap * Math.tanh(alpha / 0.17) * (1 - 0.18 * smooth(0.3, 0.8, Math.abs(alpha)));   // peak ~8 deg, then falls off
      const vx = Math.max(st.v, 0.5);
      const aF = Math.atan2(st.lateralV + ca * st.yr, vx) - st.steer, aR = Math.atan2(st.lateralV - cb * st.yr, vx);
      const FyF = tire(aF, capF), FyR = tire(aR, capR), cs = Math.cos(st.steer);
      st.lateralV += ((FyF * cs + FyR) / MASS - st.v * st.yr) * dt;
      st.yr += ((ca * FyF * cs - cb * FyR) / IZ) * dt;
      st.v += st.lateralV * st.yr * dt;
      const w = smooth(1.5, 4, st.v);                                              // below ~4 m/s: plain kinematic steering (no slip blow-up)
      if (w < 1) { st.yr += ((st.v / L) * Math.tan(st.steer) - st.yr) * (1 - w) * Math.min(1, dt * 12); st.lateralV -= st.lateralV * (1 - w) * Math.min(1, dt * 12); }
      if (st.v < 0.5) { st.yr = (st.v / L) * Math.tan(st.steer); st.lateralV = 0; }
      st.slip = Math.abs(Math.atan2(st.lateralV, Math.max(Math.abs(st.v), 0.5)));
    } else st.yr *= 1 - 0.3 * dt;
    st.h += st.yr * dt;
    fx = Math.sin(st.h); fz = Math.cos(st.h); rx = fz; rz = -fx;

    st.x += (fx * st.v + rx * st.lateralV) * dt; st.z += (fz * st.v + rz * st.lateralV) * dt;
    st.ax = (st.ax || 0) + ((st.v - v0) / dt - (st.ax || 0)) * Math.min(1, dt * 8);
    // solid rocks and cacti: two body circles (nose + tail) pushed out of every obstacle, speed killed on impact
    for (const off of [WHEELBASE * 0.4, -WHEELBASE * 0.4]) for (const [ox, oz, or, top] of OBSTACLES) {
      if (st.y + dims.bellyHeight > top) continue;
      const cx = st.x + fx * off, cz = st.z + fz * off, dx = cx - ox, dz = cz - oz, min = or + 0.85;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-4) {
        st.x += (dx / d) * (min - d); st.z += (dz / d) * (min - d);
        if (st.v * (fx * dx + fz * dz) < 0) st.v *= 0.25;   // moving towards the obstacle
      }
    }
    st.x = Math.max(-HALF, Math.min(HALF, st.x)); st.z = Math.max(-HALF, Math.min(HALF, st.z));

    const wasAir = st.air;
    stepSuspension(st, dims, dt);
    if (wasAir && !st.air) st.v *= 0.97;
    const g = group.current;
    g.position.set(st.x, st.y, st.z);
    g.rotation.set(-st.pitch, st.h, st.roll, 'YXZ');
    sun.current.position.set(st.x + 30, st.y + 45, st.z + 20);
    sun.current.target.position.set(st.x, st.y, st.z);
    sun.current.target.updateMatrixWorld();
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
    { l.idle += dt; if (l.idle > 2.5) { l.yaw -= l.yaw * Math.min(1, dt * 2.5); l.pitch += (0.28 - l.pitch) * Math.min(1, dt * 2.5); } }
    const wantFov = cab.current ? 78 : 60;
    if (camera.fov !== wantFov) { camera.fov = wantFov; camera.updateProjectionMatrix(); }
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
    const target = new THREE.Vector3(st.x + Math.sin(ang) * d * cp, st.y + 1.4 + Math.sin(l.pitch) * d, st.z + Math.cos(ang) * d * cp);
    target.y = Math.max(target.y, terrainHeight(target.x, target.z) + 1.0);
    camPos.current.lerp(target, Math.min(1, dt * 10));
    camera.position.copy(camPos.current);
    camera.lookAt(st.x, st.y + 1.2, st.z);
    }

    const rc = race.current;
    if (!rc.running && Math.abs(st.v) > 1) rc.running = true;
    if (rc.running) rc.t += dt;
    const [gx, gz] = GATES[rc.next];
    if (Math.hypot(st.x - gx, st.z - gz) < 7) {
      rc.next++;
      if (rc.next >= GATES.length) {
        rc.next = 0; rc.laps++; rc.last = rc.t; rc.flash = 4;
        if (!rc.best || rc.t < rc.best) { rc.best = rc.t; try { localStorage.setItem(bestKey, String(rc.t)); } catch {} }
        rc.t = 0;
      }
    }
    rc.flash = Math.max(0, rc.flash - dt);
    const f = n => (n ? n.toFixed(1) + 's' : '--');
    if (hud.current) hud.current.textContent = `${Math.round(Math.abs(st.v) * 3.6)} km/h · ${st.surface}${st.slip > 0.14 ? ' · SLIDING' : ''}${st.air ? ' · AIRBORNE' : ''}  |  Gate ${rc.next + 1}/${GATES.length}  ${rc.t.toFixed(1)}s  |  Best ${f(rc.best)}${rc.flash > 0 ? `  |  LAP ${f(rc.last)}${rc.last === rc.best ? ' NEW BEST!' : ''}` : ''}`;
  };
  // fixed 120 Hz physics: frame-rate independent springs/tires; at most 5 catch-up steps per frame (no spiral of death)
  const acc = useRef(0);
  useFrame((_, rawDt) => {
    if (!rig.current) return;
    acc.current += Math.min(rawDt, 0.1);
    for (let n = 0; acc.current >= STEP && n < 5; n++) { sim(STEP); acc.current -= STEP; }
    if (acc.current > STEP * 5) acc.current = 0;
  });

  return <group ref={group}>{children}</group>;
}

export default function DriveWorld({ children, hud, dims = DEFAULT_DIMS }) {
  const race = useRef(newRace());
  const sun = useRef();
  return <>
    <color attach="background" args={['#cfd9e0']} />
    <fog attach="fog" args={['#cfd9e0', 80, 380]} />
    <ambientLight intensity={0.9} />
    <hemisphereLight args={['#dfeaff', '#8a6e45', 1.1]} />
    <directionalLight ref={sun} position={[30, 45, 20]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}
      shadow-camera-near={1} shadow-camera-far={120} shadow-normalBias={0.025} />
    <Terrain />
    <Scenery />
    <Gates race={race} />
    <Vehicle hud={hud} dims={dims} race={race} sun={sun}>{children}</Vehicle>
  </>;
}
