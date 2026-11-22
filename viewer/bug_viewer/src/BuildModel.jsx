import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { holoMaterials, ghostify, HOLO } from './hologram.js';
import { fitCandidate, planRemove } from './game/workshop.js';
import { carFitReady } from './game/carSnap.js';
import { workVehicles } from './game/projects.js';
import { toLocal } from './game/workTarget.js';
import { HOLD } from './game/restPose.js';
import { held, toolInHand } from './game/items.js';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { resolve, partFile, bodyById, partById } from './build.js';
import { rimGeometry } from './Rims.jsx';
import { ProcPart } from './ProcParts.jsx';
import { applyWeathering, kindForMaterial, LIVERY } from './weather.js';
import { createSuspensionVisual, disposeSuspensionVisual } from './suspension.js';
import { game, useGame } from './game/store.js';
import { BUG } from './rules/vehicles.js';
import ProcEngine from './Engine.jsx';
import RollingChassis from './Chassis.jsx';

export const sourceNameFor = o => { for (let n = o; n; n = n.parent) if (n.userData.source_name) return n.userData.source_name; return o.name; };
/** Meshes exported without normals render as raw flat facets (bright shards) - give them smooth normals. */
function smoothNormals(root) {
  root.traverse(o => {
    if (!o.isMesh || o.geometry.attributes.normal) return;
    let g = o.geometry.clone(); g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4); g.computeVertexNormals(); o.geometry = g;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.flatShading = false; m.needsUpdate = true; });
  });
}
const isWheelNode = o => /^C?Wheel_(FL|FR|RL|RR)$/.test(o.name);
function inspectSelection(e, onSelect, asset) {
  e.stopPropagation();
  const m = e.object, size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
  onSelect?.({ name: m.name || '(unnamed mesh)', sourceName: sourceNameFor(m), asset,
    triangles: Math.round((m.geometry?.index?.count || m.geometry?.attributes?.position?.count || 0) / 3),
    size: [size.x, size.y, size.z].map(n => n.toFixed(2)) });
}

/** One GLB. `mask` hides meshes by name prefix (only when isBase), `paint` recolours matching materials. */
function Model({ file, mask = [], hide = [], wireframe, onSelect, isBase = false, channels = [], wheelDy = 0, material = null, opens = [], only = null }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material?.clone();
      const raycast = o.raycast;
      o.raycast = function (raycaster, hits) { if (this.visible) raycast.call(this, raycaster, hits); };
    });
    return c;
  }, [scene]);
  const maskKey = mask.join('|') + '#' + hide.join('|') + '#' + (only || []).join('|');
  useEffect(() => {
    clone.traverse(o => {
      if (!o.isMesh) return;
      o.visible = !((isBase && mask.some(prefix => sourceNameFor(o).startsWith(prefix))) || hide.some(prefix => sourceNameFor(o).startsWith(prefix))) && (!only || only.some(prefix => sourceNameFor(o).startsWith(prefix)));
      const wheel = isWheelNode(o) || (o.parent && isWheelNode(o.parent));
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m) return;
        m.wireframe = !!wireframe;
        if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
        const ch = !wheel && channels.find(c => c.re.test(m.name || 'unnamed'));
        m.color.copy(material?.color ? new THREE.Color(material.color) : ch ? new THREE.Color(ch.color) : m.userData.baseColor);
        if (material) { if (material.metalness != null) m.metalness = material.metalness; if (material.roughness != null) m.roughness = material.roughness; }
        if (material?.unpainted && (m.map || m.vertexColors)) { m.map = null; m.vertexColors = false; m.needsUpdate = true; }   // bare fiberglass: flat colour, whatever the model was textured with
        if (!material && !wheel) applyWeathering(m, kindForMaterial(m.name || ''), o, clone);
        else if (material?.weave) applyWeathering(m, 'carbon', o, clone);
      });
    });
  }, [clone, maskKey, wireframe, isBase, channels, material]);
  // open lids (engine lid, front hood): swing the matching meshes about a hinge on the lid's top edge
  const opensKey = opens.map(o => o.piece).join('|');
  useEffect(() => {
    clone.traverse(o => { if (o.userData.lidOpen) { o.matrixAutoUpdate = true; o.userData.lidOpen = false; o.updateMatrix(); } });
    if (!opens.length) return;
    clone.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(clone.matrixWorld).invert();
    for (const op of opens) {
      const meshes = []; clone.traverse(o => { if (o.isMesh && op.match.some(m => sourceNameFor(o).startsWith(m))) meshes.push(o); });
      if (!meshes.length) continue;
      // hinge from the panel itself (first match = the skin), not handles/trim that stick out past it; doors hinge just inside the skin's front edge
      const skin = meshes.filter(m => sourceNameFor(m).startsWith(op.match[0])), box = new THREE.Box3();
      for (const m of skin.length ? skin : meshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))); }
      const p = op.axis === 'y' ? new THREE.Vector3(op.side > 0 ? box.max.x - 0.025 : box.min.x + 0.025, 0, box.max.z - 0.03) : new THREE.Vector3(0, box.max.y, op.hinge === 'front' ? box.max.z : box.min.z);
      const H = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(op.axis === 'y' ? new THREE.Matrix4().makeRotationY(op.angle) : new THREE.Matrix4().makeRotationX(op.angle)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
      for (const m of meshes) { const Mc = inv.clone().multiply(m.matrixWorld), Pc = inv.clone().multiply(m.parent.matrixWorld).invert(); m.matrix.copy(Pc.multiply(H).multiply(Mc)); m.matrixAutoUpdate = false; m.userData.lidOpen = true; }
    }
  }, [clone, opensKey]);
  // wheels built into a body shell stay on the ground when the body is lifted
  useEffect(() => { clone.traverse(o => { if (isWheelNode(o)) { o.userData.y0 ??= o.position.y; o.position.y = o.userData.y0 + wheelDy; } }); }, [clone, wheelDy]);
  return <primitive object={clone} onClick={e => inspectSelection(e, onSelect, file)} />;
}

