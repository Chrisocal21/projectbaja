import test from 'node:test';
import assert from 'node:assert/strict';
import { PSI, stepPressure, pressureLine, PRESSURE_TOOL_ITEMS } from './tirePressure.js';

const hold = (tool, psi, sec, air) => { let p = psi, t = 0; for (; t < sec; t += 0.1) { const r = stepPressure(tool, p, 0.1, air); if (!r.ok) return { ...r, psi: p }; p = r.psi; } return { ok: true, psi: p }; };
test('the gauge bleeds air down to a floor and then refuses', () => {
  const r = hold('gauge', 30, 3, false); assert.ok(r.psi < 19 && r.psi > 17);
  const flat = hold('gauge', 30, 20, false); assert.equal(flat.ok, false); assert.equal(flat.psi, PSI.min);
});
test('the air chuck needs the compressor and stops at the maximum', () => {
  assert.match(stepPressure('airchuck', 12, 0.1, false).why, /compressor/);
  const r = hold('airchuck', 12, 20, true); assert.equal(r.ok, false); assert.equal(r.psi, PSI.max);
});
test('the pressure tools are items and say what they do', () => {
  assert.ok(PRESSURE_TOOL_ITEMS.gauge.name && PRESSURE_TOOL_ITEMS.airchuck.name);
  assert.match(pressureLine('gauge', 30), /30 psi.*let air out/); assert.match(pressureLine('airchuck', 18), /fill/);
});
