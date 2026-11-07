import React, { useEffect, useState } from 'react';
import { CONFIG_SCHEMA, buggyConfig, getPath, setPath } from './vehicle/config.js';
import { placeWheels } from './vehicle/sim.js';
import { proStore } from './vehicle/store.js';

/** Per-wheel readout (load, slip angle, slip ratio, surface, suspension, grip used) + live tuning sliders. */
export default function ProDebug() {
  const [, tick] = useState(0);
  const [open, setOpen] = useState(true);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 100); return () => clearInterval(id); }, []);
  const t = proStore.telemetry, cfg = proStore.config;
  if (!cfg) return null;
  const set = (path, v) => { setPath(cfg, path, v); if (proStore.car) placeWheels(proStore.car); tick(n => n + 1); };
  const reset = () => { const d = buggyConfig(); for (const [p] of CONFIG_SCHEMA) setPath(cfg, p, getPath(d, p)); if (proStore.car) placeWheels(proStore.car); tick(n => n + 1); };
  const copy = () => navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2));
  const bar = v => <span className="usebar"><i style={{ width: `${Math.min(100, v * 100)}%`, background: v > 0.95 ? '#e0701c' : '#6aa87a' }} /></span>;
  return <div className="prodebug">
    <div className="pd-head"><b>PRO PHYSICS · Stage 1 debug</b><button onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'}</button></div>
    {open && <>
      <table><thead><tr><th></th><th>Load N</th><th>Slip °</th><th>Slip κ</th><th>Surface</th><th>Susp</th><th>Grip used</th></tr></thead>
        <tbody>{(t?.wheels || []).map(w => <tr key={w.name}><td>{w.name}</td><td>{Math.round(w.load)}</td><td>{w.alphaDeg.toFixed(1)}</td><td>{w.kappa.toFixed(2)}</td><td>{w.surface}</td><td>{w.comp == null ? '—' : w.comp.toFixed(2)}</td><td>{bar(w.used)}</td></tr>)}</tbody></table>
      {t && <div className="pd-line">lat {t.latG.toFixed(2)} g · long {t.longG.toFixed(2)} g · body slip {t.slipDeg.toFixed(1)}° · yaw {t.r.toFixed(2)} rad/s</div>}
      <div className="pd-actions"><button onClick={() => proStore.reset?.()}>Reset car (R)</button><button onClick={reset}>Reset tuning</button><button onClick={copy}>Copy config</button></div>
      <div className="pd-sliders">{CONFIG_SCHEMA.map(([path, label, min, max, step]) => {
        const v = getPath(cfg, path);
        return <label key={path}><span>{label}<b>{(+v).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}</b></span><input type="range" min={min} max={max} step={step} value={v} onChange={e => set(path, +e.target.value)} /></label>;
      })}</div>
    </>}
  </div>;
}