function Rim({ rim, color }) {
  const geo = useMemo(() => rimGeometry(rim.style), [rim.style]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} metalness={0.4} roughness={0.4} side={THREE.DoubleSide} /></mesh>;
}

/** One instance of a single-tire GLB (0.95 m across, axle on Z) mounted on a wheel position. */
function TireWheel({ set, mount, rim, rimColor }) {
  const { scene } = useGLTF(`/models/${set.file}.glb`);
  const wheel = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.castShadow = true; o.receiveShadow = true;
      if (!o.material.map) { o.material.color.set('#1d1d1d'); o.material.roughness = 0.95; o.material.metalness = 0; }
    });
    smoothNormals(c);
    c.traverse(o => { if (o.isMesh) applyWeathering(o.material, 'rubber', o, c); });
    return c;
  }, [scene]);
  const left = mount.center[0] > 0, s = mount.radius / (set.baseRadius || 0.475);
  return <group name={`CWheel_${mount.name}`} position={mount.center}>
    <group rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]} scale={s}><primitive object={wheel} />{rim && <Rim rim={rim} color={rimColor} />}</group>
  </group>;
}

/** Spare tire that matches whatever tire/wheel style is fitted, mounted on a carrier (axle along Z, face to the rear). */
function useTireClone(file) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  return useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); if (!o.material.map) { o.material.color.set('#1d1d1d'); o.material.roughness = 0.95; o.material.metalness = 0; } });
    smoothNormals(c);
    c.traverse(o => { if (o.isMesh) applyWeathering(o.material, 'rubber', o, c); });
    return c;
  }, [scene]);
}
function TireSpare({ set, spare, scale, rim, rimColor }) {
  const tire = useTireClone(set.file);
  return <group position={spare.center} rotation={[0, Math.PI, 0]} scale={(spare.radius * scale) / (set.baseRadius || 0.475)}><primitive object={tire} />{rim && <Rim rim={rim} color={rimColor} />}</group>;
}
function PrebuiltSpare({ file, spare }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const { obj, center } = useMemo(() => {
    const c = scene.clone(true), box = new THREE.Box3();
    c.traverse(o => { if (!o.isMesh) return; if (/^FL_/.test(o.name) || /^FL_/.test(o.parent?.name || '')) box.expandByObject(o); else o.visible = false; });
    return { obj: c, center: box.getCenter(new THREE.Vector3()) };
  }, [scene]);
  return <group position={spare.center} rotation={[0, Math.PI / 2, 0]}><group position={[-center.x, -center.y, -center.z]}><primitive object={obj} /></group></group>;
}
function FallbackSpare({ spare }) {
  return <group position={spare.center}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[spare.radius, spare.radius, 0.26, 40]} /><meshStandardMaterial color="#141414" roughness={0.9} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[spare.radius * 0.58, spare.radius * 0.58, 0.27, 32]} /><meshStandardMaterial color="#8a8a90" metalness={0.6} roughness={0.4} /></mesh>
  </group>;
}
/** Mount for the spare: a hub plate behind the tire, two arms out to the rear cage and a post down to the bumper bar. (The carrier GLB is a small low-poly tire, which doubled up with the real spare, so it is not drawn.) */
function SpareBracket({ spare }) {
  const [cx, cy, cz] = spare.center, hubZ = cz + 0.2, mat = <meshStandardMaterial color="#2a2d30" metalness={0.55} roughness={0.45} />;
  const hub = new THREE.Vector3(cx, cy, hubZ);
  const tube = (to, r = 0.03) => { const d = to.clone().sub(hub), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); return { pos: hub.clone().add(to).multiplyScalar(0.5).toArray(), q, len: d.length(), r, to }; };
  // on the Stage 2 rear cage the arms clamp straight onto its outer tube; otherwise they reach in to the bumper bar
  const anchors = (spare.anchors || [[-0.34, cy - 0.28, -1.9], [0.34, cy - 0.28, -1.9], [0, 0.46, -1.94]]).map(a => new THREE.Vector3(...a));
  return <group>
    <mesh position={hub.toArray()} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />{mat}</mesh>
    {anchors.map((a, i) => { const t = tube(a); return <group key={i}>
      <mesh position={t.pos} quaternion={t.q} castShadow><cylinderGeometry args={[t.r, t.r, t.len, 10]} />{mat}</mesh>
      <mesh position={a.toArray()} castShadow><boxGeometry args={[0.1, 0.1, 0.04]} />{mat}</mesh>
    </group>; })}
  </group>;
}
function SpareTire({ spare, r }) {
  const set = r.wheelSet;
  if (set.kind === 'tire') return <TireSpare set={set} spare={spare} scale={r.scale} rim={r.rim} rimColor={r.rimColor} />;
  if (set.kind === 'prebuilt') return <PrebuiltSpare file={set.bodies[r.body.id]} spare={spare} />;
  return <FallbackSpare spare={spare} />;
}

