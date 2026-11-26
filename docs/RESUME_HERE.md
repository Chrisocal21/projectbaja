# RESUME HERE (rewritten Nov 22, 2026; start-here note Nov 23)

Read this first when picking the work back up. Then [README](./README.md) (which doc is current, which is history) and [CANON](./CANON.md) (locked, never invent lore). Labels: **PROPOSAL** = design guess.

## How we work now
- **The game is simulation-forward (Chris, Nov 22).** No click-and-choose for anything the player does to a vehicle: tires off rims, grinding rust, painting, buffing, hosing dirt off, fitting parts, servicing are all hands-on jobs with tools. Admin and the build-mode swatches are dev tools and are hidden at launch.
- **One branch: `main`.** Commit and push small, often. Only commit in this repo (`projectbaja`); never in `salvageroad` (it is a read-only reference, merge finished, see [SALVAGE_MERGE_PLAN](./SALVAGE_MERGE_PLAN.md)).
- **Two builders at once: Claude Code and ChatGPT.** Before editing, run `git status`: files that show as modified and are not yours belong to the other builder, so leave them alone. Whenever something is for ChatGPT, add it to [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md) (standing rule).
- Chris plays and judges how it feels. All physics, wear and world numbers are estimates (labelled in code and docs) to tune by feel.
- Dev server: `npx vite --port 3001` in `viewer/bug_viewer`. Tests: `npm test` (607 pass, Nov 22). `npm run build` fails on a locked `dist/review` folder (EPERM): build to a temp folder instead. Build check: `npx vite build --outDir <tmp> --emptyOutDir`.

## Where things stand (Nov 22)
All pushed to `main`. Details and numbers are in [REPAIR_AND_WORLD_PLAN](./REPAIR_AND_WORLD_PLAN.md) (the running record) and [PERFORMANCE_WORK](./PERFORMANCE_WORK.md).

- **Driving:** one rigid-body car (`src/rigid.js`): spring-damper wheels, friction-circle tires, engine with gears and heat, open/LSD/locker diff, tire pressure, handling profiles (`handlingProfiles.js`; the old loose balance is saved as `DRIFT_BASELINE` for a future drift car), long-travel suspension for upgraded builds, wet brakes, wading, river current, deep water drowns the engine. Controller support, speed FOV, eased steering wheel.
- **Wear and service:** `src/wear.js`: shocks, tires, alignment, engine wear slowly (quarter rate until dialled in); clues while driving, hold T to look the car over or service with the wrench / jack, workbench service, parts that change wear rates.
- **World features** (`worlds/offroadFeatures.js`, `wildFeatures.js`, `WildScenery.jsx`): whoops, low table-top jumps, berms, dirt tracks, strips beside highways, creek crossings, rivers (flowing look), forest trails, hill climbs, plank bridges, about 9,000 trees. Dust, tire ruts, landing and bottom-out feedback.
- **Mechanic loop:** tools in hand (wrench, jack), tool-gated removal, hold-click fit/remove, fiberglass panels flat white until painted, the fiberglass front clip, El Cajon as a restorable and drivable second vehicle.
- **Admin (phone):** a grid of vehicle and tool tiles; spawn a whole vehicle where you stand, parts, items, props, teleport to any city or spot with a vehicle, races, cheats. Archive of everything in the game. Hide it before any public build.
- **Perf:** draw cap (650 m), terrain streaming in slices, FPS counter (`PerfHud`); Chris sees about 30 FPS on his machine: the next perf pass needs his numbers.
- **Sound:** a first procedural pass (`src/audio.js`, K mutes, 50% default). Real recordings are better; see the handoff.
- **Big map (`?realmap`):** real border slice, real highways, junction signs, rest areas, gas stations. See [WORLD_MAP](./WORLD_MAP.md) and [ROAD_WORK_BACKLOG](./ROAD_WORK_BACKLOG.md). Road crossings, river crossings and driveways into places are ChatGPT's current job (Nov 22).

