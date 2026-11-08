// The Build Sandbox's 3D: ground + grid, placed pieces, ghosts (one piece or a whole blueprint), region box, measure tool.
// Rules come from rules.js / format.js (the game's own structures.js underneath). No game state is used.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CELL, OX, OZ } from '../worlds/structures.js';
import { StructureModel } from '../worlds/StructureModels.jsx';
import GarageModel from './GarageModel.jsx';
import { holoMaterials, ghostify, footprint, HOLO } from '../hologram.js';
import { pieceKey, rotateRel, placeRel, stampOrigin, boundsOf } from './format.js';
import { snapPiece, placeWhy, stampWhy } from './rules.js';

export const HALF = 30;   // the world is 60 x 60 m
const V = new THREE.Vector3();
const snapLine = (v, off) => off + Math.round((v - off) / CELL) * CELL;
const clampW = v => Math.max(-HALF, Math.min(HALF, v));

// ---------------- ground, grid, axes ----------------
function Grid({ fine }) {
  const geo = useMemo(() => {
    const major = [], minor = [];
    for (let x = -HALF; x <= HALF + 1e-9; x += 0.5) { const isMajor = Math.abs(((x - OX) / CELL) - Math.round((x - OX) / CELL)) < 1e-9; (isMajor ? major : minor).push(x, 0, -HALF, x, 0, HALF); }
    for (let z = -HALF; z <= HALF + 1e-9; z += 0.5) { const isMajor = Math.abs(((z - OZ) / CELL) - Math.round((z - OZ) / CELL)) < 1e-9; (isMajor ? major : minor).push(-HALF, 0, z, HALF, 0, z); }
    const g = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
    return { major: g(major), minor: g(minor) };
  }, []);
  const labels = [];
  for (let v = -HALF + 10; v < HALF; v += 10) { labels.push(<Html zIndexRange={[5, 0]} key={'x' + v} position={[v, 0.05, HALF + 0.8]} center className="bl-axis">x {v}</Html>); labels.push(<Html zIndexRange={[5, 0]} key={'z' + v} position={[-HALF - 1.2, 0.05, v]} center className="bl-axis">z {v}</Html>); }
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="ground" userData={{ ground: true }}><planeGeometry args={[HALF * 2, HALF * 2]} /><meshStandardMaterial color="#b9b2a2" roughness={1} /></mesh>
    {fine && <lineSegments geometry={geo.minor} position={[0, 0.006, 0]} raycast={() => {}}><lineBasicMaterial color="#5f5a50" transparent opacity={0.14} /></lineSegments>}
    <lineSegments geometry={geo.major} position={[0, 0.008, 0]} raycast={() => {}}><lineBasicMaterial color="#3a3730" transparent opacity={0.5} /></lineSegments>
    {/* axes through the origin (x = 0 is NOT a grid line: the game's grid lines sit on odd x so they meet the garage's walls) */}
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[HALF * 2, 0.06]} /><meshBasicMaterial color="#c0392b" /></mesh>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} raycast={() => {}}><planeGeometry args={[HALF * 2, 0.06]} /><meshBasicMaterial color="#2a6fd6" /></mesh>
    <mesh position={[0, 0.3, 0]} raycast={() => {}}><cylinderGeometry args={[0.06, 0.06, 0.6, 10]} /><meshBasicMaterial color="#222" /></mesh>
    <Html zIndexRange={[5, 0]} position={[0, 0.7, 0]} center className="bl-axis bl-origin">0, 0</Html>
    <Html zIndexRange={[5, 0]} position={[HALF - 1, 0.1, 0]} center className="bl-axis bl-ax-x">+X</Html>
    <Html zIndexRange={[5, 0]} position={[0, 0.1, HALF - 1]} center className="bl-axis bl-ax-z">+Z</Html>
    {labels}
  </group>;
}

