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
  return `<div class="dg"><svg viewBox="0 0 200 200">${track}${arc(sp, 'dg-speed')}${o.gear ? `<circle class="dg-track in" cx="100" cy="100" r="68" stroke-dasharray="${(SWEEP * 0.85).toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(135 100 100) scale(1)"/>` : ''}</svg>`
    + `<div class="dg-c"><b>${Math.round(o.mph)}</b><i>MPH</i>${o.gear ? `<em class="${hot ? 'red' : ''}">G${o.gear}</em>` : ''}</div>${o.gear ? `<div class="dg-rev${hot ? ' red' : ''}"><u style="width:${Math.round(Math.min(1, rv) * 100)}%"></u></div>` : ''}</div>`
    + `<div class="dg-side"><div class="dg-fuel${fuelPct < 15 ? ' low' : ''}"><small>FUEL</small><i><b style="width:${fuelPct.toFixed(0)}%"></b></i><em>${Math.round(o.fuel)} L${o.fuelWord ? ' ' + o.fuelWord : ''}</em></div><div class="dg-chips">${chips}</div><div class="dg-foot">${o.foot || ''}</div></div>`;
}