## NEXT BIG IDEA (Chris, Nov 27): benches and crafting
The build menu becomes benches you physically build (sawhorses, workbench, grinder, welding table, table saw, tube bender); storage goes anywhere; the starting garage gets dialed back; materials are bought, scrapped or found. Full plan: [CRAFTING_PLAN](./CRAFTING_PLAN.md). Chris picked all four recs (Nov 27): Walt's machines there but broken (B), physical material stacks, four materials, machines bought with benches you build. The phone now stays one size on every app (done Nov 27).
- **Phase 1, blueprints built by hand: built (Nov 27).** Tire shelving, supply shelving and the parts rack are blueprints now (`game/blueprints.js` rules + tests, `game/bpWork.js`). Build menu: "Place blueprint" (free) or "Buy ready-made". The blueprint stands as an amber hologram; E at it puts in the wood and scrap you have; hold left click with the wrench works it through three stages, and the real rack rises out of the floor as you go. Work only goes as far as the materials put in. Taking a blueprint or a hand-built rack down gives the materials back (canon #024). The workbench no longer makes racks. Materials are still the tally here; physical stacks come in Phase 4. Verified in the browser: place, feed, half-build, finish, it holds tires, take down refunds 3 wood + 4 scrap.
- **Next: Phase 2** (steel and fasteners, the grinder turns scrap into steel, salvage junk for materials).

## Nov 27 plan (Chris): materials, crafting and a phone that feels like the internet
Chris's words: start with few racks and craft more from scrap metal and wood; wood from the junk you clear and from Dusty's (both); things to pick up by the road and in the forests; more room in your vehicle; scrap and other materials scarce, bought in a store or as junk from sellers online; the phone's Internet should feel like browsing the web, GTA-phone style, with separate sites: a car forum / car-selling app, an auto parts store, a materials store, different sellers. Build order, one piece at a time (PROPOSAL numbers throughout):
1. **Wood + crafted racks + a leaner start: built (Nov 27).** `game.mats.wood` beside scrap. The workbench makes racks (tire shelving, supply shelving, parts rack) from scrap and wood; a made rack goes into Stored and is placed from build mode (B). A new game starts with one tire shelf and one supply shelf, no free LED bar, mud flaps or bumper pods, no cash in the tool chest, an empty engine stand instead of the spare engine. Old saves keep what they have. Also: one oil drum, not two. The old crate, held at the bench, breaks into 3 wood. Racks cost 3-4 scrap + 3-4 wood (PROPOSAL); a new game has about 7 scrap (yard scrap pile + dead fridge) and 3 wood (the crate), so one rack. Buying a ready rack in build mode still works. Build mode stays locked until the junk inside is cleared (as before). Known quirk (older): a shelf aimed at the shop's west wall snaps to the office side and is refused.
2. **Finds in the world: built (Nov 27)** (`game/matFinds.js`). Bundles of planks or scrap lie at about half the roadside stops (1-2 pieces) and on the verge of every forest trail (one or two bundles of 2-3, mostly wood): 55 finds on the big map, 86 wood and 27 scrap in all. E or click picks one up straight onto your materials. Put down once per save (`home.matV`), old saves too. Dusty sells lumber (2 planks, $14) and steel offcuts (2 pieces, $22). Junkyards and barns already sell old crates ($8), which break into 3 wood at the bench. All PROPOSAL numbers.
3. **More room in the vehicle: built (Nov 27).** The Bug's cab counts the back seat now (4 -> 6), its roof rack 6 -> 8; the trucks' cabs 3 -> 4, the El Cajon's bed 12 -> 16, the '84 pickup's bed 16 -> 20. Materials take no space (they are a tally). The pack stays at 4. PROPOSAL numbers.
4. **The phone browser: built (Nov 27)** (`game/web.js` rules, `game/webShop.js` buying, `game/BrowserApp.jsx`). Internet opens a browser: address bar, back, home, a page of bookmarks. Parts Online (the old parts app inside it), Building & Steel Supply (lumber 5/12 and steel 5/12 bundles, $10 delivery, to Walt's door), Classifieds (3-4 junk lots and 3-4 used parts at 45-70% of new, sellers in real towns, a new board every game day, bought posts disappear; lots dropped at Walt's door for $15, parts boxed at the pickup), Honest Al's (the old Car sales list). Cars on the classifieds wait for more car models. Was: a home page of sites. Auto parts store (today's Parts online), a materials store (scrap, wood), a classifieds board of cars and junk lots from different sellers around the real towns (the listings change), Al's lot. Site and seller names: PROPOSAL until Chris names them (no invented lore).
5. Then back to the service visit (step 4 below).

