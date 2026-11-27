import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { clipFor } from '../game/people.js';

/** A real person model (game/people.js), rigged: they idle, and talk when you stand close. */
function Model({ file }) {
  const { scene, animations } = useGLTF(`/models/${file}.glb`);
  // SkeletonUtils: a plain clone would leave the copy skinned to the original's bones
  const copy = useMemo(() => { const c = cloneSkinned(scene); c.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return c; }, [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(copy), [copy]);
  const now = useRef(null), root = useRef(), here = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => { mixer.stopAllAction(); now.current = null; }, [mixer]);
  useFrame(({ camera }, dt) => {
    if (!root.current) return;
    const name = clipFor(root.current.getWorldPosition(here).distanceTo(camera.position));
    if (name !== now.current?.name) {
      const clip = THREE.AnimationClip.findByName(animations, name); if (!clip) return;
      const action = mixer.clipAction(clip).reset().play();
      if (now.current) action.crossFadeFrom(now.current.action, 0.3, false);
      else action.time = Math.random() * clip.duration;   // so a row of people does not sway in step
      now.current = { name, action };
    }
    mixer.update(Math.min(dt, 0.1));
  });
  return <primitive ref={root} object={copy} dispose={null} />;
}
/** position is ground level, facing +z */
export default function Person({ file, ...props }) {
  return <group {...props}><Suspense fallback={null}><Model file={file} /></Suspense></group>;
}
