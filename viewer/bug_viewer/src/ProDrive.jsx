import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildWheelRig } from './suspension.js';
import { STEP, createCar, stepCar, resetCar, telemetry } from './vehicle/sim.js';
import { buggyConfig } from './vehicle/config.js';
import { createInput } from './vehicle/input.js';
import { proStore } from './vehicle/store.js';

/** Flat tarmac test pad: 5 m grid, a 25 m skid-pad ring and a slalom, so slides and weight transfer are easy to judge. */
function Pad() {
  const cones = useMemo(() => {
    const out = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; out.push([Math.cos(a) * 25 + 40, Math.sin(a) * 25 + 40]); }
    for (let i = 0; i < 10; i++) out.push([(i % 2 ? 2.2 : -2.2) - 0, 30 + i * 14]);
    return out;
  }, []);
  const mesh = useRef();
  useEffect(() => {
    const m = new THREE.Object3D();
    cones.forEach(([x, z], i) => { m.position.set(x, 0.25, z); m.updateMatrix(); mesh.current.setMatrixAt(i, m.matrix); });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [cones]);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[800, 800]} /><meshStandardMaterial color="#2d3033" roughness={0.9} /></mesh>
    <gridHelper args={[800, 160, '#8d949a', '#464c51']} position={[0, 0.01, 0]} />
    <instancedMesh ref={mesh} args={[null, null, cones.length]} castShadow><coneGeometry args={[0.18, 0.5, 10]} /><meshStandardMaterial color="#ff6a1a" /></instancedMesh>
  </>;
}

function ProVehicle({ children, hud, dims }) {
  const group = useRef(), rig = useRef(null), input = useRef(null), acc = useRef(0), sun = useRef();
  const cab = useRef(false), look = useRef({ yaw: 0, pitch: 0.28, dist: 9, idle: 0 });
  const camPos = useRef(new THREE.Vector3(0, 4, -12));
  const { camera, gl } = useThree();
  const car = useMemo(() => {
    const cfg = proStore.config || (proStore.config = buggyConfig());
    const c = createCar(cfg, dims.mounts); proStore.car = c; return c;
  }, [dims]);

  useEffect(() => { input.current = createInput(); return () => input.current.dispose(); }, []);
  useEffect(() => { rig.current = buildWheelRig(group.current, dims.mounts); }, [dims]);
  useEffect(() => {
    proStore.reset = () => { resetCar(car); rig.current?.wheels.forEach(w => { w.spin.rotation.x = 0; }); };
    return () => { proStore.reset = null; };
  }, [car]);
  useEffect(() => {
    camera.far = 900; camera.fov = 60; camera.near = 0.1; camera.updateProjectionMatrix();
    const el = gl.domElement, l = look.current;
    const lock = () => { if (document.pointerLockElement !== el) { try { el.requestPointerLock()?.catch?.(() => {}); } catch {} } };
    const move = e => { if (document.pointerLockElement !== el) return; l.yaw -= e.movementX * 0.004; l.pitch = Math.max(-0.1, Math.min(1.3, l.pitch + e.movementY * 0.004)); l.idle = 0; };
    const wheel = e => { e.preventDefault(); l.dist = Math.max(4, Math.min(22, l.dist * (1 + e.deltaY * 0.001))); };
    const key = e => { if (e.code === 'KeyC' && !e.repeat) { cab.current = !cab.current; l.yaw = 0; l.pitch = 0.28; } };
    lock(); el.addEventListener('pointerdown', lock); window.addEventListener('mousemove', move); window.addEventListener('keydown', key);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', lock); window.removeEventListener('mousemove', move); window.removeEventListener('keydown', key); el.removeEventListener('wheel', wheel); if (document.pointerLockElement === el) document.exitPointerLock(); camera.far = 100; camera.fov = 43; camera.near = 0.05; camera.updateProjectionMatrix(); };
  }, [camera, gl]);

  useFrame((_, rawDt) => {
    if (!rig.current || !input.current) return;
    acc.current += Math.min(rawDt, 0.1);
    let n = 0;
    while (acc.current >= STEP && n++ < 5) {
      const inp = input.current.read(STEP);
      if (inp.reset) proStore.reset?.();
      stepCar(car, inp, STEP); acc.current -= STEP;
    }
    if (acc.current > STEP * 5) acc.current = 0;
    const dt = Math.min(rawDt, 0.05), g = group.current;

    // body pose (Stage 1: lean is cosmetic; real springs arrive in Stage 3)
    g.position.set(car.x, 0, car.z);
    g.rotation.set(car.pitchVis, car.h, car.rollVis, 'YXZ');
    for (const w of rig.current.wheels) {
      const cw = car.wheels.find(x => x.name === w.name);
      w.spin.rotation.x += cw.omega * dt;
      w.steer.rotation.y = cw.steerAngle;
    }
    if (rig.current.wheel) rig.current.wheel.rotation.z = -car.steer * 3.5;
    sun.current.position.set(car.x + 30, 45, car.z + 20); sun.current.target.position.set(car.x, 0, car.z); sun.current.target.updateMatrixWorld();

    // camera
    const l = look.current;
    l.idle += dt; if (l.idle > 2.5) { l.yaw -= l.yaw * Math.min(1, dt * 2.5); l.pitch += (0.28 - l.pitch) * Math.min(1, dt * 2.5); }
    const wantFov = cab.current ? 78 : 60; if (camera.fov !== wantFov) { camera.fov = wantFov; camera.updateProjectionMatrix(); }
    if (cab.current) {
      g.updateMatrixWorld(true);
      camera.position.copy(g.localToWorld(new THREE.Vector3(...dims.cabEye)));
      const head = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(l.pitch - 0.28), l.yaw + Math.PI, 0, 'YXZ'));
      camera.quaternion.copy(g.quaternion).multiply(head); camPos.current.copy(camera.position);
    } else {
      const ang = car.h + Math.PI + l.yaw, d = l.dist + Math.min(4, car.speed * 0.1), cp = Math.cos(l.pitch);
      camPos.current.lerp(new THREE.Vector3(car.x + Math.sin(ang) * d * cp, Math.max(1, 1.4 + Math.sin(l.pitch) * d), car.z + Math.cos(ang) * d * cp), Math.min(1, dt * 10));
      camera.position.copy(camPos.current); camera.lookAt(car.x, 1.2, car.z);
    }

    const t = proStore.telemetry = telemetry(car);
    if (hud.current) hud.current.textContent = `${Math.round(t.kmh)} km/h · PRO PHYSICS stage 1${Math.abs(t.slipDeg) > 8 ? ' · SLIDING' : ''}${input.current.pad ? ' · gamepad' : ''}`;
  });

  return <>
    <directionalLight ref={sun} position={[30, 45, 20]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={120} shadow-normalBias={0.025} />
    <group ref={group}>{children}</group>
  </>;
}

export default function ProDrive({ children, hud, dims }) {
  return <>
    <color attach="background" args={['#b9c6cf']} /><fog attach="fog" args={['#b9c6cf', 90, 420]} />
    <ambientLight intensity={0.9} /><hemisphereLight args={['#dfeaff', '#555', 1.0]} />
    <Pad />
    <ProVehicle hud={hud} dims={dims}>{children}</ProVehicle>
  </>;
}