## CURRENT FOCUS (Nov 26): the new-game opening and living service visits
Chris refocused on everything from the start of a new game. The winch waits. His picks: **customers drive onto the lift while you wave them on; the Bug gets its own side bay (wider garage); the tire cleanup blocks opening, junk tires pay cash, some tires are still good.**
Build order, one at a time:
1. **Tire cleanup: built** (`game/yardTires.js`). 16 tires in small heaps against and near the building, as a shop left alone for a year (Chris: not strewn over the yard); 11 bald, 5 worth keeping, one of those holed. Bald ones go on the scrap pile beside the lot ($4, PROPOSAL); the others go on a tire rack. OPEN stays off until all are dealt with. The four old shelf tires are gone from a new game; the Bug's own wheels stay on its shelf. Older saves are unchanged. Needs Chris's feel notes.
2. **Minimal starting stock: built Nov 27** (see the Nov 27 plan above; the cartons on the supply shelf are real bin items, so they stay). Chris said "your rec" (Nov 26) to the 16-item list. Not built yet: cut the free LED bar, mud flaps and bumper pods; the $44 tool chest cash; the spare engine (keep its stand); one oil drum and the crate; one tire shelf; the fake cartons on the parts shelves. Keep the toolbox $40, the plug kit, the engine block, the jerry can, the compressor, bench, pegboard, lift and the parts shelves.
3. **Side bay: built** (`worlds/sideBay.js`, drawn by `SideBay` in `Sites.jsx`). A lean-to on the shop's east wall (x 7..13, z -6..6, roof 4.6 to 3.6 m) with its own roll-up opening to the yard; the back corner of the shop's east wall (openings segment R0) is a permanent walk-through. The Bug stands in it (`BUG_BAY`), her engine behind her and her seats along the outer wall. The lift is free. Old saves: a Bug still on the lift moves into the bay once (`ensureBugBay`); its loose parts stay where they were. The water tank moved east to (19.6, -8.6) and the planned drive round the east side for garage levels 1-3 moved to x 13.8..17.4. PROPOSAL sizes; needs Chris to walk it.
4. The visit: the car drives in off the road, onto the lift, and drives away.
5. Hands-on service jobs (oil first, then tire and belt).
6. People: walking, talking, waiting.
7. Garage atmosphere.

