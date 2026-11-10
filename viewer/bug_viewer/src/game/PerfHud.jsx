import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game } from './store.js';
import { takePerfMetrics } from './perfMetrics.js';

const detailed = typeof location !== 'undefined' && /[?&]perf(?:[=&]|$)/.test(location.search);

/** Small in-game FPS counter; ?perf expands it with frame and renderer statistics. */
export default function PerfHud() {
  const { gl } = useThree(), node = useRef(null), samples = useRef([]), elapsed = useRef(0);
  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;right:18px;top:${detailed ? 12 : 80}px;z-index:9999;padding:${detailed ? '8px 10px' : '5px 8px'};background:#111d;color:#d8e7dc;font:700 12px/1.4 monospace;white-space:pre;pointer-events:none;border:1px solid #fff3`;
    document.body.appendChild(el); node.current = el;
    return () => { el.remove(); node.current = null; };
  }, []);
  useFrame((_, dt) => {
    if (!node.current) return;
    const visible = detailed || game.settings?.showFps !== false;
    node.current.style.display = visible ? '' : 'none';
    if (!visible) { samples.current = []; elapsed.current = 0; return; }
    samples.current.push(dt * 1000); elapsed.current += dt;
    if (elapsed.current < 1) return;
    const ordered = samples.current.sort((a, b) => a - b), pick = q => ordered[Math.min(ordered.length - 1, Math.floor(q * (ordered.length - 1)))];
    const fps = samples.current.length / elapsed.current;
    node.current.style.color = fps < 20 ? '#ff756d' : fps < 40 ? '#ffd17a' : '#a4e5b4';
    if (detailed) {
      const work = takePerfMetrics().slice(0, 5).map(([name, m]) => `${name}: ${m.count}x max ${m.max.toFixed(1)} ms`).join('\n');
      node.current.textContent = `FPS ${fps.toFixed(0)}  frame ${pick(0.5).toFixed(1)} / p95 ${pick(0.95).toFixed(1)} / max ${ordered.at(-1).toFixed(1)} ms\n` +
        `Draw ${gl.info.render.calls}  tris ${Math.round(gl.info.render.triangles / 1000)}k  geom ${gl.info.memory.geometries}  tex ${gl.info.memory.textures}` + (work ? `\n${work}` : '');
    } else node.current.textContent = `FPS ${fps.toFixed(0)}`;
    samples.current = []; elapsed.current = 0;
  });
  return null;
}
