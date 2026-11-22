// Water, trees and hills for the off-road features (see offroadFeatures.js, which places them beside the roads and indexes them):
//   ford     a dirt trail with a creek running across it (water a little over the tyres)
//   river    a long winding river beside a road, with a trail that fords it at a shallow stretch
//   forest   a slow, winding trail enclosed by trees on both sides, with creek crossings
//   climb    a dirt trail straight up and over a big hill
// Pure and deterministic. A creek is a trench carved into the ground (negative height) with a water surface at a level a little below the banks; a hill is a smooth dome.
// Heading convention is the game's: angle 0 faces +z, positive turns toward +x.

const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const WILD_KINDS = ['ford', 'climb', 'forest', 'river'];
export const WATER_NAME = { ford: 'Creek crossing trail', climb: 'Hill climb trail', forest: 'Forest trail', river: 'River ford trail' };

/** a winding polyline from (x0, z0) heading `ang`, a point every `step` m, swinging side to side by `amp` */
function windingPath(x0, z0, ang, len, amp, k, step = 24) {
  const sn = Math.sin(ang), cs = Math.cos(ang), ph = hash(k, 91) * 6.28, wl = 90 + hash(k, 92) * 80, out = [];
  for (let s = 0; s <= len + 1e-6; s += step) { const w = amp * Math.sin(s / wl + ph) * smooth(0, 60, s); out.push([x0 + sn * s + cs * w, z0 + cs * s - sn * w]); }
  return out;
}
const along = (path, s) => {   // the point and heading `s` metres along a polyline
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], l = Math.hypot(bx - ax, bz - az); if (acc + l >= s || i === path.length - 2) { const t = Math.max(0, Math.min(1, (s - acc) / (l || 1))); return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / (l || 1), tz: (bz - az) / (l || 1) }; } acc += l; }
  return { x: path[0][0], z: path[0][1], tx: 0, tz: 1 };
};
const pathLen = path => path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);
/** a plank bridge where the trail crosses at `s`: centre and the trail's heading */
const deckAt = (path, s) => { const c = along(path, s); return { x: c.x, z: c.z, h: Math.atan2(c.tx, c.tz) }; };
/** is (x, z) on a bridge deck (a strip 4.8 m wide along the trail across the creek)? */
export const inDeck = (d, x, z) => { const dx = x - d.x, dz = z - d.z, sn = Math.sin(d.h), cs = Math.cos(d.h), s = dx * sn + dz * cs, t = dx * cs - dz * sn; return Math.abs(s) < d.L / 2 && Math.abs(t) < d.W / 2; };
/** a creek across a trail at `s`: three points either side, a slight bend, `len` m long */
function creekAcross(path, s, len, k) {
  const c = along(path, s), px = -c.tz, pz = c.tx, bend = (hash(k, 93) - 0.5) * 9;
  return [[c.x - px * len / 2, c.z - pz * len / 2], [c.x + c.tx * bend, c.z + c.tz * bend], [c.x + px * len / 2, c.z + pz * len / 2]];
}

