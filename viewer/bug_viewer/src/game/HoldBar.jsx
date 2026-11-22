// The fill bar for click-and-hold actions (bolt a part on, take one off). main.jsx sets game.holdBar = { t0, dur, label }; this draws it under the crosshair
// and fills it over `dur`. Release early and main.jsx clears holdBar: nothing happens. Self-contained styling so it needs no CSS file.
import React, { useEffect, useState } from 'react';
import { game } from './store.js';

export default function HoldBar() {
  const [p, setP] = useState(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { const h = game.holdBar; setP(h ? { f: h.frac != null ? h.frac : Math.min(1, (performance.now() - h.t0) / h.dur), label: h.label } : null); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, []);
  if (!p) return null;
  return <div style={{ position: 'fixed', left: '50%', top: '58%', transform: 'translateX(-50%)', width: 220, zIndex: 20, pointerEvents: 'none', font: '700 13px system-ui,sans-serif', color: '#f3e9c8', textAlign: 'center', textShadow: '0 1px 3px #000' }}>
    <div style={{ marginBottom: 5 }}>{p.label}</div>
    <div style={{ height: 10, background: 'rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.5)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${p.f * 100}%`, height: '100%', background: '#e0a526' }} /></div>
  </div>;
}