// ---------------- placed pieces ----------------
export function Pieces({ pieces, hideKey, dim, groupRef }) {
  return <group ref={groupRef}>{pieces.map(p => { const k = pieceKey(p); return k === hideKey ? null : <group key={k} position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]} userData={{ pkey: k }} visible={!(dim && dim.has(k))}>{p.id === 'garage' ? <GarageModel /> : <StructureModel id={p.id} mat={p.mat} />}</group>; })}</group>;
}
const keyOf = o => { for (let q = o; q; q = q.parent) if (q.userData?.pkey) return q.userData.pkey; return null; };

const Outline = ({ box, color = '#ffd84a' }) => {
  if (!box) return null;
  return <lineSegments position={box.c} raycast={() => {}} renderOrder={20}><edgesGeometry args={[new THREE.BoxGeometry(...box.s)]} /><lineBasicMaterial color={color} depthTest={false} transparent /></lineSegments>;
};
const boxOf = obj => { const b = new THREE.Box3().setFromObject(obj); if (b.isEmpty()) return null; const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); return { c: [c.x, c.y, c.z], s: [s.x + 0.04, s.y + 0.04, s.z + 0.04] }; };

// ---------------- the ghost (one piece or a whole blueprint), shared by the creator camera and the first-person walker ----------------
export function useGhost(ctl) {
  const st = ctl.current, mats = useMemo(() => holoMaterials(), []);
  const ghost = useRef(), inner = useRef(), foot = useRef();
  useEffect(() => () => mats.dispose(), [mats]);
  const g = st.ghostSpec;   // { type: 'piece', id, mat } | { type: 'stamp', rel, turns, lid } | null
  const stampRel = useMemo(() => (g?.type === 'stamp' ? rotateRel(g.rel, g.turns) : null), [g?.type, g?.lid, g?.turns, g?.rel]);
  const ghostKey = g ? (g.type === 'piece' ? `p:${g.id}:${g.mat}` : `s:${g.lid}:${g.turns}`) : '';
  useEffect(() => {   // footprint patch under the ghost, sized like the game's (Home.jsx Ghost)
    if (!inner.current || !foot.current) return; foot.current.clear(); if (!g) return;
    if (g.type === 'piece') {
      inner.current.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(inner.current.matrixWorld).invert(), b = new THREE.Box3();
      inner.current.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))); } });
      const s = b.isEmpty() ? new THREE.Vector3(1, 1, 1) : b.getSize(new THREE.Vector3());
      foot.current.add(footprint(Math.max(0.6, s.x + 0.2), Math.max(0.6, s.z + 0.2), mats));
    } else { const bb = boundsOf(stampRel); const f = footprint(bb.w + 0.2, bb.d + 0.2, mats); f.position.set((bb.minX + bb.maxX) / 2, 0.05, (bb.minZ + bb.maxZ) / 2); foot.current.add(f); }
  }, [ghostKey]);
  /** place the ghost at ground point gp (or hide it); returns the ghost info the UI shows */
  const update = (gp, t) => {
    const s = ctl.current, gs = s.ghostSpec; let info = null;
    if (ghost.current) ghost.current.visible = !!(gs && gp);
    if (gs && gp && ghost.current && inner.current) {
      ghostify(inner.current, mats); mats.pulse(t, true);
      if (gs.type === 'piece') {
        const sn = snapPiece(gs.id, gp.x, gp.z, gs.id === 'garage' ? s.turns : s.flip), existing = s.moving ? s.pieces.filter(p => pieceKey(p) !== s.moving.key) : s.pieces;
        const why = placeWhy(gs.id, sn.x, sn.z, sn.ry, existing);
        mats.set(why ? HOLO.bad : HOLO.ok); ghost.current.position.set(sn.x, 0, sn.z); ghost.current.rotation.set(0, sn.ry, 0);
        info = { type: 'piece', ...sn, id: gs.id, mat: gs.mat, why };
      } else if (stampRel) {
        const o = stampOrigin(stampRel, gp.x, gp.z), abs = placeRel(stampRel, o), r = stampWhy(abs, s.pieces);
        mats.set(r.why ? HOLO.bad : HOLO.ok); ghost.current.position.set(o.x, 0, o.z); ghost.current.rotation.set(0, 0, 0);
        info = { type: 'stamp', origin: o, abs, why: r.why ? `${r.bad.length} of ${abs.length} blocked. ${r.why}` : '', bad: r.bad.length };
      }
    }
    return info;
  };
  const gsp = st.ghostSpec;
  const el = <group ref={ghost} visible={false} userData={{ hideInShot: true }}>
    <group ref={inner} key={ghostKey}>
      {gsp?.type === 'piece' && (gsp.id === 'garage' ? <GarageModel /> : <StructureModel id={gsp.id} mat={gsp.mat} />)}
      {gsp?.type === 'stamp' && stampRel && stampRel.map((p, i) => <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.ry, 0]}>{p.id === 'garage' ? <GarageModel /> : <StructureModel id={p.id} mat={p.mat} />}</group>)}
    </group>
    <group ref={foot} />
  </group>;
  return { el, update };
}