/** one wild item planned from an anchor point on a road: { item, trail } (trail = the dirt road that reaches it). (nx, nz) points away from the road, (tx, tz) along it. */
export function planWild(kind, px, pz, nx, nz, tx, tz, k) {
  const out = Math.atan2(nx, nz);
  let path, creeks = [], hill = null, shallow = null;
  if (kind === 'ford') {
    path = windingPath(px, pz, out, 150 + hash(k, 1) * 110, 14, k);
    creeks = [{ pts: creekAcross(path, pathLen(path) * 0.55, 46, k), hw: 3.2 + hash(k, 2) * 2, D: 0.6 + hash(k, 3) * 0.35, shallow: null, deck: hash(k, 31) < 0.4 ? deckAt(path, pathLen(path) * 0.55) : null }];
  } else if (kind === 'forest') {
    path = windingPath(px, pz, out, 340 + hash(k, 1) * 190, 22, k);
    const L = pathLen(path), at = hash(k, 4) < 0.5 ? [0.38] : [0.3, 0.7];
    creeks = at.map((f, i) => ({ pts: creekAcross(path, L * f, 40, k + i), hw: 2.6 + hash(k, 5 + i) * 1.6, D: 0.5 + hash(k, 7 + i) * 0.3, shallow: null, deck: hash(k, 32 + i) < 0.55 ? deckAt(path, L * f) : null }));
  } else if (kind === 'climb') {
    const R = 62 + hash(k, 1) * 26, H = 9 + hash(k, 2) * 7, off = 90 + R * 0.5;
    hill = { x: px + nx * off, z: pz + nz * off, H, R };
    path = [[px, pz], [px + nx * off * 0.5, pz + nz * off * 0.5], [hill.x, hill.z], [hill.x + nx * (R + 45), hill.z + nz * (R + 45)]];
  } else {   // river: runs beside the road, a trail goes out and fords it
    const dist = 170 + hash(k, 1) * 110, rx = px + nx * dist, rz = pz + nz * dist, ang = Math.atan2(tx, tz), half = 520 + hash(k, 2) * 260;
    const p0 = [rx - tx * half, rz - tz * half], riv = windingPath(p0[0], p0[1], ang, half * 2, 55, k + 5, 30);
    const mid = riv[Math.floor(riv.length / 2)];
    path = [[px, pz], [(px + mid[0]) / 2, (pz + mid[1]) / 2], mid, [mid[0] + nx * 70, mid[1] + nz * 70]];
    const L = pathLen(riv);
    creeks = [{ pts: riv, hw: 6 + hash(k, 3) * 3, D: 1.1 + hash(k, 4) * 0.5, shallow: [L / 2 - 36, L / 2 + 36] }];
  }
  const first = path[0], last = path[path.length - 1], mid = along(path, pathLen(path) / 2);
  return {
    item: { kind, x: mid.x, z: mid.z, h: Math.atan2(last[0] - first[0], last[1] - first[1]), path, creeks, hill, start: first },
    trail: { name: WATER_NAME[kind], kind: 'dirt', pts: path },
  };
}

/** points to test (water, steepness, paved roads, built places) before the item is kept */
export function wildFootprint(it) {
  const pts = [], L = pathLen(it.path);
  for (let s = 40; s <= L; s += 60) { const p = along(it.path, s); pts.push({ x: p.x, z: p.z }); }
  for (const c of it.creeks) if (it.kind !== 'river') for (const q of c.pts) pts.push({ x: q[0], z: q[1], creek: true });   // creek points keep the strict flat-ground test
  if (it.hill) pts.push({ x: it.hill.x, z: it.hill.z }, { x: it.hill.x + it.hill.R * 0.6, z: it.hill.z }, { x: it.hill.x - it.hill.R * 0.6, z: it.hill.z });
  return pts;
}

