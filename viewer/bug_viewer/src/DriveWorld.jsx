import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ---------- terrain ----------
const WORLD = 400;           // meters across
const HALF = WORLD / 2 - 6;  // drivable limit
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function terrainHeight(x, z) {
  let h = Math.sin(x * 0.045) * Math.cos(z * 0.04) * 4.5
        + Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.09) * 1.6
        + Math.sin(x * 0.31) * Math.cos(z * 0.27 + 2) * 0.35
        + Math.sin(x * 1.3 + z * 0.4) * Math.sin(z * 1.1 - x * 0.3) * 0.3;   // rough ground so the suspension has work to do
  // flat start pad so the car spawns on level ground
  h *= smooth(10, 32, Math.hypot(x, z));
  // jump ramp: runs along +Z from z=30..42, 28m long run-up, drops off at the lip
  const rx = Math.abs(x) < 5 ? 1 : smooth(8, 5, Math.abs(x)) ;
  if (z > 20 && z < 36) h += ((z - 20) / 16) * 2.2 * rx * (Math.abs(x) < 8 ? 1 : 0);
  // whoops (washboard bumps) in a strip to the right
  if (x > 25 && x < 40 && z > -40 && z < 40) h += Math.sin(z * 1.1) * 0.35 * smooth(25, 28, x) * smooth(40, 37, x);
  return h;
}

