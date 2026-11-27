# Garage business plan: customer cars, crew, new service (Nov 26 2026)

Planning only. Nothing here is built. **CHRIS** = what Chris asked for. **PROPOSAL** = a design guess, not decided.
Builds on `EXPANSION_PLAN.md` section 5 (CHRIS, Nov 22: skills that grow, paid from earnings, a shop that misses payroll loses people, generic names).
CANON lists employees under Phase 3. Chris is asking for them now; CANON.md is not edited until Chris says to.

## Today in the game
One customer at a time. Their car appears in a lot stall (no driving in, no person). The player does the job at the car.
The garage already has bay spots and lifts per level (`worlds/garageLevels.js`) and parking stalls (`worlds/lot.js`). There is no day of the week yet.

## A. Customer cars
CHRIS: several can come at a time; cars pull up to the shop doors, onto the lift if the job needs it; a waiting customer parks in a parking spot.
PROPOSAL:
- A job list replaces the single job. Each visit: arriving, parked, waiting for a bay, in a bay, done, leaving.
- Cars visibly drive in from the road to a stall and drive out again.
- Each job says where it is done: **at the stall** (wipers, bulb), **in a bay** (battery, belt), **on the lift** (suspension, exhaust).
- When a bay is free and the player (or a worker) calls the car in, it drives through the door into the bay. A car never drives into an occupied bay or through a parked vehicle: if the way is blocked it waits and says so.
- Customers either **wait** (stand or sit by the shop, car stays in a stall) or **drop off** (leave; the car stays).
- How many at once: up to 2 at level 0, then grows with bays and parking. No angry timers (kept from today).

## B. Crew
CHRIS: workers earn money passively at the garage; controlled from the phone; they manage their own time; several shifts that cover lunches; shifts overlap when people go home; Monday to Sunday; different skills; promotions.
PROPOSAL:
- Phone app **Crew**: applicants, hire, let go, weekly schedule, what each person is doing now, today's takings, promote.
- The player picks who is hired and, optionally, shifts. **Auto schedule** is the default: it staggers lunches and overlaps shift changes, and warns about uncovered hours (CANON rule 8: scheduling is optional depth).
- Example day: early 7:00-15:30, late 10:30-19:00 (4.5 h overlap), 30 min lunches at different times. Each person works 5 days; covering 7 days needs at least 3 people.
- Workers are visible: they walk to the car, work at it, take lunch, arrive and go home.
- Skills (Nov 22 list): engine, suspension, body and paint, tires and wheels, fab and welding, electrical and diagnosis, race prep. Skill sets which jobs they take, how fast and how well; it grows with work.
- Positions: helper, mechanic, lead mechanic, service manager (calls cars in and hands out jobs). Later: race crew chief.
- Money: job pay comes in, parts come out of real shop stock (CANON rule 6: no magic stock), wages are paid weekly. No stock, no job: the worker says what is missing.
- Balance: hands-on work by the player should pay more per job than a worker's job nets.
- CANON: workers earn only while the game runs or time is skipped (sleeping). Nothing while closed. No injuries, no insurance.
- A week is about 2 hours of real play at today's 18 minutes per day.

## C. A service between the service garage and the race team
CHRIS: something unlike the other stores, within the lore; race team eventually.
PROPOSAL (names are placeholders):
1. **Desert prep (recommended):** customers bring a stock vehicle to be made ready for the dirt: inspection, skid plate, tires, lights, rack, recovery gear, later suspension and welded protection. The player test drives it. Uses the repair and welding shop (CANON), and teaches the skills a race team needs.
2. **Trail recovery:** go pull stuck and broken vehicles out, then repair them at the shop. Uses the tow and soft ground systems and the planned winch.
3. **Race support for hire:** prep and chase other people's entries at events. Closest to a race team, but needs racing first.
Suggested ladder: service garage, then desert prep (+ recovery later), then race support, then our own team.
No lore is added: nothing says Walt offered any of these.

## Build order (one piece at a time)
1. Several customers, each with a car and a person, waiting in stalls.
2. Cars drive in and out.
3. Bay and lift jobs: the car pulls through the door.
4. Hire one worker who does jobs (Crew app).
5. Week, shifts, lunches, overlap, auto schedule, weekly wages.
6. Skills growth and promotions.
7. Desert prep.
