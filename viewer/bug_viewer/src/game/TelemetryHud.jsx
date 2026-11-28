// Engineering telemetry for the car you drive (docs/vehicle-physics/PHYSICS_AUDIT.md, milestone 1). F9 toggles it; ?telemetry in the URL starts it on.
// It only reads the simulation (window.__baja, set by DriveWorld), so turning it on or off never changes how the car drives.
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { game } from './store.js';

const startOn = typeof location !== 'undefined' && /[?&]telemetry(?:[=&]|$)/.test(location.search);
const deg = r => (r * 57.2958).toFixed(1);

/** the panel's text from a drive state (pure, so it can be tested) */
export function telemetryText(st) {
  const rb = st?.rb; if (!rb) return 'telemetry: no car';
  const m = rb.shape.mass, latG = (st.v * st.yr) / 9.81, wheels = rb.wheels || [];
  const lines = [
    `TELEMETRY (F9)   ${Math.abs(st.v * 3.6).toFixed(0)} km/h   lat ${latG.toFixed(2)} g   gear ${st.gear ?? '-'}  ${Math.round(st.rpm || 0)} rpm`,
    `mass ${m.toFixed(0)} kg  CG ${rb.shape.com.y.toFixed(2)} m   pitch ${deg(st.pitch || 0)}  roll ${deg(st.roll || 0)}  yaw rate ${deg(st.yr || 0)}/s`,
    `ground ${st.surfName || '?'}  grip ${(st.mu ?? 0).toFixed(2)}   contacts ${rb.contacts}${rb.touch ? '  BODY TOUCHING' : ''}${st.air ? '  AIRBORNE' : ''}`,
    'wheel   load N   travel m  slip deg  Fx N    Fy N   used',
  ];
  for (const w of wheels) {
    const used = w.cap > 0 ? Math.hypot(w.fx, w.fy) / w.cap : 0;
    lines.push(`${w.name}  ${w.touching ? '' : 'air '}${String(Math.round(w.load)).padStart(6)}  ${w.travel.toFixed(3).padStart(7)}  ${deg(w.sa).padStart(7)}  ${String(Math.round(w.fx)).padStart(6)} ${String(Math.round(w.fy)).padStart(6)}  ${(used * 100).toFixed(0).padStart(3)}%`);
  }
  return lines.join('\n');
}

export default function TelemetryHud() {
  const node = useRef(null), t = useRef(0);
  useEffect(() => {
    if (startOn) game.telemetry = true;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:18px;top:120px;z-index:9999;padding:6px 9px;background:#111e;color:#cfe6ff;font:600 12px/1.45 monospace;white-space:pre;pointer-events:none;border:1px solid #fff2;border-radius:6px;display:none';
    document.body.appendChild(el); node.current = el;
    const key = e => { if (e.code === 'F9') { e.preventDefault(); game.telemetry = !game.telemetry; } };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); el.remove(); node.current = null; };
  }, []);
  useFrame((_, dt) => {
    const el = node.current; if (!el) return;
    const on = !!game.telemetry && !game.onFoot; el.style.display = on ? '' : 'none';
    if (!on || (t.current += dt) < 0.1) return;   // ten updates a second is plenty to read
    t.current = 0; el.textContent = telemetryText(window.__baja);
  });
  return null;
}
