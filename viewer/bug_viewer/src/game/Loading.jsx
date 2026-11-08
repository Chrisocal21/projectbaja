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
    const id = setInterval(() => {
      const s = st.current, now = performance.now(), busy = s.active;   // real downloads only: fitting a part must never cover the screen
      if (busy) s.lastBusy = now;
      setShow(v => {
        if (!v) return false;   // once the world is up it never comes back: small models streaming in later (a held part, a ghost) just pop in
        if (now - s.lastBusy > 800 && now - s.shownAt > 1400) return false;
        return v;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);
  return <div className={`loading title-bg${show ? '' : ' done'}`}>
    <div className="loading-card">
      <div className="loading-title">PROJECT <span>BAJA</span></div>
      <div className="loading-bar"><div style={{ width: `${Math.max(4, Math.round(progress))}%` }} /></div>
      <div className="loading-sub">{active ? `Loading Baja County… ${loaded}/${total}` : 'Setting up the garage…'}</div>
      <div className="loading-tip">{tip}</div>
    </div>
  </div>;
}
