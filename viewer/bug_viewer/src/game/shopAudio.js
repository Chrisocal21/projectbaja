import { isMuted } from '../audio.js';

/** Procedural workshop loops. Shares K's mute state and the game's 50% default. */
export function createShopAudio() {
  let context, master, source, oscillator, filter, noiseGain, toneGain;
  let pulse = 0, disposed = false;
  function unlock() {
    if (disposed) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context) {
      context = new Audio();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = .7;
      noiseGain = context.createGain();
      toneGain = context.createGain();
      noiseGain.gain.value = toneGain.gain.value = 0;
      oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      source.connect(filter).connect(noiseGain).connect(master);
      oscillator.connect(toneGain).connect(master);
      source.start();
      oscillator.start();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  const gesture = () => unlock();
  window.addEventListener('pointerdown', gesture, { passive: true });
  window.addEventListener('keydown', gesture, { passive: true });
  const profiles = {
    wrench: [1800, 900, .025, 0],
    grinder: [2600, 210, .070, .009],
    welder: [3600, 120, .055, .008],
    saw: [1600, 155, .050, .018],
    bender: [420, 65, .028, .012],
  };
  return {
    update(kind, dt, volume = .5) {
      if (!context || context.state !== 'running') return;
      const now = context.currentTime;
      const profile = profiles[kind];
      master.gain.setTargetAtTime(isMuted() ? 0 : Math.max(0, Math.min(1, volume)), now, .025);
      pulse += dt;
      const click = kind === 'wrench' ? (pulse % .27 < .024 ? 1 : 0) : 1;
      filter.frequency.setTargetAtTime(profile?.[0] || 400, now, .04);
      oscillator.frequency.setTargetAtTime(profile?.[1] || 65, now, .04);
      noiseGain.gain.setTargetAtTime((profile?.[2] || 0) * click, now, .008);
      toneGain.gain.setTargetAtTime(profile?.[3] || 0, now, .04);
    },
    dispose() {
      disposed = true;
      window.removeEventListener('pointerdown', gesture);
      window.removeEventListener('keydown', gesture);
      source?.stop();
      oscillator?.stop();
      context?.close();
    },
  };
}

export function shopWorkKind(hold) {
  if (!hold) return null;
  if (hold.shopSound) return hold.shopSound;
  const label = (hold.label || '').toLowerCase();
  if (/grind|cutting.*steel|cutting.*drum/.test(label)) return 'grinder';
  if (/weld/.test(label)) return 'welder';
  if (/saw/.test(label)) return 'saw';
  if (/bend/.test(label)) return 'bender';
  if (/^(bolting on|taking off)\b/.test(label)) return 'wrench';
  if (hold.work && /frame|build|assem|bolting|tighten|standing|laying.*(?:boards|shelves|slats|deck)|pulling.*crate/.test(label)
      && !/traction boards/.test(label)) return 'wrench';
  return null;
}
