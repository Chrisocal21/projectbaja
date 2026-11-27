import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AnimationMixer, LoopRepeat } from 'three';

/** Position is ground level. Facing is +z. A seated pelvis is 0.49 m above the origin. */
export default function CustomerPerson({ variant = 1, action = 'idle', ...props }) {
  const { scene, animations } = useGLTF('/models/PERSON_Customer' + Math.max(1, Math.min(3, variant)) + '.glb');
  const model = useMemo(() => {
    const copy = clone(scene);
    copy.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    return copy;
  }, [scene]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  useEffect(() => {
    const clip = animations.find(a => a.name === action) || animations[0];
    const current = mixer.clipAction(clip).reset().setLoop(LoopRepeat, Infinity).fadeIn(.18).play();
    return () => { current.fadeOut(.18); };
  }, [mixer, animations, action]);
  useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(model); }, [mixer, model]);
  useFrame((_, dt) => mixer.update(Math.min(dt, .1)));
  return <group {...props}><primitive object={model} dispose={null} /></group>;
}
