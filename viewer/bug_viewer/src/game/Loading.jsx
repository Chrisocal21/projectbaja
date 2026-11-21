import React, { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';

const TIPS = [
  'Grandpa kept everything. Look under the tarps.',
  'Hold a part near the Bug: green means bolt it on, amber means something has to go first.',
  'Aim at a part with empty hands and press R to take it off.',
  "Dusty at the gas station sells the supplies for odd jobs.",
  'Scrap metal + a welder + a tube bender = shock hoops.',
];

/**
 * Covers the game while the world downloads its models/textures, so you never see it half-built.
 * Stays up until the three.js loaders have been idle for a moment and it's been visible long enough not to flicker.
 */
export default function LoadingScreen() {
  const { active, progress, loaded, total } = useProgress();
  const [show, setShow] = useState(true);
  const st = useRef({ shownAt: performance.now(), lastBusy: performance.now(), active: true });
  st.current.active = active;
  const tip = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]).current;
  useEffect(() => {
    // Downloads finishing isn't "ready": terrain tiles, roads and shaders keep building for a few seconds and cause long frames.
    // So also hold the cover until frames have been smooth (no frame over 90 ms) for 1.5 s, or 20 s have passed.
    let raf = 0, last = performance.now();
    const frame = t => {
      if (t - last > 90) st.current.lastHitch = t;
      last = t; raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const id = setInterval(() => {
      const s = st.current, now = performance.now(), busy = s.active;   // real downloads only: fitting a part must never cover the screen
      if (busy) s.lastBusy = now;
      setShow(v => {
        if (!v) return false;   // once the world is up it never comes back: small models streaming in later (a held part, a ghost) just pop in
        const smooth = now - Math.max(s.lastHitch || 0, s.shownAt) > 1500, timedOut = now - s.shownAt > 20000;
        if (timedOut || (now - s.lastBusy > 800 && now - s.shownAt > 1400 && smooth)) return false;
        return v;
      });
    }, 100);
    return () => { clearInterval(id); cancelAnimationFrame(raf); };
  }, []);
  return <div className={`loading title-bg${show ? '' : ' done'}`}>
    <div className="loading-card">
      <div className="title-sign-lockup loading-sign">
        <img className="title-sign" src="/images/project-baja-sign.svg" alt="Project Baja — Walt's Garage" />
        <img className="title-sign-buggy" src="/images/baja-buggy-cutout.png" alt="" />
      </div>
      <div className="loading-bar"><div style={{ width: `${Math.max(4, Math.round(progress))}%` }} /></div>
      <div className="loading-sub">{active ? `Loading Baja County… ${loaded}/${total}` : 'Setting up the garage…'}</div>
      <div className="loading-tip">{tip}</div>
    </div>
  </div>;
}
