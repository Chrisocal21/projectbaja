import { roadStations } from './regionalRoads.js';
// Things to mob over: whoop sections, road/table-top jumps, banked dirt berms and little tracks (oval of two berms, a whoop straight and a jump), placed
// along the real roads, with a short dirt trail from the road to each track. Pure and deterministic (same map every time). Everything is a height added
// to the ground; nothing is drawn separately, so the car, the terrain mesh, the grass and the walkers all agree on it.
//
// Placement: planFeatures() walks the roads and picks spots beside them (and the trails that reach them). buildField() then drops anything that would sit
// on a paved road, in water or on a built site, and indexes the rest so heightAt(x, z) is a cheap lookup (0 almost everywhere).
// Heading convention is the game's: angle 0 faces +z, positive turns toward +x.

import { planWild, wildFootprint, wildPrimitives, evalWild, waterOver, creekMeshes, wildTrees, inDeck, flowOf, WILD_KINDS } from './wildFeatures.js';

const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

export const FEATURE = { spacing: 450, maxPerRoad: 100, cell: 96 };

// ---- the shapes (heights in metres at a point in the feature's own frame: s along its heading, t across it) ----
/** whoops: rounded humps across the path, tapering in and out */
function whoops(f, s, t) {
  if (s < 0 || s > f.L) return 0;
  const end = smooth(0, f.lam * 2, s) * smooth(f.L, f.L - f.lam * 2, s), side = 1 - smooth(f.W * 0.3, f.W / 2, Math.abs(t));
  const cycles = s / f.lam;
  const phase = TAU * cycles + 0.42 * Math.sin(cycles * 1.27);
  const amplitude = f.A * (0.88 + 0.12 * Math.cos(cycles * 1.61));
  return amplitude * end * side * (0.5 - 0.5 * Math.cos(phase));
}

/** Vehicle table in metres. Even the lowest mound has a full-length approach. */
export function tableLengths(H) {
  const up = 9 + 4 * H, top = 7 + H, down = 14 + 7 * H;
  return { up, top, down, total: up + top + down };
}
export function tableHeight(H, s) {
  const { up, top, total } = tableLengths(H);
  if (s <= 0 || s >= total) return 0;
  if (s < up) {
    // Build grade over the first half, hold it through the takeoff, then round
    // the last fifth into the crown. The slope is continuous at each join.
    const t = s / up, grade = H / 0.65;
    if (t < 0.5) return grade * t * t;
    if (t < 0.8) return grade * (t - 0.25);
    return H - grade * (1 - t) ** 2 / 0.4;
  }
  return H * (1 - smooth(up + top, total, s));
}
function jump(f, s, t) {
  return tableHeight(f.H, s) * (1 - smooth(3.2, f.W / 2, Math.abs(t)));
}
/** a banked dirt berm on the outside of a turn: rises toward the outer lip, then drops off */
function berm(f, dx, dz) {
  const r = Math.hypot(dx, dz); if (r > f.R + 9 || r < f.R - 12) return 0;
  let d = Math.atan2(dx, dz) - f.dir; d = Math.atan2(Math.sin(d), Math.cos(d));
  const ang = 1 - smooth(f.span * 0.7, f.span, Math.abs(d));
  return f.B * ang * smooth(f.R - 12, f.R - 0.6, r) * (1 - smooth(f.R - 0.6, f.R + 9, r));
}
/** evaluate one primitive at world (x, z) */
function evalPrim(p, x, z) {
  if (p.type === 'deck') return 0;
  if (p.type === 'seg' || p.type === 'hill') return evalWild(p, x, z);
  const dx = x - p.x, dz = z - p.z;
  if (p.type === 'berm') return berm(p, dx, dz);
  const sn = Math.sin(p.h), cs = Math.cos(p.h), s = dx * sn + dz * cs, t = dx * cs - dz * sn;
  return p.type === 'whoops' ? whoops(p, s, t) : jump(p, s, t);
}
const place = (cx, cz, h, s, t) => ({ x: cx + Math.sin(h) * s + Math.cos(h) * t, z: cz + Math.cos(h) * s - Math.sin(h) * t });

