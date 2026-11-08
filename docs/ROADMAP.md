# Project: Baja — ROADMAP (regroup, November 8, 2026)

One page that says where everything stands. Written because work had spread across several pages and half-finished systems. Read [CANON](./CANON.md) first. Labels: **PROPOSAL** = a design guess, not decided. **CHRIS IDEA** = Chris asked for it, not yet scoped or locked in canon. Nothing here invents lore.

## 0. FOCUS (Nov 8, Chris): main game only. Dev testing tools (Build Sandbox, Placement Lab) are ON HOLD; do not extend them until Chris says so.

## 1. Where everything lives (all on `main` now)

| What | Where to open it | State |
|---|---|---|
| The game | `/` | Playable. Garage, county, Bug, '84 truck, odd jobs, build mode, upgrades, index (I). |
| Placement Lab (test room for the new grid placement) | `/?lab=placement` | Works. Test scene only. |
| Placement in the real game (cargo, sell/store, click place) | in the main game, ON by default (no flag) | Stage 3 cargo shipped (Bug trunk, truck bed, roof rack, trailer data); Stage 4a sell/store and 4b click placement shipped; 4c tire racks in progress. |
| Build Sandbox (dev tool, build with all pieces, export/import) | `/buildlab.html` | Works. Only the 8 building pieces plus the garage so far. **Chris wants all parts in it.** |
| Click to pick up (E no longer picks up) | in the main game | Live, not behind a flag. |

Open each flagged page from the dev server (`localhost:5299`). None of these are linked from the game on purpose.

## 2. Done (see [PROGRESS_TRACKER](./PROGRESS_TRACKER.md) for detail)
Garage start, breaker, letter, Grandma's Bug and restoration, #7 under the tarp, shock hoops quest, odd jobs, trailer fix-up, 6 km county with real terrain and textures, map (M), fleet and '84 truck, fit and detach glow, build mode with materials and the new HUD, upgrades panel (lift, parking, office), index (I), settings and creative mode, placement rules plus lab, like-items clipping, Bug cargo.

## 3. Half finished (the "sitting on another page" list)

1. **Placement Stage 3 (vehicles): DONE.** Open question only: the truck bed fits **3** upright tires across (wheel wells 0.84 m apart), not 4. There is still **no towable trailer** (data format is ready).
2. **Placement Stages 4c–6.** 4a (sell/store) and 4b (click place) shipped; 4c tire racks in progress; then 4d bench/lift/pegboard and tool slots, 4e wall surface, 4f retire the B menu for furniture, then world placement (5) and versioned save (6).
3. **Build Sandbox parts.** Add fences, props, furniture, vehicles and parts (needs export format v2). Hide the axes in Game view. Then the step that turns an exported build into a **placeable template in the world** (not built).
4. **Truck cargo bug: FIXED** (`5f80a4e`). The truck model was turned 180 degrees so it drives front-first, and wheel, cab-eye and bed data were adjusted.
5. **Scrap heap "pick through"** is still on E. Needs a decision.
6. **Carried over from the tracker:** the whole play-test list (frame rate on 6 km, load time, battery start, doors), old-save handling, licence check for the public web build, tire condition ("bald"), a physical jack, a real manual save with versions and backups.

## 4. Chris's backlog, organised

**A. Phone + PC ecosystem (Rockstar-style).** *Decision Nov 8 (Chris): the phone REPLACES the Esc pause menu. Opening it is how you save, exit, change settings, browse the internet, see car sales, order parts, and so on. Note: browsers always release the mouse on Esc, so Esc must open the phone as the mouse is released, and a second key (PROPOSAL: P) opens it too.* Home screen with mini apps: the Index (wiki-style, not called "wiki"), jobs, SMS with suppliers and clients, story log. Walt's PC for ordering parts and looking up vehicles. *App list to be designed together.*
**B. Garage furniture.** Everything movable. Tire racks show real tires, shelves show real items.
**C. Tool spots.** Pegboard outlines become missing-tool slots. Grandpa had the basic, older tools; welder, bender, grinder and other specialty tools are bought or found.

**D. Chris's new list (pasted November 8):**

