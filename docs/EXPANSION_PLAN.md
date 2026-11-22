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

## Expansion rules (Chris, Nov 22: "give it rules")
Layout rules, checked by tests (worlds/garageLevels.js layoutProblems):
1. Every bay is inside the building and overlaps nothing (other bays, bench wall, aisle, racks).
2. A car can drive into every bay without crossing another bay: its own roll-up door, or a drive aisle with a roll-up door.
3. Doors sit on an outside wall, fit its span, never overlap.
4. Always a bench wall (solid, 6 m or more, no bays): west wall behind the office. Wall items whose wall is removed move there.
5. Car racks are reachable from the aisle.
Look rules (worlds/GarageExtension.jsx):
- New steel, not Walt's rust: clean panels outside, white liner and grey kick plate inside.
- A real white ceiling with steel beams and columns, not a dark void.
- Roll-up doors where the layout says (raised, bump posts, concrete apron outside).
- Lights that light the room when the power is on.
- One slab with the old shop: fresh concrete (level 1) or flake epoxy (2-3); painted, numbered bays (number at the end the car drives in from).
- Level 3 is taller (6.4 m) for 3-high car racks; marked drive aisle with a big door at each end (east E1, west W1: drive-through).
- No columns in a door opening or on the bench wall; the old back wall opening is framed by a steel header and jamb posts (the pass-through).
Plan diagram: viewer/bug_viewer/screenshots/garage_plan_0_3.png.

## Status (Nov 22)
Built: levels 1-3 to the rules above. L1: 2 new bays with back doors. L2: 4 new bays with back doors, epoxy. L3: 4 bays on a drive aisle, big east door, 3 car racks x 3 tiers (9 cars). Lifts snap to bay spots. Pegboard moves to the bench wall when the back wall opens.
Decided: level 3 keeps 6 floor bays plus 9 rack spots for now (growing west past the office can be a later step). Cars reach the back doors around the east side, between the shop and the camper.
Not yet: Walt's workbench still stands where it was (free-standing, move it by hand); doors are always open (no open/close); doorway through the office's back wall; benches/storage for the new floor.

## Office levels plan (PROPOSED Nov 22, waiting for Chris to approve)
Diagram: viewer/bug_viewer/screenshots/office_plan_0_3.png. The office grows into a new wing 4 m x 12 m west of the old office (x -17.2..-13.2, z -6..6; the existing annex stage lives inside it). It does not touch the garage extension (that starts at z -6.6, further west is the L3 west drive).
- L1 customer office: wing with a customer door at the front, waiting seats, service counter in the widened (3 m) wall doorway, back room with a desk and files.
- L2 parts counter: the back room becomes a parts room with shelves; parts counter plus supplier desk (faster orders).
- L3 two-storey block: stair up in the wing; upstairs team room, race planning wall; a balcony through the old office's east wall over Walt's shop floor (3.1 m up).
- Open: the apartment (living L3) shares the upstairs with the team room, or goes elsewhere. Chris to say.
