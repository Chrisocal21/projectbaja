// Building a blueprint by hand (rules: game/blueprints.js). E at the blueprint puts in the materials you have; holding left click with the
// right tool works it through its stages (main.jsx starts it on mouse down, stops it on mouse up, like finishWork.js). Progress is kept on the prop.
import { game, save, say } from './store.js';
import { toolInHand, TOOLS } from './items.js';
import { buildById } from './home.js';
import { BLUEPRINTS, feed, work, needText, stageOf, missing, fedFrac, matsText } from './blueprints.js';

const nameOf = p => (buildById[p.id]?.name || p.id).replace(/ \(.*\)/, '').toLowerCase();
const bpProp = uid => game.props.find(q => q.uid === uid && q.bp);
const setProp = (uid, patch) => { game.props = game.props.map(q => (q.uid === uid ? { ...q, ...patch } : q)); };
const toolName = id => (TOOLS[id]?.name || id).toLowerCase();
const hasTool = b => !b.tool || toolInHand()?.id === b.tool;
const haveAny = miss => Object.keys(miss).some(m => (game.mats?.[m] || 0) > 0);

/** the line under the crosshair at a blueprint */
export function bpPrompt(uid) {
  const p = bpProp(uid); if (!p) return '';
  const b = BLUEPRINTS[p.id], miss = missing(p.bp, p.id), short = Object.keys(miss).length > 0, canWork = fedFrac(p.bp, p.id) > (p.bp.work || 0) + 1e-6;
  const pct = Math.round((p.bp.work || 0) * 100), parts = [];
  if (short && haveAny(miss)) parts.push(`Press E — Put in materials (${needText(p.bp, p.id)})`);
  if (canWork) parts.push(hasTool(b) ? `Hold left click — ${stageOf(p.bp, p.id)} (${pct}%)` : `Hold the ${toolName(b.tool)} to build it (${pct}%)`);
  if (!parts.length) parts.push(`Blueprint: ${nameOf(p)} · needs ${needText(p.bp, p.id)} (you have none of it)`);
  return parts.join('  ·  ') + '  ·  V — Move it';
}

/** E: put in what you have toward what it still needs */
export function feedBlueprint(uid) {
  const p = bpProp(uid); if (!p) return;
  const r = feed(p.bp, p.id, game.mats || {});
  if (!r.n) return say(Object.keys(missing(p.bp, p.id)).length ? `You have none of what it still needs: ${needText(p.bp, p.id)}. Salvage junk, search toolboxes and the yard, or buy it at Dusty\'s or on the phone.` : 'Everything is in. Hold left click with the wrench to build it.');
  const mats = { ...game.mats }; for (const [m, n] of Object.entries(r.used)) mats[m] = (mats[m] || 0) - n;
  game.mats = mats; setProp(uid, { bp: r.bp }); save();
  const left = Object.keys(missing(r.bp, p.id)).length;
  say(`Put in ${matsText(r.used)}. ${left ? `Still short ${matsText(missing(r.bp, p.id))}; you can start on it now.` : `That's everything: hold left click with the ${toolName(BLUEPRINTS[p.id].tool)} to build it.`}`);
}

let timer = 0, last = 0;
/** hold left click: work the aimed blueprint. Returns true if it took the click. */
export function startBpWork(uid) {
  stopBpWork(false);
  const p = bpProp(uid); if (!p) return false;
  const b = BLUEPRINTS[p.id];
  if (!hasTool(b)) { say(`You need the ${toolName(b.tool)} in your hands for this (it's in your pack: Tab).`); return true; }
  const first = work(p.bp, p.id, 0.001); if (!first.ok) { say(first.why); return true; }
  last = performance.now(); game.holdBar = { t0: last, dur: 1e9, label: `${stageOf(p.bp, p.id)}…`, frac: p.bp.work || 0, work: true };
  timer = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (game.target !== 'bp:' + uid) return;   // looked away: nothing happens until you look back
    const q = bpProp(uid); if (!q) { stopBpWork(true); return; }
    const r = work(q.bp, q.id, dt);
    if (!r.ok) { say(r.why); stopBpWork(true); return; }
    if (r.done) { finish(q); return; }
    setProp(uid, { bp: r.bp });
    if (game.holdBar) { game.holdBar.frac = r.bp.work; game.holdBar.label = `${stageOf(r.bp, q.id)}…`; }
  }, 90);
  return true;
}
function finish(p) {
  stopBpWork(false);
  game.props = game.props.map(q => { if (q.uid !== p.uid) return q; const { bp, ...rest } = q; return { ...rest, made: { ...BLUEPRINTS[q.id].mats }, paid: 0 }; });
  game.propsV = (game.propsV || 0) + 1; save();
  say(`Built: ${nameOf(p)}. It works like any other now; taking it down gives back ${matsText(BLUEPRINTS[p.id].mats)}.`);
}
export function stopBpWork(persist = true) {
  if (!timer) return; clearInterval(timer); timer = 0;
  if (game.holdBar?.work) game.holdBar = null;
  if (persist) save();
}
