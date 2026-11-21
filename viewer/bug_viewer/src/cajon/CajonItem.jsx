// A loose El Cajon part lying on the ground or in your hands: its own model, laid the way it would be left on a garage floor (restPose.js), bottom on y = 0.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CAJON, groupOf } from '../rules/vehicles.js';
import { restOfCajon, FEEL } from '../game/restPose.js';
import { partCopy } from './instance.js';

export default function CajonItem({ id }) {
  const { obj, off } = useMemo(() => {
    const c = partCopy(id); if (!c) return { obj: null, off: [0, 0, 0] };
    const slot = CAJON.slots.find(s => s.id === id), rest = FEEL ? restOfCajon(slot && groupOf(slot)) : [0, 0];
    const tilt = new THREE.Group(); tilt.rotation.set(rest[0], 0, rest[1]);
    if (id === 'wheel' || slot?.wheel) { tilt.rotation.set(0, 0, Math.PI / 2); }   // a wheel lies flat on its side
    tilt.add(c); tilt.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tilt), ctr = box.getCenter(new THREE.Vector3());
    return { obj: tilt, off: [-ctr.x, -box.min.y, -ctr.z] };
  }, [id]);
  return obj ? <group position={off}><primitive object={obj} /></group> : null;
}