function Suspension({ mounts, lift, coilovers, wireframe, onSelect }) {
  const visual = useMemo(() => createSuspensionVisual(mounts, lift, coilovers), [mounts, lift, coilovers]);
  useEffect(() => () => disposeSuspensionVisual(visual), [visual]);
  useEffect(() => { visual.traverse(o => { if (o.isMesh) o.material.wireframe = !!wireframe; }); }, [visual, wireframe]);
  return <primitive object={visual} onClick={e => inspectSelection(e, onSelect, 'SuspensionAssembly (procedural)')} />;
}

/** Auto-fit: rotates (fit.rot = [x,y,z] degrees, or fit.rotY), then scales/positions a free-sized GLB into a target box on the body. */
function Fitted({ file, fit, children }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const t = useMemo(() => {
    const d = THREE.MathUtils.degToRad, r = fit.rot || [0, fit.rotY || 0, 0];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(d(r[0]), d(r[1]), d(r[2]), 'XYZ'));
    const raw = new THREE.Box3().setFromObject(scene), rawCenter = raw.getCenter(new THREE.Vector3());
    const rb = raw.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(), q, new THREE.Vector3(1, 1, 1)));   // box of the rotated model
    const sz = rb.getSize(new THREE.Vector3());
    const tmin = new THREE.Vector3(...fit.min), tmax = new THREE.Vector3(...fit.max), tsize = tmax.clone().sub(tmin);
    let sc = new THREE.Vector3(tsize.x / sz.x, tsize.y / sz.y, tsize.z / sz.z);
    if (fit.uniform) { const u = Math.min(sc.x, sc.y, sc.z); sc = new THREE.Vector3(u, u, u); }
    return { center: rawCenter, quat: q, scale: sc.toArray(), pos: tmin.clone().add(tmax).multiplyScalar(0.5).toArray() };
  }, [scene, fit]);
  return <group position={t.pos} scale={t.scale}><group quaternion={t.quat}><group position={[-t.center.x, -t.center.y, -t.center.z]}>{children}</group></group></group>;
}

