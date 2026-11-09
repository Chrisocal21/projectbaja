# WORLD MAP: the big picture (Nov 9, 2026) - PROPOSAL, nothing built

Chris's goal: a stylized (not compressed) map with decent-size regions: Mojave high desert, the coast (SoCal and Baja coast), the Baja peninsula, Arizona and so on. Baja County stays the home base.
Everything below is a **design guess to edit**. It is real-world geography only. No new places, people or lore. Names of regions are plain and descriptive and changeable. See [CANON](./CANON.md) (locked): canon only says "remote Baja County", so nothing here changes it.

## The shape (PROPOSAL)
Baja County is the hub. Each region grows out of it in the real compass direction, joined by the highway.

```
                 NORTH: Mojave high desert
                          |
WEST: Coast  ----  BAJA COUNTY (home)  ----  EAST: Arizona / Sonoran
(SoCal + Baja coast)      |             (the lakebed strip leads here)
                 SOUTH: Baja peninsula
                 (the scrubland strip leads here)
```

- Each region is its own map about the size of today's county (6 to 9 km across), with its own height and ground. "Decent size" = you spend real time driving in each one.
- Today's strips are the first steps: the **south scrubland** leads toward the Baja peninsula and the **east dry lakebed** leads toward Arizona.
- Regions load one at a time. You drive to the edge on the highway, a short load, and you arrive on the other side (PROPOSAL: not one giant world, which the game's tech cannot stream yet).

## Regions and what each needs
| Region | Look | New biomes | Tech needed (beyond today) |
|---|---|---|---|
| **Baja County** (home, exists) | Dry high desert, canyon, forest mountain, grassland | exist | none |
| **Coast** (west) | Ocean, beaches, sea cliffs, cooler hazy light, coastal highway | Beach, sea cliff, coastal scrub | **Water** (ocean plane, shoreline, wet sand), slow or stop in deep water, sea sound, haze. Biggest new work. Ties to the boat idea |
| **Mojave high desert** (north) | Joshua trees, rocky hills, cooler air, wide flats | Joshua flats, boulder hills | New plants and rocks only |
| **Baja peninsula** (south) | Cardon cacti, red rock, long road with the sea on one side | Cardon desert, red mesa | New plants; reuses the coast water |
| **Arizona / Sonoran** (east) | Saguaro cactus, mesas, big skies, monsoon storms | Saguaro desert, mesa | New plants; storm weather later |
| **Mexico side** | Just the south end of the peninsula (geography only) | reuse | none; nothing here is canon |

## Build order (PROPOSAL, one at a time)
1. **Region system first:** a way to hold several maps, travel between them on the highway, and save which region you are in. Nothing visible, tested hard. (Needed before any new region.)
2. **Coast** (your pick): water and shoreline, then beach and cliffs, then a coastal highway.
3. **Baja peninsula** (reuses the water).
4. **Mojave**, then **Arizona** (plants and ground only, cheaper).
5. Weather per region (cool coast haze, desert heat, monsoon) once the weather system exists.

## Open questions for Chris
- How long should the highway between regions feel (a short loading hop, or a long empty road)? PROPOSAL: a short hop with a sign.
- Should each region have its own garage or shop later, or is everything run from Walt's Garage? (Lore question: not decided here.)
- Do you want the vehicle shop and parts suppliers to change by region (coast = marine parts)? PROPOSAL: later.
- The plants, rocks and water need art. Art is on hold: do you want to unpark it for the coast?