/** snapshots for blueprint thumbnails (any view) and the creator camera jump. Always mounted. */
export function Helpers({ ctl, piecesRef }) {
  const { camera, gl, scene, size, controls } = useThree();
  useEffect(() => {
    const st = ctl.current;
    st.snapshot = (keysToShow, b) => {
      const W = 240, H = 150, hidden = [];
      const hide = o => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
      scene.traverse(o => { if (o.userData?.hideInShot) hide(o); });
      piecesRef.current?.children.forEach(c => { if (!keysToShow.has(c.userData.pkey)) hide(c); });
      const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 400);
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, r = Math.max(2, 0.5 * Math.hypot(b.w, b.d, b.h)) + 0.6, dist = r / Math.sin((35 / 2) * Math.PI / 180);
      const dir = new THREE.Vector3(0.75, 0.75, 1).normalize();
      cam.position.set(cx + dir.x * dist, b.h / 2 + dir.y * dist, cz + dir.z * dist); cam.lookAt(cx, b.h * 0.35, cz); cam.updateMatrixWorld();
      const pr = gl.getPixelRatio(), cv = gl.domElement;
      gl.setScissorTest(true); gl.setViewport(0, 0, W, H); gl.setScissor(0, 0, W, H); gl.render(scene, cam);
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      out.getContext('2d').drawImage(cv, 0, cv.height - H * pr, W * pr, H * pr, 0, 0, W, H);
      gl.setScissorTest(false); gl.setViewport(0, 0, size.width, size.height);
      hidden.forEach(o => { o.visible = true; });
      return out.toDataURL('image/jpeg', 0.78);
    };
    st.lookAt = (x, z, d = 22) => { if (!controls) return; controls.target.set(x, 0, z); camera.position.set(x + d * 0.55, d * 0.75, z + d * 0.75); controls.update(); };
  });
  return null;
}