/** welded-in shock hoops: a tube tower over each wheel, braced back to the body (fabricated from scrap, see game/home.js) */
export function ShockHoops({ mounts, ghost = null }) {
  const steel = useMemo(() => ghost ? ghost.body : new THREE.MeshStandardMaterial({ color: '#3a3d40', metalness: 0.6, roughness: 0.45 }), [ghost]);
  const g = useMemo(() => {
    const root = new THREE.Group(), tube = (a, b, r = 0.024) => { const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), steel); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = !ghost; root.add(m); };
    for (const m of mounts) {
      const [x, y, z] = m.center, xi = x * 0.72, top = y + m.radius + 0.36, front = m.name.startsWith('F') ? 1 : -1;
      const a = new THREE.Vector3(xi, y - 0.05, z - 0.3), b = new THREE.Vector3(xi, top, z - 0.18), c = new THREE.Vector3(xi, top, z + 0.18), d = new THREE.Vector3(xi, y - 0.05, z + 0.3);
      tube(a, b); tube(b, c); tube(c, d);                                                   // the hoop over the tire
      tube(b, new THREE.Vector3(xi * 0.35, top - 0.05, z - front * 0.15), 0.02);            // brace in to the body
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), steel); p.position.set(xi, top + 0.01, z); root.add(p);   // shock top plate
    }
    if (ghost) ghostify(root, ghost);
    return root;
  }, [mounts, steel, ghost]);
  return <primitive object={g} />;
}

/** a hologram of part of a GLB (only the meshes whose names start with `only`), e.g. the empty spot a held part bolts into */
function GhostModel({ file, only, mats }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => { if (o.isMesh) o.visible = !only || only.some(p => sourceNameFor(o).startsWith(p)); });
    return ghostify(c, mats);
  }, [scene, (only || []).join('|'), mats]);
  return <primitive object={obj} />;
}
/** this vehicle as a work vehicle (where it is, how far you are from it), and whether it is the one you are standing at */
export function selfOf(vehId) {
  const v = workVehicles().find(x => x.id === vehId), W = game.work;
  return { v, mine: !!W && W.id === vehId, dist: v && game.onFoot ? Math.hypot(game.pos.x - v.pose.x, game.pos.z - v.pose.z) : Infinity };
}
/** the real (solid) meshes of part of a GLB: what the held part looks like once it has clipped into its spot */
function SolidModel({ file, only }) {
  const { scene } = useGLTF(`/models/${file}.glb`);
  const obj = useMemo(() => { const c = scene.clone(true); c.traverse(o => { if (o.isMesh) { o.visible = !only || only.some(p => sourceNameFor(o).startsWith(p)); o.castShadow = false; } }); return c; }, [scene, (only || []).join('|')]);
  return <primitive object={obj} />;
}
/** box (world) of only the meshes that are switched on: setFromObject would count the hidden rest of the car's GLB too */
function visBox(root) {
  const b = new THREE.Box3(), t = new THREE.Box3(); root.updateWorldMatrix(true, true);
  root.traverse(o => { if (o.isMesh && o.visible) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); t.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); b.union(t); } });
  return b;
}
/** the held part, once it is lined up with its spot: flies from your hands into the hologram and sits there (game/carSnap.js decides when).
 *  Also works out whether the crosshair is at the spot (game.snapNear): a generous zone around where the part goes, so you don't have to hit one exact point. */
