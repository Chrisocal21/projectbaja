# Project: Baja — FEATURE_MAP

Provisional working title. Last updated: November 8, 2026, after the Forge canon (systems table and phases added).

Status key: SETTLED (decided), PLANNED (agreed direction, not started), LATER (explicitly deferred), OPEN (undecided, see OPEN_QUESTIONS).

IMPLEMENTED below means a tested local asset-lab prototype, not a shipped
gameplay feature or production-ready asset.

## Core fantasy

The vehicle on screen tells the story of everything the player found, repaired, bought and built. Lived-in and populated, not lonely or post-apocalyptic.

Locked story, rules and phases: [CANON](./CANON.md). **Only Phase 1 is open.**

## Systems and build phase (Forge canon, November 7)

Every system is CANON as a long-term promise. The last column is when it gets built.

| System | What is locked | Build in | In the repo today |
|---|---|---|---|
| Vehicle identity and condition | Persistent ID, parts as separate components; salvaged, used, refurbished or race-ready condition; history and value | Phase 1 (minimal) | Parts are separate slots. No per-part IDs or condition yet |
| Physical repair | Inspect, diagnose, pick tools, remove, repair or replace, reinstall, test. No instant repair button | Phase 1 | Remove and install by hand with rules and tools. No inspect, diagnose or repair step |
| Parts, sourcing, inventory | Physical deliveries and storage; new, used and refurbished differ; compatibility by mounts and dimensions | Phase 1 (one source), Phase 2 | Physical items, hands, pack, shelves, car storage, boxed shop pickup |
| Driving and surfaces | Grounded suspension, tires, drivetrain, fuel, terrain; pavement differs from dirt | Phase 1 (minimal) | Arcade-sim driving, a grip value per surface |
| Save system | Versioned, atomic, rotating backups, independent slots | Phase 1 | One autosave slot; fit and remove written atomically since November 8 |
| Economy | Cash, purchases, a transparent history | Phase 1 (basic) | Cash and purchases; no history |
| Garage business | Customers, quotes, jobs, reputation, fleet contracts, subcontracting | Phase 2 and 3 | Odd jobs exist (ahead of phase, frozen) |
| Garage construction | Modular snap building, blueprints, 100% refund on cancel | Phase 2 (simple) | Build mode exists (ahead of phase, frozen); takedown refunds 50% today, canon says 100% on cancel |
| Employees | Hiring, morale, scheduling, delegation, remote approvals | Phase 3 | None |
| World and NPCs | Routines, businesses, opportunities, weather, seasons | Phase 3 | Static towns, no NPC routines |
| Racing and teams | Local races, class rules, endurance series, team, sponsors, BajaWire | Phase 3 to 5 | Tracks only, no races |
| Advanced mechanical depth | Engines, electrical, fabrication, certification, dyno, telemetry | Phase 4 | Stepwise engine mods and shock-hoop fabrication (ahead of phase) |
| Towing, recovery, mobile bases | Trailers, winches, roadside rescue, campers | Phase 3 and 4 | None |
| Terrain change and cleanliness | Tracks, ruts, washouts, dirt effects, detailing | Phase 4 | A wear and dirt shader, a car wash |
| Living Frontier | Seeded streaming with protected saved changes | Phase 5 | None |
| Museum, hosted events | Showroom, public events, vendors, staff, sponsors | Phase 5 | None |
| Organizer and opportunities | Journal, task lists, vehicle boards, restrained notifications | Phase 2 onwards | None |
| Difficulty and communications | Presets plus per-system toggles; coverage, radios, offline maps | Phase 2 and 4 | None |

