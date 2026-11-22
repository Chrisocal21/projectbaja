# Research fix plan: going one by one through the three handoffs

Started Nov 22, 2026. The three handoffs are saved in [research/](./research/): vehicle mechanics, driving physics, world/property/business. They are PROPOSALS. [CANON](./CANON.md) and the live game win. Rule for every step: one real, working system, shown with a screenshot or test, committed, then the next.

## How benches work (Chris's direction, my recommendation)

One bench system, not one-off code per machine.

1. **A bench is a prop with a tray.** Anything you set down within reach of it counts as "on the bench" (the tire machine already does this: rim + tire within 1.5 m).
2. **Each bench kind has recipes**: what it accepts, what it needs (tool, power, consumable), how long the hold takes, what comes out. Pure rules in `machineRules.js` style, tested headless. The tire machine's tray is the first recipe; the rest copy it.
3. **Everything is a real part with its own condition.** Nothing is a menu choice. You do the work by hand: hold-click, set a part in, take a part off.

| Bench | What you do |
|---|---|
| Tire machine (done) | rim + fitting tire on the tray -> wheel (no air). Patch and inflate by hand. |
| Engine stand (next big one) | see below |
| Mechanics workbench | clean, service and small repair of a loose part (wipe grime, new gasket, new bushing); condition goes up only as far as the part allows; worn-out parts need replacing |
| Battery charger | battery on it -> charge rises, health does not |
| Press / vise | bushings, bearings in and out |
| Parts washer | grime off so you can read the part's real condition |
| Welding table | bracket and guard making (later) |

## The engine stand: a buildable motor

- Put the engine on the stand and it becomes a **parts tree** you can see: case, two heads, valve covers, carb, air cleaner, fan housing, distributor, coil, alternator, starter, exhaust, oil sump, flywheel.
- **Hold-click a piece to take it off**, set it on the bench or floor; **hold-click a held piece at its glowing spot to put it back**. Same hold bar and rules as the car.
- Each piece has its own condition and faults (worn, cracked, fouled, missing). Loose pieces can go to the workbench, washer or press, or be replaced from stock.
- Order matters: you cannot reach the heads until the covers are off. Blockers are named on screen, same as the car.
- The engine on the stand is **the same engine** that goes back in the car. Whatever you fixed (or left broken) decides whether and how well it runs.
- Build in tiers: Tier 0 outside pieces (carb, ignition, fan, exhaust), Tier 1 covers and heads, Tier 2 the bottom end. Ship Tier 0 first.
- Art: needs separate meshes per piece. Until real models exist each piece is a simple labelled stand-in, honestly marked as one. No Meshy credits spent without Chris saying so.

## Order of work (one by one)

Status key: [ ] not started, [x] done, [~] partly there.

### A. Vehicle mechanics (research/PROJECT_BAJA_VEHICLE_MECHANICS)
1. [~] Bench system: generalise the tray into recipes; tire machine is the first. (this plan)
2. [x] Engine stand with a Tier 0 buildable motor (above): nine outside pieces, order enforced, condition kept. Not yet wired to whether the car starts (step 3).
3. [x] The engine's pieces ride into the car with it (build.engineParts) and back out. No starter, carburetor, coil, distributor or plugs, or one below 15%, means it will not start, and the message names the piece. Sitting in the seat and the first crank both check it. Still to do: weak (not dead) pieces making it run rough or crank longer.
4. [x] Battery charger (new buildable prop: a battery beside it charges in about 90 s, needs garage power; a flat battery under 20% will not start the car; junk batteries start part empty; charge rides in and out of the car) and workbench service (an engine piece lying on the bench is cleaned in 4 s, +25 up to 85%, once per piece; shot pieces under 15% need replacing). Not yet: replacement stock for shot pieces, cleaning battery health.
5. [~] Press, spring compressor and brake lathe are DEFERRED (research puts them in Phase 2 and the game has no bushing, bearing or strut parts for them to work on yet). Parts washer done (new buildable prop; engine pieces come off dirty with their condition hidden, 5 s in the washer shows it, and a dirty piece cannot be serviced until washed; needs garage power). Still to do, one at a time: press, spring compressor, brake lathe.
6. [ ] Blockers and the access order for the engine; Tier 1 pieces.
7. [ ] Work orders and the repair ledger.

### B. Driving (research/PROJECT_BAJA_DRIVING_PHYSICS)
1. [x] Audit written: [DRIVING_AUDIT](./DRIVING_AUDIT.md) (from the code, check by feel). Best next: a headless drive script that measures stopping distance and acceleration per surface.
2. [ ] Installed tire changes grip you can measure (tires now exist per rim size).
3. [ ] Surfaces: hardpack, gravel, sand, clay behave differently.
4. [ ] Worn damper and punctured tire change the drive; repair undoes it.
5. [ ] Gearing and tire size trade-off; towing and recovery later.

### C. World, property, business (research/PROJECT_BAJA_WORLD_PROPERTY_BUSINESS)
1. [~] Customer jobs with real completion checks (flat wheel done).
2. [ ] Garage power: breaker, load limit, equipment says why it will not run.
3. [ ] Cleaning zones with visible, saved change.
4. [ ] Storage: shelves and bins that remember what is in them.
5. [ ] Quotes, ledger of money in and out, repeat customers and reputation.
6. [ ] Salvage with owner and permission, find and tow wrecks (audit item 3).
7. [ ] Building modules that refund materials in full when taken down (canon).

Anything ChatGPT needs from this goes in [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md) the same session.
