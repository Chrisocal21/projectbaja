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
  return <div className="hold-bar"><div className="hb-label">{p.label}</div><div className="hb-track"><div style={{ width: `${p.f * 100}%` }} /></div></div>;
}
