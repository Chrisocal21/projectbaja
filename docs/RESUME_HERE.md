# RESUME HERE (written Nov 8, 2026; big-map section added Nov 9)

Read this first when picking the work back up. Labels: **PROPOSAL** = design guess. Nothing here changes [CANON](./CANON.md).

## Chris's three must-dos (goal: everything up so progress can be saved)
1. **Saves that survive updates** (then Clerk + Vercel cloud saves, last).
2. **Bigger map** with new biomes, expanded in steps behind a glowing hologram wall.
3. **More biomes over time** (Grassland and Forest Mountain are built).

## Big map: real border slice (Nov 9) - behind `?realmap`, pushed in 5d57ad6
- One seamless world from Los Angeles to Cabo (garage in Imperial Valley) on real elevation data, streamed in tiles. Steps 1-5 done; details in [WORLD_MAP](./WORLD_MAP.md). Normal game is unchanged.
- Step 5 roads: Natural Earth highways, graded and blended into the ground, bypassing the built places. Step 5b/5c: stop signs, lights, dead-end signs, rest areas (6) and gas stations (13); freeway ramps exist but only show with `?realmap&ramps` (normal `?realmap` uses at-grade junctions, see [ROAD_WORK_BACKLOG](./ROAD_WORK_BACKLOG.md)).
- Drive tests (steering bot, dev car powered via `game.home.bugFired = true`): diamonds stay within 2.5 m of centre; loops fine at ~25 mph but swing 6.4 m off at ~34 mph (R_LOOP 75 is too tight, try ~100).
- **Next on the map:** loop radius, road joins/junction polish (backlog), driveways + collision for roadside places, overpasses (needs a bridge system), then step 6: biomes by real area, map screen, teleports, make `?realmap` the default. ChatGPT is handling visuals; perf work is in [PERFORMANCE_WORK](./PERFORMANCE_WORK.md).

## Done and pushed
- 4d: bench, car lift and pegboard are movable, sellable props with tool slots (78c4812).
- Save steps 1-3: versioned save envelope, old saves upgrade, corrupt/newer saves protected, job, held item and on-foot position saved (471611f).
- Biomes: Grassland (NW) and Forest Mountain (SE) with a trail and a river crossing, in a data-driven list (ad8ad7c).
- Crosshair-only interaction (683e911), Stage 4a-4c garage furniture, tire racks.

## In flight when we stopped (check git log for what landed)
- **Real tires** everywhere in the shop, with tread condition.
- **Biome follow-ups:** trail to a summit lookout, tree and rock colliders, number-key teleports.
- **Update button:** "Update ready - Save and update" returns to the exact moment (no title screen; a click-to-continue overlay is needed for the mouse), plus Save now, Export/Import save, confirm before New game.

If an agent did not finish, its work may be uncommitted: run `git status` first and check for edits before starting anything new.

## Next, in order
1. **Hologram boundary wall** (blue-cyan, faint grid, "Area closed for now" is a PROPOSAL text) at the current 6 km edge, built as data so a region can move it. Enlarge the map grid only when the first new region is built.
2. **Letter as an item** (shelf or wall memento), wall surface (4e), pegboard snaps to walls, true tool outlines on empty slots, floor jack lives on the floor.
3. **Starting stock:** real garage items only. No new cash, no specialty tools, **no Dusty lore without Chris's approval** (canon: $1,500 locked, "no magic stock").
4. Save steps 4-6: IndexedDB backups (last 5), slots. Prune old backup keys, keep the newest few.
5. Stage 4f (retire the B menu for furniture), then the phone and PC (design the app list together first), ordering, arriving vehicles.
6. **Last:** Clerk login (optional, guest play stays) + Vercel storage for cloud saves, same save file as local.

## Decisions Chris made
- Pegboard: empty slot shows an outline, tool shows when owned. Finding or buying tools are side quests (PROPOSAL, not designed).
- Letter becomes a normal item. Floor jack stays on the floor. Pegboard snaps to walls.
- Backup cannot be written: saving pauses with a warning (my call).
- Biome picks: map stays inside 6 km until the wall plan, summit trail yes, tree colliders yes, teleports yes, river effects later.

## Open questions for Chris
- Phone key P; shacks discoverable; is Phase 2+ open; lock cabin/boat into canon; does Al sell trailers.
- Stale shelf text ("move it with V"); aim radii feel; prices (bench 400, lift 1500, pegboard 60 are placeholders).
- Wall message wording and colour (cyan is the PROPOSAL).

## Known rough edges
- River has no splash, drag or sound. Bug is weak on steep climbs.
- One unexplained reading: `game.onFoot` was false just before a reload in one run (update-button agent was asked to investigate).
- Pre-existing: duplicate `bench` key in Walker.jsx, stale dev server on :5299 (never restart it), nearly-black truck material.
- Not browser-tested: bench/pegboard E prompts, many interaction aim zones, storing a rack with Shift+X.
