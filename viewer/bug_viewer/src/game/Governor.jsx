import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { game, say } from './store.js';

/**
 * Keeps the game smooth on slower machines: when the last few seconds averaged under LOW_FPS it steps the graphics down one tier
 * (game.perfTier: 0 shadows high, 1 shadows low, 2 shadows off, 3 shadows off + 75% resolution) and never steps back up (no flapping).
 * Only touches what is set to Auto in Settings. Ignores the first seconds (loading) and paused time.
 */
const LOW_FPS = 28, WINDOW = 4, WARMUP = 12, MAX_TIER = 3;
export default function Governor() {
  const { setDpr } = useThree(), t = useRef({ age: 0, acc: 0, n: 0 });
  useFrame((_, dt) => {
    const s = t.current;
    if (game.paused || dt > 0.5) return;   // a tab switch or a pause is not slowness
    s.age += dt; if (s.age < WARMUP) return;
    s.acc += dt; s.n++;
    if (s.acc < WINDOW) return;
    const fps = s.n / s.acc; s.acc = 0; s.n = 0;
    game.fps = fps;
    const cfg = game.settings || {}, auto = cfg.shadows === 'auto' || cfg.renderScale === 'auto';
    if (!auto || fps >= LOW_FPS || (game.perfTier || 0) >= MAX_TIER) return;
    game.perfTier = (game.perfTier || 0) + 1;
    if (game.perfTier >= 3 && cfg.renderScale === 'auto') setDpr(0.75);
    say(game.perfTier >= 3 ? 'Running slow: lowered the resolution too (Settings > Video).' : 'Running slow: turned shadows down (Settings > Video).');
    s.age = WARMUP - 4;   // give the change a few seconds before judging again
  });
  return null;
}
