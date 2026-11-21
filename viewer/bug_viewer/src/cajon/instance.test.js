import test from 'node:test';
import assert from 'node:assert/strict';
// the model draws a few canvas textures (badges, headlight lenses): a stub canvas is enough to build it under node
const ctx = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const THREE = await import('three');
const { CAJON, groupOf } = await import('../rules/vehicles.js');
const { isFitted } = await import('../rules/restore.js');
const { shellBuild } = await import('../game/cajonParts.js');
const { getTemplate, makeCajon, applyBuild, swing, stepCovers, partCopy, HUBS, COVER_GROUP } = await import('./instance.js');
const { REST_CAJON } = await import('../game/restPose.js');

const whole = { def: 'cajon', hidden: [], stripped: [], wheels: 'stock', parts: {} };
const box = o => { o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse(c => { if (c.isMesh && c.visible) { c.geometry.computeBoundingBox(); b.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld)); } }); return b; };

test('the model has a group for every slot of the definition (rules and model agree)', () => {
  const T = getTemplate();
  for (const s of CAJON.slots) {
    if (s.wheel) continue;
    assert.ok(groupOf(s), `${s.id} has no model group name`);
    assert.ok(T.parts[groupOf(s)], `${s.id}: the model has no "${groupOf(s)}" group`);
  }
  assert.equal(T.wheels.length, 4);
  for (const g of Object.values(COVER_GROUP)) assert.ok(T.hinges[g], `no hinge for ${g}`);
});
test('a new truck tags every part with its slot (what the crosshair reads) and every wheel with its hub', () => {
  const t = makeCajon();
  for (const s of CAJON.slots.filter(x => !x.wheel)) assert.equal(t.parts[s.id].userData.slot, s.id);
  for (const n of Object.keys(HUBS)) assert.equal(t.wheels[n].userData.slot, 'ecWheel' + n);
  // a mesh deep inside a part finds its slot by walking up
  let mesh = null; t.parts.ecDoorL.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  let n = mesh, slot = null; for (; n; n = n.parent) if (n.userData.slot) { slot = n.userData.slot; break; }
  assert.equal(slot, 'ecDoorL');
});
test('what is shown follows the build: the bare shell shows no parts, stands under all four hubs; a whole truck shows everything', () => {
  const t = makeCajon();
  applyBuild(t, shellBuild());
  for (const s of CAJON.slots) { if (s.wheel) { assert.equal(t.wheels[s.wheel].visible, false); assert.equal(t.stands[s.wheel].visible, true); } else assert.equal(t.parts[s.id].visible, false, s.id); }
  applyBuild(t, whole);
  for (const s of CAJON.slots) { assert.equal(isFitted(CAJON, whole, s.id), true); if (s.wheel) { assert.equal(t.wheels[s.wheel].visible, true); assert.equal(t.stands[s.wheel].visible, false); } else assert.equal(t.parts[s.id].visible, true, s.id); }
  applyBuild(t, { ...whole, hidden: ['hood'], stripped: ['ecWheelRL'] });
  assert.equal(t.parts.ecHood.visible, false); assert.equal(t.wheels.RL.visible, false); assert.equal(t.stands.RL.visible, true); assert.equal(t.parts.ecDoorL.visible, true);
});
test('the truck stands on the ground, is 5.5 m long and about 2 m wide, and the wheels sit under the arches', () => {
  const t = makeCajon(); applyBuild(t, whole);
  const b = box(t.root), sz = b.getSize(new THREE.Vector3());
  assert.ok(Math.abs(b.min.y) < 0.02, `lowest point ${b.min.y}`);   // tyres on y = 0
  assert.ok(sz.z > 5.4 && sz.z < 5.7, `length ${sz.z}`); assert.ok(sz.x > 1.9 && sz.x < 2.4, `width ${sz.x}`);
  for (const [n, c] of Object.entries(CAJON.mounts)) { const wb = box(t.wheels[n]); const ctr = wb.getCenter(new THREE.Vector3()); assert.ok(Math.hypot(ctr.x - c.center[0], ctr.y - c.center[1], ctr.z - c.center[2]) < 0.02, `${n} hub ${ctr.toArray()} vs ${c.center}`); }   // the rules' hub centres are where the wheels really are
});
test('the hood, doors and tailgate swing on their hinges, and shut again exactly', () => {
  const t = makeCajon(); applyBuild(t, whole);
  const shut = box(t.parts.ecHood), shutDoor = box(t.parts.ecDoorL);
  swing(t, 'ecHood', 1); const up = box(t.parts.ecHood); assert.ok(up.max.y > shut.max.y + 0.8, 'hood lifts');
  swing(t, 'ecDoorL', 1); const out = box(t.parts.ecDoorL); assert.ok(out.max.x > shutDoor.max.x + 0.3, `driver door swings out (${shutDoor.max.x} -> ${out.max.x})`);
  swing(t, 'ecDoorR', 1); const outR = box(t.parts.ecDoorR); assert.ok(outR.min.x < -1.3, 'passenger door swings out the other way');
  swing(t, 'ecTailgate', 1); assert.ok(box(t.parts.ecTailgate).min.y < box(t.parts.ecTailgate).max.y - 0.1);
  for (const id of ['ecHood', 'ecDoorL', 'ecDoorR', 'ecTailgate']) swing(t, id, 0);
  const again = box(t.parts.ecHood); assert.ok(again.min.distanceTo(shut.min) < 1e-6 && again.max.distanceTo(shut.max) < 1e-6);
});
test('covers ease open and shut over time and report when they stop moving', () => {
  const t = makeCajon(), want = new Set(['ecHood']);
  assert.equal(stepCovers(t, want, 0.1), true); assert.ok(t.open.ecHood > 0 && t.open.ecHood < 1);
  for (let i = 0; i < 40; i++) stepCovers(t, want, 0.05); assert.equal(t.open.ecHood, 1); assert.equal(stepCovers(t, want, 0.05), false);
  for (let i = 0; i < 40; i++) stepCovers(t, new Set(), 0.05); assert.equal(t.open.ecHood, 0);
});
test('two trucks do not share materials: glowing a part on one leaves the other alone', () => {
  const a = makeCajon(), b = makeCajon(); let ma = null, mb = null;
  a.parts.ecHood.traverse(o => { if (o.isMesh && !ma) ma = o.material; }); b.parts.ecHood.traverse(o => { if (o.isMesh && !mb) mb = o.material; });
  assert.notEqual(ma, mb); ma.emissive.set(0xff0000); assert.equal(mb.emissive.getHex(), 0);
  assert.equal(typeof ma.onBeforeCompile, 'function');   // the rust shader came along
});
test('part copies for items and holograms: every slot has one; wheels copy a wheel', () => {
  for (const s of CAJON.slots) { const c = partCopy(s.id); assert.ok(c, s.id); let meshes = 0; c.traverse(o => { if (o.isMesh) meshes++; }); assert.ok(meshes > 0, s.id); }
  assert.ok(partCopy('wheel')); assert.equal(partCopy('nope'), null);
  const w = box(partCopy('wheel')).getSize(new THREE.Vector3()); assert.ok(Math.abs(w.y - 0.76) < 0.02 && w.x < 0.45);   // a 0.76 m tyre, 0.38 m wide
});

test('a loose part lies the way its rest pose says: doors, glass, grille, headlights and tailgate end up flat (their thinnest side is the vertical one)', () => {
  for (const s of CAJON.slots) {
    const g = groupOf(s), rest = REST_CAJON[g]; if (!rest) continue;
    const tilt = new THREE.Group(); tilt.rotation.set(rest[0], 0, rest[1]); tilt.add(partCopy(s.id));
    const flat = box(tilt).getSize(new THREE.Vector3()), upright = box(partCopy(s.id)).getSize(new THREE.Vector3());
    assert.ok(flat.y <= Math.min(flat.x, flat.z) + 1e-6, `${g} lies ${flat.x.toFixed(2)} x ${flat.y.toFixed(2)} x ${flat.z.toFixed(2)} (x, y, z)`);
    assert.ok(flat.y < upright.y + 1e-6 || upright.y <= Math.min(upright.x, upright.z) + 1e-6, `${g} did not get lower`);
  }
});