// ---- what a plan item is made of ----
/** primitives for one plan item, each with a bounding radius */
export function primitivesOf(it, baseH = () => 0) {
  if (WILD_KINDS.includes(it.kind)) return wildPrimitives(it, baseH);
  const out = [], H = it.h;
  const add = (p, rad) => out.push({ ...p, rad });
  if (it.kind === 'whoops') add({ type: 'whoops', x: it.x, z: it.z, h: H, L: it.L, W: it.W, lam: it.lam, A: it.A }, it.L + it.W);
  else if (it.kind === 'jump') add({ type: 'jump', x: it.x, z: it.z, h: H, H: it.H, W: it.W }, tableLengths(it.H).total + it.W);
  else if (it.kind === 'berms') {   // an S of two berms: a turn one way, then the other
    add({ type: 'berm', x: it.x, z: it.z, R: it.R, dir: H + Math.PI / 2, span: 1.25, B: it.B }, it.R + 9);
    const c = place(it.x, it.z, H, it.R * 1.5, it.R * 2.2);
    add({ type: 'berm', x: c.x, z: c.z, R: it.R, dir: H - Math.PI / 2 + Math.PI, span: 1.25, B: it.B }, it.R + 9);
  } else if (it.kind === 'track') {   // oval: whoop straight, jump straight, a banked berm at each end
    const S = it.S, R = it.R, A = place(it.x, it.z, H, -S / 2, -R), J = place(it.x, it.z, H, S / 2, R);
    add({ type: 'whoops', x: A.x, z: A.z, h: H, L: S, W: 12, lam: it.lam, A: it.A }, S + 12);
    add({ type: 'jump', x: J.x, z: J.z, h: H + Math.PI, H: it.H, W: 20 }, tableLengths(it.H).total + 20);   // the other straight, driven the other way
    for (const [s, d] of [[S / 2, H], [-S / 2, H + Math.PI]]) { const c = place(it.x, it.z, H, s, 0); add({ type: 'berm', x: c.x, z: c.z, R: R + 4, dir: d, span: 1.7, B: it.B }, R + 13); }
  }
  return out;
}

/** every plan item's footprint, for the checks (centre points along its length) */
export function footprint(it) {
  if (WILD_KINDS.includes(it.kind)) return wildFootprint(it);
  const pts = [];
  for (const p of primitivesOf(it)) {
    if (p.type === 'berm') {
      const steps = Math.ceil(2 * p.span * (p.R + 9) / 12);
      for (let i = 0; i <= steps; i++) {
        const angle = p.dir - p.span + 2 * p.span * i / steps;
        for (const radius of [p.R - 12, p.R, p.R + 9]) pts.push(place(p.x, p.z, angle, radius, 0));
      }
    } else {
      const length = p.type === 'jump' ? tableLengths(p.H).total : p.L;
      const steps = Math.ceil(length / 12);
      for (let i = 0; i <= steps; i++) {
        for (const t of [-p.W / 2, 0, p.W / 2]) pts.push(place(p.x, p.z, p.h, length * i / steps, t));
      }
    }
  }
  return pts;
}

