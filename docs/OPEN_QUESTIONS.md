# Project: Baja — OPEN_QUESTIONS

Last updated: November 8, 2026. New: the Forge's ten questions (F1–F10) and the places where the [CANON](./CANON.md) and the current build disagree (C1–C9). Answered earlier: camera (both: first person on foot, chase or cab in a vehicle) and first world slice (Baja County). Only undecided items are listed. Settled items live in [FEATURE_MAP](./FEATURE_MAP.md) and CANON.

## Current blockers

- **For Slice A:** the Forge says only F1 (how a wrench turn feels) and F2 (what "finished" means for v1) block starting. C5 and C6 shape what the Slice A wheel install looks like.
- **Before a public release:** licensing (17) and old saves (10e).
- Production art, optimization and collision decisions below still block claiming production readiness.

## Forge questions (November 7), in the order to answer them

Each has the Forge's recommendation, so you can answer yes or give a counter.

| # | Question | Forge recommendation |
|---|---|---|
| F1 | What does turning a wrench feel like: hold to turn, a timed motion, a small puzzle, or a single click? | Hold to turn, one tool choice, no minigames. Make it satisfying before making it deep. *Today it's a single key press (E).* |
| F2 | What does "finished" mean for Baja v1: a portfolio piece, a free demo or a paid release? | Pick a target before Slice B. A playable demo of the four slices is a real milestone on its own. |
| F3 | Which engine and physics does the repo actually run today? | Stay with what works; don't port. **Answered by inspection:** React Three Fiber and three.js r170, our own arcade-sim drive code, saves in browser `localStorage`. |
| F4 | How does Baja share your time with your other projects, including Zombie Siege (named your main project on November 1)? | A fixed weekly block for Baja, and one open project at a time. |
| F5 | What year is the game set in? | Choose a present-day year quietly and never state it on screen. |
| F6 | Can the first playable ship with placeholder art? | Yes. Boxes and simple shapes until the Bug is fun. Art comes last. |
| F7 | What is the first paid activity: a scrap haul, or a customer job? | Scrap haul to Salvage & Surplus; it needs no NPC AI. *Odd jobs (customer jobs) already exist, see C3.* |
| F8 | Which five failure points does the Bug start with? | Wheel and tire, battery, fuel, one ignition part, and rust as cosmetic only. |
| F9 | First person, third person, or both? | First person on foot and a chase view for driving, one toggle. *Already matches the game: first person on foot, chase or cab view driving.* |
| F10 | Who writes Walt's letter, and how long is it? | You write it, under 150 words. *The in-game letter today is a placeholder Claude wrote; it gets replaced word for word.* |

**Parked on purpose until their phase opens:** player name and appearance, names for the co-driver and his son, the accident year and place, the final title, fictional car makes, the NPC roster, payout values, wages and interest, race lengths, map topology, FPS targets, multiplayer.

## Build mode: decisions from Chris (November 8)

- **Buyable lift and "Car lot space":** done. Both are now garage/yard upgrades with levels (Second car lift; Parking lot expansion), bought from the Upgrades panel (key U, or Pause → Upgrades) — separate from the structure kit. See PROGRESS_TRACKER, "Queued by Chris". The office expansion is also done (a real back room, cut doorway, real collision — see PROJECT_LOG). Still open: whether a second office level adds more room or furniture zones (build-mode furniture can't reach the annex yet — it's outside the `inOffice`/`wingFree` boxes those checks use), and whether upgrades should ever unlock materials.
- **Old PC / parts ordering:** still open (build the catalogue and delivery now, or later?).
- **Structure kit look and materials:** newer and less rusted than Walt's garage; the player chooses the material. Still to settle: which materials, prices, and whether upgrades unlock materials.

## Canon vs the current build (found November 8)

These are places where something built before the canon arrived doesn't match it. Nothing has been removed. Where the fix was pure wording that contradicted a locked fact, it's noted as done.

- **C1. Map size.** Canon says a handcrafted core of about 3 × 3 km, "an early target, not a performance promise". The build is 6 × 6 km since November 7. Keep 6 km, or go back to 3 km? (Replaces 10f.)
- **C2. Stripping the #7.** Today the #7's shocks, race tires and beadlock rims are meant for the Bug, and the uncover text says so. Canon makes the #7 emotionally loaded, optional and never forced: the player may keep it covered or sell it. Does taking its parts for the Bug stay? Should the uncover text stop telling the player what to do with it?
  - **Done:** removed "cracked frame" from the uncover text. Canon says the #7 was repaired after the accident and its seized parts come from storage.
- **C3. Systems built ahead of phase:**
  - odd jobs from customers (Phase 2–3)
  - build mode (Phase 2)
  - the trailer upgrades
  - buying Al's truck (Phase 2)
  - an open, drivable Proving Grounds (Phase 4)

  Leave them in but frozen (the recommendation)? Or hide them behind a flag while Phase 1 is tested? Note also that taking down a build-mode item refunds 50% today, while canon #024 says cancel and demolition refund 100%. That's a one-line change once you say so.