// ---------------- the creator camera: orbit / pan, pointer, ghost, region, measure ----------------
export function Interact({ ctl, piecesRef }) {
  const { camera, gl, scene, controls } = useThree();
  const ptr = useRef({ x: 0, y: 0, in: false, down: null, drag: null }), keys = useRef(new Set());
  const ray = useMemo(() => new THREE.Raycaster(), []), plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const cursor = useRef(), last = useRef({});
  const gh = useGhost(ctl);
  const [hoverBox, setHoverBox] = useState(null), [regionDrag, setRegionDrag] = useState(null);

  // restore the creator camera (this view mounts every time you switch to it)
  useEffect(() => {
    if (!controls) return;
    camera.rotation.order = 'XYZ'; camera.fov = 50; camera.updateProjectionMatrix();
    const v = ctl.current.creatorView || { pos: [16, 18, 24], target: [3, 0, 3] };
    controls.target.set(...v.target); camera.position.set(...v.pos); controls.update();
    return () => { ctl.current.creatorView = { pos: camera.position.toArray(), target: controls.target.toArray() }; };
  }, [controls]);

  useEffect(() => {
    const el = gl.domElement;
    const pos = e => { const r = el.getBoundingClientRect(); ptr.current.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.current.y = -((e.clientY - r.top) / r.height) * 2 + 1; };
    const move = e => { pos(e); ptr.current.in = true; if (ptr.current.down) { const d = ptr.current.down; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true; } };
    const down = e => { if (e.button !== 0) return; pos(e); ptr.current.down = { x: e.clientX, y: e.clientY, moved: false, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }; if (ctl.current.tool === 'region' && last.current.ground) { const p = last.current.ground; ptr.current.drag = { x0: snapLine(p.x, OX), z0: snapLine(p.z, OZ), x1: snapLine(p.x, OX), z1: snapLine(p.z, OZ) }; } };
    const up = e => {
      if (e.button !== 0 || !ptr.current.down) return; const d = ptr.current.down; ptr.current.down = null;
      const drag = ptr.current.drag; ptr.current.drag = null;
      if (drag) { setRegionDrag(null); if (d.moved && drag.x0 !== drag.x1 && drag.z0 !== drag.z1) { ctl.current.onRegion(drag); return; } }
      if (!d.moved) ctl.current.onClick({ shift: d.shift, ctrl: d.ctrl, ...last.current });
    };
    const leave = () => { ptr.current.in = false; };
    const kd = e => { if (e.target.closest?.('input, textarea, select') || ctl.current.paused) return; keys.current.add(e.code); };
    const ku = e => keys.current.delete(e.code), blur = () => keys.current.clear();
    el.addEventListener('pointermove', move); el.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); el.addEventListener('pointerleave', leave);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', leave); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); };
  }, [gl]);

  useFrame(({ clock }, dt) => {
    const s = ctl.current;
    if (controls) controls.enabled = !s.paused;
    if (controls && keys.current.size && !s.paused) {
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
      const rgt = new THREE.Vector3(-f.z, 0, f.x), k = keys.current, sp = Math.max(4, camera.position.distanceTo(controls.target)) * 0.8 * Math.min(dt, 0.05) * (k.has('ShiftLeft') || k.has('ShiftRight') ? 2.5 : 1);
      const m = new THREE.Vector3();
      if (k.has('KeyW')) m.add(f); if (k.has('KeyS')) m.sub(f); if (k.has('KeyD')) m.add(rgt); if (k.has('KeyA')) m.sub(rgt);
      if (m.lengthSq() && !(k.has('ControlLeft') || k.has('ControlRight'))) { m.normalize().multiplyScalar(sp); camera.position.add(m); controls.target.add(m); controls.update(); }
    }
    ray.setFromCamera(ptr.current, camera);
    const gp = ptr.current.in && !s.paused ? ray.ray.intersectPlane(plane, new THREE.Vector3()) : null;
    if (gp) { gp.x = clampW(gp.x); gp.z = clampW(gp.z); }
    const hit = ptr.current.in && !s.paused && piecesRef.current ? ray.intersectObject(piecesRef.current, true).find(h => h.object.visible) : null;
    const hkey = hit ? keyOf(hit.object) : null;
    const ghostInfo = gh.update(gp, clock.elapsedTime);
    let mpt = null;
    if (s.tool === 'measure' && ptr.current.in) {
      const tgt = [piecesRef.current, scene.getObjectByName('ground')].filter(Boolean);
      const h = ray.intersectObjects(tgt, true).find(q => q.object.visible && !q.object.userData.holo);
      if (h) { const r = v => Math.round(v * 20) / 20; mpt = [r(h.point.x), r(h.point.y), r(h.point.z)]; }
    }
    if (cursor.current) { cursor.current.visible = !!mpt; if (mpt) cursor.current.position.set(...mpt); }
    if (ptr.current.drag && gp) { const d = ptr.current.drag, x1 = snapLine(gp.x, OX), z1 = snapLine(gp.z, OZ); if (d.x1 !== x1 || d.z1 !== z1) { d.x1 = x1; d.z1 = z1; setRegionDrag({ ...d }); } }
    last.current = { ground: gp ? { x: gp.x, z: gp.z } : null, pieceKey: hkey, ghost: ghostInfo, mpt };
    const sig = `${hkey}|${ghostInfo ? `${ghostInfo.x ?? ghostInfo.origin.x},${ghostInfo.z ?? ghostInfo.origin.z},${ghostInfo.ry},${ghostInfo.why}` : ''}|${gp ? `${snapLine(gp.x, OX)},${snapLine(gp.z, OZ)}` : ''}|${mpt}`;
    if (sig !== s.lastSig) {
      s.lastSig = sig;
      let hb = null, size = null;
      if (hkey) { const obj = piecesRef.current.children.find(c => c.userData.pkey === hkey); if (obj) { hb = boxOf(obj); size = hb && hb.s.map(v => v - 0.04); } }
      setHoverBox(hb); s.onHover({ key: hkey, size, ghost: ghostInfo, ground: gp ? { x: gp.x, z: gp.z } : null, mpt });
    }
  });

  return <group>
    <OrbitControls makeDefault mouseButtons={{ LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} maxPolarAngle={Math.PI / 2 - 0.03} minDistance={2} maxDistance={140} enableDamping={false} />
    {gh.el}
    <mesh ref={cursor} visible={false} raycast={() => {}} userData={{ hideInShot: true }}><sphereGeometry args={[0.07, 12, 8]} /><meshBasicMaterial color="#ff2bd6" depthTest={false} /></mesh>
    <group userData={{ hideInShot: true }}>{ctl.current.tool !== 'measure' && <Outline box={hoverBox} />}</group>
    {regionDrag && <RegionBox r={regionDrag} color="#4aa3ff" />}
  </group>;
}