// ---- planning: spots beside the roads ----
/** roads: [{ kind, pts: [[x, z], ...] }]; returns { items: [...], trails: [{ name, kind: 'dirt', pts }] } */
export function planFeatures(roads, okSpot = () => true, okWild = okSpot) {   // okWild: the (looser) ground test for the trail kinds, which can climb and wind over some slope
  const items = [], trails = [];
  roads.forEach((road, ri) => {
    if (!road.pts || road.pts.length < 2 || road.kind === 'ramp') return;
    const pts = road.pts, line = roadStations(pts); let carried = hash(ri, 3) * FEATURE.spacing * 0.7, n = 0;
    for (let i = 0; i < pts.length - 1 && n < FEATURE.maxPerRoad; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 1) continue;
      const tx = (bx - ax) / len, tz = (bz - az) / len; let at = 0;
      while (carried + (len - at) >= FEATURE.spacing && n < FEATURE.maxPerRoad) {
        at += FEATURE.spacing - carried; carried = 0;
        const px = ax + tx * at, pz = az + tz * at, k = ri * 1009 + n * 31 + i, r = hash(k, 1), side = hash(k, 2) < 0.5 ? -1 : 1, off = 45 + hash(k, 3) * 150;
        const nx = -tz * side, nz = tx * side, along = Math.atan2(tx, tz) + (hash(k, 4) < 0.5 ? 0 : Math.PI);
        const x = px + nx * off, z = pz + nz * off; n++;
        let it = null, wild = null;
        if (r < 0.26) it = { kind: 'whoops', x, z, h: along, L: 70 + hash(k, 5) * 90, W: 13, lam: 15 + hash(k, 6) * 4, A: 0.28 + hash(k, 7) * 0.2 };
        else if (r < 0.44) it = { kind: 'jump', x, z, h: along, H: 1 + hash(k, 5) * 0.65, W: 20 };
        else if (r < 0.56) it = { kind: 'berms', x, z, h: along, R: 24 + hash(k, 5) * 14, B: 1.0 + hash(k, 6) * 0.7 };
        else if (r < 0.66) { const far = 90 + hash(k, 8) * 200; it = { kind: 'whoops', x: px + nx * far, z: pz + nz * far, h: along + Math.PI / 2, L: 60 + hash(k, 5) * 60, W: 13, lam: 16, A: 0.26 + hash(k, 6) * 0.18 }; }
        else if (r >= 0.72) { wild = planWild(r < 0.78 ? 'ford' : r < 0.84 ? 'climb' : r < 0.95 ? 'forest' : 'river', px, pz, nx, nz, tx, tz, k); it = wild.item; }
        else { const far = 220 + hash(k, 8) * 260; it = { kind: 'track', x: px + nx * far, z: pz + nz * far, h: along + (hash(k, 9) - 0.5) * 1.2, S: 90 + hash(k, 5) * 50, R: 24 + hash(k, 6) * 6, B: 1.3 + hash(k, 7) * 0.5, lam: 16, A: 0.3 + hash(k, 10) * 0.18, H: 1.15 + hash(k, 11) * 0.4 }; }
        if (!it || !footprint(it).every(p => (wild && !p.creek ? okWild : okSpot)(p.x, p.z))) continue;
        if (wild) { items.push(Object.assign(it, { id: items.length })); const entry = line.at(line.distance[i] + at - 60);
          trails.push({ ...wild.trail, parentRoad: ri, pavedEnds: [0], pts: [[entry.x, entry.z], ...wild.trail.pts.slice(1)] }); continue; }
        it.id = items.length;
        items.push(it);
        if (it.kind === 'track' || hash(k, 12) < 0.3) {   // a dirt trail from the road to it
          const m = place(px, pz, Math.atan2(nx, nz), off * 0.5, hash(k, 13) * 20 - 10);
          const dx = it.x - m.x, dz = it.z - m.z, dl = Math.hypot(dx, dz) || 1, stop = it.kind === 'track' ? 70 : 28, e = dl > stop + 40 ? [it.x - dx / dl * stop, it.z - dz / dl * stop] : [it.x, it.z];   // the trail ends at the feature's edge
          const entry = line.at(line.distance[i] + at - Math.min(100, off));
          trails.push({ parentRoad: ri, pavedEnds: [0], name: it.kind === 'track' ? 'Dirt track trail' : 'Dirt spur', kind: 'dirt', pts: [[entry.x, entry.z], [m.x, m.z], e] });
        }
      }
      carried += len - at;
    }
  });
  return { items, trails };
}