function SnapIn({ children, mine = true }) {
  const g = useRef(), S = useRef({ off: null, tick: 0, box: null }), { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []), c0 = useMemo(() => new THREE.Vector2(0, 0), []);
  useEffect(() => () => { game.snapNear = false; }, []);
  useFrame((_, dt) => {
    const n = g.current; if (!n) return; const s = S.current;
    if (!mine) { s.off = null; n.visible = false; return; }   // only the vehicle you are standing at takes the held part
    if (s.tick++ % 3 === 0 || !s.box) {
      const p = n.position.clone(); n.position.set(0, 0, 0); s.box = visBox(n); n.position.copy(p);
      if (s.box.isEmpty()) game.snapNear = false;
      else { ray.setFromCamera(c0, camera); game.snapNear = ray.ray.intersectsBox(s.box.clone().expandByScalar(0.5)); }
    }
    if (!carFitReady() || s.box.isEmpty()) { s.off = null; n.visible = false; return; }
    n.visible = true;
    if (!s.off) {   // just snapped: start the flight at the hand
      const hand = new THREE.Vector3(HOLD.right, -HOLD.down, -HOLD.forward).applyMatrix4(camera.matrixWorld);
      s.off = n.parent.worldToLocal(hand).sub(n.parent.worldToLocal(s.box.getCenter(new THREE.Vector3())));
    }
    s.off.multiplyScalar(Math.exp(-dt * 14));   // eases in over about a fifth of a second
    n.position.copy(s.off);
  });
  return <group ref={g} visible={false}>{children}</group>;
}
/** the hologram of a spot, plus the real part that flies into it when you line the held part up (module level so it keeps its animation between renders) */
export function SnapPair({ ghost, solid, mine = true }) {   // ghost / solid: the hologram and the real part of any vehicle (a GLB piece here, an El Cajon part in cajon/CajonModel.jsx)
  const holo = useRef();
  useFrame(() => { if (holo.current) holo.current.visible = !(mine && carFitReady()); });   // the hologram is for lining up: once the part has clipped in, only the real part shows
  return <><group ref={holo}>{ghost}</group><SnapIn mine={mine}>{solid}</SnapIn></>;
}
function SnapGhost({ file, only, mats, mine = true }) {
  return <SnapPair mine={mine} ghost={<GhostModel file={file} only={only} mats={mats} />} solid={<SolidModel file={file} only={only} />} />;
}
export const WHEEL_MESH = { FL: 'B_FLWheel', FR: 'B_FRWheel', RL: 'B_BLWheel', RR: 'B_BRWheel' };
/** §9 of the assembly guide: while you hold a part near the car, the spot where it goes glows - green (go), amber (open the lid first), red (not yet) */
function FitGhost({ build, r, vehId }) {
  useGame();
  const mats = useMemo(() => holoMaterials(), []), amber = useMemo(() => { const m = holoMaterials(); m.set(HOLO.amber); return m; }, []);
  useEffect(() => () => { mats.dispose(); amber.dispose(); }, [mats, amber]);
  useFrame(({ clock }) => { mats.pulse(clock.elapsedTime, game.work?.id === vehId); amber.pulse(clock.elapsedTime + 0.6, true); });
  const { mine, dist } = selfOf(vehId);
  const fc0 = dist <= 10 && held() ? fitCandidate(build, mine ? game.work.zone : undefined) : null;
  return <>{fc0?.plan.blockers?.length ? <SlotGhosts ids={fc0.plan.blockers} r={r} mats={amber} /> : null}<FitGhostMain build={build} r={r} mats={mats} vehId={vehId} /></>;
}
/** amber ghosts over fitted/missing slots that have to change first (assembly guide §9.3) */
function SlotGhosts({ ids, r, mats }) {
  return <>{ids.map(id => {
    const slot = BUG.slots.find(s => s.id === id); if (!slot) return null;
    if (slot.wheel) return <GhostModel key={id} file={r.body.file} only={[WHEEL_MESH[slot.wheel]]} mats={mats} />;
    const piece = slot.piece && (r.body.pieces || []).find(p => p.id === slot.piece);
    return piece ? <group key={id} position={[0, r.lift, 0]}><GhostModel file={r.body.file} only={piece.match} mats={mats} /></group> : null;
  })}</>;
}
/** a point (car frame) inside a wheel's sphere is that wheel: tire tread, hub, brake and suspension meshes carry no slot name of their own */
function wheelNear(p, r) {
  for (const m of r.mounts || []) { const [x, y, z] = m.center; if (Math.hypot(p.x - x, p.y - y, p.z - z) < m.radius * 1.25) return r.wheelSlot ? r.wheelSlot(m.name) : 'wheel' + m.name; }   // r.wheelSlot: another vehicle's slot ids (the El Cajon's are ecWheelFL...)
  return null;
}
/** which restoration slot a mesh of the car belongs to (body pieces and wheels), or null */
function slotForMesh(o, r) {
  for (let n = o; n; n = n.parent) { if (n.userData?.slot) return n.userData.slot; if (n.userData?.upgrade) return 'up:' + n.userData.upgrade; }   // engine, battery and bolt-ons are tagged groups
  for (let n = o; n; n = n.parent) { const m = /^CWheel_(FL|FR|RL|RR)/.exec(n.name || ''); if (m) return 'wheel' + m[1]; }
  const src = sourceNameFor(o), w = Object.entries(WHEEL_MESH).find(([, mesh]) => src.startsWith(mesh)); if (w) return 'wheel' + w[0];
  const piece = (r.body.pieces || []).find(p => p.match.some(m => src.startsWith(m)));
  return piece ? BUG.slots.find(s => s.piece === piece.id)?.id || null : null;
}
const visibleChain = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
/** assembly guide §9.3c: empty-handed, the part you aim at glows white (it can come off) or red with what's in the way amber. Sets game.aim for the R key. */
export function DetachGlow({ build, r, carRef, vehId }) {
  // glows the REAL part (emissive pulse on its own material copies, guide §9.3c option B), so it follows doors and lids wherever they've swung
  const { camera } = useThree();
  const ray = useMemo(() => { const rc = new THREE.Raycaster(); rc.far = 4; return rc; }, []), centre = useMemo(() => new THREE.Vector2(0, 0), []);
  const st = useRef({ tick: 0, aim: null, lit: [] });
  const unlight = () => { for (const { m } of st.current.lit) if (m.userData.e0) m.emissive.copy(m.userData.e0); st.current.lit = []; };
  useEffect(() => () => { unlight(); if (game.work?.id === vehId) game.aim = null; }, []);
  useEffect(() => { unlight(); st.current.aim = null; }, [build]);   // a fit/detach changes what can come off: re-light next pick
  useFrame(({ clock }) => {
    const S = st.current, car = carRef.current, mineNow = game.work?.id === vehId;
    if (!mineNow && S.aim) { unlight(); S.aim = null; }   // you walked away from this vehicle: stop lighting its part
    if (mineNow && S.tick++ % 4 === 0) try {   // aim pick every 4th frame: the body is ~120k triangles
      let id = null;
      if (game.onFoot && !game.buildMode && car) {
        ray.setFromCamera(centre, camera);
        for (const h of ray.intersectObject(car, true)) {
          const m = h.object.material; if (!h.object.isMesh || (m && m.transparent && m.depthWrite === false) || !visibleChain(h.object)) continue;
          id = slotForMesh(h.object, r) || wheelNear(car.worldToLocal(h.point.clone()), r);   // the mesh under the crosshair decides; a tire, hub, brake or arm near a wheel counts as that wheel
          if (window.__aimDebug) console.log('[aim]', h.object.name, sourceNameFor(h.object), '->', id);
          break;   // nearest solid hit wins
        }
      }
      let near = false;               // is the crosshair on the car, or right at a bare wheel hub? (then a held part snaps to the car; looking elsewhere puts it down there)
      if (game.onFoot && car) {
        const inv = new THREE.Matrix4().copy(car.matrixWorld).invert(), rl = ray.ray.clone().applyMatrix4(inv), v = new THREE.Vector3();
        near = !!id || (r.mounts || []).some(m => (build.stripped || []).includes(r.wheelSlot ? r.wheelSlot(m.name) : 'wheel' + m.name) && rl.distanceToPoint(v.set(...m.center)) < 0.9);
      }
      game.snapAim = near;
      game.look = id;                 // what the crosshair is on (doors, hood, lid, seats use this for E)
      const gid = toolInHand() ? id : null; // what a hold-click would take off: only with empty hands
      game.aim = gid;
      if (gid !== S.aim) {
        unlight(); S.aim = gid;
        if (gid && car) {
          const plan = planRemove(gid, build, game.work.zone), col = new Map([[gid, plan.ok ? 0xbfe8ff : 0xff3a24]]);
          if (!plan.ok) for (const b of plan.blockers || []) col.set(b, 0xffa020);
          car.traverse(o => { if (!o.isMesh || !visibleChain(o)) return; const sid = slotForMesh(o, r); if (!col.has(sid)) return;
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (!m?.emissive) continue; m.userData.e0 ??= m.emissive.clone(); S.lit.push({ m, c: new THREE.Color(col.get(sid)) }); } });
        }
      }
    } catch (err) { if (!S.err) { S.err = true; console.error('[glow] detach glow failed (game keeps running):', err); } }
    const k = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 7));
    for (const { m, c } of S.lit) m.emissive.copy(c).multiplyScalar(k);
  });
  return null;
}
function FitGhostMain({ build, r, mats, vehId }) {
  const { v, mine, dist } = selfOf(vehId); if (!v || dist > 10) return null;
  const fc = held() ? fitCandidate(build, mine ? game.work.zone : undefined) : null; if (!fc) return null;
  const it = fc.it, plan = fc.plan;
  mats.set(plan.ok ? HOLO.ok : HOLO.bad);   // what has to happen first glows amber (SlotGhosts)
  if (it.kind === 'fab' && it.id === 'shockHoops') return <ShockHoops mounts={r.mounts} ghost={mats} />;
  if (it.kind === 'stock' && it.id === 'wheel') {
    const bare = ['FL', 'FR', 'RL', 'RR'].filter(w => (build.stripped || []).includes('wheel' + w)), cl = mine ? game.work : toLocal(v.pose, game.pos.x, game.pos.z); if (!bare.length) return null;
    const near = bare.map(w => [w, r.mounts.find(m => m.name === w)]).sort((a, b) => Math.hypot(a[1].center[0] - (cl?.lx || 0), a[1].center[2] - (cl?.lz || 0)) - Math.hypot(b[1].center[0] - (cl?.lx || 0), b[1].center[2] - (cl?.lz || 0)))[0][0];
    return <SnapGhost mine={mine} mats={mats} file={r.body.file} only={[WHEEL_MESH[near]]} />;
  }
  if (it.kind === 'stock') {
    const slot = BUG.slots.find(s => s.id === it.id), piece = slot?.piece && (r.body.pieces || []).find(p => p.id === slot.piece);
    return piece ? <group position={[0, r.lift, 0]}><SnapGhost mine={mine} mats={mats} file={r.body.file} only={piece.match} /></group> : null;
  }
  if (it.kind === 'part') {
    const p = partById[it.id]; if (!p || p.proc || p.engineMod || p.spare || p.fit) return null;
    return <group position={[0, r.lift, 0]}><group position={p.offset?.[r.body.id] || [0, 0, 0]}><SnapGhost mine={mine} mats={mats} file={partFile(p, r.body.id)} only={null} /></group></group>;
  }
  return null;
}

