import { slots, bodies, wheelSets, parts, presets, rims } from './catalog/index.js';

export { slots, bodies, wheelSets, parts, presets, rims };
export const rimById = Object.fromEntries(rims.map(r => [r.id, r]));
export const bodyById = Object.fromEntries(bodies.map(b => [b.id, b]));
export const wheelById = Object.fromEntries(wheelSets.map(w => [w.id, w]));
export const partById = Object.fromEntries(parts.map(p => [p.id, p]));

export const PALETTE = [
  [null, 'Original'], ['#f2f2ee', 'White'], ['#1c1c1e', 'Black'], ['#b3202a', 'Red'], ['#e0701c', 'Orange'],
  ['#e8c21a', 'Yellow'], ['#2f6b3a', 'Green'], ['#1f7f86', 'Teal'], ['#1f4fa8', 'Blue'], ['#6b3aa0', 'Purple'],
  ['#c2a878', 'Sand'], ['#6b6f3a', 'Olive'], ['#56606b', 'Gunmetal'],
];
export const SIZE = { min: 0.8, max: 1.35, step: 0.05 };
export const LIFT = { min: 0, max: 0.3, step: 0.025 };

export const defaultBuild = () => ({ body: bodies[0].id, wheels: 'stock', wheelScale: 1, lift: 0, rim: 'steel', colors: {}, hidden: [], parts: {} });

const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(+v) ? +v : a));

// ---- compatibility ----
export const partFile = (p, bodyId) => (p.bodies === '*' ? p.file : p.bodies?.[bodyId]);
export const partFits = (p, bodyId) => !!partFile(p, bodyId);
/** 'ok' = fits, 'refit' = belongs to this body family but not fitted yet, 'hidden' = n/a */
export function partState(p, body) {
  if (partFits(p, body.id)) return 'ok';
  return p.families?.includes(body.family) ? 'refit' : 'hidden';
}
export const wheelSetFits = (w, bodyId) => w.kind !== 'prebuilt' || !!w.bodies?.[bodyId];
export const labelFor = (item, bodyId) => item.labels?.[bodyId] || item.label;