// ---- right beside the highways ----
/**
 * roadside play strips along the paved roads: a whoop strip or a single jump just off the shoulder, running parallel to the road, with a short dirt spur from the road.
 * They are close and frequent (every 250-500 m) so there is always something to hop on while you travel. roads: [{ kind, pts: [[x, z], ...] }]
 */
export function planHighwayFeatures(roads, okSpot = () => true, firstId = 0) {
  const items = [], trails = [];
  roads.forEach((road, ri) => {
    if (!road.pts || road.pts.length < 2 || road.kind === 'ramp' || road.kind === 'dirt') return;
    const pts = road.pts, line = roadStations(pts); let carried = hash(ri, 41) * 300, n = 0;
    for (let i = 0; i < pts.length - 1 && n < 140; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 1) continue;
      const tx = (bx - ax) / len, tz = (bz - az) / len; let at = 0;
      while (carried + (len - at) >= HWY_SPACING && n < 140) {
        at += HWY_SPACING - carried; carried = 0;
        const px = ax + tx * at, pz = az + tz * at, k = ri * 4099 + n * 37 + i, side = hash(k, 2) < 0.5 ? -1 : 1, nx = -tz * side, nz = tx * side;
        carried = hash(k, 7) * 220; n++;
        const off = 24 + hash(k, 3) * 18, x = px + nx * off, z = pz + nz * off, h = Math.atan2(tx, tz) + (hash(k, 4) < 0.5 ? 0 : Math.PI), r = hash(k, 1);
        const it = r < 0.55 ? { kind: 'whoops', x, z, h, L: 45 + hash(k, 5) * 40, W: 12, lam: 15 + hash(k, 6) * 4, A: 0.24 + hash(k, 8) * 0.18 }
          : { kind: 'jump', x, z, h, H: 0.9 + hash(k, 5) * 0.55, W: 20 };
        if (!footprint(it).every(p => okSpot(p.x, p.z))) continue;
        const direction = Math.cos(h - Math.atan2(tx, tz)) > 0 ? 1 : -1;
        const length = it.L ?? tableLengths(it.H).total;
        const station = line.distance[i] + at;
        if (station < 85 + (direction < 0 ? length : 0) || line.length - station < 85 + (direction > 0 ? length : 0)) continue;
        const entry = line.at(station - direction * 85), exit = line.at(station + direction * (length + 85));
        if (![entry, exit].every(p => okSpot(p.x, p.z))) continue;
        it.id = firstId + items.length; it.roadside = true; items.push(it);
        trails.push({ name: 'Roadside dirt loop', kind: 'dirt', parentRoad: ri, pavedEnds: [0, 1],
          pts: [[entry.x, entry.z], [x, z], [x + tx * direction * length, z + tz * direction * length], [exit.x, exit.z]] });
      }
      carried += len - at;
    }
  });
  return { items, trails };
}
const HWY_SPACING = 420;

// ---- the height field ----
/**
 * index the plan's primitives (dropping any that fail `ok`) and return { heightAt, waterDepthAt, trunksNear, trees, creeks, count }.
 * baseH(x, z) = the ground height without any feature (creek water levels are set from it); only needed for creeks.
 */
