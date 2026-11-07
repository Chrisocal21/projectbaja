import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { terrainHeight, terrainVertexHeight, WORLD, TERRAIN_SEGMENTS } from './terrain.js';
import { STEP, createVehicleState, chassisQuaternion, tireSupport, stepSuspension, suspensionConfig,
  createSuspensionVisual, updateSuspensionVisual, disposeSuspensionVisual, buildWheelRig, wheelSteerAngle } from './suspension.js';

const dimsFor = (offroad = true, scale = 1, lift = 0) => ({
  wheelbase: 2.38, track: offroad ? 1.5 : 1.31, offroad, lift, bellyHeight: (offroad ? 0.28 : 0.14) + lift,
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({
    name, radius: (offroad ? 0.38 : 0.345) * scale,
    center: [(name.endsWith('L') ? 1 : -1) * (offroad ? 0.75 : 0.655),
      (offroad ? 0.38 : 0.345) * scale, name.startsWith('F') ? 1.19 : -1.19],
  })),
});
const near = (a, b, tolerance = 1e-4) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b} (tolerance ${tolerance})`);
const flat = () => 0;
const wheelCatalog = JSON.parse(fs.readFileSync(new URL('./catalog/wheels.json', import.meta.url)));

function validateContact(st, dims, sample = terrainHeight) {
  const quaternion = chassisQuaternion(st), config = suspensionConfig(dims);
  for (const wheel of st.wheels) {
    assert.ok(wheel.travel >= -config.droop - 1e-6 && wheel.travel <= config.compression + 1e-6);
    const hub = wheel.hub.clone().applyQuaternion(quaternion).add(new THREE.Vector3(st.x, st.y, st.z));
    const orientation = quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      wheelSteerAngle(st.steer, wheel.name, dims)));
    const mount = dims.mounts.find(m => m.name === wheel.name);
    const support = tireSupport(hub, mount.radius, st.h, sample, orientation, mount.halfWidth);
    assert.ok(hub.y >= support - 0.001, `${wheel.name} penetrated terrain by ${support - hub.y}m at ${st.x}, ${st.z}`);
  }
  for (const x of [-dims.track * 0.35, 0, dims.track * 0.35]) for (const z of [-dims.wheelbase / 2 - 0.4, 0, dims.wheelbase / 2 + 0.4]) {
    const p = new THREE.Vector3(x, dims.bellyHeight + (z === 0 ? 0 : 0.2), z).applyQuaternion(quaternion).add(new THREE.Vector3(st.x, st.y, st.z));
    assert.ok(p.y >= sample(p.x, p.z) + 0.025 - 0.16, 'chassis belly penetrated terrain');
  }
  for (const key of ['y', 'vy', 'pitch', 'roll', 'pitchV', 'rollV']) assert.ok(Number.isFinite(st[key]), key);
}

test('terrain collider matches both rendered triangle halves and ramp lip', () => {
  const geometry = new THREE.PlaneGeometry(WORLD, WORLD, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainVertexHeight(i % (TERRAIN_SEGMENTS + 1), Math.floor(i / (TERRAIN_SEGMENTS + 1))));
  const triangle = new THREE.Triangle(), indices = geometry.index;
  for (const [col, row] of [[250, 250], [250, 294], [249, 295], [290, 220], [450, 88]]) {
    for (let half = 0; half < 2; half++) {
      const index = (row * TERRAIN_SEGMENTS + col) * 6 + half * 3;
      triangle.a.fromBufferAttribute(pos, indices.getX(index));
      triangle.b.fromBufferAttribute(pos, indices.getX(index + 1));
      triangle.c.fromBufferAttribute(pos, indices.getX(index + 2));
      const p = triangle.a.clone().multiplyScalar(0.2).addScaledVector(triangle.b, 0.3).addScaledVector(triangle.c, 0.5);
      near(terrainHeight(p.x, p.z), p.y, 3e-5);
    }
  }
  geometry.dispose();
});

test('stock and offroad springs settle without sideways drift across tire sizes and lifts', () => {
  for (const offroad of [false, true]) for (const scale of [0.8, 1, 1.35]) for (const lift of [0, 0.3]) {
    const dims = dimsFor(offroad, scale, lift), st = createVehicleState();
    for (let i = 0; i < 1200; i++) { stepSuspension(st, dims, STEP, flat); validateContact(st, dims, flat); }
    assert.equal(st.contacts, 4); assert.equal(st.lateralV, 0); near(st.x, 0); near(st.z, -8);
    near(st.y, 0.005, 0.002); near(st.pitch, 0, 0.002); near(st.roll, 0, 0.002);
  }
});

test('world-space wheel contacts and body attitude follow cross slopes at any heading and steering lock', () => {
  const sample = (x, z) => x * 0.18 + z * 0.12;
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) for (const steer of [-0.45, 0, 0.45]) {
    const st = createVehicleState(), dims = dimsFor(); st.h = heading; st.y = -0.9;
    st.steer = steer;
    for (let i = 0; i < 1200; i++) { stepSuspension(st, dims, STEP, sample); validateContact(st, dims, sample); }
    assert.equal(st.contacts, 4);
    assert.ok(Math.abs(st.pitch) + Math.abs(st.roll) > 0.15);
  }
});

test('one-wheel articulation stays independent and bounded', () => {
  const dims = dimsFor(), st = createVehicleState();
  const sample = (x, z) => x > 0.4 && z > -8 ? 0.18 : 0;
  for (let i = 0; i < 600; i++) { stepSuspension(st, dims, STEP, sample); validateContact(st, dims, sample); }
  assert.ok(st.wheels.find(w => w.name === 'FL').travel > st.wheels.find(w => w.name === 'FR').travel + 0.03);
});

test('drop landing and reset clear airborne state and spring momentum', () => {
  const dims = dimsFor(), st = createVehicleState(); st.y = 5; st.lateralV = 3;
  let air = false, landed = false;
  for (let i = 0; i < 1200; i++) {
    stepSuspension(st, dims, STEP, flat); validateContact(st, dims, flat);
    air ||= st.air; landed ||= air && !st.air;
  }
  assert.ok(air && landed); near(st.y, 0.005, 0.002); near(st.pitch, 0, 0.003); near(st.roll, 0, 0.003);
  assert.ok(st.lateralV > 0 && st.lateralV <= 3, "lateral speed " + st.lateralV);
  Object.assign(st, createVehicleState());
  assert.equal(st.vy, 0); assert.equal(st.pitchV, 0); assert.equal(st.rollV, 0);
  assert.equal(st.lateralV, 0); assert.equal(st.air, false); assert.equal(st.wheels.length, 0);
});

test('ramp launch, whoops, reverse and rough trails never penetrate the rendered earth', () => {
  const dims = dimsFor();
  let airborne = 0;
  for (const [x, speed, heading] of [[0, 18, 0], [32, 12, 0], [32, -9, 0], [-80, 24, 0.8]]) {
    const st = createVehicleState(); st.x = x; st.h = heading; st.v = speed;
    for (let i = 0; i < 900; i++) {
      st.x += Math.sin(heading) * speed * STEP; st.z += Math.cos(heading) * speed * STEP;
      stepSuspension(st, dims, STEP); validateContact(st, dims); airborne += Number(st.air);
    }
  }
  assert.ok(airborne > 0, 'ramp must launch, not glue the body to terrain');
});

test('fixed-step suspension is identical at 30, 60 and 120 fps', () => {
  const results = [];
  for (const fps of [30, 60, 120]) {
    const st = createVehicleState(), dims = dimsFor(); st.y = 2;
    for (let frame = 0; frame < fps * 3; frame++) for (let i = 0; i < 120 / fps; i++) stepSuspension(st, dims, STEP, flat);
    results.push(st);
  }
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
});

test('shock eyes, telescoping rod and suspension arms align at bump and droop without scaling their widths', () => {
  for (const scale of [0.8, 1.35]) for (const lift of [0, 0.3]) {
    const dims = dimsFor(true, scale, lift), visual = createSuspensionVisual(dims.mounts, lift);
    for (const travel of [-0.24, 0, 0.22]) {
      const hubs = dims.mounts.map(m => ({ name: m.name, hub: new THREE.Vector3(...m.center).add(new THREE.Vector3(0, travel, 0)) }));
      updateSuspensionVisual(visual, hubs); visual.updateMatrixWorld(true);
      for (const w of visual.userData.suspension.wheels) {
        near(w.upperEye.getWorldPosition(new THREE.Vector3()).distanceTo(w.anchors.upper), 0);
        const hub = hubs.find(h => h.name === w.mount.name).hub;
        near(w.lowerEye.getWorldPosition(new THREE.Vector3()).distanceTo(hub.clone().add(w.anchors.lowerOffset)), 0);
        assert.ok(Math.abs(w.anchors.lowerOffset.x) - (w.mount.halfWidth ?? 0.14) >= 0.08, 'spring must clear tire shoulder');
        near(w.body.scale.x, 0.036); near(w.rod.scale.x, 0.015); near(w.spring.scale.x, 1);
        near(w.body.position.y - w.body.scale.y / 2, w.rod.position.y + w.rod.scale.y / 2);
        w.links.forEach((link, i) => {
          const endpoint = new THREE.Vector3(0, -0.5, 0).applyMatrix4(link.matrixWorld);
          near(endpoint.distanceTo(w.anchors.pivots[i]), 0);
        });
      }
    }
    disposeSuspensionVisual(visual);
  }
});

async function loadAsset(name) {
  const path = new URL(`../public/models/${name}.glb`, import.meta.url);
  const buffer = fs.readFileSync(path);
  return (await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '')).scene;
}

test('real stock and Stage 2 assets rig exactly four complete wheels, including multi-material groups', async () => {
  for (const [body, offroad] of [['VEH_001_Beetle_Imported', false], ['STAGE2_VEH_001_Beetle_Imported', true]]) {
    const root = new THREE.Group(), dims = dimsFor(offroad);
    dims.mounts = Object.entries(wheelCatalog.find(w => w.id === 'stock').mounts['*']).map(([name, mount]) => ({ name, ...mount }));
    root.add(await loadAsset(body));
    const rig = buildWheelRig(root, dims.mounts);
    assert.equal(rig.wheels.length, 4); assert.ok(rig.wheel);
    for (const w of rig.wheels) {
      const meshes = []; w.spin.traverse(o => { if (o.isMesh) meshes.push(o); });
      assert.ok(meshes.length >= 3, w.name);
      assert.ok(w.r > 0.3); assert.equal(w.front, w.name.startsWith('F'));
      const box = new THREE.Box3().setFromObject(w.spin);
      const center = box.getCenter(new THREE.Vector3());
      near(center.distanceTo(w.steer.position), 0, 0.001);
      near(box.getSize(new THREE.Vector3()).y / 2, w.r, 0.001);
    }
  }
});

test('hidden stock wheels do not duplicate prebuilt or named replacement wheels', async () => {
  for (const [body, tires, offroad] of [
    ['VEH_001_Beetle_Imported', 'PART_001_AllTerrainWheelSet', false],
    ['STAGE2_VEH_001_Beetle_Imported', 'STAGE2_PART_001_AllTerrainWheelSet', true],
  ]) {
    const root = new THREE.Group(), base = await loadAsset(body), dims = dimsFor(offroad);
    dims.mounts = Object.entries(wheelCatalog.find(w => w.id === 'at-original').mounts[offroad ? 'classic-stage2' : 'classic'])
      .map(([name, mount]) => ({ name, ...mount }));
    base.traverse(o => {
      if (o.isMesh) for (let p = o; p; p = p.parent) if (/^B_(FL|FR|BL|BR)Wheel/.test(p.userData.source_name || p.name)) o.visible = false;
    });
    root.add(base, await loadAsset(tires));
    const rig = buildWheelRig(root, dims.mounts);
    assert.equal(rig.wheels.length, 4);
    for (const w of rig.wheels) {
      w.spin.traverse(o => assert.ok(!/^B_(FL|FR|BL|BR)Wheel/.test(o.name)));
      const box = new THREE.Box3().setFromObject(w.spin);
      near(box.getCenter(new THREE.Vector3()).distanceTo(w.steer.position), 0, 0.001);
      near(box.getSize(new THREE.Vector3()).y / 2, w.r, 0.001);
    }
  }
  const root = new THREE.Group(), dims = dimsFor();
  for (const mount of dims.mounts) {
    const wheel = new THREE.Group(); wheel.name = `CWheel_${mount.name}`; wheel.position.set(...mount.center);
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24), new THREE.MeshBasicMaterial()));
    root.add(wheel);
  }
  const visual = createSuspensionVisual(dims.mounts); root.add(visual);
  const rig = buildWheelRig(root, dims.mounts);
  assert.equal(rig.wheels.length, 4); assert.equal(rig.suspension, visual);
  for (const w of rig.wheels) near(w.steer.position.distanceTo(new THREE.Vector3(...dims.mounts.find(m => m.name === w.name).center)), 0);
  disposeSuspensionVisual(visual);
});

test('missing wheel assets fail explicitly before partially modifying the model', () => {
  const root = new THREE.Group();
  assert.throws(() => buildWheelRig(root, dimsFor().mounts), /Missing visible FL wheel/);
  assert.equal(root.children.length, 0);
});