- **C4. Proving Grounds access.** Canon says "closed at first, testing access later". Today you can drive in from the start, and the placeholder letter says "nobody checks the fence".
- **C5. The Bug's starting state.** Canon: the rear-right wheel is off after a flat, and Walt had started on rust. The game also has the driver's seat out, which canon doesn't mention. Slice A says "one part". Keep the seat out, or fit it from the start so the wheel is the only job?
- **C6. Tools aren't physical.** The floor jack and the engine hoist are invisible tools you get anywhere in the garage zone. Canon rule 6 says tools are real objects. PROPOSAL: a real floor jack that sits in the garage and has to be next to the car. Only the wrench is physical today (it starts in your pack).
- **C7. Spawn point.** Slice A says "spawn in the garage". A new game starts in the yard, about 15 m in front of the roller door, looking in. Inside or outside?
- **C8. A bald tire needs tire condition.** Slice A fits a *bald* tire, and Slice B makes it grip worse on dirt. There is no tire condition today: the loose rear-right wheel is just "stock". PROPOSAL (smallest version):
  - Give wheels a `tread` value. The loose rear-right wheel's own tire is flat.
  - Mounting a bald tire from the yard pile onto that rim is the Slice A job.
  - The yard tires stop being only junk.

  This needs your OK, because it changes what the yard junk is.
- **C9. Saves.** Canon wants versioned saves with atomic writes, rotating backups and independent slots. Today there is one autosave slot in `localStorage` (`baja-save-v1`) with no version field and no backup. Slice A only needs "survives save and reload", which works. When do slots and backups come in, and is a manual save needed for Slice A?

## Marketplace

1. What does the appraisal depend on: part count, part quality, rarity, condition, or a mix?
2. How does asking above or below the appraisal change offers (speed, number, size)?
3. Do rare parts or standout builds justify asking high, and how is that expressed?

## Parts and building

4. How are gameplay upgrade tiers structured from scavenged junk to race-ready?
   The classic rounded Stage 2 visual direction is settled, not its gameplay rules.
5. How does progression from Stock through Stage 2 to the later full Baja
   unlock: by finding parts, buying them, or both?
6. Does a barn hold whole vehicles, parts, or both?
7. How many junkyards, and roughly where in SoCal and Baja?
8. Do barns need seeding so every region has a few, or is placement fully random? (Suggested during planning, not decided.)

## World

9. ~~Camera view~~: answered, both.
10. ~~First playable slice~~: answered, Baja County.
10a. What should each build-mode item actually do? Proposals are in [BUILD_MODE](./BUILD_MODE.md).
10b. Can the player buy more land around the garage to grow the build grid, and how much does it cost?
10c. When do the '78 half-ton and other roster vehicles become available (money, time, story beats)?
10d. Do Proving Grounds races give the first income from racing?
10e. **Old saves after the map grew:** vehicles parked away from the garage keep their old (3 km map) coordinates, which now land on different ground. Reset those saves, move parked vehicles home on load, or leave them?
10f. ~~Final map size~~: see C1. Canon also sets a Phase 5 target: a "Living Frontier" past the core, streamed and seeded.
10g. What fills the extra space: barn finds, donor wrecks, a junkyard, more shacks or another town? (Ideas parked in STORY_AND_WORLD.) Iron Flats, a canon town, is one candidate (Phase 3).
10h. ~~Lore overview~~: arrived as the Forge canon, see [CANON](./CANON.md) and C1–C9.

## Racing and later

11. When does racing enter, and in what form?
12. When do bikes enter?

## Project

13. Final title, logo and tagline.
14. The viewer check is complete; when is Salvage Road carry-over authorized,
    and in what order (driving, scrapyards, world generators)? No Salvage Road code
    has been copied; Baja has its own driving, loot and world code now, so this may be moot.
15. Does the El Cajon from Salvage Road appear in Baja, or is the Bug the only starter?
16. Platform and distribution plan (browser only, or beyond).

## Assets and the next Baja stage

17. What are the redistribution/production licenses for the supplied Beetle,
    tire, pickup (Hilux) and plant/tree assets, and how will native branding be removed or cleared?
    The terrain heightmap, rocks, dead trees, shrubs and most ground textures come from Unity Asset
    Store packs (EULA: use embedded in a game, no standalone redistribution). A browser build serves
    those files openly. Is that acceptable for a public Vercel deploy, or do they stay in private
    builds until confirmed? Poly Haven textures are CC0. See `public/textures/ground/SOURCES.md`.
18. Will a detailed engine asset be supplied, or should the current refitted
    flat-four visual blockout be remodeled? What running-gear fidelity is required?
19. What exact visual target defines the later full Baja/Class 1-inspired
    build? Competition classification, long-travel geometry and gameplay
    requirements are not settled by the current Stage 2 preview.
20. What steering, suspension travel, collision and rigging requirements must
    be validated before these static assets enter a playable build?
21. What are the platform-specific triangle, draw-call, LOD and texture budgets?
    Current Stock is 190,396 triangles and assembled Stage 2 is 253,214. The county now
    downloads about 15 MB of terrain textures and desert models and loads in about 20 s.
22. How should the settled workshop-wear/primer direction be authored and
    baked, and how should missing source textures/materials be replaced?
    Current imports use documented plain/PBR approximations, not final wear art.