// ---- primitives: creek segments and hills (the field indexes them) ----
/** creek segments carry their own water level (a little below the bank at their ends), so the water follows a slope */
/** the depth factor along a creek (1 = full): shallower through a ford, smoothly */
const depthFactor = c => sAlong => (c.shallow ? 1 - 0.58 * smooth(c.shallow[0] - 30, c.shallow[0], sAlong) * (1 - smooth(c.shallow[1], c.shallow[1] + 30, sAlong)) : 1);
export function wildPrimitives(it, baseH) {
  const out = [];
  it.creeks.forEach(c => {
    const pts = c.pts, lv = pts.map(q => baseH(q[0], q[1]));
    const kAt = depthFactor(c);
    if (c.deck) out.push({ type: 'deck', x: c.deck.x, z: c.deck.z, h: c.deck.h, W: 4.8, L: c.hw * 2.6 * 2 + 4, rad: c.hw * 2.6 + 6 });
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), Da = c.D * kAt(acc), Db = c.D * kAt(acc + l);
      out.push({ type: 'seg', x: (ax + bx) / 2, z: (az + bz) / 2, ax, az, bx, bz, hw: c.hw, Da, Db, wlA: lv[i] - Da * 0.3, wlB: lv[i + 1] - Db * 0.3, rad: l / 2 + c.hw * 2.8 });
      acc += l;
    }
  });
  if (it.hill) out.push({ type: 'hill', x: it.hill.x, z: it.hill.z, H: it.hill.H, R: it.hill.R, rad: it.hill.R + 2 });
  return out;
}
const segNear = (p, x, z) => {   // distance to the segment and the position along it (0..1)
  const dx = p.bx - p.ax, dz = p.bz - p.az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (z - p.az) * dz) / l2));
  return { d: Math.hypot(p.ax + dx * t - x, p.az + dz * t - z), t };
};
/** the change this wild primitive makes to the ground at (x, z): negative for a creek bed, positive for a hill */
export function evalWild(p, x, z) {
  if (p.type === 'hill') { const r = Math.hypot(x - p.x, z - p.z); if (r >= p.R) return 0; return p.H * (1 - smooth(0, 1, r / p.R)) * (1 + 0.1 * Math.sin(x * 0.07 + z * 0.05)); }
  const { d, t } = segNear(p, x, z); if (d > p.hw * 2.6) return 0;
  return -(p.Da + (p.Db - p.Da) * t) * (1 - smooth(p.hw * 0.4, p.hw * 2.6, d));
}
/** the current at (x, z) over a creek segment: the direction it flows and a strength 0..1 (rivers flow harder than creeks), or null when not in the channel */
export function flowOf(p, x, z) {
  if (p.type !== 'seg') return null;
  const { d } = segNear(p, x, z); if (d > p.hw * 1.3) return null;
  const dx = p.bx - p.ax, dz = p.bz - p.az, l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l, k: 0.3 + 0.7 * smooth(4, 7.5, p.hw) };
}
/** how deep the water is at (x, z) over a creek segment, given the ground height without features (0 = dry) */
export function waterOver(p, x, z, baseH) {
  if (p.type !== 'seg') return 0;
  const { d, t } = segNear(p, x, z); if (d > p.hw * 2.6) return 0;
  const bed = baseH - (p.Da + (p.Db - p.Da) * t) * (1 - smooth(p.hw * 0.4, p.hw * 2.6, d)), wl = p.wlA + (p.wlB - p.wlA) * t;
  return Math.max(0, wl - bed);
}
/** the water surface to draw: per creek, points [x, z, level] */
export function creekMeshes(it, baseH) {
  return it.creeks.map(c => ({ hw: c.hw, pts: (() => { const kf = depthFactor(c); let acc = 0; return c.pts.map((q, i) => { if (i) acc += Math.hypot(q[0] - c.pts[i - 1][0], q[1] - c.pts[i - 1][1]); return [q[0], q[1], baseH(q[0], q[1]) - c.D * kf(acc) * 0.3]; }); })() }));
}

// ---- trees ----
/** trees for a forest trail (both sides, close) or along a river's banks (scattered), away from the water and the trail itself */
export function wildTrees(it, ok) {
  const out = [], creekPts = it.creeks.flatMap(c => c.pts.map(q => ({ x: q[0], z: q[1], hw: c.hw })));
  const nearWater = (x, z) => creekPts.some(c => Math.hypot(x - c.x, z - c.z) < c.hw * 2.4 + 4);
  if (it.kind === 'forest') {
    const L = pathLen(it.path);
    for (let s = 12; s < L; s += 5.2) {
      const c = along(it.path, s), px = -c.tz, pz = c.tx;
      for (const side of [-1, 1]) for (let n = 0; n < 2; n++) {
        const kk = Math.round(s * 7) + side * 13 + n * 5;
        if (hash(kk, 11) < 0.22) continue;
        const off = 4.3 + hash(kk, 12) * 8, x = c.x + px * side * off, z = c.z + pz * side * off;
        if (nearWater(x, z) || !ok(x, z)) continue;
        out.push([x, z, 0.8 + hash(kk, 13) * 0.55, hash(kk, 14) * 6.28, hash(kk, 15) < 0.7 ? 0 : 1]);
      }
    }
  } else if (it.kind === 'river') {
    const riv = it.creeks[0], L = pathLen(riv.pts);
    for (let s = 10; s < L; s += 11) {
      const c = along(riv.pts, s), px = -c.tz, pz = c.tx;
      for (const side of [-1, 1]) {
        const kk = Math.round(s * 3) + side * 7;
        if (hash(kk, 21) < 0.45) continue;
        const off = riv.hw * 1.9 + 3 + hash(kk, 22) * 9, x = c.x + px * side * off, z = c.z + pz * side * off;
        if (!ok(x, z) || Math.hypot(x - it.path[2][0], z - it.path[2][1]) < 24) continue;   // keep the ford open
        out.push([x, z, 0.9 + hash(kk, 23) * 0.6, hash(kk, 24) * 6.28, 1]);
      }
    }
  }
  return out;
}
