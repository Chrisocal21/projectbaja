// Surface table. Stage 1 only needs tarmac; Stage 2 adds the rest and per-wheel sampling.
//   mu         peak grip multiplier
//   kappaPeak  slip ratio at peak longitudinal grip     (lower = sharper, more road-like)
//   alphaPeak  slip angle (rad) at peak lateral grip
//   Cx, Cy     falloff shape past the peak: tail grip = sin(C*pi/2) of peak  (1.3 = holds on, 1.9 = falls off a cliff)
//   rr         rolling resistance coefficient
//   sink       extra drag force per N of load from the tire digging in
export const SURFACES = {
  tarmac: { id: 'tarmac', name: 'Tarmac', mu: 1.0, kappaPeak: 0.11, alphaPeak: 0.13, Cx: 1.55, Cy: 1.65, rr: 0.012, sink: 0 },
};

export const surfaceAt = () => SURFACES.tarmac;
