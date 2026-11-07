import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

export const STEP = 1 / 120;
export const GRAVITY = 9.81;
const MASS = 1000;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

export function suspensionConfig(dims) {
  return {
    compression: dims.offroad ? 0.22 : 0.12,
    droop: dims.offroad ? 0.24 : 0.14,
    stiffness: dims.offroad ? 26000 : 34000,
    damping: dims.offroad ? 2600 : 3000,
    antiRoll: dims.offroad ? 4500 : 8000,
  };
}

export function createVehicleState() {
  return { x: 0, z: -8, y: 0, vy: 0, lateralV: 0, h: 0, v: 0, yr: 0, steer: 0,
    pitch: 0, roll: 0, pitchV: 0, rollV: 0, ax: 0, slip: 0, air: false, contacts: 4, wheels: [] };
}

export function chassisQuaternion(st) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(-st.pitch, st.h, st.roll, 'YXZ'));
}

export function wheelSteerAngle(steer, name, dims) {
  if (!name.startsWith('F') || Math.abs(steer) < 1e-6) return 0;
  const radius = dims.wheelbase / Math.abs(Math.tan(steer));
  const inside = name.endsWith('L') === (steer > 0);
  return Math.sign(steer) * Math.atan(dims.wheelbase / (radius + (inside ? -1 : 1) * dims.track / 2));
}

// A tire footprint, not just a point ray: support both shoulders and the rolling arc.
export function tireSupport(hub, radius, heading, sample = terrainHeight, orientation = null, halfWidth = 0.14) {
  let height = -Infinity;
  const quaternion = orientation || new THREE.Quaternion().setFromAxisAngle(UP, heading);
  const point = new THREE.Vector3();
  for (const across of [-halfWidth, 0, halfWidth]) for (let i = 0; i <= 12; i++) {
    const angle = (i / 12 - 0.5) * Math.PI;
    point.set(across, -Math.cos(angle) * radius, Math.sin(angle) * radius).applyQuaternion(quaternion);
    height = Math.max(height, sample(hub.x + point.x, hub.z + point.z) - point.y);
  }
  return height + 0.005;
}

function wheelContact(st, mount, quaternion, config, sample, dims) {
  const up = UP.clone().applyQuaternion(quaternion);
  const nominal = new THREE.Vector3(...mount.center).applyQuaternion(quaternion).add(new THREE.Vector3(st.x, st.y, st.z));
  const angle = wheelSteerAngle(st.steer, mount.name, dims);
  const heading = st.h + angle;
  const orientation = quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, angle));
  const hub = nominal.clone();
  let needed = 0, support = 0;
  for (let i = 0; i < 4; i++) {
    support = tireSupport(hub, mount.radius, heading, sample, orientation, mount.halfWidth);
    needed = (support - nominal.y) / up.y;
    hub.copy(nominal).addScaledVector(up, clamp(needed, -config.droop, config.compression));
  }
  return { needed, support, nominal, hub, up };
}

export function stepSuspension(st, dims, dt, sample = terrainHeight) {
  const config = suspensionConfig(dims), mounts = dims.mounts;
  st.vy -= GRAVITY * dt;
  st.y += st.vy * dt;
  st.pitch = clamp(st.pitch + st.pitchV * dt, -0.65, 0.65);
  st.roll = clamp(st.roll + st.rollV * dt, -0.55, 0.55);
  const quaternion = chassisQuaternion(st);
  const up = UP.clone().applyQuaternion(quaternion);
  let correction = 0;
  // Bump stops and a sampled belly collider are unilateral constraints, never an averaged ground clamp.
  for (let pass = 0; pass < 4; pass++) {
    let raise = 0;
    for (const mount of mounts) {
      const contact = wheelContact(st, mount, quaternion, config, sample, dims);
      raise = Math.max(raise, (contact.needed - config.compression) * up.y);
    }
    for (const x of [-dims.track * 0.35, 0, dims.track * 0.35]) {
      for (const z of [-dims.wheelbase / 2 - 0.4, 0, dims.wheelbase / 2 + 0.4]) {
        const p = new THREE.Vector3(x, dims.bellyHeight, z).applyQuaternion(quaternion)
          .add(new THREE.Vector3(st.x, st.y, st.z));
        raise = Math.max(raise, sample(p.x, p.z) + 0.025 - p.y);
      }
    }
    if (raise <= 1e-6) break;
    st.y += raise + 1e-5;
    correction += raise;
  }
  if (correction > 0) st.vy = Math.max(0, st.vy);

  let force = 0, pitchTorque = 0, rollTorque = 0, contacts = 0;
  const previous = st.wheels;
  const comZ = -dims.wheelbase * 0.08;
  st.wheels = mounts.map((mount, i) => {
    const contact = wheelContact(st, mount, quaternion, config, sample, dims);
    const touching = contact.needed >= -config.droop - 0.002;
    const old = previous[i];
    const target = touching ? clamp(contact.needed, -config.droop, config.compression) : -config.droop;
    let travel = touching ? target : Math.max(-config.droop, (old?.travel || 0) - dt * 0.9);
    // Wheels cannot lag through the surface while the chassis springs are settling.
    travel = Math.max(travel, Math.min(config.compression, contact.needed));
    const hub = new THREE.Vector3(...mount.center).addScaledVector(UP, travel);
    let load = 0;
    if (touching) {
      contacts++;
      const preload = MASS * GRAVITY * (mount.name.startsWith('F') ? 0.21 : 0.29);
      const groundV = old?.touching ? clamp((contact.support - old.support) / dt, -12, 12) : 0;
      const hubV = st.vy + st.pitchV * (mount.center[2] - comZ) + st.rollV * mount.center[0];
      load = clamp(preload + config.stiffness * travel + config.damping * (groundV - hubV), 0, preload * 5);
      force += load * up.y;
      pitchTorque += load * (mount.center[2] - comZ);
      rollTorque += load * mount.center[0];
    }
    return { name: mount.name, hub, travel, touching, support: contact.support, load, needed: contact.needed };
  });
  for (const axle of ['F', 'R']) {
    const left = st.wheels.find(w => w.name === `${axle}L`), right = st.wheels.find(w => w.name === `${axle}R`);
    if (left.touching && right.touching) rollTorque += config.antiRoll * (left.travel - right.travel) * dims.track;
  }
  if (contacts) {
    pitchTorque += MASS * st.ax * 0.48;
    rollTorque += MASS * st.v * st.yr * 0.48;
  }
  st.vy += force / MASS * dt;
  st.pitchV += (pitchTorque / (MASS * dims.wheelbase ** 2 / 4) - st.pitchV * 2) * dt;
  st.rollV += (rollTorque / (MASS * dims.track ** 2 / 3) - st.rollV * 2.5) * dt;
  if (Math.abs(st.pitch) >= 0.65 && st.pitchV * st.pitch > 0) st.pitchV = 0;
  if (Math.abs(st.roll) >= 0.55 && st.rollV * st.roll > 0) st.rollV = 0;
  st.contacts = contacts;
  st.air = contacts === 0;
}

