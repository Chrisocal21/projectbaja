// The driving HUD as markup (PURE, loads under node): a round speed gauge with a rev ring, a fuel bar, and warning chips. DriveWorld sets it as innerHTML each frame
// only when it changes, so this stays a string builder rather than React (no 60 fps re-render).
const ARC = 2 * Math.PI * 80, SWEEP = ARC * 0.75;   // a 270-degree gauge
const arc = (frac, cls) => `<circle class="${cls}" cx="100" cy="100" r="80" stroke-dasharray="${(SWEEP * Math.max(0, Math.min(1, frac))).toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(135 100 100)"/>`;
const track = `<circle class="dg-track" cx="100" cy="100" r="80" stroke-dasharray="${SWEEP.toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(135 100 100)"/>`;
/** o: { mph, topMph, gear, rpm, redline, fuel, tank, fuelWord, surface, flags: [[text, 'warn'|'bad'|''], ...], foot } */
export function driveHudHtml(o) {
  const sp = o.topMph > 0 ? o.mph / o.topMph : 0, rv = o.gear && o.redline ? o.rpm / o.redline : 0, hot = rv > 0.92;
  const fuelPct = o.tank > 0 ? Math.max(0, Math.min(100, (o.fuel / o.tank) * 100)) : 0;
  const chips = [[o.surface, ''], ...(o.flags || [])].filter(c => c[0]).map(([t, l]) => `<span class="dg-chip ${l || ''}">${t}</span>`).join('');
  const n = String(Math.round(o.mph)).padStart(3, '0'), z = n.match(/^0*/)[0].length >= 3 ? 2 : n.match(/^0*/)[0].length, num = `<s>${n.slice(0, z)}</s>${n.slice(z)}`;   // Forza style: three digits, the leading zeros dimmed
  return `<div class="dg"><svg viewBox="0 0 200 200">${track}${o.gear ? arc(rv, `dg-speed dg-rev${hot ? ' red' : ''}`) : ''}</svg>${o.gear ? `<div class="dg-gear${hot ? ' red' : ''}">${o.gear}</div>` : ''}`
    + `<div class="dg-c"><b>${num}</b><i>MPH</i></div></div>`
    + `<div class="dg-side">${(o.cond || []).length ? `<div class="dg-cond">${o.cond.map(r => `<div class="dg-row ${r.level || ''}"><small>${r.label}</small><i><b style="width:${Math.round(r.frac * 100)}%"></b></i><em>${r.note}</em></div>`).join('')}</div>` : ''}<div class="dg-fuel${fuelPct < 15 ? ' low' : ''}"><small>FUEL</small><i><b style="width:${fuelPct.toFixed(0)}%"></b></i><em>${Math.round(o.fuel)} L${o.fuelWord ? ' ' + o.fuelWord : ''}</em></div><div class="dg-chips">${chips}</div><div class="dg-foot">${o.foot || ''}</div></div>`;
}