## Nov 27: Codex's garage-tier work reviewed and committed; the office finished
- Codex (ChatGPT) ran out mid-job. Its back-shop tier work is committed (73b91ae): service counter -> chassis setup -> race control, storage signs, Walt's bench moves to the back shop with what is on it. Claude removed invented story from its side-bay family board (only the Bug photo stays) and moved the rack signs off the posts.
- The office (Codex's next item) is done by Claude: one counter (Walt's), one stair (Walt's, into the team room through a doorway off his loft), plus two walking bugs fixed. Details in CHATGPT_HANDOFF "Office and stairs".
- **Chris's new idea (Nov 27), for step 2:** start with fewer racks, and let the player build more by crafting them from scrap metal, wood and the like (minor crafting). `home.js RECIPES` / `fabricate` (the workbench) already makes shock hoops from scrap, so racks would be new recipes there. Not built yet.

## START HERE (Nov 23)
Chris stopped for the night on Nov 22 after the getting-stuck build (commit `f2985d8`). Everything below is built, tested and pushed, but **none of it has been checked in the game yet**. No screenshot was possible (the headless browser freezes once the big map starts). First job tomorrow: Chris plays through the list, then Claude tunes.

**Built Nov 22, to check in the game:**
1. **Shops restock**: what you buy at a roadside shop comes back after 72 game hours (`game/shopStock.js`).
2. **Carry it or have it delivered**: every road-shop item has a "Deliver $X" button (price + 15% fee, hours by distance) to Walt's pickup area (`game/roadShop.js`).
3. **Units**: Settings has mph / km/h and °F / °C (`game/units.js`).
4. **Race towns**: start and finish towns on the race signs, the map and the discoveries (`worlds/raceCourses.js`).
5. **Finish work**: grinder, buffer, hose and spray cans for sale (Dusty's, off-road stores, junkyards, barns); spray cans run dry (shows "% left"); hitting rocks and cacti chips the paint on that corner (left/right side is a guess: check it); front and rear aprons can be ground and painted.
6. **Field kit**: 12 V tire pump plugs a flat (needs a plug kit) and fills tires anywhere.
7. **Phone Contacts app**: Dusty's store, Off-road parts, Tow truck. The tow brings you and the car to Walt's from anywhere: a fee plus distance, takes game hours (`game/tow.js`). Dusty's and Off-road "Call" open Internet ordering for now.
8. **Getting stuck** (`src/bogDown.js`, `src/worlds/softGround.js`, `game/recoveryWork.js`): silt (pale powder: open flats, a ring round the dry lakebed) and soft sand (deep washes, dune hearts); never near Walt's. Crawl or spin the wheels and you sink (the car sits lower, HUD says SOFT GROUND / BOGGING DOWN / STUCK); speed (~25 mph silt, ~20 soft sand) and aired-down tires float you. Out with a **shovel** ($25, hold-click each wheel 5 s) or **traction boards** ($95, lay at a wheel, drive out, walk back for them), or the tow. Y no longer frees a bogged car. Questions for Chris: can you see the silt? Too easy or too hard to get stuck? Does digging out feel right?

9. **Jerry can** (Nov 23): holds 20 L. Hold it, press E at a pump to fill it (80 cents a litre), hold left click on the car to pour it in the tank (`game/fuelCan.js`). Sold at Dusty's and gas marts ($12). Check it in the game.

**Next build: the winch** (Opus 5.5, high effort: physics). Chris: winches grab onto trees near you (`world.trunks(x, z)` already lists nearby trunks). Decide first: a **winch bolted to the car** (an installed part, powered by the car) or a **hand winch / come-along** you carry and crank? After that: tow strap between two vehicles.

**Waiting on Chris:** what Dusty's and the off-road shop should say or do when you call them (no lore invented, so they open ordering for now); the winch choice above; feel notes from playing.

**With ChatGPT** (in [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md)): paintable bumpers and a separate roof mesh; silt sections on trails, a silt ground texture, shovel and board models.

**Older backlog:** walk-in shop interiors, body work (dents, filler), towing with a strap / drivable tow truck, bumpers and roof finish once the model pieces exist, rain exposure (no weather system yet).

## Right now (Nov 22, late)
Chris paused the garage/office expansion (levels 1-3 of garage and office are built; living, mechanics, fuel room are not) to go back to **gameplay: the garage business, building and finding vehicles, and the story in levels 0 and 1**. See [EXPANSION_PLAN](./EXPANSION_PLAN.md) "Status, Nov 22".

## Next (in order, Chris's call)
1. Test the new handling, suspension and table tops by feel; tune.
2. **Lower the dirt roads just below the highway asphalt** so unpaved "flatish" roads sit in a natural shallow cut (jumps at crossings are fine); not on bump sections, jumps or turns. **Assigned to ChatGPT** (it owns `highways.js`; spec is item 0 in [CHATGPT_HANDOFF](./CHATGPT_HANDOFF.md)).
3. Performance on Chris's machine (about 30 FPS): thin trees and roadside strips if needed.
4. **Paint, rust and clean-up as hands-on jobs** (spec: [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) section 6). Full tool and job checklist, including towing: [TOOLS_AND_JOBS](./TOOLS_AND_JOBS.md). Rules are built and tested (`src/rules/finish.js`: per-panel rust, paint coverage, gloss, dirt; grind, paint, buff, hose, weather, chip). Built (Nov 22): grinder, 5 spray cans, buffer and hose are held tools (Admin > Quick sets > Finish tools) that hold-click the aimed **fiberglass** panel; state saved per vehicle and panel (`home.finish`, `src/finishJobs.js`, `game/finishWork.js`). Steel body panels (doors, hood, engine lid, fenders) work too: they start painted, grinding takes them to bare steel, bare steel rusts as game hours pass, driving adds dirt (`game/finishTick.js`). The hose is now "Hose / power sprayer". Done Nov 22: spray cans run dry (four coats each) and all finish tools are for sale. Chips from hits done (rocks, cacti; hood, aprons, fenders). Front and rear aprons are finishable. Not yet (bumpers are chrome trim and the roof is not a separate model piece): rain exposure, real tool art, other body parts (bumpers, roof). Tires off rims comes after. The build-mode paint swatch is only a dev stand-in.
6. Older plan (Nov 8, still unverified item by item): see [GAMEPLAN](./GAMEPLAN.md) and [PROGRESS_TRACKER](./PROGRESS_TRACKER.md) (history). Cloud saves (Clerk + Vercel) stay last.

7. **Field kit and getting stuck** (Nov 22): tow truck in the phone's Contacts, 12 V pump + plug kit, and now silt beds / soft sand that bog a slow car (`src/bogDown.js`, `src/worlds/softGround.js`, `game/recoveryWork.js`) with a shovel and traction boards to get out. Next: winch that anchors to a tree (Chris: winches grab trees), then tow strap. Numbers are PROPOSAL: tune by feel.

## Open questions for Chris (still open as far as we know)
- Explorer: should unfound places show real names or "???".
- Is Phase 2+ open; lock cabin/boat into canon; does Al sell trailers; are the El Cajon and Dusty's gift canon (**CANON? not locked**).
- Prices in the shop are placeholders.

## Known rough edges
- Bridges have no solid rails (you can drive off the side); water ripples are cosmetic.
- Full-lock turns at high speed still roll the Bug and trucks (tall body, not the tires).
- Terrain mesh is 2.5 m at best, so whoops (7-19 m) look faceted (in the handoff for ChatGPT).
- Not tested by hand yet: long-travel soak, handling profiles, wet brakes, drowning, bridges, service by hand.
- Pre-existing: nearly-black truck material.
