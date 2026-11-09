# GAMEPLAN (Nov 8, 2026) - read, add your own lines, then we go top to bottom

Sources merged: RESUME_HERE, ROADMAP, PROGRESS_TRACKER notes, your messages. **PROPOSAL** = design guess. Nothing here changes [CANON](./CANON.md). Add items under "CHRIS ADDS" at the bottom.

Goal: **everything up so progress can be saved**, then bigger map and more biomes.

## DONE Nov 8 (quick wins, all on main)
- Floor jack lives on the floor (46c11ad). Hologram wall + "Area closed for now" text (9abae17, b735e1b), not yet seen at the edge.
- Simple phone on Esc with placeholder apps (9a083fb). Shelf text fixed (706f0cc). Pegboard wrench outline (90cb35d).
- Map turn-around fix and barn check-off were already done (8f8ebc7). Duplicate `bench` key was a false alarm.
- Update button + Save/Export/Import in the phone (93302cc). Real tires with tread + tree colliders merged (d3eb572). WIP branch deleted.
- Starting stock: already has a pack wrench, random shop loot and 4 worn tires; nothing more added (anything else risks canon: Dusty's supplies, no magic stock). Needs Chris's call.
- Skipped as too slow for now: letter as item (needs item system + wall surface).

## TOKEN PLAN (big first while tokens are full, small at the tail before reset)
**Phase 1: big jobs (use agents, one at a time, verify in browser, commit after each)**
1. Letter as an item + wall surface (4e): hang letter/photos, pegboard snaps to walls.
2. First new region: bigger map grid, move the hologram wall, new biome (needs Chris to pick direction + biome).
3. Phone apps: design chat first, then build the real ones (Jobs, Texts, Orders, Index).
4. Arriving vehicles + ordering (deliveries on the map). Needs Phase 2+ answer.
5. Clerk login + Vercel cloud saves (last of the big ones).
**Phase 2: medium (when about half the tokens are left)**
6. Save slots. 7. Stage 4f (retire B menu for furniture). 8. Trailers / towing.
**Phase 3: tiny, for the last tokens before reset (one line each, no agents)**
- Tune hologram wall brightness/text. Tune tread label cut-offs. Phone icon names/art. Prompt wording fixes.
- Add Chris's play-test findings as one-line fixes. Doc updates. Delete stale branches.
- Rule: start a big job only with plenty left; if tokens run low mid-job, commit what works on a branch, never half-merge.

## CHRIS'S PHASE 1 ORDER (Nov 8, set this order)
1. Letter as an item + wall surface (hang things, pegboard snaps to walls).
2. First new region: bigger map, hologram wall moved out. Plan + my picks (south, Scrubland, 2 km strip): [REGION_PLAN.md](./REGION_PLAN.md).
3. Real phone apps, after a design chat.
4. Arriving vehicles and ordering (needs the Phase 2+ answer).
5. Clerk + Vercel cloud saves. Prep done: see [CLOUD_SAVES_PLAN.md](./CLOUD_SAVES_PLAN.md).

**Status, Nov 9 2026:**
- 1 done. 2 done (Scrubland). 3 mostly done: real apps are Map, Internet, Money, Save, Settings, Index, Upgrades, Story log, Jobs, Orders, Camera. Still placeholders: Texts, Contacts (need lore), Car sales (need stock and prices), Radio, Weather.
- 4: ordering, map marker, Orders app and a visual delivery truck are done (truck has no collision or sound, follows the first order only).
- Camera/Feed: photos with place, coordinates and facing; purple map dots; Print needs a $120 photo printer (Internet > Gear, PROPOSAL).
- 5: built and deployed, NOT yet tested signed-in. Clerk login (phone > Save > Account), `/api/save` (Clerk-checked, private Blob, main + 3 backups), Upload/Download buttons with a question before any overwrite. Env vars set on Vercel production (Clerk keys, Blob token). Not built: automatic upload on save; preview-deploy env vars; sign-in method choices (needs the Clerk app claimed). A spare empty Blob store `projectbaja-saves2` should be deleted in Vercel.
- Controls (Nov 9, PROPOSAL): E picks loose items into the pack, left click holds them, right click puts down (G retired). Hold left click bolts the held part on, hold right click takes the aimed part off (E/R retired for this). At the Bug, E only acts on what the crosshair is on: door handle toggles that door, a seat sits, hood/engine lid toggle (Q retired). Box sizes in src/game/carAim.js are guesses to tune by hand.
- Title screen: logo reads PROJECT:BAJA, logo and menu at bottom centre.
- Grandpa's #7 in the garage now uses a Meshy body (rough, PROPOSAL look). Art and models are on hold; making it drivable is parked.

## 0. Start-of-session checklist (5 min)
- [ ] `git status`, `git switch racer-items-fitglow`, `git fetch` (compare with `origin/main`, local `main` is stale).
- [ ] Open the live Vercel site once. Confirm it loads.
- [ ] Decide what to do with branch `wip-unfinished-nov8` (see step A).
- [ ] Agents use their own vite ports (not 5299/5411/5417/5530/5611). Close them afterward.

## A. (DONE, merged) Half-built work. Still to PLAY-TEST by hand: fitting a tire on a car, position after Save and update, trunk colliders, summit trail, teleports
Do one at a time: play-test in a real browser, fix, merge to main, push.
1. **Update button** ("Update ready - Save and update"), Save now, Export/Import, New-game confirm. Returns to the exact moment, click-to-continue overlay. *Most important: this is your main goal.*
2. **Real tires** (size, fit, tread; every shop tire usable on vehicles).
3. **Trees/rocks colliders + summit lookout + number-key teleports.**
4. Look into: `game.onFoot` was false right before a reload in one run. A brand-new game has no car pose until the car is driven.

## B. Saves (must-do #1)
5. Save steps 4-6: IndexedDB backups (keep newest 5), save slots, prune old backup/corrupt keys.
6. **LAST:** Clerk optional login + Vercel storage cloud saves (guest still saves locally, same save file).

## C. Bigger map and biomes (must-dos #2, #3)
7. Check the hologram wall by driving to an edge (built, not seen). Brightness OK? Add the "Area closed for now" text (PROPOSAL).
8. First new region: enlarge the map grid, move the wall. Which direction / which biome first? **(your pick)**
9. More biomes later: data-driven registry already exists (`src/worlds/biomes/registry.js`).
10. River splash, drag and sound (later).

## D. Garage and items (small, noticeable)
11. Pegboard: true tool outlines on empty slots (now a pale rectangle).
12. Fix stale shelf text ("move it with V").
13. Letter in the toolbox becomes a normal item (shelf or wall memento).
14. Wall surface (stage 4e): hang the letter, photos. Pegboard snaps to walls.
15. **Starting stock:** real garage items only. No new cash ($1,500 locked), no specialty tools, **no Dusty lore without your OK**.
16. Stage 4f: retire the B menu for furniture. DONE (click furniture to move it; B is now only the shop for new pieces).
17. Clean up: duplicate `bench` key in Walker.jsx, nearly-black truck material, stale :5299 server.

## E. Bigger features (design together first)
18. **Phone replaces the Esc menu** (save, exit, settings, internet, car sales, orders). App list designed together. Key P is a PROPOSAL.
19. **PC in Walt's office** for ordering parts and looking up vehicles.
20. **Arriving vehicles** (one system): delivery trucks, tow trucks, visitors. Shown on the map.
21. Familiar faces bring photos/objects for the walls (needs wall surface, item 14).
22. Pegboard tools as side quests: finding or buying specialty tools (PROPOSAL, not designed).
23. Trailers (enclosed, flat bed), towing. Truck bed holds 3 tires, not 4. Open question.
24. Barn check-off when empty, map orientation (check it is fixed and live).

## F. Later, needs your approval (lore)
25. Grandpa's cabin (snowy high-desert town) and fishing boat. **Not in canon.** Who owned it, town, who tells you to go: UNKNOWN.
26. Real regions (Baja, Mojave, Arizona, Utah, Mexico) as geography. Towns, people, businesses inside: UNKNOWN.

## G. Questions for you (answer any, any order)
- Is Phase 2+ open now (needed for items 20, 21, 25)?
- Lock cabin and boat into canon? Does Al sell trailers? Shacks discoverable?
- Phone key P OK? Scrap heap stays on E?
- Aim radii feel, placeholder prices (bench 400, lift 1500, pegboard 60), wall message wording and colour.
- Keep the Index on I once it is a phone app?

## H. Known rough edges (not blocking)
- Bug is weak on steep climbs. Not browser-tested: bench/pegboard E prompts, many aim zones, Shift+X storing a rack.
- Play-test list: frame rate on 6 km, load time, battery start, doors, licence check for the public web build, tire "bald" condition, a physical jack.
- **ON HOLD:** Build Sandbox (`/buildlab.html`) and Placement Lab. Main game only.

## Suggested order when tokens return
A1 -> A2 -> A3 -> C7 -> D (11, 12, 13) -> B5 -> D14, D15 -> C8 -> E (design chats) -> B6 last.

## CHRIS ADDS
- (Nov 8) The junk pile on the covered #7 (drums, jerry can, crate; `JunkPile` in worlds/Home.jsx) is scenery only. Chris wants it movable or usable (barrels hold oil etc.) OR removed and replaced by things that get dropped off. DONE earlier (commits ab51c03, 4fab893): drums, jerry cans, crate and engine block are real carryable items; only the leaning door is left as scenery. Drums and cans holding oil or fuel is still later.
