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
16. Stage 4f: retire the B menu for furniture.
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
-
