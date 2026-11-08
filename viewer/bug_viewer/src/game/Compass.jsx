// HUD "halo" compass: a slim heading band, top centre. Shows while walking/driving (hidden when a menu or the map pauses the game).
// PROPOSAL: discovered places (on its pad or the road in front, pad radius + 25 m, Walt's Garage from the start) get a marker with name + distance.
import React, { useEffect, useState } from 'react';
import { game, save } from './store.js';
import { SITES } from '../worlds/county.js';
import { LABELS } from './MapPanel.jsx';
import { bearingOf, bearingFromYaw, compassPoint, bearingTo, relative, discovered, newlyDiscovered, norm } from './compass.js';

const W = 560, SPAN = 120, PX = W / SPAN;   // band width, degrees visible, pixels per degree
const PLACES = Object.keys(LABELS).map(id => ({ id, x: SITES[id].x, z: SITES[id].z, r: SITES[id].r }));
const headingNow = () => game.onFoot ? bearingOf(game.face.x, game.face.z) : bearingFromYaw(game.pose?.h || 0);
const txt = { position: 'absolute', transform: 'translateX(-50%)', font: '700 12px/1 var(--hud-cond)', letterSpacing: '0.12em', textShadow: '0 2px 6px #000' };

export default function Compass() {
  const [, tick] = useState(0);
  useEffect(() => {
    let raf, last = 0;
    const loop = t => {
      raf = requestAnimationFrame(loop);
      if (t - last < 60) return; last = t;
      if (!game.paused) { const found = newlyDiscovered(game.home, game.pos.x, game.pos.z, PLACES); if (found.length) { game.home = { ...game.home, discovered: [...(game.home.discovered || []), ...found] }; save(); } }
      tick(n => n + 1);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  if (game.paused) return null;
  const hd = headingNow(), known = discovered(game.home), px = d => W / 2 + relative(hd, d) * PX;
  const ticks = []; for (let d = 0; d < 360; d += 15) if (Math.abs(relative(hd, d)) < SPAN / 2) ticks.push(d);
  return <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: W, height: 46, pointerEvents: 'none', color: 'var(--hud-text)', background: 'var(--hud-bg)', border: '1px solid var(--hud-line)', overflow: 'hidden', zIndex: 5, WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)' }}>
    {ticks.map(d => { const card = d % 45 === 0; return <React.Fragment key={d}>
      <i style={{ position: 'absolute', left: px(d), top: card ? 4 : 8, width: 1, height: card ? 9 : 5, background: card ? 'var(--hud-text)' : 'var(--hud-dim)' }} />
      {card && <span style={{ ...txt, left: px(d), top: 16, color: d % 90 === 0 ? 'var(--hud-acc)' : 'var(--hud-text)', fontSize: d % 90 === 0 ? 15 : 12 }}>{compassPoint(d)}</span>}
    </React.Fragment>; })}
    {PLACES.filter(p => known.has(p.id)).map(p => { const b = bearingTo(game.pos.x, game.pos.z, p.x, p.z); if (Math.abs(relative(hd, b)) > SPAN / 2) return null; const m = Math.hypot(p.x - game.pos.x, p.z - game.pos.z);
      return <span key={p.id} style={{ ...txt, left: px(b), top: 31, color: 'var(--hud-ok)', fontSize: 10, whiteSpace: 'nowrap' }}>{'◆'} {LABELS[p.id]} {m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m / 10) * 10 + ' m'}</span>; })}
    <span style={{ ...txt, left: W / 2 + 22, top: 4, color: 'var(--hud-acc)' }}>{Math.round(norm(hd)) % 360}°</span>
    <i style={{ position: 'absolute', left: W / 2 - 4, top: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid var(--hud-acc)' }} />
  </div>;
}