function Terrain() {
  const geo = useMemo(() => {
    const seg = 220;
    const g = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);
      const slope = Math.abs(terrainHeight(x + 1, z) - y) + Math.abs(terrainHeight(x, z + 1) - y);
      const noise = (Math.sin(x * 1.7) * Math.sin(z * 1.9)) * 0.04;
      c.set('#b79b63').lerp(new THREE.Color('#8a6e45'), Math.min(1, slope * 0.9)).lerp(new THREE.Color('#d8c08a'), Math.min(1, Math.max(0, (y + 2) * 0.08)));
      c.offsetHSL(0, 0, noise);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial vertexColors roughness={1} flatShading /></mesh>;
}

function Scenery() {
  const rocks = useRef(), cacti = useRef();
  const items = useMemo(() => {
    let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const r = [], c = [];
    for (let i = 0; i < 260; i++) {
      const x = (rnd() - 0.5) * WORLD * 0.95, z = (rnd() - 0.5) * WORLD * 0.95;
      if (Math.hypot(x, z) < 18) continue;
      (rnd() < 0.65 ? r : c).push({ x, z, s: 0.5 + rnd() * 1.6, r: rnd() * 6 });
    }
    return { r, c };
  }, []);
  useEffect(() => {
    const m = new THREE.Object3D();
    items.r.forEach((p, i) => { m.position.set(p.x, terrainHeight(p.x, p.z) + p.s * 0.25, p.z); m.scale.set(p.s, p.s * 0.7, p.s * 1.2); m.rotation.set(0, p.r, 0); m.updateMatrix(); rocks.current.setMatrixAt(i, m.matrix); });
    items.c.forEach((p, i) => { m.position.set(p.x, terrainHeight(p.x, p.z) + p.s, p.z); m.scale.set(0.35 * p.s, p.s * 2, 0.35 * p.s); m.rotation.set(0, p.r, 0); m.updateMatrix(); cacti.current.setMatrixAt(i, m.matrix); });
    rocks.current.instanceMatrix.needsUpdate = cacti.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <>
    <instancedMesh ref={rocks} args={[null, null, items.r.length]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#7d776c" roughness={1} flatShading /></instancedMesh>
    <instancedMesh ref={cacti} args={[null, null, items.c.length]} castShadow><cylinderGeometry args={[0.6, 0.8, 1, 7]} /><meshStandardMaterial color="#58703f" roughness={1} flatShading /></instancedMesh>
  </>;
}

// ---------- vehicle ----------
export const DEFAULT_DIMS = { wheelbase: 2.38, track: 1.5, cabEye: [0.31, 1.32, -0.15] };
// cab eye: driver's eye in vehicle space (steering wheel is at x=+0.3, z=0.25..0.5) — tune per model
const RIDE_HEIGHT = 0;       // model origin sits at ground contact; raise if wheels sink
const MAX_SPEED = 32;        // m/s (~115 km/h)
const ACCEL = 11, BRAKE = 22, DRAG = 0.012, ROLL_RES = 0.9, G = 9.81;

function useKeys() {
  const keys = useRef({});
  useEffect(() => {
    const dn = e => { keys.current[e.code] = true; if (e.code === 'Space') e.preventDefault(); };
    const up = e => { keys.current[e.code] = false; };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);
  return keys;
}


// ---------- wheel rig: pull wheel meshes out of the model so they can spin + steer ----------
const WHEEL_RE = /^(FL|FR|RL|RR)_/, BASE_WHEEL_RE = /^B_(FL|FR|BL|BR)Wheel/, STEER_RE = /^B_InteriorSteeringWheel/;
function buildRig(root) {
  const keep = [root.position.clone(), root.rotation.clone()];
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);   // work in vehicle space
  const sets = {}, wheelMeshes = [];
  const named = [];
  root.traverse(o => {
    if (/^C?Wheel_(FL|FR|RL|RR)$/.test(o.name)) { named.push(o); return; }   // wheels already split into their own nodes
    if (!o.isMesh) return;
    const n = o.userData.source_name || o.name;
    let m = WHEEL_RE.exec(n), key, base = false;
    if (m) key = m[1];
    else if ((m = BASE_WHEEL_RE.exec(n))) { key = m[1].replace('B', 'R'); base = true; }
    else if (/^Cylinder/.test(n)) {                       // classic/stock model: generic names, so match by shape + position
      if (/^Cylinder009(_\d+)?$/.test(n)) { wheelMeshes.push(o); return; }                 // steering wheel
      const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      if (!(Math.abs(c.x) > 0.45 && bb.max.y < 0.8 && sz.y > 0.2 && sz.x < 0.4 && Math.abs(Math.abs(c.z) - 1.19) < 0.45)) return;
      key = (c.z > 0 ? 'F' : 'R') + (c.x > 0 ? 'L' : 'R'); base = true;
    }
    else { if (STEER_RE.test(n)) wheelMeshes.push(o); return; }
    (sets[(base ? 'b' : 'p') + key] ||= []).push(o);
  });
  const wheels = [];
  for (const meshes of Object.values(sets)) {
    const box = new THREE.Box3(); meshes.forEach(o => box.expandByObject(o));
    const c = box.getCenter(new THREE.Vector3()), r = (box.max.y - box.min.y) / 2;
    const steer = new THREE.Object3D(), spin = new THREE.Object3D();
    steer.position.copy(c); steer.add(spin); root.add(steer); root.updateMatrixWorld(true);
    meshes.forEach(o => spin.attach(o));
    wheels.push({ steer, spin, r, front: c.z > 0 });
  }
  for (const o of named) {
    const box = new THREE.Box3().expandByObject(o), c = box.getCenter(new THREE.Vector3());
    const steer = new THREE.Object3D(), spin = new THREE.Object3D();
    steer.position.copy(c); steer.add(spin); root.add(steer); root.updateMatrixWorld(true);
    spin.attach(o);
    wheels.push({ steer, spin, r: (box.max.y - box.min.y) / 2, front: c.z > 0 });
  }
  let wheel = null;                                       // cab steering wheel
  if (wheelMeshes.length) {
    const box = new THREE.Box3(); wheelMeshes.forEach(o => box.expandByObject(o));
    const pivot = new THREE.Object3D(); pivot.position.copy(box.getCenter(new THREE.Vector3())); root.add(pivot); root.updateMatrixWorld(true);
    wheelMeshes.forEach(o => pivot.attach(o)); wheel = pivot;
  }
  root.position.copy(keep[0]); root.rotation.copy(keep[1]); root.updateMatrixWorld(true);
  return { wheels, wheel };
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

// visible coilovers: spring + shock body + chrome rod, stretching between a body mount and the moving hub
const _geo = {};
function shockGeo() {
  if (_geo.spring) return _geo;
  const pts = Array.from({ length: 181 }, (_, i) => { const t = i / 180, a = t * Math.PI * 2 * 9; return new THREE.Vector3(Math.cos(a) * 0.075, 0.08 + t * 0.84, Math.sin(a) * 0.075); });
  _geo.spring = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.013, 6);
  _geo.body = new THREE.CylinderGeometry(0.045, 0.045, 1, 12).translate(0, 0.5, 0);
  _geo.rod = new THREE.CylinderGeometry(0.02, 0.02, 1, 8).translate(0, 0.5, 0);
  return _geo;
}
function makeShock() {
  const g = shockGeo(), grp = new THREE.Group();
  const spring = new THREE.Mesh(g.spring, new THREE.MeshStandardMaterial({ color: '#d9381e', roughness: 0.4, metalness: 0.3 }));
  const body = new THREE.Mesh(g.body, new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.5, metalness: 0.6 }));
  const rod = new THREE.Mesh(g.rod, new THREE.MeshStandardMaterial({ color: '#d0d0d4', roughness: 0.2, metalness: 0.9 }));
  grp.add(spring, body, rod); grp.userData = { spring, body, rod };
  return grp;
}
const _w = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

function Vehicle({ children, hud, dims, race }) {
  const WHEELBASE = dims.wheelbase, TRACK = dims.track, CAB_EYE = dims.cabEye;
  const group = useRef();
  const keys = useKeys();
  const { camera, gl } = useThree();
  const look = useRef({ yaw: 0, pitch: 0.28, dist: 9, drag: false, idle: 0 });
  const s = useRef({ x: 0, z: -8, y: 0, vy: 0, h: 0, v: 0, steer: 0, pitch: 0, roll: 0, air: false });
  const cab = useRef(false), susp = useRef({ pv: 0, pd: 0, pdv: 0, rd: 0, rdv: 0, bob: 0, bobv: 0 });
  const rig = useRef(null), rigTries = useRef(0);
  const camPos = useRef(new THREE.Vector3(0, 4, -16));

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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30), k = keys.current, st = s.current;
    if (k.KeyR) { Object.assign(st, { x: 0, z: -8, y: 0, vy: 0, h: 0, v: 0, steer: 0, pitch: 0, roll: 0 }); race.current = newRace(); }

    const throttle = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const steerIn = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
    const cosH = Math.cos(st.h), sinH = Math.sin(st.h);
    const fx = sinH, fz = cosH;                 // forward
    const rx = cosH, rz = -sinH;                // right

    // --- longitudinal (only with traction) ---
    if (!st.air) {
      if (throttle > 0) st.v += ACCEL * (1 - Math.max(0, st.v) / MAX_SPEED) * dt;
      else if (throttle < 0) st.v += (st.v > 0.5 ? -BRAKE : -ACCEL * 0.6) * dt;
      if (k.Space) st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), BRAKE * dt);
      if (!throttle) st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), ROLL_RES * dt);
      st.v -= st.v * Math.abs(st.v) * DRAG * dt;
      // gravity along slope
      const e = 0.6;
      const slope = (terrainHeight(st.x + fx * e, st.z + fz * e) - terrainHeight(st.x - fx * e, st.z - fz * e)) / (2 * e);
      st.v -= G * slope / Math.sqrt(1 + slope * slope) * dt;
      st.v = Math.max(-9, Math.min(MAX_SPEED * 1.4, st.v));

      // --- steering ---
      const maxSteer = 0.62 / (1 + Math.abs(st.v) * 0.09);
      st.steer += (steerIn * maxSteer - st.steer) * Math.min(1, dt * 7);
      st.h += (st.v / WHEELBASE) * Math.tan(st.steer) * dt;
    }

    st.x += fx * st.v * dt; st.z += fz * st.v * dt;
    st.x = Math.max(-HALF, Math.min(HALF, st.x)); st.z = Math.max(-HALF, Math.min(HALF, st.z));

    // --- wheel contact heights ---
    const wp = (lx, lz) => terrainHeight(st.x + rx * lx + fx * lz, st.z + rz * lx + fz * lz);
    const hFL = wp(-TRACK / 2, WHEELBASE / 2), hFR = wp(TRACK / 2, WHEELBASE / 2);
    const hRL = wp(-TRACK / 2, -WHEELBASE / 2), hRR = wp(TRACK / 2, -WHEELBASE / 2);
    const groundY = (hFL + hFR + hRL + hRR) / 4 + RIDE_HEIGHT;
    const tPitch = Math.atan2((hFL + hFR) / 2 - (hRL + hRR) / 2, WHEELBASE);
    const tRoll = Math.atan2((hFR + hRR) / 2 - (hFL + hRL) / 2, TRACK);

    // --- vertical: gravity + ground clamp (crests launch the buggy) ---
    st.vy -= G * dt;
    st.y += st.vy * dt;
    let landed = false; const vyBefore = st.vy;
    if (st.y <= groundY) {
      if (st.air && st.vy < -4) st.vy = -st.vy * 0.12; else st.vy = 0;     // landing thump
      landed = st.air; st.vy0 = vyBefore; st.y = groundY; st.air = false;
      if (landed) st.v *= 0.97;
    } else if (st.y - groundY > 0.15) st.air = true;

    // --- body attitude: follow terrain on ground, hold in air with slight nose-drop ---
    const a = Math.min(1, dt * (st.air ? 1.5 : 5));
    // suspension: sprung chassis (dive/squat under accel, roll in corners, bounce on landing) + independent wheel travel
    const su = susp.current, acc = dt > 0 ? (st.v - su.pv) / dt : 0; su.pv = st.v;
    const lat = st.v * Math.tan(st.steer) * st.v / WHEELBASE;
    const spring = (x, v, target, k, c) => { v += (k * (target - x) - c * v) * dt; return [x + v * dt, v]; };
    [su.pd, su.pdv] = spring(su.pd, su.pdv, st.air ? 0 : THREE.MathUtils.clamp(acc * 0.016, -0.11, 0.11), 90, 9);
    [su.rd, su.rdv] = spring(su.rd, su.rdv, st.air ? 0 : THREE.MathUtils.clamp(-lat * 0.014, -0.16, 0.16), 90, 9);
    if (landed) su.bobv -= Math.min(6, Math.abs(st.vy0 || 0)) * 0.5;
    [su.bob, su.bobv] = spring(su.bob, su.bobv, 0, 140, 10);
    su.bob = THREE.MathUtils.clamp(su.bob, -0.2, 0.1);
    st.pitch += ((st.air ? st.pitch * 0.98 : tPitch) - st.pitch) * a;
    st.roll += ((st.air ? st.roll : tRoll) - st.roll) * a;

    const g = group.current;
    if (!rig.current && g.children.length > 0 && rigTries.current++ < 300) {          // models have loaded
      const r = buildRig(g);
      r.shocks = r.wheels.map(w => { const m = makeShock(); g.add(m); const c = w.steer.position; w.upper = new THREE.Vector3(c.x * 0.8, c.y + 0.6, c.z); return m; });
      if (r.wheels.length || r.wheel) { rig.current = r; console.info(`[drive] rigged ${r.wheels.length} wheel groups, steering wheel: ${!!r.wheel}`); }
    }
    g.position.set(st.x, st.y + su.bob, st.z);
    g.rotation.set(-(st.pitch + su.pd), st.h, st.roll + su.rd, 'YXZ');
    if (rig.current) {
      g.updateMatrixWorld(true);
      for (const w of rig.current.wheels) {
        w.y0 ??= w.steer.position.y; w.off ??= 0;
        const lx = w.steer.position.x, lz = w.steer.position.z;
        const hW = terrainHeight(st.x + rx * -lx + fx * lz, st.z + rz * -lx + fz * lz);       // ground under this wheel (+X is vehicle left)
        const wy0 = _w.set(lx, w.y0, lz).applyMatrix4(g.matrixWorld).y;   // where the hub would be with no travel
        w.vel ??= 0;
        const tgt = st.air ? -0.2 : THREE.MathUtils.clamp(hW + (w.r || 0.5) - wy0 + su.bob, -0.4, 0.4);
        w.vel += (110 * (tgt - w.off) - 7 * w.vel) * dt; w.off = THREE.MathUtils.clamp(w.off + w.vel * dt, -0.42, 0.42);   // underdamped = free-flowing
        w.steer.position.y = w.y0 + w.off - su.bob; w.spin.rotation.x += (st.v / w.r) * dt; if (w.front) w.steer.rotation.y = st.steer; }
      rig.current.wheels.forEach((w, i) => {
        const m = rig.current.shocks[i], lo = w.steer.position;
        _d.copy(w.upper).sub(lo); const len = _d.length();
        m.position.copy(lo); m.quaternion.setFromUnitVectors(_up, _d.normalize());
        const u = m.userData; u.spring.scale.y = len; u.body.scale.y = len * 0.5; u.rod.position.y = len * 0.42; u.rod.scale.y = len * 0.58;
      });
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
    if (hud.current) hud.current.textContent = `${Math.round(Math.abs(st.v) * 3.6)} km/h${st.air ? ' · AIRBORNE' : ''}  |  Gate ${rc.next + 1}/${GATES.length}  ${rc.t.toFixed(1)}s  |  Best ${f(rc.best)}${rc.flash > 0 ? `  |  LAP ${f(rc.last)}${rc.last === rc.best ? ' NEW BEST!' : ''}` : ''}`;
  });

  return <group ref={group}>{children}</group>;
}

export default function DriveWorld({ children, hud, dims = DEFAULT_DIMS }) {
  const race = useRef(newRace());
  return <>
    <color attach="background" args={['#cfd9e0']} />
    <fog attach="fog" args={['#cfd9e0', 80, 380]} />
    <ambientLight intensity={0.9} />
    <hemisphereLight args={['#dfeaff', '#8a6e45', 1.1]} />
    <directionalLight position={[60, 90, 40]} intensity={2.6} />
    <Terrain />
    <Scenery />
    <Gates race={race} />
    <Vehicle hud={hud} dims={dims} race={race}>{children}</Vehicle>
  </>;
}
