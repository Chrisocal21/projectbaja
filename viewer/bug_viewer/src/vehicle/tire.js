// Per-wheel tire: simplified Pacejka-style curve on COMBINED slip, so longitudinal and lateral forces share one friction budget.
//   slip ratio  kappa = (omega*R - vx) / max(|vx|, vmin)       (+ = wheel spinning faster than the ground)
//   slip angle  alpha = atan2(vy, max(|vx|, vmin))
//   s = hypot(kappa/kappaPeak, alpha/alphaPeak); force = mu*N*shape(s); direction follows the slip vector.
// So braking while turning (big kappa) automatically takes grip from the sideways force - no scripting.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Normalised force curve: rises to exactly 1 at s = 1, then falls to sin(C*pi/2). */
export function shape(s, C) {
  const B = Math.tan(Math.PI / (2 * C));
  return Math.sin(C * Math.atan(B * s));
}

const KAPPA_MIN_SPEED = 1.5, ALPHA_MIN_SPEED = 1.0;

/** vx, vy: wheel-frame ground velocity of the contact patch (vx along the wheel, vy to the wheel's left). */
export function tireForce(surface, tire, vx, vy, omega, N, R, out = {}) {
  if (N <= 1) { out.Fx = out.Fy = out.kappa = out.alpha = out.used = out.muN = 0; return out; }
  const kappa = clamp((omega * R - vx) / Math.max(Math.abs(vx), KAPPA_MIN_SPEED), -3, 3);
  const alpha = Math.atan2(vy, Math.max(Math.abs(vx), ALPHA_MIN_SPEED));
  const sx = kappa / surface.kappaPeak, sy = alpha / surface.alphaPeak;
  const s = Math.hypot(sx, sy) + 1e-9;
  const C = (surface.Cx * sx * sx + surface.Cy * sy * sy + surface.Cx * 1e-12) / (sx * sx + sy * sy + 1e-12);   // blended falloff shape (safe at zero slip)
  const loadFactor = clamp(1 - tire.loadSens * (N / tire.nominalLoad - 1), 0.6, 1.3);   // grip does not grow linearly with load
  const mu = tire.mu * surface.mu * loadFactor, muN = mu * N;
  const F = muN * shape(s, C);
  let Fx = F * sx / s, Fy = -F * sy / s;
  // very low speed: slip angle is meaningless, so blend to a viscous lateral force that lets the car actually stop
  const b = smooth(0.4, tire.lowSpeed, Math.abs(vx));
  Fy = b * Fy + (1 - b) * clamp(-muN * vy / 0.7, -muN, muN);
  out.Fx = Fx; out.Fy = Fy; out.kappa = kappa; out.alpha = alpha; out.muN = muN;
  out.used = clamp(Math.hypot(Fx, Fy) / muN, 0, 1.5);
  return out;
}
