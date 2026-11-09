// Save envelope + migrations (pure: no localStorage, no game state, loads under node).
// Friends must never lose a save to an update: every change to the saved shape is a new migrations[v] step,
// and a save written by NEWER code is kept untouched instead of being read wrongly.
import { seededV } from './stash.js';

export const FORMAT = 'baja-save';
export const CURRENT = 1;

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const maxUid = list => (Array.isArray(list) ? list : []).reduce((m, x) => (x && Number.isFinite(x.uid) && x.uid > m ? x.uid : m), 0);

/** hand out the next unique id for a collection; the counter only ever goes up, and never collides with a live entry */
export function allocUid(counters, key, ...lists) {
  const n = Math.max(counters[key] || 1, ...lists.map(l => maxUid(l) + 1));
  counters[key] = n + 1;
  return n;
}

/** migrations[v](data) -> data at version v+1. Add a new entry whenever the saved shape changes and bump CURRENT. */
export const migrations = {
  0(d) {   // bare blob (before the envelope existed) -> v1
    const o = { ...d };
    const home = isObj(d.home) ? d.home : {};
    // the starter-fixture version is made explicit here (it used to be inferred at runtime), so home.js can trust fixturesV
    o.home = { cleared: [], power: false, letter: false, ...home, fixtures: home.fixtures ?? false, fixturesV: seededV(home), stored: Array.isArray(home.stored) ? home.stored : [] };
    o.mats = { scrap: 0, ...(isObj(d.mats) ? d.mats : {}) };
    o.fleet = isObj(d.fleet) ? d.fleet : { bug: { pose: null } };
    o.items = Array.isArray(d.items) ? d.items : [];
    o.props = Array.isArray(d.props) ? d.props : [];
    o.boxes = isObj(d.boxes) ? d.boxes : {};
    o.owned = Array.isArray(d.owned) ? d.owned : [];
    o.nextUid = { props: Math.max(maxUid(o.props), maxUid(o.home.stored)) + 1, items: maxUid(o.items) + 1 };
    o.job = d.job ?? null; o.fueled = !!d.fueled; o.crates = isObj(d.crates) ? d.crates : {};
    o.onFoot = typeof d.onFoot === 'boolean' ? d.onFoot : null; o.walkPose = d.walkPose ?? null;
    return o;
  },
};

export const wrap = (data, now = Date.now()) => ({ format: FORMAT, version: CURRENT, savedAt: now, slot: 'main', data });

/**
 * Read a raw localStorage string.
 *  status 'empty'   nothing saved
 *         'corrupt' not JSON / not a save: caller must stash `raw` and never overwrite
 *         'newer'   written by newer code: caller must keep it and not write
 *         'ok'      data is current; `from` is the version it was stored at (migrated if from < CURRENT)
 */
export function parseSave(raw) {
  if (raw == null || raw === '') return { status: 'empty', data: {}, from: CURRENT };
  let j; try { j = JSON.parse(raw); } catch { return { status: 'corrupt', data: {}, from: null }; }
  if (!isObj(j)) return { status: 'corrupt', data: {}, from: null };
  let version = 0, data = j;
  if (j.format === FORMAT) {
    if (!Number.isInteger(j.version) || j.version < 0 || !isObj(j.data)) return { status: 'corrupt', data: {}, from: null };
    version = j.version; data = j.data;
  }
  if (version > CURRENT) return { status: 'newer', data: {}, from: version };
  const from = version;
  try { while (version < CURRENT) { const m = migrations[version]; if (!m) return { status: 'corrupt', data: {}, from }; data = m(data); version++; } }
  catch { return { status: 'corrupt', data: {}, from }; }
  return { status: 'ok', data, from };
}

export const validPose = p => isObj(p) && ['x', 'z'].every(k => Number.isFinite(p[k]) && Math.abs(p[k]) < 20000) && (p.yaw === undefined || Number.isFinite(p.yaw)) && (p.y === undefined || Number.isFinite(p.y));
const validCarPose = p => isObj(p) && ['x', 'z', 'h'].every(k => Number.isFinite(p[k]) && Math.abs(p[k]) < 20000);

/** a saved job is kept only if it has a known id (isKnown) and a real spot; otherwise the player just gets a fresh customer later */
export const sanitizeJob = (j, isKnown = () => true) => (isObj(j) && typeof j.id === 'string' && isKnown(j.id) && Number.isFinite(j.x) && Number.isFinite(j.z) && Number.isFinite(j.h ?? 0) ? { ...j, h: j.h ?? 0 } : null);
/** crate respawn timers: keep only numbers still in the future (they are Date.now() deadlines) */
export const sanitizeCrates = (c, now = Date.now()) => Object.fromEntries(Object.entries(isObj(c) ? c : {}).filter(([, t]) => Number.isFinite(t) && t > now));

/** where the player resumes: on foot at the saved pose, or in the car; anything invalid falls back to beside the car */
export function resumePlan(data, carPose) {
  if (data.onFoot === true && validPose(data.walkPose) && Number.isFinite(data.walkPose.yaw)) return { onFoot: true, walkPose: { ...data.walkPose } };
  if (data.onFoot === false && validCarPose(carPose)) return { onFoot: false, walkPose: null };
  return null;   // caller uses the default: on foot beside the car
}
