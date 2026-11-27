import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { game } from './store.js';
import { createShopAudio, shopWorkKind } from './shopAudio.js';

/**
 * Mount once inside Canvas. Supply workPosition in world metres at the tool contact.
 * Increment completion when an actual build stage commits. A cancelled hold emits no puff.
 * kind can select wrench/grinder/welder/saw/bender for future station jobs.
 */
export default function ShopWorkEffects({ workPosition, completion = 0, kind, volume = .5 }) {
  const audio = useRef(), lastCompletion = useRef(completion), puffAge = useRef(99);
  const sparks = useRef(), puff = useRef();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(48 * 3), 3));
    return g;
  }, []);
  useEffect(() => {
    audio.current = createShopAudio();
    return () => { audio.current.dispose(); geometry.dispose(); };
  }, [geometry]);
  useFrame(({ clock }, dt) => {
    const hold = game.paused ? null : game.holdBar;
    const active = hold ? (kind || shopWorkKind(hold)) : null;
    audio.current?.update(active, dt, volume);
    const position = workPosition;
    sparks.current.visible = !!position && (active === 'grinder' || active === 'welder');
    if (position) {
      sparks.current.position.fromArray(position);
      puff.current.position.fromArray(position);
    }
    if (sparks.current.visible) {
      const attribute = geometry.attributes.position;
      for (let i = 0; i < 48; i++) {
        const age = (clock.elapsedTime * 2.8 + i * .731) % 1;
        const angle = i * 2.399;
        attribute.setXYZ(i, Math.cos(angle) * age * .31, .12 * age - age * age * .32, age * .48 + Math.sin(angle) * age * .13);
      }
      attribute.needsUpdate = true;
    }
    if (completion !== lastCompletion.current) {
      lastCompletion.current = completion;
      puffAge.current = 0;
    }
    puffAge.current += Math.min(dt, .1);
    puff.current.visible = !!position && puffAge.current < .65;
    const age = puffAge.current;
    if (puff.current.visible) {
      puff.current.position.y += age * .2;
      puff.current.scale.setScalar(.06 + age * .22);
      puff.current.material.opacity = .18 * (1 - age / .65);
    }
  });
  return <>
    <points ref={sparks} geometry={geometry} frustumCulled={false} visible={false}>
      <pointsMaterial color="#ffbc51" size={.018} sizeAttenuation transparent opacity={.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
    <mesh ref={puff} visible={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#c9c0ac" transparent opacity={0} depthWrite={false} />
    </mesh>
  </>;
}
