# Physics test results

Numbers the headless tests print, so changes are measured, not felt. Re-run with `npm test` in `viewer/bug_viewer` (the facility table prints from `src/physicsFacility.test.js`). All inputs are [estimate] (see `catalog/physics.json`). Newest first.

## Nov 28, 2026: first in-game telemetry read (F9 panel)

Stock Bug, full lock at 75 km/h on scrub (ground grip 0.61):

| Wheel | Load N | Slip angle | Fx N | Fy N | Grip used |
|---|---|---|---|---|---|
| FL | 1048 | -33.9 deg | -11 | 641 | 100% |
| FR | 3402 | -28.7 deg | -83 | 2080 | 100% |
| RL | 1979 | -9.8 deg | 618 | 1135 | 100% |
| RR | 4391 | -9.6 deg | 1155 | 2498 | 96% |

Lateral 0.74 g, roll 1.3 deg. Two findings: (1) the car understeers hard at full lock at speed: the fronts are far past their grip peak (about 30 deg of slip) while the rears sit near 10 deg; (2) 0.74 g on 0.61 grip is only possible because gravity is 1.35 x (the tires are pressed 35% harder), so that feel crutch is also a grip bonus of about a third.

## Nov 28, 2026: facility baseline (milestone 1), before any physics change

Car: the stock Bug as the game resolves it (820 kg, CG 0.50 m, 42/58, track 1.30 m, wheelbase 2.38 m, stock tires r 0.346 m, stock suspension), on dirt.

| Test | Result |
|---|---|
| Static pad | Tire loads 2281 / 2281 / 3149 / 3149 N = 100.0% of weight (at the game's 1.35 x gravity); 42.0% front; the car sits exactly on its spring preload (0 mm travel). |
| Frame rate | 6 s full throttle at 30 / 60 / 144 fps: 115.7 m and 30.61 m/s at every rate; spread 0.03%. The game's sub-stepping keeps simulated time exact, so a fixed-step rewrite is not urgent. |
| Skidpad, 12 m/s | Stock: 0.69 g, 1.3 deg roll. 33s + 4-inch kit + wider stance: 0.67 g, 1.4 deg roll. |
| Single-wheel bump, 12 cm at 4 m/s | Front-left travel 0.089 m, front-right -0.004 m; settles level afterwards. Traced: the rear-left then takes 10 cm and 11.5 kN, and the body rolls about 3 deg before settling. |

## Nov 27, 2026: lift kit drive test (headless, the game's own steering limits)

| Build | Tip limit | Rolls on dirt at |
|---|---|---|
| Stock size | 1.30 g | never (tested to 54 mph) |
| 31s + 2-inch, 3 cm wider | 1.15 g | about 45 mph, half lock |
| 33s + 4-inch, 8 cm wider | 1.11 g | about 40 mph, half lock (27 mph before the wider stance) |

Lifted Bugs clear a 40 cm ridge the stock one grounds on; 33s at half throttle stall on it (taller gear, less push at the wheel).

## Handoff Step 9 acceptance tests (BAJA_PHYSICS_MECHANICS_HANDOFF.md) and where they live

| # | Test | Status | Test file |
|---|---|---|---|
| 1 | Stock vs long-travel on whoops | Passes: long travel heaves less than half of stock | `suspensionSoak.test.js` |
| 2 | Sand: street pressure vs aired down | Passes: street bogs, aired down keeps moving | `vehiclePhysics.test.js`, `bogDown.test.js` |
| 3 | Open diff vs locker, one wheel off the ground | Passes: open stalls, locker drives out | `drivetrain.test.js` |
| 4 | Side-slope tip, with and without a cage | Passes: caged car tips at a lower slope | `vehiclePhysics.test.js` |
| 5 | Overheat on a slow climb | Passes: warning, then power loss, then damage | `drivetrain.test.js` |
| 6 | A diagnosis puzzle (three causes, tests separate them) | Missing (only "bouncy ride can be tire pressure" exists, `wear.test.js`) | |
