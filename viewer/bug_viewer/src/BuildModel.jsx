import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { resolve, partFile } from './build.js';
import { rimGeometry } from './Rims.jsx';
import { createSuspensionVisual, disposeSuspensionVisual } from './suspension.js';

const sourceNameFor = o => { for (let n = o; n; n = n.parent) if (n.userData.source_name) return n.userData.source_name; return o.name; };
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
function Model({ file, mask = [], wireframe, onSelect, isBase = false, channels = [], wheelDy = 0, material = null }) {
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
  const maskKey = mask.join('|');
  useEffect(() => {
    clone.traverse(o => {
      if (!o.isMesh) return;
      o.visible = !(isBase && mask.some(prefix => sourceNameFor(o).startsWith(prefix)));
      const wheel = isWheelNode(o) || (o.parent && isWheelNode(o.parent));
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m) return;
        m.wireframe = !!wireframe;
        if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
        const ch = !wheel && channels.find(c => c.re.test(m.name || 'unnamed'));
        m.color.copy(material?.color ? new THREE.Color(material.color) : ch ? new THREE.Color(ch.color) : m.userData.baseColor);
        if (material) { if (material.metalness != null) m.metalness = material.metalness; if (material.roughness != null) m.roughness = material.roughness; }
      });
    });
  }, [clone, maskKey, wireframe, isBase, channels, material]);
  // wheels built into a body shell stay on the ground when the body is lifted
  useEffect(() => { clone.traverse(o => { if (isWheelNode(o)) { o.userData.y0 ??= o.position.y; o.position.y = o.userData.y0 + wheelDy; } }); }, [clone, wheelDy]);
  return <primitive object={clone} onClick={e => inspectSelection(e, onSelect, file)} />;
}

function Rim({ rim, color }) {
  const geo = useMemo(() => rimGeometry(rim.style), [rim.style]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} metalness={0.75} roughness={0.35} side={THREE.DoubleSide} /></mesh>;
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

export default function BuildModel({ build, wireframe, onSelect, drive = false }) {
  const r = useMemo(() => resolve(build), [build]);
  const common = { wireframe, onSelect, channels: r.channels };
  return <>
    <group position={[0, r.lift, 0]}>
      <Model file={r.body.file} mask={r.masks} isBase wheelDy={-r.lift} {...common} />
      {r.active.filter(p => !p.attach && p.slot !== 'suspension').map(p => {
        const f = partFile(p, r.body.id), fit = p.fit?.[r.body.id] || p.fit?.['*'];
        const pcol = p.paintAs && (build.colors[p.paintAs] || r.body.defaultPaint), pch = pcol ? [{ re: /./, color: pcol }] : r.channels;
        const m = <Model file={f} {...common} channels={pch} material={p.material} />;
        return <group key={p.id} position={p.offset?.[r.body.id] || [0, 0, 0]}>{fit ? <Fitted file={f} fit={fit}>{m}</Fitted> : m}{p.spare && <SpareTire spare={p.spare} r={r} />}</group>;
      })}
    </group>
    {r.wheelSet.kind === 'prebuilt' && <Model file={r.wheelSet.bodies[r.body.id]} wireframe={wireframe} onSelect={onSelect} />}
    {r.tire && r.mounts.map(m => <TireWheel key={`${r.wheelSet.id}-${m.name}`} set={r.wheelSet} mount={m} rim={r.rim} rimColor={r.rimColor} />)}
    {(drive || r.active.some(p => p.slot === 'suspension' || p.slot === 'shocks')) &&
      <Suspension mounts={r.mounts} lift={r.lift} wireframe={wireframe} onSelect={onSelect}
        coilovers={drive || r.active.some(p => p.slot === 'shocks')} />}
  </>;
}
