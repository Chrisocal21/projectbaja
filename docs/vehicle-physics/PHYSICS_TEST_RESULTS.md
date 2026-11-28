# Physics test results

Numbers the headless tests print, so changes are measured, not felt. Re-run with `npm test` in `viewer/bug_viewer` (the facility table prints from `src/physicsFacility.test.js`). All inputs are [estimate] (see `catalog/physics.json`). Newest first.

## Nov 28, 2026: milestone 4, wheel spin and lock-up

| Test | Result |
|---|---|
| Launch, 1.5 s: tire speed over ground speed | Loose sand 8.0 m/s (the cap); asphalt 0.0 |
| Braking from 54 km/h on dirt | Pedal down 9.2 m (fronts locked 96% of the stop); brake help 7.8 m; 30% trigger 15.7 m |
| Braking while turning, 1.2 s | Heading change: locked 1.3 deg, brake help 37.4 deg |
| Rear-left over a hole | Open diff spins it to 42 m/s with the partner still; locker turns both at 8.5 m/s |
| Split ground, braking, no help (from milestone 3) | Now swings 42 deg toward the asphalt (was 12): locked wheels hold no line |
| Split ground, launch, 3 s | Open 14.9 m, locker 21.2 m (the locker's tail steps toward the mud) |
| Frame rate 30 / 60 / 144 fps | Spread 0.04% |
| Static pad, skidpad, bump | Unchanged |

Test car (`driveMeasure.js`), before -> after: 0-15 m/s pavement 1.8 -> 1.8 s, dirt 1.9 -> 1.9, sand 4.4 -> 4.2, mud 6.4 -> 6.5. Handbrake stop from 20 m/s (the rears now lock): pavement 14.9 -> 15.9 m, dirt 16.4 -> 17.3, sand 22.3 -> 23.8, mud 33.2 -> 35.7.

In the game, loose sand: launch showed the right-rear tire at 34 km/h with the car at 6; a straight hard stop showed all four LOCK.

## Nov 28, 2026: milestone 3, ground under each wheel

All earlier facility numbers are identical after the change.

| Test | Result |
|---|---|
| Split ground, braking from 54 km/h | Left wheels asphalt, right wheels sand: pulls 11.8 deg and 0.44 m toward the asphalt. Mirrored: -11.8 deg, -0.44 m. All asphalt: 0.0 deg. |
| Split ground, launch, right rear in mud, 3 s | Open diff 15.8 m, locker 26.1 m. |
| In the game, county road edge | Left wheels read Asphalt (grip 1.08), right wheels Loose sand (0.34); the Bug turned toward the road under braking. |

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
