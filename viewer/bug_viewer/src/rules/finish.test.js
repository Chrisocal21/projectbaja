import test from 'node:test';
import assert from 'node:assert/strict';
import { newPanel, grind, paint, buff, hose, weather, splash, chip, look, stateName, isPainted, RULES } from './finish.js';

const run = (p, fn, total, ...a) => { for (let i = 0; i < 10; i++) { const r = fn(p, total / 10, ...a); if (!r.ok) return r; p = r.panel; } return { ok: true, panel: p }; };

test('a rusted panel cannot be painted until it is ground', () => {
  const p = newPanel('steel', { rust: 0.8 });
  const r = paint(p, 0.5, '#c0392b');
  assert.equal(r.ok, false); assert.match(r.why, /rust/i);
  assert.equal(stateName(p), 'rusted');
});

test('grinding takes rust to bare metal; then painting works, flat', () => {
  let p = run(newPanel('steel', { rust: 0.8 }), grind, 0.8).panel;
  assert.ok(p.rust < 0.02); assert.equal(stateName(p), 'ground');
  p = run(p, paint, 1, '#c0392b').panel;
  assert.equal(stateName(p), 'painted'); assert.equal(p.gloss, RULES.flatGloss);
});

test('you cannot buff bare metal or a half-painted panel', () => {
  assert.equal(buff(newPanel('steel'), 0.5).ok, false);
  const half = paint(newPanel('steel'), 0.5, '#fff').panel;
  assert.match(buff(half, 0.5).why, /finish painting/i);
});

test('buffing raises gloss to buffed and stops there', () => {
  let p = run(newPanel('steel'), paint, 1, '#2a5d9f').panel;
  p = run(p, buff, 1).panel;
  assert.equal(stateName(p), 'buffed');
  assert.equal(buff(p, 0.1).ok, false);
  assert.ok(look(p).roughness < look(run(newPanel('steel'), paint, 1, '#2a5d9f').panel).roughness);
});

test('a new coat of a different colour needs the old one ground off', () => {
  const p = run(newPanel('steel'), paint, 1, '#2a5d9f').panel;
  assert.equal(paint(p, 0.5, '#c0392b').ok, false);
  const g = run(p, grind, 1).panel;
  assert.equal(paint(g, 0.5, '#c0392b').ok, true);
});

test('fiberglass starts flat white, never rusts, and paints the same way', () => {
  const g = newPanel('glass');
  assert.equal(look(g).color, '#f3f3f0'); assert.equal(look(g).roughness, 0.92);
  assert.equal(weather(g, 1000, 3).rust, 0);
  assert.equal(grind(g, 0.5).ok, false);   // nothing to sand
  const painted = run(g, paint, 1, '#c0392b').panel;
  assert.equal(look(painted).color, '#c0392b'); assert.ok(isPainted(painted));
});

test('bare steel rusts over time, paint slows it a lot, rust never shows through a full coat', () => {
  const bare = weather(newPanel('steel'), 10);
  const coated = weather(run(newPanel('steel'), paint, 1, '#fff').panel, 10);
  assert.ok(bare.rust > 0.1);
  assert.ok(coated.rust < bare.rust / 4);
  assert.equal(look(coated).rust, 0);
});

test('the hose takes off dirt only', () => {
  const p = splash(newPanel('steel', { rust: 0.5 }), 0.8);
  const r = run(p, hose, 0.8).panel;
  assert.ok(r.dirt < 0.01); assert.equal(r.rust, 0.5);
  assert.equal(hose(r, 0.2).ok, false);
});

test('a hard hit chips paint back toward bare; a full strip returns to ground', () => {
  const p = run(newPanel('steel'), paint, 1, '#fff').panel;
  const hit = chip(p, 0.5);
  assert.ok(hit.coverage < 1 && hit.coverage > 0); assert.equal(isPainted(hit), false);
  const gone = chip(chip(p, 1), 1);
  assert.equal(gone.coverage, 0); assert.equal(gone.color, null);
});

test('jobs never change the panel they are given', () => {
  const p = newPanel('steel', { rust: 0.5, dirt: 0.5 });
  const frozen = JSON.stringify(p);
  grind(p, 0.3); paint(p, 0.3, '#fff'); hose(p, 0.3); buff(p, 0.3); weather(p, 5); chip(p, 1);
  assert.equal(JSON.stringify(p), frozen);
});

test('grinding strips paint before rust (you cannot see rust through a coat)', () => {
  const p = newPanel('steel', { rust: 0.5, coverage: 1, color: '#fff', bare: false });
  const r = grind(p, 0.4).panel;
  assert.ok(r.coverage < 1 && r.rust === 0.5);
});
