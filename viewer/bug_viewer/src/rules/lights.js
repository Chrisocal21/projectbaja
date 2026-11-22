// Headlight rules (pure): a vehicle's lights work when its battery and headlights are fitted (the Bug and the El Cajon; the '84 pickup is always whole).
import { isFitted } from './restore.js';
import { VEHICLES } from './vehicles.js';

export const LIGHT_SLOTS = { bug: ['battery', 'headlights'], cajon: ['ecBattery', 'ecHeadlights'] };
const NAMES = { battery: 'battery', ecBattery: 'battery', headlights: 'headlights', ecHeadlights: 'headlights' };

/** { ok, why } for a vehicle definition id ('bug', 'cajon', 'pickup84', ...) and its build */
export function lightsCheck(defId, build) {
  const need = LIGHT_SLOTS[defId]; if (!need) return { ok: true };
  const def = VEHICLES[defId], gone = need.filter(s => !build || !isFitted(def, build, s));
  return gone.length ? { ok: false, why: `The lights do not work: the ${[...new Set(gone.map(s => NAMES[s]))].join(' and ')} ${gone.length > 1 ? 'are' : 'is'} missing.` } : { ok: true };
}

// ---- light modes (L cycles): headlights, and with a light bar fitted, the bar too ----
/** a roof light bar is fitted when the build has one in its lightBar slot */
export const hasLightBar = build => !!(build?.parts?.lightBar || build?.parts?.roofLights);
export const LIGHT_MODES = { off: 'off', head: 'Headlights', both: 'Headlights and light bar', bar: 'Light bar' };
/** the modes you can cycle through: off, headlights, and (with a bar) headlights + bar and bar alone */
export const modesFor = bar => (bar ? ['off', 'head', 'both', 'bar'] : ['off', 'head']);
/** the next mode in the cycle; a mode that is no longer available (the bar was taken off) restarts at headlights */
export function nextMode(mode, bar) { const m = modesFor(bar), i = m.indexOf(mode); return i < 0 ? m[1] : m[(i + 1) % m.length]; }
export const headOn = mode => mode === 'head' || mode === 'both';
export const barOn = mode => mode === 'both' || mode === 'bar';
