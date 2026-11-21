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
