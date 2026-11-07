VEH_001 Classic Bug - Baja Roll Cage Pack v0.1

PART_014_InteriorRollCage.glb
PART_015_FrontCageReinforcement.glb
PART_016_RearCageBracing.glb

Three.js / React Three Fiber compatible GLB (glTF 2.0)
Coordinates: meters, +Y up, +Z vehicle forward; shared vehicle origin.
Parts are independent add-on models aligned approximately to VEH_001_Bug_Base_v01.glb.
Visual blockouts only: simplified metal tube geometry and solid-color materials.
NOT a physically engineered or safety-approved cage.

Notes:
- Cage tubes intersect the current procedural body shell; correct body cutouts and mounting points in the detailed vehicle model.
- Keep PART_003_RearEngineCage as the outer bumper guard; PART_016 is inboard rear bracing.
- Hide or modify conflicting stock panels as necessary; inspect fit inside the R3F scene.
- No UV-baked wear, textures, weld details, vehicle rig or collisions yet.
- Generation source: build_roll_cage_pack.py (requires numpy and trimesh).
