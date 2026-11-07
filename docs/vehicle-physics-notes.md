# Vehicle physics notes (from the user's earlier game)

Condensed from their full reference. Current sim = `viewer/bug_viewer/src/DriveWorld.jsx` (arcade model, not a rigid-body sim).

## Where we are vs. the reference
| Topic | Reference | Baja now |
|---|---|---|
| Timestep | fixed 120 Hz+, semi-implicit Euler, accumulator clamp | variable dt (capped 1/30) - **fix first** |
| Body | rigid body, forces at contact points | heading/pitch/roll faked from terrain plane |
| Suspension | F = k*x + c*v, bump/rebound c (rebound ~2-3x), progressive bump stop, droop limit | per-wheel spring + hard clamps (COMP 0.22 / DROOP 0.2); body height is kinematic |
| Spring rate | k = m_corner (2 pi f)^2, off-road 1.0-1.4 Hz, rear 10-20% stiffer | hand-tuned numbers |
| Tires | friction circle, slip ratio/angle, Pacejka, load sensitivity, surface mu | none (speed along heading only) |
| Drivetrain | torque curve, gears, diff/LSD/locker, 4WD low range | single ACCEL/MAX_SPEED |
| Brakes | front bias 60-70%, ABS, handbrake locks rear | one BRAKE value |
| Aero | 0.5 rho Cd A v^2 (+ lift/downforce) | quadratic DRAG only |
| Weight transfer | dN = m a h / L (long), m a h / t (lat) | fake pitch/roll offsets from accel/lat |
| Rollover | a_lat = g t / 2h, tripping | none (car can't flip) |
| Surfaces | mu + Crr per ground type, sinkage in sand/mud | one surface |
| Damage/wear | per-subsystem | none |
| Towing/cargo | CoM + inertia update with payload | none |

## Handy numbers
- g 9.81; rho 1.225 (x exp(-h/8500)); 1 m/s = 3.6 km/h
- mu: knobby on dirt 0.7-0.9, packed dirt 0.5-0.7, loose gravel/sand 0.3-0.5, mud 0.2-0.4
- Crr: asphalt 0.01, gravel 0.04, sand 0.2-0.4
- Peak slip: ratio 0.08-0.15, angle 8-15 deg off-road; sliding mu = 70-90% of peak
- Ride frequency: off-road truck 1.0-1.4 Hz; zeta ~0.25-0.4; travel off-road 0.3-0.5 m
- Rollover a_lat = g (t/2h); Beetle-ish (t 1.5, h 0.6) ~1.25 g; sideslope tip = atan(t/2h)
- Stop distance d = v^2 / (2 mu g); breakover = atan(2 clearance / wheelbase)
- Buggy: ~900-1100 kg, CoM ~0.5-0.6 m, ~40/60 front/rear (rear engine)

## Suggested upgrade order (cheap to expensive)
1. Fixed 120 Hz step with render interpolation.
2. Surface types (sand/rock/mud) driving mu, Crr, sinkage.
3. Slip-based tire model with friction circle (gives drifting, understeer, wheelspin).
4. Real spring-damper force on a rigid body (raycast per wheel) replacing the kinematic pitch/roll.
5. Drivetrain: torque curve + gears + diff types (open/locked) - ties into customizer parts (engine, diff, tires change handling).
6. Weight transfer, rollover, damage tied to part stats.
7. Customizer parts feed physics: tire radius/width, spring rate, travel, mass, Cd.
