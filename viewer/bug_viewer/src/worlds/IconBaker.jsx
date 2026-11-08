// Renders the build-menu thumbnails: every build item mounted (hidden) into a private scene, then shot one by one
// with a small second WebGL renderer (render targets on the main renderer skip sRGB + tone mapping, so icons came out dark).
// Runs a couple of seconds after the world loads, a few icons a frame, then unmounts and frees its renderer.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { iconJobs, iconsReady, setIcon, markIconsReady } from '../game/icons.js';

const SIZE = 256, PER_FRAME = 4, DELAY = 2.5;
const VIEW = new THREE.Vector3(1, 0.72, 1.35).normalize();   // front-right, a little above: the classic catalogue angle

export default function IconBaker({ Model, T }) {
  const [done, setDone] = useState(iconsReady());
  const jobs = useMemo(() => iconJobs(), []), refs = useRef({}), next = useRef(0), t0 = useRef(null);
  const kit = useMemo(() => {
    if (iconsReady()) return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
    const gl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    gl.setPixelRatio(1); gl.setSize(SIZE, SIZE, false); gl.setClearColor(0x000000, 0);
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
    const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    const key = new THREE.DirectionalLight('#fff4e4', 2.4); key.position.set(5, 9, 7); scene.add(key);
    const rim = new THREE.DirectionalLight('#bcd6ff', 1.1); rim.position.set(-6, 4, -5); scene.add(rim);
    scene.add(new THREE.HemisphereLight('#eef2f4', '#4a4038', 0.6));
    return { canvas, gl, scene, cam: new THREE.PerspectiveCamera(26, 1, 0.05, 400) };
  }, []);
  useEffect(() => () => { if (kit) { kit.scene.environment?.dispose(); kit.gl.dispose(); kit.gl.forceContextLoss?.(); } }, [kit]);
  useFrame(({ clock }) => {
    if (done || !kit) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    if (clock.elapsedTime - t0.current < DELAY) return;   // let the world settle first
    const { gl, scene, cam, canvas } = kit, box = new THREE.Box3(), sphere = new THREE.Sphere();
    for (let n = 0; n < PER_FRAME && next.current < jobs.length; n++, next.current++) {
      const j = jobs[next.current], g = refs.current[j.key]; if (!g) continue;
      g.visible = true; g.updateMatrixWorld(true);
      box.setFromObject(g); if (box.isEmpty()) { g.visible = false; continue; }
      box.getBoundingSphere(sphere);
      const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * 0.92;
      cam.position.copy(sphere.center).addScaledVector(VIEW, dist); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix(); cam.lookAt(sphere.center);
      gl.clear(); gl.render(scene, cam);
      setIcon(j.key, canvas.toDataURL('image/png'));
      g.visible = false;
    }
    if (next.current >= jobs.length) { setDone(true); markIconsReady(); }
  });
  if (done || !kit) return null;
  return createPortal(<>{jobs.map(j => <group key={j.key} ref={el => { refs.current[j.key] = el; }} visible={false}><Model id={j.id} T={T} mat={j.mat} /></group>)}</>, kit.scene);
}
