// GAME-FEEL view: the first-person walker, a faithful copy of the movement in game/Walker.jsx (the real one is wired to the story:
// prompts, car, county colliders), so it can't be mounted as-is. Same numbers: eye 1.72 m, walk 3.2 m/s, run (Shift) 6 m/s, 10/s
// velocity easing, view bob, mouse look 0.0022 rad/px, pitch +-1.3, fov = the game's default (70), mouse look needs pointer lock (click).
// The ghost is placed 4.5 m ahead (horizontal) like Home.jsx's Ghost. Empty world: no colliders, just the 60 x 60 m bounds.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { game, emit } from '../game/store.js';
import { lookScale } from '../game/settings.js';
import { HALF, useGhost, keyOf } from './Scene.jsx';

export const walk = { x: 0, z: 10, yaw: 0, pitch: 0, vx: 0, vz: 0, t: 0, keys: {} };
if (typeof window !== 'undefined') window.__blwalk = walk;

export default function Walk({ ctl, piecesRef }) {
  const { camera, gl } = useThree();
  const gh = useGhost(ctl), last = useRef({}), ray = useMemo(() => new THREE.Raycaster(), []), plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);

  useEffect(() => {
    const s = walk, el = gl.domElement;
    camera.rotation.order = 'YXZ'; camera.fov = game.settings.fov; camera.updateProjectionMatrix();
    const locked = () => document.pointerLockElement === el;
    const move = e => { if (!locked() || ctl.current.paused) return; const [kx, ky] = lookScale(); s.yaw -= e.movementX * 0.0022 * kx; s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - e.movementY * 0.0022 * ky)); };
    const kd = e => { if (e.target.closest?.('input, textarea, select')) return; s.keys[e.code] = true; }, ku = e => { s.keys[e.code] = false; }, blur = () => { s.keys = {}; };
    const mdown = e => {
      if (e.target !== el || ctl.current.paused) return;
      if (!locked()) { if (e.button === 0) el.requestPointerLock?.(); return; }   // the first click only grabs the mouse, like the game
      if (e.button === 0) ctl.current.onClick({ shift: false, ctrl: false, ...last.current });
      else if (e.button === 2) ctl.current.onCancel?.();
    };
    const wheel = e => { if (locked() && !ctl.current.paused) ctl.current.onWheel?.(e.deltaY > 0 ? 1 : -1); };
    const lock = () => { ctl.current.setLocked?.(locked()); };
    window.addEventListener('mousemove', move); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    window.addEventListener('mousedown', mdown); window.addEventListener('wheel', wheel); document.addEventListener('pointerlockchange', lock);
    ctl.current.relock = () => el.requestPointerLock?.();
    lock();
    return () => {
      window.removeEventListener('mousemove', move); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      window.removeEventListener('mousedown', mdown); window.removeEventListener('wheel', wheel); document.removeEventListener('pointerlockchange', lock);
      s.keys = {}; camera.rotation.order = 'XYZ'; game.target = null;
    };
  }, [camera, gl]);

  useFrame(({ clock }, rawDt) => {
    const s = walk, c = ctl.current, dt = Math.min(rawDt, 0.05);
    if (!c.paused) {
      const k = s.keys, fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const speed = (k.ShiftLeft || k.ShiftRight) ? 6 : 3.2, len = Math.hypot(fwd, side) || 1;
      const wx = (-Math.sin(s.yaw) * fwd + Math.cos(s.yaw) * side) / len * speed, wz = (-Math.cos(s.yaw) * fwd - Math.sin(s.yaw) * side) / len * speed;
      s.vx += (wx - s.vx) * Math.min(1, dt * 10); s.vz += (wz - s.vz) * Math.min(1, dt * 10);
      s.x = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, s.x + s.vx * dt)); s.z = Math.max(-HALF + 0.3, Math.min(HALF - 0.3, s.z + s.vz * dt));
      s.t += Math.hypot(s.vx, s.vz) * dt * 2.1;
    }
    const bob = Math.sin(s.t) * 0.028 * Math.min(1, Math.hypot(s.vx, s.vz) / 3);
    camera.position.set(s.x, 1.72 + bob, s.z); camera.rotation.set(s.pitch, s.yaw, 0);
    if (camera.fov !== game.settings.fov) { camera.fov = game.settings.fov; camera.updateProjectionMatrix(); }
    game.pos.x = s.x; game.pos.z = s.z; game.face.x = -Math.sin(s.yaw); game.face.z = -Math.cos(s.yaw);

    // what the crosshair is on (pieces within reach) and where the ghost goes (4.5 m ahead on the ground, like the game)
    camera.updateMatrixWorld();
    ray.setFromCamera(center, camera);
    const hit = !c.paused && piecesRef.current ? ray.intersectObject(piecesRef.current, true).find(h => h.object.visible && h.distance < 9) : null;
    const hkey = hit ? keyOf(hit.object) : null;
    const gp = c.paused ? null : { x: Math.max(-HALF, Math.min(HALF, s.x + game.face.x * 4.5)), z: Math.max(-HALF, Math.min(HALF, s.z + game.face.z * 4.5)) };
    const ghostInfo = gh.update(gp, clock.elapsedTime);
    last.current = { ground: gp, pieceKey: hkey, ghost: ghostInfo, mpt: null };
    const tgt = hkey ? 'piece' : null;
    if (game.target !== tgt) { game.target = tgt; emit(); }
    const sig = `${hkey}|${ghostInfo ? `${ghostInfo.x ?? ghostInfo.origin.x},${ghostInfo.z ?? ghostInfo.origin.z},${ghostInfo.ry},${ghostInfo.why}` : ''}`;
    if (sig !== c.lastSig) { c.lastSig = sig; c.onHover({ key: hkey, size: null, ghost: ghostInfo, ground: gp, mpt: null }); }
  });
  return <group>{gh.el}</group>;
}