/** Drop anything invalid for the body, enforce `requires`, clamp numbers. */
export function normalize(input) {
  const b = { ...defaultBuild(), ...input, parts: { ...(input.parts || {}) }, colors: { ...(input.colors || {}) }, hidden: [...(input.hidden || [])] };
  if (input.paint) b.colors.paint = input.paint;   // legacy single paint colour
  delete b.paint;
  if (!bodyById[b.body]) b.body = bodies[0].id;
  if (!wheelById[b.wheels] || !wheelSetFits(wheelById[b.wheels], b.body)) b.wheels = 'stock';
  b.wheelScale = clamp(b.wheelScale, SIZE.min, SIZE.max);
  b.lift = clamp(b.lift, LIFT.min, LIFT.max);
  if (!rimById[b.rim]) b.rim = 'steel';
  const chans = new Set([...(bodyById[b.body].colorChannels || []).map(c => c.id), 'rim']);
  for (const [k, v] of Object.entries(b.colors)) if (!chans.has(k) || !/^#[0-9a-f]{6}$/i.test(v || '')) delete b.colors[k];
  const pieceIds = new Set((bodyById[b.body].pieces || []).map(x => x.id));
  b.hidden = [...new Set(b.hidden)].filter(id => pieceIds.has(id));
  for (let pass = 0; pass < 3; pass++) {
    for (const [slot, id] of Object.entries(b.parts)) {
      const p = partById[id];
      if (!p || p.slot !== slot || !partFits(p, b.body)) { delete b.parts[slot]; continue; }
      for (const [rs, rid] of Object.entries(p.requires || {})) if (b.parts[rs] !== rid) delete b.parts[slot];
    }
  }
  return b;
}

export function setBody(build, id) { return normalize({ ...build, body: id }); }
export const setRim = (build, id) => normalize({ ...build, rim: id });
export function setWheels(build, id) { return normalize({ ...build, wheels: id }); }
export function setPart(build, slot, id) {
  const next = { ...build, parts: { ...build.parts } };
  if (!id) delete next.parts[slot];
  else { next.parts[slot] = id; Object.assign(next.parts, partById[id]?.requires || {}); }
  return normalize(next);
}
export const applyPreset = p => normalize({ ...defaultBuild(), ...p.build });

// ---- derived values used by the renderer + the drive world ----
export function resolve(build) {
  const body = bodyById[build.body], ws = wheelById[build.wheels];
  const tire = ws.kind === 'tire', custom = ws.kind !== 'stock';
  const scale = tire ? build.wheelScale : 1;
  const active = Object.values(build.parts).map(id => partById[id]).filter(Boolean);
  const pieces = body.pieces || [];
  const masks = [
    ...active.flatMap(p => p.hides?.[body.id] || p.hides?.['*'] || []),
    ...(custom ? body.wheelHide : []),
    ...pieces.filter(x => build.hidden.includes(x.id)).flatMap(x => x.match),
  ];
  const channels = (body.colorChannels || []).filter(c => build.colors[c.id]).map(c => ({ id: c.id, re: new RegExp(c.match, 'i'), color: build.colors[c.id] }));
  for (const a of body.alwaysPaint || []) channels.push({ id: 'always-' + a.match, re: new RegExp(a.match, 'i'), color: a.color || build.colors[a.channel] || body.defaultPaint });   // e.g. painted body interior panels
  const wheelMounts = ws.mounts?.[body.id] || ws.mounts?.['*'] || body.wheels;
  const mounts = Object.entries(wheelMounts).map(([name, w]) => ({
    name, radius: w.radius * scale, center: [w.center[0], w.center[1] * scale, w.center[2]],
    halfWidth: tire ? ws.halfWidth * w.radius * scale / ws.baseRadius : w.halfWidth,
  }));
  const baseR = body.wheels.FL.radius;
  const liftable = body.stockWheelsLiftable || custom;
  const lift = liftable ? build.lift + (tire ? (scale - 1) * baseR : 0) : 0;
  const fl = mounts.find(m => m.name === 'FL'), rl = mounts.find(m => m.name === 'RL');
  const eye = body.cabEye;
  const rim = tire ? rimById[build.rim] : null, rimColor = rim ? (build.colors.rim || rim.defaultColor) : null;
  return {
    rim, rimColor, body, wheelSet: ws, tire, custom, scale, active, masks, channels, mounts, lift, liftable,
    dims: { tire: ws.grip || { mu: 1, rr: 1, surf: {} }, wheelbase: fl.center[2] - rl.center[2], track: Math.abs(fl.center[0]) * 2, cabEye: [eye[0], eye[1] + lift, eye[2]],
      mounts, lift, bellyHeight: (body.id === 'classic-stage2' ? 0.28 : 0.14) + lift,
      offroad: body.id === 'classic-stage2' || active.some(p => p.slot === 'suspension' || p.slot === 'shocks') },
  };
}

// ---- share links ----
export const encodeBuild = b => {
  try { return btoa(JSON.stringify([b.body, b.wheels, +b.wheelScale.toFixed(2), +b.lift.toFixed(3), b.colors, b.parts, b.hidden, b.rim])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  catch { return ''; }
};
export function decodeBuild(s) {
  try {
    const [body, wheels, wheelScale, lift, colors, ps, hidden, rim] = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    return normalize({ body, wheels, wheelScale, lift, colors: typeof colors === 'string' ? { paint: colors } : colors || {}, parts: ps, hidden: hidden || [], rim });
  } catch { return null; }
}

// ---- variety ----
const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomBuild() {
  let b = { ...defaultBuild(), body: pick(bodies).id };
  const ws = wheelSets.filter(w => wheelSetFits(w, b.body));
  b.wheels = pick(ws).id;
  b.wheelScale = SIZE.min + Math.round(Math.random() * ((SIZE.max - SIZE.min) / SIZE.step)) * SIZE.step;
  b.rim = pick(rims).id;
  b.lift = Math.round(Math.random() * (LIFT.max / LIFT.step)) * LIFT.step * 0.8;
  const rc = () => `#${[0, 0, 0].map(() => Math.floor(40 + Math.random() * 180).toString(16).padStart(2, '0')).join('')}`;
  b.colors = {};
  if (Math.random() < 0.4) b.colors.rim = rc();
  for (const c of bodyById[b.body].colorChannels || []) if (Math.random() < (c.id === 'paint' ? 0.85 : 0.35)) b.colors[c.id] = rc();
  for (const s of slots) {
    const ok = parts.filter(p => p.slot === s.id && partFits(p, b.body));
    if (ok.length && Math.random() < 0.55) b = setPart(b, s.id, pick(ok).id);
  }
  return normalize(b);
}

/** How many distinct builds the catalog allows (sizes, lifts and palette are discretised). */
export function countBuilds(bodyId) {
  const sizeSteps = Math.round((SIZE.max - SIZE.min) / SIZE.step) + 1, liftSteps = Math.round(LIFT.max / LIFT.step) + 1;
  const per = id => {
    const sets = wheelSets.filter(w => wheelSetFits(w, id));
    const wheelOpts = sets.reduce((n, w) => n + (w.kind === 'tire' ? sizeSteps * rims.length * (PALETTE.length + 1) : 1), 0);
    const partOpts = slots.reduce((n, s) => n * (1 + parts.filter(p => p.slot === s.id && partFits(p, id)).length), 1);
    const bd = bodyById[id];
    return wheelOpts * liftSteps * PALETTE.length ** (bd.colorChannels?.length || 1) * 2 ** (bd.pieces?.length || 0) * partOpts;
  };
  return bodyId ? per(bodyId) : bodies.reduce((n, b) => n + per(b.id), 0);
}
