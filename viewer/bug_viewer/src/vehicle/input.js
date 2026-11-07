// Keyboard + gamepad -> { throttle, brake, steer (left +), handbrake }, with the smoothing that makes keyboard feel okay.
const dead = (v, d = 0.12) => (Math.abs(v) < d ? 0 : Math.sign(v) * (Math.abs(v) - d) / (1 - d));
const towards = (cur, target, up, down, dt) => cur + Math.max(-down * dt, Math.min(up * dt, target - cur));

export function createInput() {
  const keys = {};
  const dn = e => { keys[e.code] = true; if (e.code === 'KeyR' && !e.repeat) keys.resetPressed = true; if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); };
  const up = e => { keys[e.code] = false; };
  const blur = () => { for (const k of Object.keys(keys)) keys[k] = false; };
  window.addEventListener('keydown', dn); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
  const out = { throttle: 0, brake: 0, steer: 0, handbrake: 0, reset: false, pad: false };
  const sm = { throttle: 0, brake: 0, steer: 0 };

  out.read = dt => {
    const pad = (navigator.getGamepads?.() || []).find(p => p && p.connected);
    // keyboard targets
    let tThr = keys.KeyW || keys.ArrowUp ? 1 : 0, tBrk = keys.KeyS || keys.ArrowDown ? 1 : 0;
    let tSteer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0), hand = keys.Space ? 1 : 0;
    let analogSteer = false;
    if (pad) {
      const rt = pad.buttons[7]?.value || 0, lt = pad.buttons[6]?.value || 0, sx = dead(-(pad.axes[0] || 0));
      if (rt > 0.02 || lt > 0.02 || Math.abs(sx) > 0) { tThr = Math.max(tThr, rt); tBrk = Math.max(tBrk, lt); if (Math.abs(sx) > 0) { tSteer = sx; analogSteer = true; } }
      if (pad.buttons[1]?.pressed || pad.buttons[2]?.pressed) hand = 1;           // B / X
      if (pad.buttons[9]?.pressed) keys.resetPressed = true;                        // Start
    }
    out.pad = !!pad;
    // ramps: keyboard throttle/brake ease in; steering eases in/out (analog sticks pass through nearly raw)
    sm.throttle = towards(sm.throttle, tThr, 4.5, 9, dt);
    sm.brake = towards(sm.brake, tBrk, 6, 12, dt);
    sm.steer = analogSteer ? towards(sm.steer, tSteer, 12, 12, dt) : towards(sm.steer, tSteer, tSteer * sm.steer < 0 ? 9 : 4.5, 7, dt);
    out.throttle = sm.throttle; out.brake = sm.brake; out.steer = sm.steer; out.handbrake = hand;
    out.reset = !!keys.resetPressed; keys.resetPressed = false;
    return out;
  };
  out.dispose = () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  return out;
}
