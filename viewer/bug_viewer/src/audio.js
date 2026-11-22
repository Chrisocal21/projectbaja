// Procedural sound (Web Audio, no sample files): engine from rpm and throttle, tire and gravel noise from speed and slip, wind, water, landing thumps, bottom-out clunks.
// All numbers are first guesses to tune by ear. The audio context can only start after a click or key press, so it starts on the first one. K mutes.
let ctx = null, master = null, eng = null, nz = null, muted = false, vol = 0.5;   // default 50%
try { muted = localStorage.getItem('baja-mute') === '1'; } catch {}

/** engine firing frequency (Hz) for a 4-cylinder four-stroke: two firings per crank turn */
export const firingHz = rpm => (Math.max(500, rpm) / 60) * 2;
/** tire / gravel noise loudness 0..1 from speed (m/s), slip (0..1) and how loose the surface is (0..1) */
export const roadNoise = (speed, slip, loose) => Math.min(1, Math.abs(speed) / 28) * (0.25 + 0.9 * Math.min(1, slip) + 0.6 * loose) * (Math.abs(speed) > 0.5 ? 1 : 0);

function noiseBuffer(c) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function build() {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  ctx = new C(); master = ctx.createGain(); master.gain.value = muted ? 0 : vol; master.connect(ctx.destination);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), og = ctx.createGain(), lp = ctx.createBiquadFilter();
  o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 2; og.gain.value = 0;
  o1.connect(lp); o2.connect(lp); lp.connect(og); og.connect(master); o1.start(); o2.start();
  eng = { o1, o2, og, lp };
  const buf = noiseBuffer(ctx), mk = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { fl, g }; };
  nz = { tire: mk('bandpass', 700, 0.7), wind: mk('lowpass', 500, 0.5), water: mk('highpass', 1800, 0.4), buf };
}
const start = () => { try { if (!ctx) build(); if (ctx?.state === 'suspended') ctx.resume(); } catch {} };
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown'].forEach(t => window.addEventListener(t, start, { passive: true }));
  window.addEventListener('keydown', e => { if (e.code === 'KeyK' && !e.repeat && !/INPUT|TEXTAREA/.test(e.target?.tagName || '')) setMuted(!muted); });
}
export function setMuted(m) { muted = m; try { localStorage.setItem('baja-mute', m ? '1' : '0'); } catch {} if (master) master.gain.setTargetAtTime(m ? 0 : vol, ctx.currentTime, 0.05); }
export const isMuted = () => muted;

/** once per frame while driving: { on, rpm, throttle, speed, slip, loose, air, wade, hot } */
export function updateAudio(s) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, k = 0.06, f = firingHz(s.rpm || 900 + Math.abs(s.speed) * 90);
  eng.o1.frequency.setTargetAtTime(f, t, k); eng.o2.frequency.setTargetAtTime(f * 0.5, t, k);
  eng.lp.frequency.setTargetAtTime(260 + f * 3.2 + s.throttle * 900, t, k);
  eng.og.gain.setTargetAtTime(s.on ? 0.045 + Math.max(0, s.throttle) * 0.06 + Math.min(0.03, f / 4000) : 0, t, 0.08);
  const rd = s.on ? roadNoise(s.speed, s.slip, s.loose) * (s.air ? 0 : 1) : 0, sp = Math.abs(s.speed);
  nz.tire.g.gain.setTargetAtTime(rd * 0.22, t, 0.08); nz.tire.fl.frequency.setTargetAtTime(500 + sp * 22 + s.slip * 500, t, 0.1);
  nz.wind.g.gain.setTargetAtTime(s.on ? Math.min(0.2, (sp / 45) ** 2 * 0.2) : 0, t, 0.15); nz.wind.fl.frequency.setTargetAtTime(250 + sp * 12, t, 0.15);
  nz.water.g.gain.setTargetAtTime(s.on && s.wade > 0.05 ? Math.min(0.25, 0.05 + sp / 60) : 0, t, 0.1);
}
function burst(freq, dur, gain, type = 'sine', noise = 0) {
  if (!ctx || ctx.state !== 'running' || muted) return;
  const t = ctx.currentTime, g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); g.connect(master);
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.45), t + dur); o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  if (noise) { const s = ctx.createBufferSource(); s.buffer = nz.buf; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 400; const ng = ctx.createGain(); ng.gain.setValueAtTime(gain * noise, t); ng.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(fl); fl.connect(ng); ng.connect(master); s.start(t); s.stop(t + dur + 0.05); }
}
/** a landing, imp = downward speed m/s */
export const thump = imp => burst(70 + imp * 4, 0.28 + Math.min(0.3, imp / 30), Math.min(0.7, 0.12 + imp / 18), 'sine', 0.8);
/** the suspension hitting its stops */
export const clunk = () => burst(190, 0.16, 0.35, 'square', 0.4);