export function suspensionAnchors(mount, lift = 0) {
  const [x, y, z] = mount.center, side = Math.sign(x), front = mount.name.startsWith('F');
  const halfWidth = mount.halfWidth ?? 0.14;
  return {
    upper: new THREE.Vector3(x - side * (halfWidth + 0.21), y + 0.48 + lift, z - (front ? 0.13 : -0.1)),
    lowerOffset: new THREE.Vector3(-side * (halfWidth + 0.09), -0.1, 0),
    pivots: front
      ? [new THREE.Vector3(side * 0.32, y + 0.07 + lift, z - 0.32), new THREE.Vector3(side * 0.32, y - 0.12 + lift, z - 0.32)]
      : [new THREE.Vector3(side * 0.26, y - 0.1 + lift, z + 0.46), new THREE.Vector3(side * 0.2, y - 0.08 + lift, z)],
  };
}

function connect(mesh, a, b, radius = 1) {
  const delta = b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, delta.clone().normalize());
  mesh.scale.set(radius, delta.length(), radius);
}

export function createSuspensionVisual(mounts, lift = 0, coilovers = true) {
  const root = new THREE.Group();
  root.name = 'SuspensionAssembly';
  const tube = new THREE.CylinderGeometry(1, 1, 1, 10);
  const dark = new THREE.MeshStandardMaterial({ color: '#303438', metalness: 0.7, roughness: 0.45 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#c4c8ce', metalness: 0.9, roughness: 0.22 });
  const red = new THREE.MeshStandardMaterial({ color: '#c83a25', metalness: 0.4, roughness: 0.4 });
  const points = Array.from({ length: 145 }, (_, i) => {
    const t = i / 144, a = t * Math.PI * 16;
    return new THREE.Vector3(Math.cos(a) * 0.062, t, Math.sin(a) * 0.062);
  });
  const springGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 144, 0.009, 6);
  const makeTube = material => { const mesh = new THREE.Mesh(tube, material); root.add(mesh); return mesh; };
  const wheels = mounts.map(mount => {
    const anchors = suspensionAnchors(mount, lift);
    anchors.pivots.forEach((pivot, i) => {
      const tower = makeTube(dark); tower.name = `${mount.name}_ShockTower_${i}`;
      connect(tower, pivot, anchors.upper, 0.018);
    });
    const shock = new THREE.Group(); root.add(shock);
    const body = new THREE.Mesh(tube, dark), rod = new THREE.Mesh(tube, chrome);
    const spring = new THREE.Mesh(springGeo, red); spring.visible = coilovers;
    const lowerEye = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), dark);
    const upperEye = lowerEye.clone();
    shock.add(body, rod, spring, lowerEye, upperEye);
    for (const [name, mesh] of Object.entries({ ShockBody: body, ShockRod: rod, Spring: spring, LowerEye: lowerEye, UpperEye: upperEye })) {
      mesh.name = `${mount.name}_${name}`;
    }
    const links = anchors.pivots.map((_, i) => {
      const link = makeTube(dark); link.name = `${mount.name}_${mount.name.startsWith('F') ? 'TrailingArm' : i ? 'Halfshaft' : 'RearArm'}_${i}`;
      return link;
    });
    const knuckle = makeTube(dark); knuckle.name = `${mount.name}_Knuckle`;
    return { mount, anchors, shock, body, rod, spring, lowerEye, upperEye, links, knuckle, bodyLength: 0.22 };
  });
  const front = mounts.find(m => m.name === 'FL');
  for (const dy of [-0.12, 0.07]) {
    const beam = makeTube(dark);
    beam.name = `FrontBeam_${dy}`;
    connect(beam, new THREE.Vector3(-0.32, front.center[1] + dy + lift, front.center[2] - 0.32),
      new THREE.Vector3(0.32, front.center[1] + dy + lift, front.center[2] - 0.32), 0.035);
  }
  const rear = mounts.find(m => m.name === 'RL');
  const crossmember = makeTube(dark); crossmember.name = 'RearCrossmember';
  connect(crossmember, new THREE.Vector3(-0.26, rear.center[1] - 0.1 + lift, rear.center[2] + 0.46),
    new THREE.Vector3(0.26, rear.center[1] - 0.1 + lift, rear.center[2] + 0.46), 0.035);
  root.userData.suspension = { wheels };
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  updateSuspensionVisual(root, mounts.map(m => ({ name: m.name, hub: new THREE.Vector3(...m.center) })));
  return root;
}

