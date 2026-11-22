import React from 'react';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

extend({ RoundedBoxGeometry });

// A small edge radius lets daylight catch cut timber, folded sheet and casework.
// Keep large architecture and thin decals on the inexpensive six-face mesh.
export default function ShopBoxGeometry({ size }) {
  const [w, h, d] = size;
  const thickness = Math.min(w, h, d);
  if (thickness < 0.024 || Math.max(w, h, d) > 5.5) return <boxGeometry args={size} />;
  return <roundedBoxGeometry args={[w, h, d, 1, Math.min(0.012, thickness * 0.12)]} />;
}
