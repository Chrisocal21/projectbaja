# Playthrough audit, levels 0 and 1 (Nov 22, 2026)

Method: a fresh save in headless Chrome (state probes) plus reading the loop code. Not a hand play-through; Chris judges feel. Labels: PROPOSAL = a guess.

## What a new save is today
- $1,500, spawn in the yard facing the garage, NO POWER chip, one line from Dusty about odd jobs. No popups (canon). Items lying about: 85 parts, 15 stock, 54 supplies, 13 rims, 5 junk, 3 tools, Walt's letter and a keepsake.
- Loop that works: flip the breaker, flip the OPEN switch, odd jobs arrive (first after about 75 s of play), supplies from Dusty or Walt's stand, hold-click to fit parts, sell to Dusty or Salvage & Surplus, order parts to be delivered (3 h; 2 h with the phone line, 1 h with the supplier account), clear junk for cash, upgrade the house.

## Gaps found, most important first
1. **The Bug's first start is a script, not the car.** `crankBug` (game/home.js) always fires on the third key turn. Battery, fuel and spark play no part, although canon (Slice C, "repairs come from real state") wants a failed start to say why. There is **no fuel in the vehicle at all** (`game.fueled` is only a gas-station flag). Walt's letter says "battery's good", so the first start can stay easy; the point is that a missing or dead battery or an empty tank must matter, and the car must say so.
2. **Nothing connects the customer office to customers.** Office L1 to L3 are built, but customers still arrive one at a time through odd jobs (7 fixed jobs, one customer, one stall). No customer cars waiting, no work orders, no repeat customers, no reputation. This is the "garage business" half of the game.
3. **Jobs are thin and repeat.** 7 jobs, each is "bring one item or a wrench, press a key, get paid". They do not use the hands-on systems that exist now (tire machine, hold-click fit, finish jobs, wear service).
4. **The story has one beat.** Walt's letter is a placeholder (Chris writes it, F10). The #7 tarp, photos and part markings exist as mechanics but there is no found-object trail (letters, photos, clippings, race records) tied to levels 0 and 1. The story log app shows the letter only.
5. **Finding vehicles is scripted, not discovered.** Two for-sale pickups, the El Cajon gift from Dusty (not locked in canon), donor Bugs. Nothing sends the player looking (rumours, a wreck on the map, a barn find).
6. **Money has no pacing.** $1,500 at start, upgrade prices are proposals, job pay is $35 to $110. Nobody has checked how long it takes to afford the first lift, the first order, the first car.
7. Smaller: the letter's own text is a placeholder; the jack is invisible (canon rule 6); the welder and bender ignore power; "bald tire" cannot exist (no tire condition on the first wheel); Texts, Contacts, Car sales, Radio, Weather are phone placeholders.

## Proposed order (Chris to confirm)
1. Real start state: fuel and battery matter, a failed start says why (small, canon Slice C).
2. Customer cars: the office/customer-lot loop with work orders that use the hands-on systems (the garage business).
3. Finding vehicles: rumours and map finds that lead to wrecks, then restoring them.
4. Story trail for levels 0 and 1 from objects only; Chris writes the real text, I build the places and slots (no invented lore).

## Done
- **1. Real start state (Nov 22).** `src/rules/fuel.js` (pure, tested). Each vehicle has a tank in litres (`home.fuel[id]`; Bug 38 L, El Cajon 60 L, pickups 70 L; all PROPOSAL). Grandma's Bug starts with 6 L of old fuel (Walt's letter: she sat since '09). The first key turn now checks the car: no battery means "there is no battery in the car", an empty tank means "she cranks but the tank is dry". Driving burns fuel (idle 0.0004 L/s to flat out 0.0039 L/s, about 2.7 hours of flat-out driving per Bug tank), the HUD shows `FUEL n L` with LOW and EMPTY, and an empty tank leaves 35% throttle so you can always limp to a pump (canon rule 4). The pump sells fuel at $0.80 a litre for the active vehicle (it used to be a flat $25 flag); with less cash it sells what you can pay for. Not done: battery charge, fuel can, fuel in other vehicles' start checks, stale-fuel penalty.