export function buildField(items, ok = () => true, baseH = () => 0, okWild = ok) {
  const C = FEATURE.cell, cells = new Map(), cutCells = new Map(), trees = [], creeks = [], decks = [], accepted = [];
  // Reserve crossings before placing race features. A deck forces the ground
  // back to bank height, which would cut a step through an overlapping jump.
  const wild = items.filter(it => WILD_KINDS.includes(it.kind));
  const race = items.filter(it => !WILD_KINDS.includes(it.kind));
  const nearCreek = ({ x, z }) => {
    const nearby = cells.get(Math.floor(z / C) * 100003 + Math.floor(x / C));
    return nearby?.some(p => (p.type === 'seg' || p.type === 'deck') && Math.hypot(x - p.x, z - p.z) <= p.rad + 6);
  };
  for (const it of [...wild, ...race]) {
    const points = footprint(it), isWild = WILD_KINDS.includes(it.kind);
    if (!points.every(p => (isWild && !p.creek ? okWild : ok)(p.x, p.z))) continue;
    if (!isWild && points.some(nearCreek)) continue;
    accepted.push(it);
    if (isWild) { trees.push(...wildTrees(it, okWild)); creeks.push(...creekMeshes(it, baseH)); }
    for (const p of primitivesOf(it, baseH)) {
      // Index the whole footprint plus a 20 m feather, including zero-height
      // troughs and bridge decks. Height alone cannot identify those regions.
      const cutReach = p.rad + 20;
      for (let r = Math.floor((p.z - cutReach) / C); r <= Math.floor((p.z + cutReach) / C); r++) {
        for (let c = Math.floor((p.x - cutReach) / C); c <= Math.floor((p.x + cutReach) / C); c++) {
          const key = r * 100003 + c;
          if (!cutCells.has(key)) cutCells.set(key, []);
          cutCells.get(key).push(p);
        }
      }
      if (p.type === 'deck') decks.push(p);
      const reach = p.rad + (p.type === 'seg' || p.type === 'deck' ? 6 : 0);
      const c0 = Math.floor((p.x - reach) / C), c1 = Math.floor((p.x + reach) / C), r0 = Math.floor((p.z - reach) / C), r1 = Math.floor((p.z + reach) / C);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * 100003 + c; let l = cells.get(k); if (!l) cells.set(k, l = []); l.push(p); }
    }
  }
  const heightAt = (x, z) => {
    const l = cells.get(Math.floor(z / C) * 100003 + Math.floor(x / C)); if (!l) return 0;
    let up = 0, down = 0;
    for (let i = 0; i < l.length; i++) { const p = l[i]; if (Math.abs(x - p.x) > p.rad || Math.abs(z - p.z) > p.rad) continue; if (p.type === 'deck') { if (inDeck(p, x, z)) return 0; continue; } const v = evalPrim(p, x, z); if (v > up) up = v; else if (v < down) down = v; }   // a bridge deck is flush with the banks: the creek bed under it does not count
    return up + down;
  };
  /** 0 throughout a feature / crossing, easing to 1 over 20 m outside it. */
  const roadCutWeight = (x, z) => {
    const nearby = cutCells.get(Math.floor(z / C) * 100003 + Math.floor(x / C));
    let distance = 20;
    for (const p of nearby || []) {
      const dx = x - p.x, dz = z - p.z;
      let d;
      if (p.type === 'seg') {
        const vx = p.bx - p.ax, vz = p.bz - p.az;
        const t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (z - p.az) * vz) / (vx * vx + vz * vz || 1)));
        d = Math.hypot(x - p.ax - vx * t, z - p.az - vz * t) - p.hw * 2.8;
      } else if (p.type === 'hill' || p.type === 'berm') {
        d = Math.hypot(dx, dz) - (p.R + (p.type === 'berm' ? 9 : 2));
      } else {
        const sn = Math.sin(p.h), cs = Math.cos(p.h), s = dx * sn + dz * cs, t = dx * cs - dz * sn;
        const length = p.type === 'whoops' ? p.L : p.type === 'jump' ? tableLengths(p.H).total : p.L;
        const start = p.type === 'deck' ? -length / 2 : 0;
        d = Math.hypot(Math.max(start - s, 0, s - start - length), Math.max(0, Math.abs(t) - p.W / 2));
      }
      distance = Math.min(distance, d);
      if (distance <= 0) return 0;
    }
    return smooth(0, 20, distance);
  };
  /** metres of water over the ground at (x, z) (0 = dry); base = the ground height there without features */
  const waterDepthAt = (x, z, base) => {
    const l = cells.get(Math.floor(z / C) * 100003 + Math.floor(x / C)); if (!l) return 0;
    for (let i = 0; i < l.length; i++) { const p = l[i]; if (p.type === 'deck' && Math.abs(x - p.x) <= p.rad && Math.abs(z - p.z) <= p.rad && inDeck(p, x, z)) return 0; }   // dry on the bridge
    let w = 0; for (let i = 0; i < l.length; i++) { const p = l[i]; if (p.type !== 'seg' || Math.abs(x - p.x) > p.rad || Math.abs(z - p.z) > p.rad) continue; w = Math.max(w, waterOver(p, x, z, base)); }
    return w > 0.03 ? w : 0;
  };
  // trunks: a grid over the trees so the car only checks the few near it
  const TC = 48, tcells = new Map(); trees.forEach((t, i) => { const k = Math.floor(t[1] / TC) * 100003 + Math.floor(t[0] / TC); let l = tcells.get(k); if (!l) tcells.set(k, l = []); l.push(i); });
  const trunksNear = (x, z) => { const out = [], cx = Math.floor(x / TC), cz = Math.floor(z / TC); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const l = tcells.get((cz + dz) * 100003 + cx + dx); if (l) for (const i of l) { const t = trees[i]; if (Math.abs(t[0] - x) < 12 && Math.abs(t[1] - z) < 12) out.push([t[0], t[1], 0.3 * t[2], 999]); } } return out; };
  /** the current at (x, z): { x, z, k } (unit direction and strength 0..1) or null; only in water, never on a bridge */
  const flowAt = (x, z) => {
    const l = cells.get(Math.floor(z / C) * 100003 + Math.floor(x / C)); if (!l) return null;
    let best = null; for (let i = 0; i < l.length; i++) { const p = l[i]; if (p.type !== 'seg' || Math.abs(x - p.x) > p.rad || Math.abs(z - p.z) > p.rad) continue; const f = flowOf(p, x, z); if (f && (!best || f.k > best.k)) best = f; }
    return best;
  };
  return { heightAt, roadCutWeight, waterDepthAt, flowAt, trunksNear, trees, creeks, decks, accepted, count: accepted.length };
}

