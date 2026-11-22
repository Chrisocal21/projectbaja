# TOOLS AND JOBS (Nov 22, 2026)

The game is simulation-forward ([RESUME_HERE](./RESUME_HERE.md)): every job on a vehicle is done by hand with a tool, a part or a consumable. This page is the checklist of all of them, so we build the tool and the job together and nothing is a menu. **Labels:** HAVE = in the game now; RULES = pure rules built and tested, no tool yet; PLANNED = not built. Prices, sizes and phases are PROPOSAL (estimates). Never invent lore: anything that touches the story is marked **CANON?**.

How a job works (the pattern we already use): aim at the thing, hold the click (or E) with the tool in hand, a progress ring fills, the rule runs atomically (`rules/atomic.js`), and a refusal says why ("Grind the rust off first"). Each job needs: a **tool**, sometimes a **fixture** (lift, bench), sometimes a **consumable**, and changes **per-part state** that is saved.

## 1. What exists now (HAVE)
- **Hand tools:** wrench (fit and remove most parts, service shocks / alignment / engine), floor jack (tires).
- **Garage fixtures:** workbench (fabricate, service), two-post car lift, **tire machine** (wheel, rim, tire), air compressor, MIG welder, tube bender, spare engine on a stand, pegboard, tire and rim shelving, supply stands.
- **Jobs:** fit and remove parts by hand (tool-gated), tire change and puncture, service and inspect by hand (hold T), shock hoops by fabricating, wear (shocks, tires, alignment, engine), tire pressure.
- **Rules only (RULES):** panel finish: grind, paint, buff, hose, rust over time, chips (`rules/finish.js`).

## 2. Body and paint (the paint sim)
| Tool or fixture | Job | Consumes | Status |
|---|---|---|---|
| Angle grinder + discs | grind rust and old paint off steel | grinding discs | HAVE (hold-click on fiberglass panels; Admin kit; discs not consumed yet) |
| Wire wheel / brush | light rust, scale, old gasket | wears out | PLANNED |
| Sanding block, DA sander | scuff fiberglass and primer, feather edges | sandpaper (grits) | PLANNED |
| Body hammer + dolly, stud puller | knock out dents from crashes | none | PLANNED |
| Body filler + spreader | fill dents and pits, then sand | filler | PLANNED |
| Masking tape + paper | two-tone, stripes, protect trim | tape | PLANNED |
| Primer, spray can or gun | cover bare metal or glass | primer | HAVE (5 colour cans, hold-click; cans not used up yet) |
| Paint (colour cans, mixed) | colour coat; the **can** is how colour is chosen, never a picker | paint | RULES |
| Clear coat | gloss and protection | clear | PLANNED |
| Buffer + compound / polish | take flat paint to gloss | polish | HAVE (hold-click) |
| Pressure washer, hose, bucket + sponge | wash dirt and mud off | water | HAVE (hose / power sprayer; driving makes panels dirty) |
| Wax, detail kit, shop vac | final shine, clean interior | wax | PLANNED |
| Paint area / booth (yard upgrade) | dust-free painting, better finish | none | PLANNED (fixture) |

