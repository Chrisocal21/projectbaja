// Panel finish: the paint sim as plain rules (docs/SYSTEMS_BLUEPRINT.md section 6). No renderer, no UI.
// One panel = one small state object. Every job takes `work` (0..1 of the whole job done this tick, so a held click can call it
// each frame) and returns { ok, panel, why? } without touching the input: a job either happens or says why not.
//
//   steel:       rusted -> ground (bare metal) -> painted (flat) -> buffed (gloss)
//   fiberglass:  gelcoat/bare (flat white) -> sanded -> painted -> buffed      (it never rusts)
//
// All numbers are estimates to tune by feel. Dirt is separate: a hose takes it off, driving puts it on.

export const RULES = {
  rustGrowth: 0.02,       // per game-hour a bare steel panel rusts (painted panels use PAINTED_RUST of this)
  paintedRust: 0.15,
  flatGloss: 0.12,        // a fresh, unbuffed coat
  buffGloss: 1,
  chipToBare: 0.6,        // how far a hard hit strips paint
};

export const newPanel = (base = 'steel', over = {}) => ({ base, rust: 0, coverage: 0, color: null, gloss: 0, dirt: 0, bare: true, ...over });

const clamp01 = v => Math.max(0, Math.min(1, v));
const done = (panel, patch) => ({ ok: true, panel: { ...panel, ...patch } });
const no = (panel, why) => ({ ok: false, panel, why });

export const isRusted = p => p.base === 'steel' && p.rust > 0.02;
export const isPainted = p => p.coverage >= 0.999 && !!p.color;
export const stateName = p => isRusted(p) ? 'rusted' : isPainted(p) ? (p.gloss >= 0.9 ? 'buffed' : 'painted') : p.coverage > 0 ? 'part-painted' : p.base === 'steel' ? 'ground' : 'bare';

/** Grinder (steel) or sanding block (fiberglass): takes off rust and old paint. */
export function grind(panel, work) {
  if (panel.base === 'steel' ? panel.rust <= 0.001 && panel.coverage <= 0 : panel.coverage <= 0 && panel.bare) return no(panel, 'Nothing to grind off.');
  // paint comes off first, then rust: you cannot see rust through a coat
  let w = work, coverage = panel.coverage, rust = panel.rust;
  if (coverage > 0) { const d = Math.min(coverage, w); coverage -= d; w -= d; }
  if (w > 0 && panel.base === 'steel') rust = Math.max(0, rust - w);
  return done(panel, { coverage, rust, color: coverage > 0 ? panel.color : null, gloss: coverage > 0 ? panel.gloss : 0, bare: coverage <= 0 });
}

/** Spray gun or can. The colour comes from the can the player is holding. Needs bare, rust-free metal or glass. */
export function paint(panel, work, color) {
  if (!color) return no(panel, 'You need a can of paint.');
  if (isRusted(panel)) return no(panel, 'Grind the rust off first.');
  if (panel.coverage > 0 && panel.color && panel.color !== color && panel.coverage >= 0.999) return no(panel, 'Grind the old colour off first.');
  if (panel.coverage >= 0.999 && panel.color === color) return no(panel, 'Already painted that colour.');
  const sum = clamp01(panel.coverage + work), coverage = sum >= 0.999 ? 1 : sum;   // snap, so ten small passes make a whole coat
  return done(panel, { coverage, color, gloss: RULES.flatGloss, bare: false });
}

/** Buffer: needs a finished coat. */
export function buff(panel, work) {
  if (!isPainted(panel)) return no(panel, panel.coverage > 0 ? 'Finish painting the panel first.' : 'Nothing to buff: it is not painted.');
  if (panel.gloss >= RULES.buffGloss - 0.001) return no(panel, 'Already as shiny as it gets.');
  return done(panel, { gloss: Math.min(RULES.buffGloss, panel.gloss + work * (RULES.buffGloss - RULES.flatGloss)) });
}

/** Pressure hose or a bucket: dirt only. It does nothing to rust or paint. */
export function hose(panel, work) {
  if (panel.dirt <= 0.001) return no(panel, 'Already clean.');
  return done(panel, { dirt: clamp01(panel.dirt - work) });
}

/** Time passes (hours): bare steel rusts, a coat slows it a lot, fiberglass never rusts. Wet roads add to `exposure`. */
export function weather(panel, hours, exposure = 1) {
  if (panel.base !== 'steel') return panel;
  const rate = RULES.rustGrowth * exposure * (isPainted(panel) ? RULES.paintedRust : panel.coverage > 0 ? 0.6 : 1);
  return { ...panel, rust: clamp01(panel.rust + rate * hours) };
}

/** Driving kicks dirt up; a hit (0..1 hardness) chips paint toward bare. */
export const splash = (panel, amount) => ({ ...panel, dirt: clamp01(panel.dirt + amount) });
export function chip(panel, hardness) {
  if (panel.coverage <= 0) return panel;
  const coverage = clamp01(panel.coverage - hardness * RULES.chipToBare);
  return { ...panel, coverage, color: coverage > 0 ? panel.color : null, gloss: coverage > 0 ? panel.gloss * 0.7 : 0, bare: coverage <= 0 };
}

/** What the renderer needs: base colour, roughness, how much rust shows, how much dirt. Fiberglass starts flat white. */
export function look(panel, bareColor = '#f3f3f0') {
  const painted = panel.coverage > 0 && panel.color;
  const base = painted ? panel.color : panel.base === 'steel' ? '#9a9da0' : bareColor;
  return { color: base, roughness: painted ? 0.9 - 0.55 * panel.gloss : panel.base === 'steel' ? 0.55 : 0.92, metalness: painted ? 0.1 + 0.2 * panel.gloss : panel.base === 'steel' ? 0.7 : 0, rust: panel.rust * (1 - panel.coverage), dirt: panel.dirt };
}
