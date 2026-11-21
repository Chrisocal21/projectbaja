# Controls, vehicle storage, crates, the El Cajon and ordering: plan

Written November 21, 2026 from Chris's list. Labels: **PROPOSAL** = my design guess. **CANON?** = needs Chris's sign-off before it goes in the game (canon is locked in [CANON](./CANON.md); no invented lore). Reads with [SALVAGE_MERGE_PLAN](./SALVAGE_MERGE_PLAN.md).

## 1. Controls (target scheme)

| Input | Does | Status |
|---|---|---|
| Hold left click | Bolt a part on / take a part off. A **bar fills** (0.8 s, PROPOSAL); release early and nothing happens | **Built Nov 21** (`game/HoldBar.jsx`, `main.jsx` `startHold`). Right-hold currently takes a part off |
| Tap left click, item in hands | Drop / put the item down | Built for "at the car with a fitting part"; elsewhere left click still places via the placement system (see Q1) |
| E | Get in/out, open/close a door, open chests and boxes | Mostly built. Open: close the door of the vehicle you're in |
| L | Vehicle lights on/off | **Not built** (no light code found). Needs headlight meshes to emit, plus a bar/key hint |
| M | Map | Built |
| Tab | Inventory; at or in a vehicle it opens that vehicle's storage | Tab is inventory now; F is car storage. Merge them (Section 2) |
| Q/E/R, wheel | Rotate a held item while aiming it | Built (placement) |

Q1: placement's locked rule is "left click picks up and places". You said "left click is drop item". I read it as: with an item in hand, tap = drop/place, hold = fit. Tell me if you want right-click to stay as "put down" too.

## 2. Vehicle storage, re-balanced

What exists: the placement grid (`placement/vehicleSurfaces.js`) already has the Bug's **front trunk under the hood** (needs hood open), **roof rack** (needs the rack fitted) and the pickup's **bed with tire mounts 5 to 8**; older unit storage (cab 3, bed 16, sizes 1 to 4) still drives F auto-stow.

To do (PROPOSAL):
1. **One storage panel per vehicle**, opened with Tab when you are in or beside it. Areas: front trunk (hood), back seat, roof rack, bed. Each area has its own capacity shown in the panel.
2. **Back seat** as a new cargo surface on the Bug (data only: size, height clearance).
3. **Re-balance capacities** so space is a real limit: the grid is the limit for new surfaces; retire the size-unit totals once every area is on the grid. Needs a pass over item sizes (Q2).
4. Hood must be open for the front trunk; the roof rack must be fitted: both already rules.

## 3. Crates and tire racks for trucks

PROPOSAL: a **crate** is a storable container item you place on a bed/rack surface; it holds a fixed grid of small items and moves as one object. **Tire racks** = bed mounts already built (pickup bed mounts 5 to 8); add a roof/rear tire carrier like a prerunner for the Bug later. Salvage Road's bed-load view (`render/bedLoad.ts`) is the reference for drawing contents.

## 4. The El Cajon

You want the Salvage Road El Cajon in the game as the **shop vehicle / daily driver**, delivered in pieces to Walt's shop and rebuilt by hand from found and bought parts. It's a good fit with the existing restoration rules.

- **CANON?** "Gifted by a neighbor business" is new story. Canon today has Al (lot), Dusty (gas) and Walt's letter. Open question 15 in [OPEN_QUESTIONS](./OPEN_QUESTIONS.md) already asks whether it appears at all. Needs your decision on who gives it and why. Until then I'd build it as an **unlabelled delivery** to the pickup area (same as phone orders: "no driver, no truck, no lore").
- Work: port the El Cajon model and its 15 parts (`salvageroad/src/render/elCajon.ts`, `rules/carParts.ts`) as a second restorable `VehicleDef`, rebuilt in R3F. Its parts need names, prices and sources in Baja's catalogue. This is merge-plan step "second restorable vehicle", moved up.
- All other vehicles are found later (Phase 2 in canon).

## 5. Ordering parts and garage supplies

Built already (job 4): order from the phone, paid in cash, a box arrives at the pickup area after a few hours (`game/orders.js`, `orderlogic.js`).
To do: a **garage-supplies category** (what Walt's shop needs to run: oil, shop rags, consumables) and **El Cajon parts** in the catalogue. What counts as "needed to run the garage" is a design call (Q3); canon says no magic stock and $1,500 start.

## Order of work (PROPOSAL)

1. Controls: hold bar (done), L lights, close-door, merge Tab and car storage.
2. Back seat surface and storage panel with re-balanced capacities.
3. Crates and bed tire racks.
4. El Cajon as a second restorable vehicle, delivered unlabelled; then the neighbor story once approved.
5. Garage-supplies ordering.

## Open questions

- Q1 above (left and right click when holding something).
- Q2: should item size/weight change, or only vehicle capacity?
- Q3: what does the garage need to run? (List and I'll price them as placeholders.)
- Canon: who gifts the El Cajon, and is it in Phase 1?

## Progress (Nov 21)

- **Workshop (X) removed.** The panel, the key and the "X — Workshop" hints are gone. At any buildable car: aim at a part and **hold left click** (bar fills) to take it off; it lands on the ground beside you. Pick up the new part with a click, stand at the car and **hold left click** to bolt it on. Right click puts down what you hold.
- Removable by aiming: every body piece, the four wheels, the engine, the battery (new small model up in the engine bay, position is a guess), bolt-on upgrades, and the body shell (once everything else is off).
- Not tested in the browser yet. Known gaps: the battery's spot, how the engine's glow looks, parts fall at one spot (no stacking), and the old "won't start, missing: ..." summary that the panel showed is only in the seat prompt now.

## Status update (Nov 21, end of day)
- Built since this plan was written: hold-left to take off now works on any restorable vehicle (donors, El Cajon); the El Cajon exists as a restorable project delivered by Dusty (CANON? not locked) with phone/PC Parts online ordering. See [REPAIR_AND_WORLD_PLAN](./REPAIR_AND_WORLD_PLAN.md).
- Still not built: L lights, Tab merged vehicle storage, back-seat/roof storage rebalance, truck crates and tire racks, a drivable El Cajon (with its bed storage), garage-supply ordering categories.

## Status update (Nov 21, Group B and C)
- Built: L headlights, Tab inventory for every nearby vehicle, tire mounts on the El Cajon bed, and **garage-supplies ordering**: the phone's Internet app and the office PC Parts tab have **Supplies** (oil, bulb, plug kit, wipers, fan belt, car battery) and **Tools** (wrench, floor jack) tabs. Data is pure (`game/garageSupplies.js`, tested); an order is `{ kind: 'garage', id: 'supply:oil' }` and arrives boxed at the shop pickup like a part. Prices equal Dusty's over-the-counter prices (a test checks that), so ordering saves the walk, not the money; Dusty's store stays the faster source (no wait). Q3 (what the garage needs to run) is answered with the existing job supplies; more items are one line each in `GARAGE_SUPPLIES`.
- Still not built: a combined back-seat surface for the Bug (it already has trunk, shelf and roof rack as grid surfaces), crate building.