// ---- on the dirt roads themselves ----
/** whoop sections and road jumps centred on dirt roads. roads: graded roads with pts [{ x, z, tx, tz, s }] and total length; only straight stretches are used. */
export function planRoadFeatures(roads, okSpot = () => true, firstId = 0) {
  const items = [], SP = 220;
  roads.forEach((road, ri) => {
    const pts = road.pts; if (!pts || pts.length < 10 || road.total < 260) return;
    let want = 110 + hash(ri, 21) * SP, n = 0;
    for (let i = 0; i < pts.length - 1 && n < 60; i++) {
      const p = pts[i]; if (p.s < want) continue;
      want = p.s + SP * (0.8 + hash(ri, i, 22) * 0.6);
      if (p.s > road.total - 140) break;
      const k = ri * 7919 + i, r = hash(k, 1), h = Math.atan2(p.tx, p.tz);
      const L = r < 0.62 ? 55 + hash(k, 2) * 55 : 80, end = pts.find(q => q.s >= p.s + L); if (!end) continue;
      if (Math.abs(Math.atan2(Math.sin(Math.atan2(end.tx, end.tz) - h), Math.cos(Math.atan2(end.tx, end.tz) - h))) > 0.18) continue;   // keep to the straights
      const it = r < 0.62 ? { kind: 'whoops', x: p.x, z: p.z, h, L, W: 11, lam: 15 + hash(k, 3) * 4, A: 0.26 + hash(k, 4) * 0.18 }
        : { kind: 'jump', x: p.x, z: p.z, h, H: 1 + hash(k, 3) * 0.5, W: 20 };
      if (!footprint(it).every(q => okSpot(q.x, q.z))) continue;
      it.id = firstId + items.length; it.onRoad = true; items.push(it); n++;
    }
  });
  return items;
}
