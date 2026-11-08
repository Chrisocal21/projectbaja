// Holograms (docs/VEHICLE_ASSEMBLY_GUIDE.md §7 + §9): a translucent body, edges that show through walls, and an optional
// footprint on the ground. Green = can go here, red = can't, amber = do this first, white = can come off.
import * as THREE from 'three';

export const HOLO = { ok: 0x55ff77, bad: 0xff5544, amber: 0xffb43a, white: 0xdff6ff };
const EDGE = { [HOLO.ok]: 0xa8ffbc, [HOLO.bad]: 0xffb0a4, [HOLO.amber]: 0xffe0a0, [HOLO.white]: 0xffffff };
const edgeCache = new WeakMap();
const edgesFor = g => { if (!edgeCache.has(g)) edgeCache.set(g, new THREE.EdgesGeometry(g, 30)); return edgeCache.get(g); };

/** one set of hologram materials; `set(color)` recolours, `pulse(t, near)` animates */
export function holoMaterials() {
  const body = new THREE.MeshBasicMaterial({ color: HOLO.ok, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const edge = new THREE.LineBasicMaterial({ color: EDGE[HOLO.ok], transparent: true, opacity: 0.95, depthTest: false });
  const foot = new THREE.MeshBasicMaterial({ color: HOLO.ok, transparent: true, opacity: 0.35, depthWrite: false });
  let cur = HOLO.ok;
  return {
    body, edge, foot,
    set(c) { if (c === cur) return; cur = c; body.color.setHex(c); foot.color.setHex(c); edge.color.setHex(EDGE[c] ?? 0xffffff); body.blending = c === HOLO.bad ? THREE.NormalBlending : THREE.AdditiveBlending; body.needsUpdate = true; },
    pulse(t, near = false) { const p = 0.5 + 0.5 * Math.sin(t * (near ? 8 : 4)); body.opacity = 0.28 + 0.25 * p; edge.opacity = 0.65 + 0.35 * p; },
    dispose() { body.dispose(); edge.dispose(); foot.dispose(); },
  };
}

/** turn every visible mesh under `root` into a hologram (in place): ghost body + edge lines. Shadows off. */
export function ghostify(root, mats) {
  root.traverse(o => {
    if (!o.isMesh || o.userData.holo) return;
    o.material = mats.body; o.castShadow = o.receiveShadow = false; o.renderOrder = 10; o.userData.holo = true;
    const e = new THREE.LineSegments(edgesFor(o.geometry), mats.edge); e.renderOrder = 11; e.userData.holo = true; e.raycast = () => {};
    o.add(e); o.raycast = () => {};
  });
  return root;
}
/** a flat footprint patch for a ghost: w x d metres, lying 5 cm above y = 0 */
export function footprint(w, d, mats) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mats.foot); m.position.y = 0.05; m.renderOrder = 9; return m;
}