export function updateSuspensionVisual(root, hubs) {
  for (const w of root.userData.suspension.wheels) {
    const hub = hubs.find(h => h.name === w.mount.name).hub;
    const inboard = -w.anchors.lowerOffset.x;
    const lower = hub.clone().add(w.anchors.lowerOffset), delta = w.anchors.upper.clone().sub(lower), length = delta.length();
    w.shock.position.copy(lower);
    w.shock.quaternion.setFromUnitVectors(UP, delta.normalize());
    const bodyLength = Math.min(w.bodyLength, length * 0.65);
    w.body.position.y = length - bodyLength / 2; w.body.scale.set(0.036, bodyLength, 0.036);
    w.rod.position.y = (length - bodyLength) / 2; w.rod.scale.set(0.015, length - bodyLength, 0.015);
    w.spring.position.y = 0.05; w.spring.scale.y = Math.max(0.01, length - 0.1);
    w.upperEye.position.y = length;
    w.links.forEach((link, i) => connect(link, w.anchors.pivots[i],
      hub.clone().add(new THREE.Vector3(-inboard, i ? -0.1 : 0.05, 0)), i && w.mount.name.startsWith('R') ? 0.018 : 0.025));
    connect(w.knuckle, hub.clone().add(new THREE.Vector3(-inboard, -0.1, 0)),
      hub.clone().add(new THREE.Vector3(-inboard, 0.05, 0)), 0.038);
  }
}

export function disposeSuspensionVisual(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(o => { if (o.isMesh) { geometries.add(o.geometry); materials.add(o.material); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}

export function buildWheelRig(root, mounts) {
  root.updateMatrixWorld(true);
  const sets = Object.fromEntries(mounts.map(m => [m.name, []]));
  let suspension = null;
  const steering = [];
  const hasVisibleMesh = o => o.visible && (o.isMesh || o.children.some(hasVisibleMesh));
  const visit = o => {
    if (!o.visible) return;
    if (o.userData.suspension) { suspension = o; return; }
    const named = /^C?Wheel_(FL|FR|RL|RR)$/.exec(o.name);
    if (named) { if (hasVisibleMesh(o)) sets[named[1]].push(o); return; }
    const name = o.userData.source_name || o.name;
    const match = /^(FL|FR|RL|RR)_/.exec(name) || /^B_(FL|FR|BL|BR)Wheel/.exec(name);
    if (match) { if (hasVisibleMesh(o)) sets[match[1].replace('B', 'R')].push(o); return; }
    if (/^B_InteriorSteeringWheel/.test(name)) { if (hasVisibleMesh(o)) steering.push(o); return; }
    o.children.forEach(visit);
  };
  root.children.forEach(visit);
  for (const mount of mounts) if (!sets[mount.name].length) throw new Error(`[drive] Missing visible ${mount.name} wheel; cannot build suspension rig.`);
  const wheels = mounts.map(mount => {
    const steer = new THREE.Group(), spin = new THREE.Group();
    steer.name = `Hub_${mount.name}`; steer.position.set(...mount.center);
    steer.add(spin); root.add(steer); root.updateMatrixWorld(true);
    sets[mount.name].forEach(o => spin.attach(o));
    return { name: mount.name, steer, spin, r: mount.radius, front: mount.name.startsWith('F') };
  });
  let wheel = null;
  if (steering.length) {
    const box = new THREE.Box3(); steering.forEach(o => box.expandByObject(o));
    wheel = new THREE.Group(); wheel.position.copy(root.worldToLocal(box.getCenter(new THREE.Vector3())));
    root.add(wheel); root.updateMatrixWorld(true); steering.forEach(o => wheel.attach(o));
  }
  return { wheels, wheel, suspension };
}
