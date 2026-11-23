// The driving HUD as markup (PURE, loads under node): a round speed gauge with a rev ring, a fuel bar, and warning chips. DriveWorld sets it as innerHTML each frame
// only when it changes, so this stays a string builder rather than React (no 60 fps re-render).
const ARC = 2 * Math.PI * 80, SWEEP = ARC * 0.75;   // a 270-degree gauge
const arc = (frac, cls) => `<circle class="${cls}" cx="100" cy="100" r="80" stroke-dasharray="${(SWEEP * Math.max(0, Math.min(1, frac))).toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(135 100 100)"/>`;
const track = `<circle class="dg-track" cx="100" cy="100" r="80" stroke-dasharray="${SWEEP.toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(135 100 100)"/>`;
const ICON = {
  TEMP: 'M12 3v11m0 0a4 4 0 1 0 4 4V6a4 4 0 0 0-8 0v12a4 4 0 0 0 4-4z',
  ENGINE: 'M4 9h3l2-3h7l2 3h2v9H6l-2-3V9zM9 12h6M2 11v5M22 11v5',
  TIRES: 'M7 3h10l2 5v8l-2 5H7l-2-5V8l2-5zM8 7h8M8 12h8M8 17h8',
  SUSPENSION: 'M3 8h4l2-3 3 6 3-6 2 3h4M3 16h4l2 3 3-6 3 6 2-3h4',
  ALIGNMENT: 'M3 5h18M3 19h18M7 3v6m10-6v6M7 15v6m10-6v6M9 12h6',
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const conditions = rows => rows.map(r => `<div class="dg-health-item ${r.level || ''}" title="${esc(`${r.label}: ${r.note}`)}" aria-label="${esc(`${r.label}: ${r.note}`)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[r.label] || ICON.ENGINE}"/></svg><small>${esc(r.label)}</small><b>${esc(r.note)}</b><i><em style="width:${Math.round(Math.max(0, Math.min(1, r.frac)) * 100)}%"></em></i></div>`).join('');
/** o: { mph, topMph, gear, rpm, redline, fuel, tank, fuelWord, surface, flags: [[text, 'warn'|'bad'|''], ...], foot } */
export function driveHudHtml(o) {
  const sp = o.topMph > 0 ? o.mph / o.topMph : 0, rv = o.gear && o.redline ? o.rpm / o.redline : 0, hot = rv > 0.92;
  const fuelPct = o.tank > 0 ? Math.max(0, Math.min(100, (o.fuel / o.tank) * 100)) : 0;
  const chips = [[o.surface, ''], ...(o.flags || [])].filter(c => c[0]).map(([t, l]) => `<span class="dg-chip ${l || ''}">${t}</span>`).join('');
  const n = String(Math.round(o.mph)).padStart(3, '0'), z = n.match(/^0*/)[0].length >= 3 ? 2 : n.match(/^0*/)[0].length, num = `<s>${n.slice(0, z)}</s>${n.slice(z)}`;   // Forza style: three digits, the leading zeros dimmed
  return `<div class="dg"><svg viewBox="0 0 200 200">${track}${o.gear ? arc(rv, `dg-speed dg-rev${hot ? ' red' : ''}`) : ''}</svg>${o.gear ? `<div class="dg-gear${hot ? ' red' : ''}">${o.gear}</div>` : ''}`
    + `<div class="dg-c"><b>${num}</b><i>MPH</i></div></div>`
    + `<div class="dg-side">${(o.cond || []).length ? `<div class="dg-health">${conditions(o.cond)}</div>` : ''}<div class="dg-fuel${fuelPct < 15 ? ' low' : ''}"><small>FUEL</small><i><b style="width:${fuelPct.toFixed(0)}%"></b></i><em>${Math.round(o.fuel)} L${o.fuelWord ? ' ' + o.fuelWord : ''}</em></div><div class="dg-chips">${chips}</div><div class="dg-foot">${o.foot || ''}</div></div>`;
}
