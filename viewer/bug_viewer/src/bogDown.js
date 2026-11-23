// Getting stuck in soft ground (PURE, no game store). Silt beds and soft sand swallow a car that goes slow or spins its wheels; speed and aired-down
// tires float over them. One number per vehicle: sink 0..1 (game.home.sink[veh].n). It raises the rolling drag, cuts grip and lowers the wheels into
// the ground. Getting out is hands-on: dig each wheel with a shovel, lay traction boards, or call the tow truck. PROPOSAL numbers: tune by feel.

/** per soft surface: cap = deepest it can bog you; rate = how fast moving slowly sinks you; spin = how fast spinning the wheels in place digs you in;
 *  floatV = m/s where you skim over it; drag = extra rolling drag at full sink (x sink^2); gripLoss = grip lost at full sink; depth = metres the wheels drop */
export const SOFT = {
  silt:     { cap: 1, rate: 0.3, spin: 0.5, floatV: 12, drag: 8, gripLoss: 0.35, depth: 0.3 },
  softSand: { cap: 1, rate: 0.25, spin: 0.45, floatV: 9, drag: 7, gripLoss: 0.3, depth: 0.25 },
  sand:     { cap: 0.25, rate: 0.12, spin: 0.2, floatV: 7, drag: 4, gripLoss: 0.15, depth: 0.08 },   // ordinary loose sand: it drags if you crawl, it never strands you
};
/** sinking eases off this fast on firm ground (per second), and much faster on traction boards */
export const LIFT = { firm: 0.8, float: 0.5, boards: 1.2 };
/** traction boards under the wheels: grip, and how near the car must stay to them (m) */
export const BOARDS = { grip: 1.35, reach: 3.5, leave: 4.5 };
/** the shovel: seconds of digging per wheel, and how much sink each dug wheel takes away */
export const DIG = { secs: 5, perWheel: 0.24 };
/** seconds of holding to lay traction boards under a wheel */
export const LAY_SECS = 2.5;
/** sink above this, crawling, with the throttle down = stuck */
export const STUCK_AT = 0.55;

const clamp01 = v => Math.max(0, Math.min(1, v));
/** 0 at street pressure (30 psi), 1 aired down to 14 psi: a wider footprint floats on soft ground */
export const airDownOf = psi => clamp01((30 - (psi ?? 30)) / 16);
export const isSoft = key => !!SOFT[key];

/** one step. o: { key (surface), throttle -1..1, speed m/s, psi, boards (on traction boards) } -> the new sink */
export function stepSink(sink, o, dt) {
  sink = sink || 0;
  if (o.boards) return Math.max(0, sink - LIFT.boards * dt);
  const s = SOFT[o.key]; if (!s) return Math.max(0, sink - LIFT.firm * dt);
  const v = Math.abs(o.speed || 0), thr = Math.min(1, Math.abs(o.throttle || 0)), air = 1 - 0.5 * airDownOf(o.psi);
  const float = clamp01((v - 1.5) / (s.floatV - 1.5));
  if (v > 0.3) {   // rolling: the car settles toward how deep this speed lets it ride (slow = deep, fast = on top)
    const target = s.cap * (1 - float) * (0.4 + 0.6 * thr) * air;
    sink += target > sink ? Math.min(target - sink, s.rate * air * dt) : -Math.min(sink - target, LIFT.float * dt);
  }
  if (thr > 0.1 && v < 1.5) sink += s.spin * thr * (1 - v / 1.5) * air * dt;   // wheels spinning in place dig a hole
  return Math.max(0, Math.min(s.cap, sink));
}

/** what the sink does to the car right now: rolling-drag and grip multipliers, and how far the wheels sit down in the ground (m) */
export function sinkEffect(sink, key, boards = false) {
  if (!(sink > 0) && !boards) return { rr: 1, mu: 1, depth: 0 };
  const s = SOFT[key], depth = (s?.depth ?? 0.25) * (sink || 0);   // (off soft ground the wheels rise back out as the sink fades: no sudden jump)
  if (boards) return { rr: 1, mu: BOARDS.grip, depth };
  if (!s) return { rr: 1, mu: 1, depth };
  return { rr: 1 + s.drag * sink * sink, mu: 1 - s.gripLoss * sink, depth };
}

/** bogged down: deep, crawling, and you are asking for power */
export const isStuck = (sink, speed, throttle) => sink > STUCK_AT && Math.abs(speed) < 0.6 && Math.abs(throttle) > 0.3;
/** the HUD word for it */
export const sinkWord = (sink, stuck) => (stuck ? 'STUCK' : sink > 0.3 ? 'BOGGING DOWN' : sink > 0.12 ? 'SOFT GROUND' : '');

/** the shovel: can this wheel be dug? Once dug it stays dug until the car sinks deeper again (the physics clears rec.dug then: see sinkDeeper) */
export const canDig = (rec, corner) => (rec?.n || 0) > 0.02 && !rec?.dug?.[corner];
/** after a physics step: the record with its dug wheels forgotten if the car went deeper (in place, it runs every step) */
export function sinkDeeper(rec, before) { if (rec.dug && rec.n > before + 1e-6) delete rec.dug; return rec; }
/** dig one wheel out: the record with less sink and that wheel marked */
export function digWheel(rec, corner) {
  const n = Math.max(0, (rec?.n || 0) - DIG.perWheel);
  return { ...(rec || {}), n, dug: { ...(rec?.dug || {}), [corner]: true } };
}

/** tools for the job (merged into TOOLS in game/items.js) */
export const RECOVERY_TOOLS = {
  shovel: { name: 'Shovel', size: 2 },
  boards: { name: 'Traction boards', size: 3 },
};
export const isRecoveryTool = id => !!RECOVERY_TOOLS[id];