| # | Idea | Fits with | Phase note |
|---|---|---|---|
| D1 | **Order supplies; a delivery truck drives in on the map** and you can see it coming before it arrives | A (phone/PC ordering), map, answers the open "deliveries" question | Needs the phone/PC and a map-marker system |
| D2 | **Tow trucks drop people off**; people and tow trucks are visible driving in, on the map, like deliveries | D1 (same "arriving vehicle" system), odd jobs | NPC routines are Phase 3 |
| D3 | **Familiar faces** (town or neighbours) stop by, check in, get repairs, sometimes bring **photos or objects to hang in the shop** (puzzle pieces about Grandpa) | Story rules (letters, photos, objects), Stage 4 (hang on walls), phone story log | Phase 2–3. Needs a wall-hanging surface in the placement system. Which NPCs say what is UNKNOWN. |
| D4 | **Barn is checked off** when you take everything out | Small, existing barn + map | Can do now |
| D5 | **Map is turned around**: it doesn't follow or point the player correctly | Existing map (M) | **Bug fix, do now** |
| D6 | **Expand the map** beyond Baja County: Baja peninsula, coastal California, high desert Mojave, Arizona, Utah, Mexico | Canon "Living Frontier" (TARGET, Phase 5: streaming beyond the core) | Phase 5. Do D5 first, because a bigger map needs a correct one. |
| D7 | **Grandpa's cabin** in a snowy high-desert mountain town (Julian / Flagstaff feel): a garage there full of his things, tools, parts, and family and racing history | D3, Vein-style haul (needs truck or trailer), D6 | PROPOSAL, new lore. See section 5. |
| D8 | **Trailers you can buy**: enclosed and flat bed, towable by the Bug and by a truck | Stage 3 trailer surface, D7 | Towing is Phase 5 in the blueprint. Stage 3 has the data format ready. |
| D9 | **Grandpa's small fishing boat** on a trailer at a friend's lake cabin; fix up, sell, or upgrade and fish | D8 | Later game. PROPOSAL, new lore. |

### Things that should be built together
- **"Arriving vehicles" system = D1 + D2 + D3.** One system: a vehicle spawns far away, drives in on the road, shows on the map with an icon, and stops at the yard. Delivery trucks, tow trucks and visitors are the same code with different cargo.
- **Map fix + expansion = D4 + D5 + D6.** Fix orientation and add the barn check first; the bigger map comes later.
- **Haul trip = D7 + D8 + Stage 3.** Trailers need cargo surfaces; the cabin needs a trailer. Build the trailer once.
- **Photos on the wall = D3 + Stage 4.** Hanging things needs a wall surface in the placement system, so plan it in Stage 4.
- **Ordering = D1 + phone/PC (A).** One order screen that feeds the delivery truck.

## 5. Lore check (needs Chris before anything is built)

Nothing below is in [CANON](./CANON.md), so it is **PROPOSED by Chris, not locked**:
- **The cabin (D7).** Who owned the house, which town, who tells the player to collect the things, and what is in it are all **UNKNOWN**. Canon story rules still apply: nothing forced, the #7 reveal optional, a player who never goes still has a complete game. The cabin should be optional.
- **The boat (D9).** Same: whose lake cabin, which friend, all UNKNOWN. Canon names no family members besides Walt, the grandmother and the co-driver.
- **Map names (D6).** Real regions (Mojave, Baja California) are fine as geography; any town, person or business inside them is still unknown.
- **Phase gating.** Canon says only Phase 1 / Slice A is open. D1–D3 and D6–D9 are Phase 2–5. Chris has been opening later phases on request; **please confirm those phases are open** (already an open question).
- **Refund rule.** Settled: canon #024 says 100% refund and the game now refunds 100% (doorway close and furniture sale).

## 6. Suggested order (PROPOSAL)
1. **Now, small:** map orientation fix (D5), barn check-off (D4), Build Sandbox: all parts.
2. **Finish Stage 3** (truck bed, roof rack, drive test), plus a real towable trailer (D8) so the format is proven.
3. **Stage 4:** garage furniture on the grid, with a wall surface for hanging things.
4. **Phone + PC** (A) with ordering, then **arriving vehicles** (D1, D2, D3).
5. **Stages 5–6:** world placement and versioned saves.
6. **Cabin and haul trips** (D7), then **map expansion** (D6), then the **boat** (D9).

## 7. Open questions for Chris
- Is Phase 2+ now open, so work on D1–D3 can start?
- Lock the cabin and boat into CANON? If yes, who gave the player permission to collect things, and what is the town? (UNKNOWN until you say.)
- Truck bed: wider bed, smaller tires, or mount spots over the wheel wells?
- Scrap heap stays on E?
- Should the Index keep its I key once it's a phone app?
