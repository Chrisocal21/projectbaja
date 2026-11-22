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
6. [~] Tier 1 pieces on the engine: intake manifold (under the carburetor, so air cleaner then carburetor come off first), left and right valve covers, and the oil filter, all with their own condition and grime like the Tier 0 pieces. Missing or shot (under 15%) of any of them and the engine will not start, and the message names the piece. Engines from older saves count as complete and get the four pieces fitted when they go on the stand. Still to do: head gaskets and timing (need the heads off), weak pieces affecting running, shock-style blockers for the stand beyond the manifold.
7. [~] Work orders: every finished customer job is written into a ledger (home.workLog, last 40, saved): who, what was wrong, what you used, what it paid, when. The phone Money app shows the total (jobs done, money earned, best repeat customer) and the last four orders. Still to do: orders for your own cars and for wreck strips, parts-used costs against the pay for a profit line, a separate Orders view with filters.

### B. Driving (research/PROJECT_BAJA_DRIVING_PHYSICS)
1. [x] Audit written: [DRIVING_AUDIT](./DRIVING_AUDIT.md) (from the code, check by feel). Best next: a headless drive script that measures stopping distance and acceleration per surface.
2. [x] Installed tire changes grip you can measure: src/driveMeasure.js plus tests, table in [DRIVING_AUDIT](./DRIVING_AUDIT.md). Finding: stock tires cannot leave sand or mud (needs a limp floor, Chris to decide how hard).
3. [~] Surfaces: hardpack and clay added to the physics data and measured (stopping and launch differ by surface, tests pass). The WORLD does not return them yet; asked ChatGPT in CHATGPT_HANDOFF.md.
4. [x] Per-corner blown damper and punctured tire (wear.js onHit: a hard landing may blow the damper at the corner that took it, a rock strike or low-pressure pinch may puncture that tire). A flat drags the car to its side (measured 3.7 m off line in 6 s) and grips less; a blown damper rebounds loose at that corner only; the wrench and jack service puts them back exactly (tested). Clues and the hold-T look-over name the corner. Not checked by feel yet; a flat does not yet show on the wheel model or sag the ride height.
5. [~] Gearing and tire size trade-off: already in the drivetrain, now measured and tested (DRIVING_AUDIT). Still to do: a swappable final-drive part, cargo and towing.

### C. World, property, business (research/PROJECT_BAJA_WORLD_PROPERTY_BUSINESS)
1. [~] Customer jobs with real completion checks (flat wheel done).
2. [x] Garage power: the tire machine, battery charger and parts washer draw 12, 8 and 10 amps while they work; the old panel takes 24, so any two are fine and three at once trip the breaker (power goes out, the message names the machines, flip the breaker panel to reset). A machine with no power says why. Not yet: a panel upgrade to raise the limit, more machines on the list (welder, compressor, lights).
3. [~] Cleaning with visible, saved change: junk piles no longer clear with one press. You hold left click to haul a load (2.5 s each, 2 to 3 loads per pile); the pile shrinks with every load, the load count is saved, and the last load clears it and pays as before. Still to do: dirt on the garage floor and walls that you scrub or hose off.
4. [~] Storage: a Parts bin ($45, Storage tab of the build menu) and the existing tool chest and steel parts rack now hold things by size (12, 10 and 24 units). E puts what you hold (or the last small part in your pack) in, left click takes the last thing out, the prompt lists what is inside, and it all saves. Selling or storing the bin spills its contents on the floor. Still to do: pick a specific item (not just the last), labels, shelf contents shown on the shelf, supply and tire shelving as real containers.
5. [~] Reputation and regulars: every job done adds 2 standing (0 to 100: unknown, known, trusted, the place to go). Standing pays up to 25% more and brings the next customer up to 30% sooner; a customer who has come back 3 times is a regular and pays 10% more, and the job message says when either changes. The phone Money app shows standing and regular count. The money ledger already existed (last 30 changes, phone and office PC). Still to do: quotes (naming a price before the job), a longer ledger with totals by week, customers who turn down a bad repair.
6. [~] Salvage with permission: every wreck and donor now carries a posted salvage fee ($25 barn donor, $60 warehouse donor, $35 roadside wrecks). The first time you try to take a part it tells you the fee; trying again pays it and the wreck is yours to strip (saved on the project). Your own car is always free; dev mode skips it. No owners are named (canon). Still to do: finding wrecks by lead instead of by driving past, towing a wreck home with a trailer or winch (needs towing physics, see DRIVING_AUDIT), and selling the stripped hulk for scrap.
7. [x] Building modules refund in full (canon #024) and it already worked at the current price; now every built prop and piece records what you PAID and the refund is exactly that, so a later price change never changes it (creative-mode builds still refund nothing, old props with no record fall back to the price). Checked in the game: placed a parts bin (paid 45), took it down, got the recorded amount back. Taking a foundation down still needs its walls, floor and roof off first, and shelves, benches and bins spill what is on them.

Anything ChatGPT needs from this goes in [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md) the same session.