/** a bare body shell (all panels, glass and trim off) standing on its own, e.g. out in the yard */
export function ShellProp({ bodyId }) {
  const body = bodyById[bodyId] || bodyById.classic;
  const mask = [...(body.pieces || []).flatMap(p => p.match), ...(body.wheelHide || []), 'B_Interior'];
  return <Model file={body.file} mask={mask} isBase />;
}

export default function BuildModel({ build, wireframe, onSelect, drive = false, vehId = 'bug' }) {
  const r = useMemo(() => resolve(build), [build]);
  if (vehId === 'bug') LIVERY.value = build?.livery ? 1 : 0;
  const common = { wireframe, onSelect, channels: r.channels };
  useGame();
  const shellOff = (build.stripped || []).includes('shell');
  const bare = ['FL', 'FR', 'RL', 'RR'].filter(w => (build.stripped || []).includes('wheel' + w));
  const bareMask = bare.map(w => ({ FL: 'B_FLWheel', FR: 'B_FRWheel', RL: 'B_BLWheel', RR: 'B_BRWheel' })[w]);
  const carRef = useRef();
  const openSet = vehId === 'bug' ? game.open : game.projectOpen?.[+vehId.slice(1)], opens = drive && openSet ? [...openSet].map(id => BUG.covers[id]).filter(c => c && !build.hidden.includes(c.piece)).map(c => ({ ...c, match: [...((r.body.pieces || []).find(x => x.id === c.piece)?.match || []), ...(c.extra || [])] })) : [];
  return <><group ref={carRef}>
    <group position={[0, r.lift, 0]}>
      {shellOff && <RollingChassis pedals={!build.hidden.includes('pedals')} />}
      <Model file={r.body.file} mask={[...r.masks, ...bareMask]} only={shellOff ? ['B_FLWheel', 'B_FRWheel', 'B_BLWheel', 'B_BRWheel'] : null} isBase wheelDy={-r.lift} opens={opens} {...common} />
      {!(build.stripped || []).includes('engine') && <group userData={{ slot: 'engine' }}><ProcEngine mods={build.parts} stockExhaust={!r.active.some(x => x.slot === 'exhaust')} /></group>}
      {!(build.stripped || []).includes('battery') && !shellOff && <group userData={{ slot: 'battery' }} position={[-0.3, 0.62, -1.33]}>{/* PROPOSAL: sits up in the engine bay by the firewall so it can be aimed at; move by eye */}<mesh castShadow><boxGeometry args={[0.24, 0.2, 0.16]} /><meshStandardMaterial color="#1e1f22" roughness={0.6} /></mesh><mesh position={[-0.06, 0.11, 0]}><cylinderGeometry args={[0.018, 0.018, 0.03, 10]} /><meshStandardMaterial color="#c8372b" metalness={0.5} /></mesh><mesh position={[0.06, 0.11, 0]}><cylinderGeometry args={[0.018, 0.018, 0.03, 10]} /><meshStandardMaterial color="#222" metalness={0.5} /></mesh></group>}
      {r.active.filter(p => !p.attach && !p.engineMod && p.slot !== 'suspension').map(p => {
        const f = partFile(p, r.body.id), fit = p.fit?.[r.body.id] || p.fit?.['*'];
        const pcol = p.paintAs && (build.colors[p.paintAs] || r.body.defaultPaint), pch = pcol ? [{ re: /./, color: pcol }] : r.channels;
        const m = <Model file={f} {...common} channels={pch} material={p.material} hide={p.hidesWithExhaust && r.active.some(x => x.slot === 'exhaust') ? p.hidesWithExhaust : []} />;
        return <group key={p.id} userData={{ upgrade: p.slot }} position={p.offset?.[r.body.id] || [0, 0, 0]}>{p.proc ? <ProcPart id={p.proc} r={r} /> : p.spare ? (() => { const sp = p.spare.cage && r.active.some(x => x.id === p.spare.cage.requires) ? { ...p.spare, ...p.spare.cage } : p.spare; return <><SpareTire spare={sp} r={r} /><SpareBracket spare={sp} /></>; })() : fit ? <Fitted file={f} fit={fit}>{m}</Fitted> : m}{p.hardware && <ProcPart id={p.hardware} r={r} />}</group>;
      })}
    </group>
    {build.fab?.hoops && <ShockHoops mounts={r.mounts} />}
    {drive && <React.Suspense fallback={null}><FitGhost build={build} r={r} vehId={vehId} /></React.Suspense>}
    {drive && <React.Suspense fallback={null}><DetachGlow build={build} r={r} carRef={carRef} vehId={vehId} /></React.Suspense>}
    {r.wheelSet.kind === 'prebuilt' && <Model file={r.wheelSet.bodies[r.body.id]} wireframe={wireframe} onSelect={onSelect} />}
    {bare.map(w => { const m = r.mounts.find(x => x.name === w); return m && <group key={'stand' + w} position={[m.center[0], 0, m.center[2]]}><mesh position={[0, m.center[1] * 0.45, 0]} castShadow><boxGeometry args={[0.22, m.center[1] * 0.9, 0.22]} /><meshStandardMaterial color="#b8361f" metalness={0.4} roughness={0.5} /></mesh><mesh position={[0, 0.02, 0]}><boxGeometry args={[0.4, 0.04, 0.4]} /><meshStandardMaterial color="#8a2a18" metalness={0.4} roughness={0.5} /></mesh></group>; })}
    {r.tire && r.mounts.filter(m => !bare.includes(m.name)).map(m => <TireWheel key={`${r.wheelSet.id}-${m.name}`} set={r.wheelSet} mount={m} rim={r.rim} rimColor={r.rimColor} />)}
    {(drive || r.active.some(p => p.slot === 'suspension' || p.slot === 'shocks')) &&
      <Suspension mounts={r.mounts} lift={r.lift} wireframe={wireframe} onSelect={onSelect}
        coilovers={drive || r.active.some(p => p.slot === 'shocks')} />}
  </group></>;
}
