import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game } from './store.js';
import { takePerfMetrics } from './perfMetrics.js';

const detailed = typeof location !== 'undefined' && /[?&]perf(?:[=&]|$)/.test(location.search);

/** tells the page how far down the counter reaches, so pop-up messages start below it (hud.css --perf-bottom) */
let reserved = 0;
function roomFor(el) {
  const to = el ? Math.ceil(el.getBoundingClientRect().bottom) + 10 : 0;
  if (to === reserved) return;
  reserved = to; document.documentElement.style.setProperty('--perf-bottom', `${to}px`);
}

/**
 * In-game frame counter. Beyond FPS it shows what makes a game feel choppy at a high frame rate:
 *   avg / 1% low   the typical frame and the slowest 1% of frames
 *   worst          the single longest frame this second
 *   hitches/s      frames far longer than normal (over 2.2x the median, at least 28 ms)
 *   jitter         how uneven the frame times are (steady = low)
 *   physics        what the car simulation cost per frame and how many sub-steps it took
 *   last hitch     the worst recent frame: how much of it was physics, and your speed
 *   slow frame     Chrome's report of which script held a frame up (when the browser offers it)
 * ?perf adds renderer statistics and the slowest streaming jobs.
 */
export default function PerfHud() {
  const { gl, scene } = useThree(), node = useRef(null), samples = useRef([]), elapsed = useRef(0), loaf = useRef(null), last = useRef('');
  useEffect(() => { window.__perfScene = { gl, scene }; }, [gl, scene]);   // test hook: scene breakdown
  useEffect(() => {
    try {
      const o = new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          const sc = [...(e.scripts || [])].sort((a, b) => b.duration - a.duration)[0];
          if (!loaf.current || e.duration > loaf.current.ms) loaf.current = { ms: e.duration, who: sc ? String(sc.sourceFunctionName || sc.invoker || sc.sourceURL || '').split('/').pop().slice(0, 40) : 'render / garbage collection' };
        }
      });
      o.observe({ type: 'long-animation-frame', buffered: false });
      return () => o.disconnect();
    } catch { /* this browser doesn't report it */ }
  }, []);
  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;right:18px;top:12px;z-index:9999;padding:${detailed ? '8px 10px' : '5px 8px'};background:#111d;color:#d8e7dc;font:700 12px/1.4 monospace;white-space:pre;pointer-events:none;border:1px solid #fff3`;
    document.body.appendChild(el); node.current = el;
    return () => { el.remove(); node.current = null; roomFor(null); };
  }, []);
  useFrame((_, dt) => {
    if (!node.current) return;
    const visible = detailed || game.settings?.showFps !== false;
    node.current.style.display = visible ? '' : 'none';
    if (!visible) { samples.current = []; elapsed.current = 0; roomFor(null); return; }
    const ss = window.__simStat || { n: 0, ms: 0 };
    samples.current.push({ ms: dt * 1000, sim: ss.ms, n: ss.n }); elapsed.current += dt;
    if (elapsed.current < 1) return;
    const all = samples.current, ordered = all.map(x => x.ms).sort((a, b) => a - b), pick = q => ordered[Math.min(ordered.length - 1, Math.floor(q * (ordered.length - 1)))];
    const fps = all.length / elapsed.current, avg = ordered.reduce((a, b) => a + b, 0) / ordered.length, med = pick(0.5);
    const jitter = Math.sqrt(ordered.reduce((a, b) => a + (b - avg) ** 2, 0) / ordered.length), hitchAt = Math.max(28, med * 2.2), hitches = all.filter(x => x.ms > hitchAt);
    const worst = all.reduce((w, x) => (x.ms > w.ms ? x : w), all[0]), simAvg = all.reduce((a, b) => a + b.sim, 0) / all.length, steps = all.reduce((a, b) => a + b.n, 0) / all.length;
    node.current.style.color = fps < 20 ? '#ff756d' : fps < 40 || hitches.length > 2 ? '#ffd17a' : '#a4e5b4';
    if (hitches.length) last.current = `last hitch ${worst.ms.toFixed(0)} ms (physics ${worst.sim.toFixed(1)}, rest ${(worst.ms - worst.sim).toFixed(0)}) at ${Math.abs(game.speed || 0).toFixed(0)} m/s`;
    const lo = loaf.current; loaf.current = null;
    const lines = [
      `FPS ${fps.toFixed(0)}  avg ${avg.toFixed(1)} ms  1% low ${(1000 / pick(0.99)).toFixed(0)} fps`,
      `worst ${ordered.at(-1).toFixed(0)} ms  hitches ${hitches.length}/s  jitter ${jitter.toFixed(1)} ms`,
      `physics ${simAvg.toFixed(1)} ms x${steps.toFixed(1)} steps/frame`,
    ];
    if (last.current) lines.push(last.current);
    if (lo) lines.push(`slow frame ${lo.ms.toFixed(0)} ms in: ${lo.who}`);
    if (detailed) {
      lines.push(`Draw ${gl.info.render.calls}  tris ${Math.round(gl.info.render.triangles / 1000)}k  geom ${gl.info.memory.geometries}  tex ${gl.info.memory.textures}`);
      for (const [name, m] of takePerfMetrics().slice(0, 5)) lines.push(`${name}: ${m.count}x max ${m.max.toFixed(1)} ms`);
    }
    node.current.textContent = lines.join('\n');
    roomFor(node.current);
    samples.current = []; elapsed.current = 0;
  });
  return null;
}
