# Benches and crafting (PLAN, Nov 27, 2026)

Chris's idea (Nov 27): the build menu turns into benches you physically build: a crafting bench, a workbench, a table saw, a welding bench, a tube bender and so on. Storage (tire rack, battery rack...) is just storage you can place anywhere. Walt's garage gets dialed back to a plain mom-and-pop shop, and bringing it all in is your job. Materials are bought, scrapped or found in the world, the way Conan Exiles, Satisfactory, Deadside or The Front do it, but **slight**: this is still a mechanic and racing game first.

Everything below is a **PROPOSAL** unless marked picked. Numbers are guesses to tune by feel.

**Chris picked (Nov 27): all four recs.** Starting garage B (Walt's machines there but broken), physical material stacks, four materials now, machines bought with benches you build.

**Phase 1 built (Nov 27):** blueprints for the tire shelving, supply shelving and parts rack (`game/blueprints.js`, `game/bpWork.js`). Materials are put in from the tally until Phase 4 makes them physical.

**Phase 2 built (Nov 26):** steel and fasteners (`game/materials.js`), cutting 2 scrap into 1 steel with the angle grinder at Walt's workbench (it moves to the grinder station in Phase 3), and hold-click salvage for the loose crate and oil drum (`game/matWork.js`). Still to come for salvage: wrecks, sheet metal and wiring.

## The idea in one line
You place a blueprint, bring the materials, and build it by hand. What you can make depends on which benches you have built.

## 1. Two kinds of things you build
- **Stations (benches) do work.** Each one unlocks its own recipes.
- **Storage just holds things.** It can go anywhere: garage, side bay, yard. It has no recipes.

## 2. Stations (PROPOSAL)
Machines (welder, table saw, bender, grinder) are **bought** (Parts Online, Classifieds used, or Walt's old ones repaired). The **bench or table that holds a machine is built by you**. A machine only works mounted on its bench.

| Station | You build it from | Needs | What it makes |
|---|---|---|---|
| Sawhorses | 4 wood, by hand | nothing | simple wood things: a plank shelf, a crate, a second sawhorse |
| Workbench (Walt's, worn) | already there; a new one is 8 wood + 6 fasteners | nothing | racks, bins, small assemblies, servicing, repairing broken machines |
| Grinder station | 3 wood + 2 fasteners + a bought angle grinder | power | cuts scrap metal into usable steel stock (the only "refining" step) |
| Welding table | 8 steel + 4 fasteners + a welder | power | steel racks, an engine stand, brackets, ramps, a roof rack, trailer parts |
| Table saw station | 6 wood + 4 fasteners + a table saw | power | cabinets, a desk, better shelving, a lumber rack |
| Tube bender station | 4 steel + 4 fasteners + a tube bender | nothing | shock hoops, cages, tube bumpers |
| Later | | | drill press, parts washer, tire machine and battery charger, which are buy-only props today, become mounted machines |

## 3. Storage (place anywhere, PROPOSAL)
- **Tire rack**
- **Battery rack**
- **Parts shelf**
- **Supply shelf**
- **Parts bins**
- **Drum rack**
- **Tool cabinet**
- **Lumber rack and steel rack**, which hold your materials if materials become physical (question 2)

Each is built at a station, or bought ready-made for more money.

## 4. Materials (PROPOSAL: four now, two later)
| Material | Where it comes from |
|---|---|
| Wood (planks) | forest finds, pallets and crates broken up, fence or barn-wood lots on Classifieds, the supply yard, Dusty's |
| Scrap metal | the yard, the dead fridge, drums, wrecks, junk lots |
| Steel stock (angle, flat bar, tube) | bought, or cut from scrap at the grinder station |
| Fasteners (bolts, screws) | toolboxes and drawers, Dusty's, salvaged from furniture and wrecks |
| Later: sheet metal | fridge, drums, car panels (for body work) |
| Later: wiring | appliances, wrecks (for lights and power) |

**Salvage is the "scrapping" part:**
- **How:** hold-click junk with the right tool to take it apart for materials.
- **What it gives:**
  - fridge: scrap, sheet metal and wiring
  - drum: sheet metal
  - pallet or crate: wood and fasteners
  - wrecks: scrap, fasteners and more

## 5. How building feels (hands-on, simulation-forward)
1. Pick a blueprint and place its ghost (the build mode you have now).
2. The ghost shows what it still needs, for example "wood 3/8 · fasteners 0/6".
3. Bring materials to it: carried, or taken from storage within reach.
4. Hold-click with the right tool (hammer, wrench or welder) through two or three stages: frame, top, done.
5. **Taking it down refunds 100% of its materials** (canon #024: you only get your own materials back).

## 6. The ladder
1. **By hand:** sawhorses, a plank shelf, crates.
2. **Workbench:** racks, bins, repairs to Walt's broken machines.
3. **Grinder:** scrap turns into steel.
4. **Welding table:** steel furniture and the first car fabrication (brackets, roof rack).
5. **Table saw:** nicer wood furniture.
6. **Tube bender:** race fabrication (hoops, cages).

**Gating:** you are only limited by which benches and tools you have, never by levels or XP (canon rule 7).

## 7. Walt's garage at the start (Chris picks)
Canon (locked) calls it "a repair and welding shop established in 1968" with "old tools and neglected machines", and the Bug's parts sit "on Walt's shelves, the tire rack".
- **Option A, bare mom-and-pop:** the lift (customers need it), Walt's worn workbench, one tire rack, one shelf, the pegboard with hand tools, and the breaker. Everything else you build or buy.
- **Option B (rec), A plus Walt's old machines, broken:** his welder under a tarp, an old grinder and the compressor. Repairing them at the workbench is cheaper than buying new. This fits canon as it stands and makes "fix the place up" (Walt's letter) a real job.
- **Either way:**
  - The engine stand stays. The opening needs it to get the Bug's plugs in.
  - Old saves keep everything they have.

## 8. What already exists and gets reused
- **Build mode** (ghosts, snapping, move, store, sell) becomes the blueprint placer.
- **`home.js RECIPES` / `fabricate`** (racks, shock hoops) become station recipes.
- **`game.mats`** (scrap and wood, the Nov 27 tally) grows to the four materials.
- **World finds** (`matFinds.js`) and the **phone browser** (supply yard, Classifieds) are already material sources.
- **Hold-click work** (`HoldBar`, the finish jobs) becomes the build stages.

## 9. Guard rails (so it never turns into busywork, canon rules 8 and 14)
- **What you craft:** shop furniture and fabricated race parts only. Car parts are still bought, found or salvaged whole.
- **No upkeep:** benches never wear out or need fuel. No hunger, no durability grind.
- **Small numbers:** a rack is a handful of materials, not a stack of 500.
- **Nothing is forced:** buying ready-made always works, just at a higher price.

## 10. Build order (one at a time)
1. **Blueprint and hand-build:** place a ghost, deliver materials, hold-click stages, 100% refund. Move today's crafted racks onto it.
2. **Materials:** add steel and fasteners; the grinder turns scrap into steel; salvage junk for materials.
3. **Stations, one by one:** sawhorses, then the workbench (recipes move onto it), then the welding table and welder, then the grinder, then the table saw, then the tube bender.
4. **Storage:** lumber and steel racks and a battery rack, plus physical materials if chosen.
5. **Dial back the starting garage** (Option A or B). This comes last, so a new game is never stuck on something not built yet.
6. **Models and sounds:** the benches and machines need real models (ChatGPT or Meshy) and sounds (saw, grinder, welder).

## 11. Questions for Chris
1. **Starting garage:** A (bare) or B (Walt's machines there but broken)? Rec: B.
2. **Materials:**
   - **Physical stacks (rec):** you carry them, store them on a lumber or steel rack, and benches use what is within reach. This follows canon rule 6, "no magic stock".
   - **A simple tally:** what we have now.
3. **How many materials now:** four (wood, scrap, steel, fasteners), or all six? Rec: four.
4. **Machines:** bought, with you building their benches (rec), or crafted entirely?
