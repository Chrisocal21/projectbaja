# Mechanic-sim design: stripping and building a car by hand

Written November 21, 2026 from Chris's brief: "walk up to the bug or any buildable car, click and hold on a part to remove it, set it on the ground, grab another part and click and hold to add it... think car mechanic sim, go deep."
Builds on [SYSTEMS_BLUEPRINT](./SYSTEMS_BLUEPRINT.md) (sections 3, 5, 6), which already specifies fitting, detaching, condition and paint. This file adds the *feel* layer and a build order. Labels: **PROPOSAL** = design guess. **BUILT** = in the game now. Nothing here changes [CANON](./CANON.md).

## The loop

```
walk up -> look at a part -> its name, condition and what blocks it show
        -> hold left click: a bar fills (the tool's sound plays) -> it comes off
        -> it lands on the ground beside you, lying the way it would be left
        -> pick it up, look at it, put it down, or fit another
        -> look at the empty spot: it glows -> hold left click -> it goes on
```
Every step is something you do with your hands and eyes in the world. No menu in the middle (the X workshop panel is removed).

## 1. Targeting: the part under the crosshair, and only that

- **BUILT (Nov 21):** the real mesh under the crosshair decides. A tire, hub, brake or suspension piece near a wheel counts as that wheel. The old guessed "hood / door / seat boxes" (`game/carAim.js`) no longer drive anything; E on the hood, lid, doors and seats now follows the same mesh hit (`game.look`).
- PROPOSAL: the part you aim at glows (white = can come off, red = blocked, amber = what must go first: **BUILT**) and its **name and condition** show beside the crosshair ("Front-left wheel, 62%").
- Debug: type `window.__aimDebug = true` in the browser console and every aim logs the mesh name it hit and the part it mapped to. If a tire or panel is not recognised, that line says exactly what to map.

## 2. Hold-to-work: the bar, and what it costs

**BUILT:** hold left click, bar fills 0.8 s, then the part comes off or goes on; let go early and nothing happens.

PROPOSAL, make the time mean something:

| Part | Hold time | Tool |
|---|---|---|
| Plate, trim, light, battery | 0.5 s | wrench / hand |
| Door, fender, hood, bumper, glass, seat | 1.0 s | wrench |
| Wheel (lug nuts) | 1.2 s | jack + wrench |
| Engine, body shell | 2.5 s, 3 s | hoist |

Rust or low condition could add up to +50% (needs the condition system, section 5). The tool's icon sits on the bar, and the sound is the tool's (ratchet, impact gun, hoist chain). A part that needs a tool you do not have shows the tool in red instead of filling.

## 3. Parts on the ground

- **BUILT (Nov 21):** a removed part goes **into your hands** so you carry it and put it down wherever you like (click). Only if your hands are full does it land on clear ground beside you: not under the car and not on top of another part (`game/dropSpot.js`). Holding a part that fits snaps it to the car only while the crosshair is on the car or at the empty spot; look anywhere else and it places there. It lies the way it would be left (door flat, hood on its back; `game/restPose.js`).
- PROPOSAL: parts dropped on a **workbench or parts tray** snap flat and tidy; wheels stack (top one only); a part carried makes you walk slower the heavier it is (blueprint 3.5: optional).
- PROPOSAL: you can set a part back **onto the car by hold-click**, and it glows where it goes (**BUILT** for the glow).

## 4. Fasteners (the "deep" option, say if you want it)

Tier 1, **BUILT/near**: one bar per part, as above.
Tier 2, PROPOSAL: the bar is per fastener where it matters. A wheel shows four lug nuts; hold removes them one after another (four short fills, ratchet each). A seized or rusted bolt needs penetrating oil or takes longer. A stripped bolt means cutting the part off (it comes off damaged).
Tier 3, PROPOSAL: sub-assemblies. Take off the engine lid, then the shroud, then the carbs: each is its own part in a chain (the Bug engine already takes mods in steps).
Recommendation: ship Tier 1 well, add Tier 2 for wheels and the engine only, and leave Tier 3 for the engine bench.

## 5. Condition (blueprint section 5, not built)

Each part carries its own condition 0 to 100% that travels with it. Condition decides: how long the bar takes (rust), whether it can be refitted as-is, and how it drives. A removed part can be **inspected** (look at it on the ground: condition and what is wrong), **repaired** at a bench with scrap or parts, or **replaced**. The wreck can start with some parts damaged and fitting a good one swaps it (blueprint 3.7). This is also where the Salvage Road rust shader and damaged-part swap (merge plan step 2) come in.

## 6. Feedback, so it never feels cheap

Sounds on start, loop, finish and drop (thud on the concrete); the part lifts slightly as the bar completes; the car settles when a wheel comes off (the corner drops onto the stand: **BUILT** as a stand); a short HUD line of what the car now lacks to run ("Won't start: no battery").

## Build order (PROPOSAL)

1. Targeting from the mesh (done), drop spot (done), debug hook (done). Next: confirm every part in a real session with `__aimDebug`.
2. Hold times by part and tool, tool icon on the bar, sounds.
3. Aimed part name and condition beside the crosshair.
4. Condition on parts (the data model: a part is an object with condition, not just an id), inspect on the ground.
5. Wheel lug nuts and engine mounts as Tier 2 fasteners.
6. Bench and tray snapping, stacking, carry weight.

## Questions for Chris

1. Hold times: OK to vary by part, or keep one 0.8 s for everything?
2. Fasteners: Tier 1 only, or Tier 2 for wheels and engine?
3. Condition: should a removed part show its condition when you look at it (needs the data model change in step 4)?
4. Carry weight: should a heavy part slow your walk?
