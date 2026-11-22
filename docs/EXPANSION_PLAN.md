# Garage expansion plan (planning only, nothing built yet)

Walt's place starts at level 0. The new owner can take the garage, office and living quarters to levels 1, 2 and 3. It is a levelled track like the upgrade stages in `worlds/upgrades.js`, and it grows into a mechanic shop and an off-road race team garage. No gas station.
Reference photos from Chris (Nov 22): corrugated steel building with a two-story office block and roll-up doors; empty big-box warehouse shell with columns; polished epoxy showroom with long light rows and a balcony; race team shop with car racks along the walls.

## 1. Everything moves
- Free on the grid: benches, racks, shelves, tool chests, tire machine, balancer, compressor, parts washer, furniture. Pick up, rotate, drop, saved.
- Wall items (wall racks, pegboards) snap to a wall.
- Lifts sit in bay spots (default: snap to bay spots, not anywhere on the floor). Doors and windows belong to the building.
- Built on the staged placement system (`docs/PLACEMENT_SYSTEM.md`), not a second system.

## 2. Garage levels
| Level | What | Look |
|---|---|---|
| 0 | Walt's old shop (now) | current |
| 1 | Working shop: 2 lifts, 4 bays, bench wall | corrugated steel, roll-up doors |
| 2 | Pro shop: 6 bays, epoxy floor, bright light rows | polished floor |
| 3 | Race warehouse: 10+ bays, car racks on the walls, display floor, fuel room | open columns, racks |
Every level has vehicle bays; level 3 has rack bays that hold cars off the floor.

## 3. Office levels
0 desk, old PC, phone. 1 counter, waiting area, back room. 2 parts counter and supplier desk (faster orders). 3 two-story office block with a balcony over the floor, team room and race planning wall.

## 4. Living (recommended, Chris to confirm)
0 the camper as now. 1 covered breezeway camper to garage. 2 bunk room. 3 apartment above the office block.

## 5. Mechanics (Chris, Nov 22)
- The shop hires **several mechanics**. Each has **skills** (engine, suspension, body and paint, tires and wheels, fab and welding, electrical and diagnosis, race prep), and skills grow as they work.
- Mechanics are **paid by the player** out of earnings and shop income. A shop that cannot make payroll loses people.
- Skills decide which jobs they can take, how fast, and how well. Better crew means the player's own vehicles and the race program move forward.
- Customer cars pile up once the level 1 shop exists. A mechanic takes a bay and works the job. The player still does hands-on work.
- Shop growth: helper, crew, full mechanic shop with a service manager, then the off-road race team garage (team hauler at the top).
- Mechanics are generic until Chris names them. No lore is invented. Add to CANON once confirmed.

## 6. Fuel
No public pumps. One on-site tank (level 2 or higher) for race vehicles only.

## 7. Art
Basic box buildings with correct doors and bay markers. ChatGPT polishes later (specs go in `CHATGPT_HANDOFF.md`).

## Build order
1. Everything-moves. 2. Garage levels 1-3 (shell and bays). 3. Office levels. 4. Living. 5. Mechanics (hire, skills, payroll, job queue). 6. Fuel room.

## Open
- Living quarters design (rec above). Customer pile-up default: starts at level 1.
