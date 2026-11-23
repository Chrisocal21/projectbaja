// The vehicle condition readout (PURE, loads under node): what the driver can see at a glance, from numbers the game already keeps.
// Only real systems: the Bug is air-cooled, so there is no coolant, and there is no oil system yet, so neither is shown (do not fake them).
import { flatCorners, worstShock } from '../wear.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lvl = health => (health < 0.35 ? 'bad' : health < 0.65 ? 'warn' : '');
/** o: { temp (C), damage 0..1, wear (wear.js numbers), psi }. -> [{ label, frac 0..1 (how full the bar is), note, level: ''|'warn'|'bad' }] */
export function condRows({ temp = 70, damage = 0, wear, psi = 30 }) {
  const w = wear || {}, hot = temp > 110, flats = flatCorners(w).length;
  const eng = 1 - clamp(Math.max(w.engine || 0, damage || 0)), tire = 1 - clamp(flats ? Math.max(w.tires || 0, 0.6) : w.tires || 0), sus = 1 - clamp(Math.max(w.shocks || 0, worstShock(w))), ali = 1 - clamp(w.align || 0);
  return [
    { label: 'TEMP', frac: clamp((temp - 70) / 80), note: `${Math.round(temp)}°C`, level: temp >= 120 ? 'bad' : hot ? 'warn' : '' },
    { label: 'ENGINE', frac: eng, note: `${Math.round(eng * 100)}%`, level: lvl(eng) },
    { label: 'TIRES', frac: tire, note: `${flats ? flats + ' FLAT · ' : ''}${Math.round(psi)} PSI`, level: flats ? 'bad' : lvl(tire) },
    { label: 'SUSPENSION', frac: sus, note: `${Math.round(sus * 100)}%`, level: lvl(sus) },
    { label: 'ALIGNMENT', frac: ali, note: `${Math.round(ali * 100)}%`, level: lvl(ali) },
  ];
}
