# Project: Baja — CANON

Locked story, world and rules, taken from the Forge review and canon of November 7, 2026. Read this before any design or code work. A rule here wins over any feature idea; if a feature breaks one, the feature changes.

Labels: **CANON** = locked. **TARGET** = locked direction, not built yet. **PROPOSED** = a Forge or Claude suggestion that is not decided. **UNKNOWN** = deliberately undecided; do not invent it.

> **Honesty note from the Forge:** canon items #001–#084 were reconstructed by theme, not recovered word for word. Treat them as directional. Re-confirm only the ones the current slice depends on.

## Pitch

Project: Baja is a grounded desert automotive sandbox. A recent graduate inherits a run-down garage, restores forgotten vehicles by hand, and decides for themselves whether that becomes a business, a collection or a racing career. There is no forced main quest.

**Final promise (#130):** a living automotive world built around your choices.

**Pillars:**
1. **Every vehicle has a story.** Finding, fixing and changing vehicles is the heart of the game.
2. **Build something worth leaving behind.** Walt's Garage is a property and a family legacy.
3. **Your garage, your builds, your rules.** Restore, collect, fabricate, explore, earn, race or just tinker.

Pillar 3 is a promise, not a feature. When a new system is proposed, ask which pillar it serves. If the only answer is pillar 3, it waits.

**Core loop:** find, inspect, diagnose, source parts, repair, build, test, drive or sell, reinvest.

**Walt's line:** "Fix her up. Then fix the place up. Then go fast." It is also the roadmap: the Bug first, the garage second, racing third.

## The opening (CANON)

- The player has just finished college. Grandfather **Walt** has died and left them **Walt's Garage**, a repair and welding shop established in 1968 in remote Baja County.
- The player drives out, decides to stay, and starts with **$1,500 total**: savings and a small inheritance combined. There is no starting loan.
- **Outside:** bald tires, scrap metal, a dead refrigerator, tumbleweeds, a 1966 trailer, a windmill and a water tank.
- **Inside:** rotting boxes, old paint cans, old oil, decades of newspapers, old tools and neglected machines.
- **Electricity starts off.** The player flips Walt's hand-wired breaker.
- **Grandma's 1971 Bug-style car** sits in the garage, partly dismantled. It hasn't run since 2009. Its rear-right wheel is off after a flat, and Walt had started dealing with rust.
- **Walt's old #7 desert racing buggy** is under a tarp on the property.
- **A letter from Walt** sets the tone. Its defining line: "Fix her up. Then fix the place up. Then go fast."
- **No compulsory "quest accepted" popups.** The player explores, notices and chooses.

**Tone:** quiet, grounded, warm and hopeful. An inhabited desert, not a wasteland. No overnight rise from junkyard to empire.

## The people (CANON)

- **Walt:** a good, widely liked mechanic with a hidden off-road racing past. The player was close to him as a child.
- **The #7 accident:** Walt was driving when a racing accident killed his childhood best friend, who was his co-driver. Walt survived. The #7 was repaired afterwards and never raced again. Its seized parts come from long storage, not from damage left unrepaired.
- **The family:** the parents hid this history because they feared racing would claim another family member. The grandmother had co-driving experience and stepped away when the grandchild was born.
- **The co-driver's son:** older than the player, an excellent mechanic and desert racer. He runs his late father's engine shop in **Iron Flats**. He knows his father died in a race, but not the full story.

## Story rules (CANON)

- The #7 story is told through letters, photos, objects, part markings, local talk, clippings and old race records.
- NPCs know only what they would know. Dialogue changes when facts come out.
- The reveal is never forced. The player can keep the buggy covered, sell it, never meet the son, or find only fragments.
- The shop owner is not a villain, and there is no automatic confrontation.
- Nothing about the #7 can trigger just because a game clock ran out.
- A player who never opens the tarp still has a complete game. Protect that.

**UNKNOWN (do not invent):**
- the accident year, the place and who was at fault
- the full text of Walt's letter
- every name except Walt's and the townsfolk locked below
- the player's name and appearance
- the names of the co-driver and his son
- the final title
- fictional car makes
- the rest of the NPC roster

**LOCKED by Chris, November 8, 2026:**
- Townsfolk names already used in the game are canon: **Rosa** (the diner), **Pastor Dale**, **Deputy Ruiz**, **Mrs. Hollis**, **Old Man Hollis**, **Dusty** (the corner store), **Al** (Honest Al's).
- The in-world year is **2025**.
- The player carries a **smartphone**. Its apps include messages and a record of what has been said, so nothing in the story is missed. Walt's old PC in the office works alongside it.

## World bible

Baja County starts as a handcrafted core of about **3 × 3 km**, with Walt's Garage near the centre. That is an early target, not a performance promise. Each place below is a design location; whether it exists in the repo is tracked in [STORY_AND_WORLD](./STORY_AND_WORLD.md).

| Place | What it is | Build in |
|---|---|---|
| Walt's Garage | The inherited property. It can never be lost to bankruptcy (#092). | Phase 1 |
| Dusty's Fuel | Fuel and roadside shopping. | Phase 1, if it is the parts source |
| Salvage & Surplus | Reusable physical parts, and a scrap buyer. | Phase 1, if it is the first income |
| Dry Wells | Local hub with businesses and residents. | Phase 3 |
| Honest Al's | Used car lot and trade-ins. | Phase 2 |
| Baja Parts | Parts supplier and vendor, possibly a sponsor. | Phase 2 |
| Rosa's diner, the Rusty Piston bar | Conversations and rumours. | Phase 3 |
| Sheriff's office | Grounded patrols, no wanted-level game. | Phase 3 |
| Hollis Farm | Rural property and opportunities. | Phase 3 |
| Red Rock Canyon, Sidewinder Dunes | Rock and sand terrain, recovery challenges. | Phase 3 |
| Bitter Lake | Dry-lake speed testing. | Phase 3 |
| Proving Grounds | Closed at first; testing access comes later. | Phase 4 |
| Iron Flats | A bigger racing and fabrication town, home of the co-driver's son's shop. | Phase 3, story optional |

**The Living Frontier (TARGET, Phase 5):**
- Terrain beyond the core streams in or is generated, instead of ending at a wall.
- Discovered landmarks, roads, towns, owned structures and player changes never move or vanish.
- Far terrain that is unvisited and unprotected may regenerate, to keep storage in check.
- It uses deterministic seeds plus saved changes. Don't save every pebble.
- Public areas stay reachable after events. Restricted race routes may close.

**Society, weather and time:**
- NPCs have routines: jobs, shopping, hobbies, travel and racing. Other garages prosper, struggle and compete without the player.
- Seasons repeat on an event calendar. There is no ageing, no story clock and no deadline.
- Dynamic weather affects traction, dust, visibility and some terrain, and its intensity scales with difficulty (TARGET).
- Sleep, food and comfort are light. There is never hardcore survival.
- **The world advances only while the game is running or time is skipped (#097).**

## Design rules that override feature ideas (CANON)

1. No mandatory main quest. The inheritance is context, not a route.
2. No player injury. Crashes damage vehicles and equipment only.
3. No insurance system of any kind (#051).
4. No stranded state that can't be fixed. Roadside recovery always has a fallback.
5. Walt's Garage can never be permanently lost (#092).
6. Physicality matters. Parts, tools, cargo and supplies are real objects. No magic stock.
7. No arbitrary skill lockouts. Knowledge and tools improve results; curiosity is always allowed.
8. No compulsory busywork. Bookkeeping, scheduling, wiring and tuning are optional depth.
9. No invented race results. Outcomes come from the simulation.
10. Do not overwrite the #7 lore. It is optional, conditional and never forced.
11. Difficulty applies to every major system, but the exclusions above stay fixed.
12. Saves are sacred. A crash or an update must not erase property or long-term builds.
13. Money matters but can be recovered: setbacks, not ruin.
14. The workshop is the core. A feature that doesn't serve restoration, use, business or the living world doesn't outrank the first playable.

Blueprint cancel and demolition refund 100% (#024). That is safe because you only get your own materials back. Revisit it if a sell-back or delivery cost is ever added on top.

## Technical principles (CANON)

- **State first, visuals second.** Save the game state, never mesh references, and rebuild what you see from that state.
- **One legitimate state per part:** installed, held, stored, lying in the world, or consumed. An install updates the vehicle and the inventory in **one atomic transaction**. The Forge says this is the one thing that must be right on day one.
- **Repairs come from real state.** A fixed car starts because the right parts are installed and working, not because an animation finished.
- **Data-driven content.** Parts, vehicles, locations and jobs live in data files, not in hard-coded scenes.
- **Versioned saves:** atomic writes, rotating backups, independent slots and a migration plan. Never overwrite the only good save during a migration.
- **No offline progression.** The simulated world stops when the game closes.
- **Keep simulation separate from rendering.**
- **Don't rewrite working code to match a diagram.** The folder tree in the original handoff is an illustration, not a mandate.
- **Write these tests first:** the starter state and $1,500 balance; installing and removing a part; start conditions and faults; purchases; a save-and-reload round trip.
- PROPOSED: the `PartCondition`, `InstalledPart`, `VehicleState` and `WorldSave` types from the original handoff are a sensible starting shape. Adapt them to the real code.

## Phases (one open at a time)

The phases set the order of work, not dates. A phase closes only when its gate passes. **Only Phase 1 is open, and inside it only Slice A.** A new idea goes in the inbox, not the build. If a Phase 1 feature truly needs a later system, build the smallest version that works, not the full system.

| Phase | What | Gate |
|---|---|---|
| 1. First playable | Slices A–D (see [PROGRESS_TRACKER](./PROGRESS_TRACKER.md)) | A new save plays from the garage to a paid purchase with no cheats, and reloads cleanly |
| 2. Garage and restoration depth | More vehicles and repair families, better suppliers and inventory, customer work orders, selling, simple garage expansion | A second vehicle is restored and sold for a profit |
| 3. Baja County comes alive | Dry Wells, NPC routines, weather, day and night, entry-level races, first employees, roadside rescue | A full in-game week where the world moves without the player |
| 4. Advanced simulation | Deeper engines, electrical, fabrication and inspection, dyno and telemetry, mobile workshops, terrain and body deformation | A part built from scratch passes inspection and races |
| 5. Living Frontier and motorsport | Seeded streaming, endurance events, hosted races, rival teams, a museum | A protected discovery survives region regeneration |

## Rules for the coding assistant (from the Forge handoff)

- Locked canon is a requirement. Do not redesign it.
- Parts exist in exactly one state: installed, held, stored, in the world, or consumed. Install and remove are atomic.
- Do not rewrite working code to match a folder diagram.
- Mark every unsettled detail as a PROPOSAL, and prefer placeholders that can be reversed.
- Only Slice A is open. Do not build later phases.
- Give exact filenames, run commands and a short test checklist. Say plainly whether the code was actually run.
- **Never:**
  - invent lore
  - add player injury or insurance
  - require a main quest
  - let parts teleport or duplicate
  - erase saves or property
  - advance the world while the game is closed
  - add business or racing systems to Phase 1