Fabrication quality (#123–#125) and electrical troubleshooting (#121–#122) are each a small game of their own. Keep both out of Phase 1.

**Excluded forever:** a main quest you must follow, player injury, insurance, permanent loss of the garage, offline progression.

## Story

- You inherit grandpa Walt's run-down garage in the middle of nowhere after college. You clean it out, restore grandma's Bug (found in the garage, half apart; cranks, coughs, then fires on the third try) and build the place up. SETTLED, IMPLEMENTED (start of the game). See [STORY_AND_WORLD](./STORY_AND_WORLD.md).
- Honest Al's lot in town sells the bigger, pricier vehicles; the Bug is yours from the start. SETTLED, IMPLEMENTED.
- Grandpa's #7 desert racer hides under a tarp in the garage; its shocks, race tires and beadlock rims go to the Bug once shock hoops are fabricated and welded in. SETTLED, IMPLEMENTED.
- Odd jobs from locals (small, no timer) and fixing up grandpa's trailer. SETTLED, IMPLEMENTED.
- Full lore: SETTLED in [CANON](./CANON.md), covering Walt, the #7 accident, the family, the co-driver's son in Iron Flats and the story rules. Only the start is in the game; the #7 backstory isn't delivered anywhere yet (later phases).

## World

- Free-roam open world across Southern California and Baja Mexico. SETTLED (long term)
- First official map: **Baja County**, 6 × 6 km (grown from 3 × 3 km on November 7), garage at the centre, roads out to a town, farm, canyon, dunes, dry lake and the Proving Grounds (test tracks), ringed by mountains. IMPLEMENTED. The Test Center stays as a dev map.
- Realistic terrain: a real eroded heightmap, graded roads, 8 photo ground textures with normal maps. IMPLEMENTED.
- Plants, trees, real rock models, dead trees and shrubs from the supplied asset packs dress the map. IMPLEMENTED.
- Environments: lived-in towns, coastal roads, dry lakebeds, desert, mountains, border-region feel. SETTLED
- Ordinary working shops and junkyards, warm afternoon light. SETTLED
- World reuses terrain and town generators from Salvage Road, re-fed with SoCal and Baja inputs. PLANNED
- Barn finds placed in the world. SETTLED (see Parts)

## Vehicles

- VEH_001 starter: faded-blue vintage rounded two-door rear-engine air-cooled Bug-inspired car, original and unbranded. SETTLED
- Current asset-lab Stock uses the user's imported classic Beetle. IMPLEMENTED
  (static asset). Its native badge is retained; final originality/unbranded
  presentation and licensing are not resolved by this import.
- ~~Player buys it beat-up from a seller at a small-town mechanic yard~~. SUPERSEDED (November 7): the Bug is grandma's, found half apart in the inherited garage. Making it roadworthy while it still looks worn stays SETTLED.
- Over time converted into a Baja Bug. Visual progression: stock worn, early trail beater, recognizable Baja conversion, capable desert Baja. SETTLED (art direction only)
- The user defined the reference-based **Stage 2** as a full-bodied classic
  rounded Baja conversion before the later full race/Class 1-inspired design.
  SETTLED (visual direction); Stage 2 static preview IMPLEMENTED. Unlocks,
  gameplay tiers and race-class compliance remain OPEN.
- Other vehicle types in scope visually: buggies, trophy trucks, rock crawlers, trucks. SETTLED as visual scope
- Bikes later. LATER
- Building: parts change both performance and appearance (tires, shocks, roll cage, bumpers, fenders and more). SETTLED
- Driving: our own arcade-sim physics (fast and fun first). IMPLEMENTED.
- Several vehicles: one active, the rest parked where you left them. The '84 4x4 pickup is buyable and drivable, with a cab and bed for hauling big parts. IMPLEMENTED. The '78 half-ton is a project for later. PLANNED
- Every part is detachable; the shell lifts off to a rolling chassis; a step-by-step engine. IMPLEMENTED (Bug). A high-power rear swap and buggy bodies. PLANNED
- Doors and lids really open (doorways cut into the body). IMPLEMENTED.
- Fit glow and detach glow: a part's spot glows green, amber (blocked by another part or a shut lid) or red. IMPLEMENTED (body pieces, wheels, bolt-ons; engine and battery not aimable yet).
- Held and loose parts show their real model. IMPLEMENTED for parts with models; supplies and tools are still crates.

## Parts sources

- Junkyards: few in the world, paid gate entry (about $5), walk the rows, pull parts off wrecks, pay for what you take. SETTLED
- Barn finds: abandoned barns out in the middle of nowhere holding vehicles or rare parts, found purely by exploring, no map markers or hints. SETTLED
- Racing rewards. LATER
- Scrapyard and loot container code carried over from Salvage Road. PLANNED

## Your property (build mode)

- Grid-build the yard and garage: fences, racks, a lift, an office with a PC, funny decor, your own car lot. SETTLED. First slice IMPLEMENTED (B key, 21 items including the welder and bender, unlocks once the garage is clean). Making items functional is PLANNED. See [BUILD_MODE](./BUILD_MODE.md).

## Marketplace

- Simple marketplace in the style of an off-road forum or classifieds site. SETTLED
- Game appraises the build. Player can accept the appraised price or set their own. SETTLED
- NPC buyers send offers; player accepts the one they want. SETTLED
- Listings do not expire; they sit until the player deals with them. SETTLED
- Buyer tastes or personalities: not in scope, kept simple. SETTLED
- Price and offer behavior (how asking above or below the appraisal affects offers). OPEN

## Racing

- Racing as an additional income stream. LATER

## Art and assets

- Grounded semi-realism, authentic workshop wear, warm afternoon light, no heavy bloom. SETTLED
- Brand palette: sand #C4A574, clay #A46A4B, sage #778571, graphite #353B40, cream #E5DDD0, orange #DC652D. SETTLED (not paint limits)
- Three.js with React Three Fiber, GLB/glTF 2.0. SETTLED
- Vite/React Three Fiber asset viewer runs locally and builds. Stock, Body
  prototype and Stage 2 Baja are distinct previews with profile-aware controls.
  IMPLEMENTED (asset lab only).
- Imported Stock: eight removable body groups, 2.38 m wheelbase, preserved
  source assembly, 190,396 triangles. Static geometry/normalization checked.
- Supplied all-terrain tread: 24,000 triangles per prepared tire; stock-size
  adaptation preserves native rims. A separate Stage 2 adaptation uses
  30-inch tires, 140 mm body lift and 1.50 m wheel-center track.
- Stage 2: rounded bonnet/nose, high-cut wings, fender-mounted lamps, simple
  bumpers/rocker rails, open rear deck, refitted engine and static running gear.
  Assembled export is 253,214 triangles. Static fit and browser behavior checked;
  no steering/suspension physics or gameplay integration is implemented.
- Original 17-model handoff package remains historical procedural prior art.
  Unfitted full suspension, cage/bracing, auxiliary-light and skid-plate
  prototypes stay gated; do not confuse existence on disk with fit validation.
- Missing textures/materials, detailed engine art, wear treatment, licensing,
  geometry optimization/LODs and production collision/rigging remain OPEN.
- See [PROGRESS_TRACKER](./PROGRESS_TRACKER.md) for results and
  [viewer README](../viewer/bug_viewer/README.md) for inventory/regeneration.

## Explicitly not carried over from Salvage Road

- Survival layer (hunger, thirst)
- Ruined-world story and tone
- Container home base
- Salvage Road branding
