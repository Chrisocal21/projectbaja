VEH_001 — Mechanical Pack v0.1
================================
Target: Three.js / React Three Fiber. glTF 2.0 (.glb).
Coordinates: +Z vehicle front, +Y up, +X vehicle right. Units: meters.
Origin matches VEH_001_Bug_Base_v01.glb.

PART_012_AirCooledRearEngine.glb
- Simplified air-cooled flat-four-inspired engine blockout.
- Case, opposed heads/cooling fins, shroud, fan/belt, air filter, intake, plug wires, exhaust.
- Install at scene origin (0,0,0); engine located near z=-1.65.
- Stock body/lid and rear opening prototype may obscure engine.

PART_013_SuspensionAssembly.glb
- Front arms, steering tie rods, rear trailing arms, driveshafts, hub placeholders, coilovers.
- Front axle z=+1.19; rear axle z=-1.19.
- Install at scene origin (0,0,0).
- Wheel hubs approximately x=+/-0.76.
- Hide PART_006_TrailShockSet when showing this full assembly to avoid duplicates.

IMPORTANT: These are procedural visual BLOCKOUTS, not mechanically validated
assemblies, rigged models, final topology, baked textures or certified PBR assets.
Engine is only exposed if the body geometry is adjusted to leave clearance.
The current Bug base has intersecting body geometry and requires actual cutouts.
All geometry should be visually inspected and refined before production use.

For regeneration: python build_mechanical_pack.py
Requires trimesh and numpy.
