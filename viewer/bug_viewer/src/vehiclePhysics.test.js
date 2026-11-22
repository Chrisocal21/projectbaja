import test from 'node:test';
import assert from 'node:assert/strict';
import { massModel, pressureEffect, tipLimitG, SURFACE_DATA, STD_ROLL } from './vehiclePhysics.js';
import { createBody, stepBody, readBody } from './rigid.js';

const WB = 2.38, stock = { parts: {} }, caged = { parts: { rollCage: 'ROLL_Cage', roofRack: 'ACC_RoofRack', roofLights: 'ROOF_RoundLights', rearCarrier: 'ACC_SpareCarrier' } };
test('a roll cage, roof rack and spare make the car heavier and raise its centre of gravity', () => {
  const a = massModel(stock, WB), b = massModel(caged, WB);
  assert.ok(b.mass > a.mass + 100 && b.cgY > a.cgY + 0.02, JSON.stringify([a, b]));
  assert.ok(tipLimitG(1.5, b.cgY) < tipLimitG(1.5, a.cgY), 'tip limit must drop');
});
test('the stock car is rear-heavy (about 40/60)', () => {
  const m = massModel(stock, WB), frontShare = 1 - m.cgFromRear / WB;   // share of weight on the FRONT axle = distance from rear / wheelbase
  assert.ok(Math.abs(m.cgFromRear / WB - 0.42) < 0.001, m.cgFromRear);
});
test('lower tire pressure helps on sand and costs grip on dirt and steering response', () => {
  const sandLow = pressureEffect(15, 'sand'), sandStreet = pressureEffect(30, 'sand'), dirtLow = pressureEffect(15, 'dirt');
  assert.ok(sandLow.grip > sandStreet.grip && sandLow.rr < sandStreet.rr);
  assert.ok(dirtLow.grip < 1 && dirtLow.steerLag > 0); assert.ok(pressureEffect(14, 'rock').pinch && !pressureEffect(30, 'rock').pinch);
});
test('surface data is within the lesson-plan ranges', () => {
  const r = { pavement: [0.9, 1, 0.01, 0.015], dirt: [0.6, 0.8, 0.03, 0.08], gravel: [0.4, 0.6, 0.05, 0.1], sand: [0.3, 0.5, 0.15, 0.3], mud: [0.2, 0.4, 0.1, 0.2], rock: [0.6, 0.8, 0.03, 0.06] };
  for (const [k, [g0, g1, r0, r1]] of Object.entries(r)) { const s = SURFACE_DATA[k]; assert.ok(s.grip >= g0 && s.grip <= g1 && s.rrCoef >= r0 && s.rrCoef <= r1, k); }
});

const dims = { wheelbase: 2.38, track: 1.5, offroad: true, lift: 0, bellyHeight: 0.28, cabEye: [0.31, 1.32, -0.15],
  mounts: ['FL', 'FR', 'RL', 'RR'].map(name => ({ name, radius: 0.38, center: [name.endsWith('L') ? 0.75 : -0.75, 0.38, name.startsWith('F') ? 1.19 : -1.19] })) };
const drive = (extra, surf, psi, sec = 10) => {
  const fx = pressureEffect(psi, surf), s0 = SURFACE_DATA[surf], d = { ...dims, ...extra };
  const b = createBody(d, {}); const env = { height: () => 0, mu: s0.grip * fx.grip * 1.25, rr: s0.rrCoef / STD_ROLL * fx.rr, ACC: 11, MAXV: 40, DRG: 0.3 * 11 / 1600 };
  for (let i = 0; i < sec * 120; i++) stepBody(b, d, { throttle: 1, brake: false, steer: 0 }, env, 1 / 120);
  return readBody(b);
};
test('sand: street pressure bogs, aired down keeps moving (and both are slower than dirt)', () => {
  const street = drive({}, 'sand', 30), low = drive({}, 'sand', 15), dirt = drive({}, 'dirt', 30);
  console.log('speed after 10 s full throttle: dirt', dirt.v.toFixed(1), 'sand@30', street.v.toFixed(1), 'sand@15', low.v.toFixed(1));
  assert.ok(low.v > street.v * 1.08 && street.v < dirt.v * 0.85, JSON.stringify([dirt.v, street.v, low.v]));
});
test('a heavier car accelerates slower (engine force is fixed)', () => {
  const light = drive({ mass: 820, cgY: 0.5, cgFromRear: 1 }, 'dirt', 30, 6), heavy = drive({ mass: 1100, cgY: 0.62, cgFromRear: 1 }, 'dirt', 30, 6);
  assert.ok(heavy.v < light.v, JSON.stringify([light.v, heavy.v]));
});
test('side-slope tip angle: the caged (higher CG) car tips at a lower slope than the stock one', () => {
  const tipSlope = extra => { for (let slope = 0.2; slope < 1.6; slope += 0.01) {
    const d = { ...dims, ...extra }, b = createBody(d, { v: 0 }), env = { height: x => x * slope, mu: 5, rr: 1, ACC: 11, MAXV: 40, DRG: 0.01 };
    for (let i = 0; i < 6 * 120; i++) stepBody(b, d, { throttle: 0, brake: true, steer: 0 }, env, 1 / 120);
    if (readBody(b).upY < 0.8) return slope; } return 9; };
  const s = massModel(stock, WB), c = massModel(caged, WB);
  const a = tipSlope({ mass: s.mass, cgY: s.cgY, cgFromRear: s.cgFromRear }), bb = tipSlope({ mass: c.mass, cgY: c.cgY, cgFromRear: c.cgFromRear });
  console.log('tip slope (rise/run) stock', a.toFixed(2), 'caged', bb.toFixed(2), '| theory', (1.5 / 2 / s.cgY).toFixed(2), (1.5 / 2 / c.cgY).toFixed(2));
  assert.ok(bb < a, JSON.stringify([a, bb]));
});