export function RegionBox({ r, color = '#4aa3ff', label }) {
  const x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1), z0 = Math.min(r.z0, r.z1), z1 = Math.max(r.z0, r.z1);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, 0.04, z))), [x0, x1, z0, z1]);
  return <group userData={{ hideInShot: true }}>
    <mesh position={[(x0 + x1) / 2, 0.03, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[x1 - x0, z1 - z0]} /><meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} /></mesh>
    <line geometry={geo}><lineBasicMaterial color={color} /></line>
    <Html zIndexRange={[5, 0]} position={[x0, 0.1, z0]} className="bl-tag bl-tag-region">{label || `${x1 - x0} x ${z1 - z0} m`}</Html>
  </group>;
}

export function Measure({ a, b }) {
  const geo = useMemo(() => (a && b ? new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]) : null), [a, b]);
  if (!a) return null;
  const d = b && Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return <group userData={{ hideInShot: true }}>
    {[a, b].filter(Boolean).map((p, i) => <mesh key={i} position={p} raycast={() => {}}><sphereGeometry args={[0.08, 12, 8]} /><meshBasicMaterial color="#ff2bd6" depthTest={false} /></mesh>)}
    {geo && <line geometry={geo} renderOrder={30}><lineBasicMaterial color="#ff2bd6" depthTest={false} transparent /></line>}
    {b && <Html zIndexRange={[5, 0]} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.3, (a[2] + b[2]) / 2]} center className="bl-tag bl-tag-measure">{d.toFixed(2)} m<small> dx {Math.abs(b[0] - a[0]).toFixed(2)} · dy {Math.abs(b[1] - a[1]).toFixed(2)} · dz {Math.abs(b[2] - a[2]).toFixed(2)}</small></Html>}
  </group>;
}

export { Grid, keyOf, boxOf, Outline };
