// Per-vehicle copies of the El Cajon model (PURE three.js, no React: loads under node with a stub canvas).
// The model is built once (cajon/model.js, about 0.2 s); every truck in the world is a deep copy of it with:
//   - its OWN materials, so one part can glow (aim) without lighting every other part that shares the paint;
//   - each removable part tagged with the slot it is (userData.slot), which is what the crosshair reads (BuildModel's DetachGlow);
//   - visibility from its build (which parts are on), jack stands under bare hubs, and hood / doors / tailgate that swing on their hinges.
import * as THREE from 'three';
import { createElCajon, GROUND_Y, HUB_Y, CAR } from './model.js';
import { CAJON, groupOf } from '../rules/vehicles.js';
import { isFitted } from '../rules/restore.js';

let template = null;
/** the one shared model (geometry and the original materials): copies share its geometry, so never dispose it */
export const getTemplate = () => (template ||= createElCajon('wrecked'));

/** hub name -> where the wheel sits in the model (inside the lift group) */
export const HUBS = { FL: [CAR.wheelX, HUB_Y, CAR.wheelFrontZ], FR: [-CAR.wheelX, HUB_Y, CAR.wheelFrontZ], RL: [CAR.wheelX, HUB_Y, CAR.wheelRearZ], RR: [-CAR.wheelX, HUB_Y, CAR.wheelRearZ] };
/** cover slot id -> the model group that swings (hood, driver_door, passenger_door, tailgate) */
export const COVER_GROUP = Object.fromEntries(Object.entries(CAJON.covers).map(([id, c]) => [id, c.piece]));

/** give every mesh its own copy of its material (clone() drops the rust shader, so it is carried over by hand) */
function ownMaterials(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material, c = m.clone();
    c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey;
    o.material = c;
  });
}

/** a new truck: { root, lift, shell, parts: {slotId -> group}, wheels: {FL.. -> mesh}, stands: {FL.. -> group}, open: {coverId -> 0..1} } */
export function makeCajon() {
  const T = getTemplate(), root = new THREE.Group(), lift = new THREE.Group();
  root.name = 'El Cajon'; lift.position.y = GROUND_Y; root.add(lift);
  const shell = T.body.clone(true); ownMaterials(shell); lift.add(shell);
  const parts = {}, wheels = {}, stands = {}, open = {};
  for (const s of CAJON.slots) {
    const g = groupOf(s); if (!g || s.wheel) continue;
    const node = shell.children.find(c => c.name === g);
    if (node) { node.userData.slot = s.id; parts[s.id] = node; }
  }
  const post = new THREE.MeshStandardMaterial({ color: '#b8361f', metalness: 0.4, roughness: 0.5 });
  Object.entries(HUBS).forEach(([name, at], i) => {
    const w = T.wheels[i].clone(true); ownMaterials(w); w.position.set(...at); w.userData.slot = 'ecWheel' + name; lift.add(w); wheels[name] = w;
    const st = new THREE.Group(), h = at[1] + GROUND_Y;   // a jack stand under the bare hub: the truck sits on blocks, not on its axle
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, h * 0.9, 0.22), post); mast.position.y = h * 0.45; mast.castShadow = true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.46), post); foot.position.y = 0.02;
    st.add(mast, foot); st.position.set(at[0] * 0.92, 0, at[2]); st.visible = false; root.add(st); stands[name] = st;
  });
  for (const id of Object.keys(CAJON.covers)) open[id] = 0;
  return { root, lift, shell, parts, wheels, stands, open, post };
}

/** show what is on the truck: parts by slot, wheels or their stands */
export function applyBuild(inst, build) {
  for (const s of CAJON.slots) {
    const on = isFitted(CAJON, build, s.id);
    if (s.wheel) { inst.wheels[s.wheel].visible = on; inst.stands[s.wheel].visible = !on; }
    else if (inst.parts[s.id]) inst.parts[s.id].visible = on;
  }
}

/** turn one swinging part about its hinge: amount 0 = shut, 1 = fully open (the same maths as Salvage Road's hinge()) */
export function swing(inst, coverId, amount) {
  const g = inst.parts[coverId], h = getTemplate().hinges[COVER_GROUP[coverId]]; if (!g || !h) return;
  g.rotation.set(h.axis === 'x' ? h.angle * amount : 0, h.axis === 'y' ? h.angle * amount : 0, 0);
  g.position.copy(h.at).sub(h.at.clone().applyEuler(g.rotation));
}
/** ease every cover toward open (in the set) or shut; returns true while anything is still moving */
export function stepCovers(inst, openSet, dt, speed = 4) {
  let moving = false;
  for (const id of Object.keys(inst.open)) {
    const want = openSet?.has(id) ? 1 : 0, cur = inst.open[id]; if (cur === want) continue;
    const next = cur < want ? Math.min(want, cur + dt * speed) : Math.max(want, cur - dt * speed);
    inst.open[id] = next; swing(inst, id, next); moving = true;
  }
  return moving;
}

/** a copy of one part's model (shared materials: for items on the floor, in hands and for holograms) - at its place on the truck, to be centred by the caller.
 *  slotId: a part slot (ecHood...) or 'wheel' / any ecWheelXX for the wheel */
export function partCopy(slotId) {
  const T = getTemplate(), s = CAJON.slots.find(x => x.id === slotId);
  if (slotId === 'wheel' || s?.wheel) return T.wheels[0].clone(true);
  const g = s && groupOf(s) && T.parts[groupOf(s)]; return g ? g.clone(true) : null;
}

export function disposeCajon(inst) {
  inst.root.traverse(o => { if (o.isMesh && !o.userData.holo) o.material.dispose?.(); });   // geometry belongs to the template
  inst.post.dispose();
  for (const st of Object.values(inst.stands)) st.traverse(o => o.isMesh && o.geometry.dispose());
}
