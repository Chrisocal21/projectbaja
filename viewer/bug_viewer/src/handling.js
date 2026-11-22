// Racing-game driving aids, kept apart from the physics so they can be tested and tuned on their own.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Counter-steer help: when the car is sliding sideways and you are not steering hard, the front wheels are turned toward where the car is
 * actually going, so a slide is caught instead of becoming a spin. It fades out as your own steering rises, so full lock still slides out.
 * lateralV: sideways speed (+ = toward the car's left), v: forward speed, steerIn: your steering -1..1 (+ = left). Returns extra steering angle (rad, + = left).
 */
export function steerAssist(lateralV, v, steerIn) {
  const sp = Math.abs(v); if (sp < 4) return 0;
  const slip = Math.atan2(lateralV, Math.max(3, sp)) * (v >= 0 ? 1 : -1);   // body slip angle: + = travelling toward the left of the nose
  const mine = 1 - clamp(Math.abs(steerIn) * 1.25, 0, 1);                    // your own steering takes over
  return clamp(slip * 1.1, -0.32, 0.32) * mine;
}

/** wider view with speed: a sense of speed without touching the physics */
export const speedFov = (base, v) => base + clamp(Math.abs(v) - 8, 0, 34) * 0.4;