## 3. Mechanical (shop and engine)
| Tool or fixture | Job | Status |
|---|---|---|
| Socket set, torque wrench | proper installs; over or under tight is a wear and failure input | PLANNED |
| Screwdrivers, pliers, vise grips | small fasteners, clips, hoses | PLANNED |
| Penetrating oil, breaker bar, impact gun | free **seized** parts (long storage; the #7 buggy's parts are seized by canon) | PLANNED |
| Engine hoist (crane) + engine stand | pull and set engines | stand HAVE, hoist PLANNED |
| Transmission jack | drop gearbox and diff | PLANNED |
| Jack stands, wheel chocks | safe work under a car (the lift covers the garage) | PLANNED |
| Oil drain pan, funnel, grease gun | oil change, grease joints | PLANNED |
| Coolant, brake fluid, bleeder kit | cooling and brake jobs (wet brakes, drowned engine) | PLANNED |
| Compression tester, spark plug socket | diagnose a worn or drowned engine (today's "inspect" clues) | PLANNED |
| Multimeter, battery charger, jump pack | electrical diagnosis, dead battery | PLANNED |
| Shock and spring compressor | coilovers and long-travel shocks | PLANNED |
| Wheel alignment rig, toe plates | proper alignment (we already wear it) | PLANNED |
| Tire gauge, valve-core tool, bead breaker, tire irons | psi (we already model it), deflate for sand, break a bead in the field | gauge + air chuck HAVE (hold on a wheel; one psi for all tires; bead breaker, irons, valve-core tool PLANNED) |
| Wheel balancer | tire vibration at speed | PLANNED |
| Parts washer | clean parts before inspection | PLANNED |
| Creeper, work light | work under the car, dark corners | PLANNED |

## 4. Fabrication
| Tool or fixture | Job | Status |
|---|---|---|
| MIG welder, tube bender | cages, hoops, brackets | HAVE |
| Plasma cutter or torch, chop saw | cut tube, plate, rusted bolts | PLANNED |
| Drill press, bench grinder, vise | brackets, mounts, sharpen | PLANNED |
| Tape measure, level, jigs | accuracy: fit tolerance on fabricated parts | PLANNED |

## 5. Field and recovery (out on the map)
The map has water, mud-free dirt, sand, jumps and flips, so a car will end up somewhere it cannot leave on its own. Recovery is the answer to "I broke it far from home".
| Tool | Job | Status |
|---|---|---|
| Spare tire, tire plug kit, 12 V air pump | fix a flat and re-inflate away from the garage | PLANNED |
| Jerry can, water jug | fuel and coolant in the field | PLANNED |
| Fire extinguisher | engine fire (heat model exists) | PLANNED |
| Shovel, traction boards | dig out of sand, bridge a soft spot | PLANNED |
| Tow strap, recovery strap, shackles | pull a stuck or dead vehicle with another | PLANNED |
| Hi-lift jack | lift and roll a flipped or stuck car | PLANNED |
| Winch (vehicle-mounted), come-along (hand) | pull yourself or another vehicle; anchor to a tree or rock | PLANNED |
| Tree saver strap, snatch block | winch from a tree without hurting it, double the pull | PLANNED |
| Axe, chainsaw | clear a fallen tree from a trail (forest trails exist) | PLANNED |
| Trailer hitch + car hauler / flatbed trailer | carry a car or the #7 | PLANNED |
| Tow truck or flatbed | bring a dead vehicle home | PLANNED (see section 6) |
| Radio / phone signal | call for help only where there is signal | PLANNED |

## 6. Towing and recovery design (PROPOSAL)
**Does Walt's Garage already have a tow truck? No.** There is none in the game and none in [CANON](./CANON.md). The yard has two wrecks (a step van and an unfinished pickup, used as donor wrecks), Grandpa's 1966 camper trailer (a home, not a tow trailer), and the #7 buggy under a tarp. A repair shop of that age plausibly owns an old tow or flatbed truck, but that is **CANON? (not locked): Chris decides**.
Suggested approach, in line with the restoration loop:
1. **Early:** a tow strap (a cheap item at Dusty's) plus any drivable second vehicle (the Bug or El Cajon). You hook the strap to a tow point on each car and drive; the towed car follows on a rope.
2. **Walt's old tow truck (CANON? PROPOSAL):** parked in the yard, not running, a restoration project like the El Cajon. You earn it, and it brings back dead vehicles with a winch and a hook or flatbed.
3. **Later:** a car hauler trailer and a hitch, for racing and long trips.
Physics (how it would be built, when we get there): a **rope or chain joint** between two rigid bodies in `rigid.js` (spring-damper along a line, slack when closer than its length, snap load limit). Today only the driven car is simulated; a towed car needs to become a **passive body** (neutral, brakes off or applied by the player, front wheels free to follow) while attached. Winching is the same joint with a motor that shortens it slowly. Tow points are named mounts on each vehicle model (front and rear), so hooking up is an aim-and-hold job.

## 7. Easy to forget (think about these early)
- **Consumables run out** (discs, sandpaper, paint, polish, tape, oil, fluids, welding wire and gas). Restocking is the supplies loop (Dusty's, the phone's Parts online).
- **Dents and crash damage** need body work, not only parts (hammer, dolly, filler).
- **Seized and rusted fasteners** make a slow, hands-on job (penetrating oil, heat, impact).
- **Diagnosis tools** (compression tester, multimeter, tire gauge) are how inspect clues turn into certainty; today the clues are free.
- **Tool wear and quality:** a worn disc or a cheap strap should fail sometimes.
- **Safety:** jack stands and chocks, so a car can fall if you skip them (optional, realistic, tune later).
- **Storage:** every tool needs a place (pegboard, drawers, truck box). The pegboard exists; most tools have no home yet.
- **Water and power:** the hose and pressure washer need water (a tank exists on the property) and the compressor, grinder and welder need power (breaker exists).

## 8. Build order (suggested)
1. **Grinder, spray can, buffer, hose on one panel** (hold-click), per-panel finish state saved on the vehicle, rust and dirt look. Uses `rules/finish.js`.
2. Tire work out of the machine as a complete job (bead, balance, pressure with a gauge); consumables model.
3. Body work: dents, hammer, filler, sanding.
4. Diagnosis and engine tools (compression tester, multimeter), seized-parts job.
5. Field kit: spare, plug kit, 12 V pump, shovel, traction boards.
6. **Recovery:** tow strap + rope joint, then winch and come-along, then the tow truck and hauler trailer.
7. Trees: axe and chainsaw to clear trails; tree-saver winching.
