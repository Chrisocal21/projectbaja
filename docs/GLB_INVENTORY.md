# GLB inventory

The game ships **107 GLBs** in `viewer/bug_viewer/public/models`. The small-prop pass added **64**. The five Phase 3 furniture models came from the preceding pass. An additional **85 files** live under the source and handoff directories, including copies.

[Small-prop contact sheet](./SMALL_MODEL_PREVIEW.png)

## What changed

| Area | Game coverage |
|---|---|
| Salvage and materials | Both drum colours, fuel can, slatted crate, engine block, planks, square tube, scrap offcuts and fastener box. Wood shows up to three boards and steel up to four tubes per bundle. |
| Tools and supplies | The 15 tool IDs share 11 GLBs. Each held tool uses its own grip. Five spray colours share a paintable can. Oil, bulb, plug kit, wipers and replacement belt now show their contents. |
| Vehicle parts | All 13 removable engine pieces, the stock battery, fabricated shock hoops and 18 loose upgrade kits. Both valve covers share a mesh. The service belt shares the engine belt. Body-specific upgrades use their existing GLBs when carried. |
| Search and cleanup | Searchable cartons, crates, toolboxes and drawers show their opened state. The six yard cleanup piles have models. The scrap-tire pad displays the tire count and a SCRAP TIRES sign. |
| Earlier furniture | Sawhorses, workbench, lumber rack, steel rack and battery rack have standalone assets ready for Phase 3 wiring. |
| Other representations | Stock body panels come from the vehicle GLB. Fitted engines, upgrade assemblies and rims can use procedural geometry. Rack placement has its own tire renderer. Delivery labels, paper keepsakes, site fixtures and buildings also have separate render paths. |

## New models used by the game

All dimensions below are width × height × depth in metres at the exported rest pose. File sizes are bytes. Mesh names identify the separate pieces, including the flaps, lids and drawer parts used for search states.

### Loose engine parts

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [ENG_AirCleaner.glb](<../viewer/bug_viewer/public/models/ENG_AirCleaner.glb>) | 0.240 × 0.095 × 0.240 | 19,492 | PressedLids, FilterPaper, Pleats, WingNut |
| [ENG_Alternator.glb](<../viewer/bug_viewer/public/models/ENG_Alternator.glb>) | 0.180 × 0.134 × 0.152 | 12,260 | Motor, VentSlots, Pulley, Mounts |
| [ENG_Carburetor.glb](<../viewer/bug_viewer/public/models/ENG_Carburetor.glb>) | 0.169 × 0.137 × 0.090 | 9,240 | FloatBowl, BaseFlange, Venturi, FuelInlet |
| [ENG_Distributor.glb](<../viewer/bug_viewer/public/models/ENG_Distributor.glb>) | 0.098 × 0.116 × 0.098 | 11,468 | Housing, Crimp, Tower, Terminals |
| [ENG_Exhaust.glb](<../viewer/bug_viewer/public/models/ENG_Exhaust.glb>) | 0.517 × 0.126 × 0.281 | 12,612 | Silencer, Inlets, Tailpipes |
| [ENG_FanBelt.glb](<../viewer/bug_viewer/public/models/ENG_FanBelt.glb>) | 0.326 × 0.014 × 0.210 | 6,892 | Belt |
| [ENG_IgnitionCoil.glb](<../viewer/bug_viewer/public/models/ENG_IgnitionCoil.glb>) | 0.074 × 0.132 × 0.074 | 8,552 | Housing, Crimp, Tower, Terminals |
| [ENG_IntakeManifold.glb](<../viewer/bug_viewer/public/models/ENG_IntakeManifold.glb>) | 0.570 × 0.151 × 0.086 | 12,192 | CarbNeck, Runners, HeadFlanges |
| [ENG_OilFilter.glb](<../viewer/bug_viewer/public/models/ENG_OilFilter.glb>) | 0.098 × 0.099 × 0.098 | 9,748 | Housing, Crimp, Seal, Thread |
| [ENG_SparkPlugs.glb](<../viewer/bug_viewer/public/models/ENG_SparkPlugs.glb>) | 0.101 × 0.078 × 0.017 | 33,224 | Threads, Hex, Ceramic, InsulatorRibs, Tips |
| [ENG_Starter.glb](<../viewer/bug_viewer/public/models/ENG_Starter.glb>) | 0.178 × 0.144 × 0.114 | 7,896 | Motor, Solenoid, Pinion, Mounts |
| [ENG_ValveCover.glb](<../viewer/bug_viewer/public/models/ENG_ValveCover.glb>) | 0.330 × 0.079 × 0.136 | 2,860 | StampedCover, Stiffeners |

### Fabricated parts

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [FAB_ShockHoops.glb](<../viewer/bug_viewer/public/models/FAB_ShockHoops.glb>) | 0.422 × 0.272 × 0.201 | 11,836 | Hoops, FootPlates |

### Loose salvage

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [JUNK_Crate.glb](<../viewer/bug_viewer/public/models/JUNK_Crate.glb>) | 0.600 × 0.516 × 0.604 | 16,932 | FacePlanks0, EndPlanks, FacePlanks1, CornerPosts, Floor, Lid, LidNails |
| [JUNK_DrumBlue.glb](<../viewer/bug_viewer/public/models/JUNK_DrumBlue.glb>) | 0.598 × 0.868 × 0.598 | 30,356 | Shell, RolledHoops, Stripe, Bungs, BungSlots, FootScuffs |
| [JUNK_DrumGreen.glb](<../viewer/bug_viewer/public/models/JUNK_DrumGreen.glb>) | 0.598 × 0.868 × 0.598 | 30,356 | Shell, RolledHoops, Stripe, Bungs, BungSlots, FootScuffs |
| [JUNK_EngineBlock.glb](<../viewer/bug_viewer/public/models/JUNK_EngineBlock.glb>) | 0.609 × 0.361 × 0.334 | 50,368 | Sump, Casting, Deck, Bores, HeadStuds, CorePlugs, FlywheelFlange, Pulley |
| [JUNK_JerryCan.glb](<../viewer/bug_viewer/public/models/JUNK_JerryCan.glb>) | 0.180 × 0.452 × 0.320 | 19,780 | StampedTank, PressedRibs, Handles, FillerCap |

### Loose upgrade kits

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [KIT_EMOD_Bore1776.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_Bore1776.glb>) | 0.247 × 0.120 × 0.247 | 112,660 | CoolingFins, Liners |
| [KIT_EMOD_Bore2110.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_Bore2110.glb>) | 0.247 × 0.120 × 0.247 | 112,660 | CoolingFins, Liners |
| [KIT_EMOD_Doghouse.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_Doghouse.glb>) | 0.596 × 0.270 × 0.240 | 5,068 | Shroud, Cooler, CoolingFins |
| [KIT_EMOD_DualKadron.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_DualKadron.glb>) | 0.314 × 0.132 × 0.100 | 10,032 | FloatBowls, AirHorns, Flanges |
| [KIT_EMOD_DualWeber.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_DualWeber.glb>) | 0.314 × 0.132 × 0.124 | 16,944 | FloatBowls, AirHorns, Flanges |
| [KIT_EMOD_Ignition.glb](<../viewer/bug_viewer/public/models/KIT_EMOD_Ignition.glb>) | 0.154 × 0.116 × 0.113 | 9,444 | Coil, Tower, Module, Leads |
| [KIT_EXH_Megaphone.glb](<../viewer/bug_viewer/public/models/KIT_EXH_Megaphone.glb>) | 0.280 × 0.114 × 0.699 | 13,796 | Inlets, Outlets, Tabs |
| [KIT_EXH_SidePipes.glb](<../viewer/bug_viewer/public/models/KIT_EXH_SidePipes.glb>) | 0.261 × 0.085 × 0.699 | 13,916 | Inlets, Outlets, Tabs |
| [KIT_FENDER_ArchTubes.glb](<../viewer/bug_viewer/public/models/KIT_FENDER_ArchTubes.glb>) | 0.218 × 0.328 × 0.711 | 36,664 | Arches |
| [KIT_GUARD_MudFlaps.glb](<../viewer/bug_viewer/public/models/KIT_GUARD_MudFlaps.glb>) | 0.220 × 0.040 × 0.314 | 3,152 | Flaps, Straps |
| [KIT_GUARD_SkidPlate.glb](<../viewer/bug_viewer/public/models/KIT_GUARD_SkidPlate.glb>) | 0.630 × 0.096 × 0.880 | 3,872 | Skid, Bolts |
| [KIT_LIGHT_BumperPods.glb](<../viewer/bug_viewer/public/models/KIT_LIGHT_BumperPods.glb>) | 0.294 × 0.159 × 0.065 | 7,908 | Housings, Lenses, Mounts |
| [KIT_LIGHT_CubePods.glb](<../viewer/bug_viewer/public/models/KIT_LIGHT_CubePods.glb>) | 0.250 × 0.117 × 0.089 | 3,376 | Housings, Lenses, Mounts |
| [KIT_LIGHT_RearBar.glb](<../viewer/bug_viewer/public/models/KIT_LIGHT_RearBar.glb>) | 0.680 × 0.082 × 0.063 | 3,544 | Housing, Lens, Feet |
| [KIT_ROLL_Cage.glb](<../viewer/bug_viewer/public/models/KIT_ROLL_Cage.glb>) | 0.754 × 0.614 × 0.754 | 12,352 | Hoops, Rails, Sills, Diagonal |
| [KIT_ROOF_Antenna.glb](<../viewer/bug_viewer/public/models/KIT_ROOF_Antenna.glb>) | 0.155 × 0.034 × 0.987 | 3,924 | Mast, Flag, Bracket |
| [KIT_ROOF_JerryCans.glb](<../viewer/bug_viewer/public/models/KIT_ROOF_JerryCans.glb>) | 0.387 × 0.380 × 0.274 | 11,176 | Tanks, Handles, Caps, Carrier |
| [KIT_ROOF_RoundLights.glb](<../viewer/bug_viewer/public/models/KIT_ROOF_RoundLights.glb>) | 0.614 × 0.159 × 0.065 | 14,864 | Housings, Lenses, Mounts, Crossbar |

### Crafting materials

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [MAT_Fasteners.glb](<../viewer/bug_viewer/public/models/MAT_Fasteners.glb>) | 0.240 × 0.085 × 0.160 | 22,264 | Bin, HexHeads, Shanks, Nuts |
| [MAT_Planks.glb](<../viewer/bug_viewer/public/models/MAT_Planks.glb>) | 0.141 × 0.140 × 1.280 | 2,952 | Plank1, Plank2, Plank3 |
| [MAT_Scrap.glb](<../viewer/bug_viewer/public/models/MAT_Scrap.glb>) | 0.605 × 0.088 × 0.336 | 6,636 | Plate, BentRebar, AngleWeb, AngleFlange |
| [MAT_SquareTube.glb](<../viewer/bug_viewer/public/models/MAT_SquareTube.glb>) | 0.103 × 0.103 × 1.100 | 5,268 | Tube1, Tube2, Tube3, Tube4 |

### Containers and tires

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [PROP_Carton.glb](<../viewer/bug_viewer/public/models/PROP_Carton.glb>) | 0.550 × 0.408 × 0.500 | 3,840 | Walls, LeftFlap, RightFlap |
| [PROP_Drawers.glb](<../viewer/bug_viewer/public/models/PROP_Drawers.glb>) | 0.720 × 0.970 × 0.509 | 8,136 | Cabinet, Back, Drawers, Pulls, UpperDrawer, UpperPull, DrawerTray |
| [PROP_Toolbox.glb](<../viewer/bug_viewer/public/models/PROP_Toolbox.glb>) | 0.565 × 0.323 × 0.272 | 8,264 | Case, Lid, Handle, Latches |
| [PROP_WornTire.glb](<../viewer/bug_viewer/public/models/PROP_WornTire.glb>) | 0.704 × 0.211 × 0.689 | 40,452 | Carcass, Tread |

### Stock parts

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [STOCK_Battery.glb](<../viewer/bug_viewer/public/models/STOCK_Battery.glb>) | 0.303 × 0.267 × 0.183 | 8,856 | Case, Lid, Positive, Negative, CarryHandle |

### Shop supplies

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [SUP_Bulb.glb](<../viewer/bug_viewer/public/models/SUP_Bulb.glb>) | 0.050 × 0.095 × 0.050 | 10,268 | Glass, Base, Contacts |
| [SUP_Oil.glb](<../viewer/bug_viewer/public/models/SUP_Oil.glb>) | 0.125 × 0.301 × 0.168 | 8,148 | Bottle, MouldedHandle, Cap, Label |
| [SUP_PlugKit.glb](<../viewer/bug_viewer/public/models/SUP_PlugKit.glb>) | 0.160 × 0.031 × 0.095 | 7,532 | PatchCase, Reamers, Grips, Plugs |
| [SUP_Wipers.glb](<../viewer/bug_viewer/public/models/SUP_Wipers.glb>) | 0.470 × 0.053 × 0.062 | 10,540 | SpringArms, Blades, Adapters |

### Hand tools and recovery

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [TOOL_AirChuck.glb](<../viewer/bug_viewer/public/models/TOOL_AirChuck.glb>) | 0.041 × 0.152 × 0.125 | 7,392 | Grip, Barrel, Trigger, Coupler |
| [TOOL_Buffer.glb](<../viewer/bug_viewer/public/models/TOOL_Buffer.glb>) | 0.163 × 0.266 × 0.136 | 18,384 | Motor, Grip, VentBands, Gearcase, SideGrip, BackingDisc, PolishingPad |
| [TOOL_FloorJack.glb](<../viewer/bug_viewer/public/models/TOOL_FloorJack.glb>) | 0.237 × 0.420 × 0.476 | 13,232 | Chassis, Wheels, LiftArm, Saddle, Lever, Grip |
| [TOOL_Gauge.glb](<../viewer/bug_viewer/public/models/TOOL_Gauge.glb>) | 0.082 × 0.160 × 0.035 | 10,632 | DialCase, DialFace, Ticks, Needle, Stem |
| [TOOL_Grinder.glb](<../viewer/bug_viewer/public/models/TOOL_Grinder.glb>) | 0.162 × 0.266 × 0.136 | 19,908 | Motor, Grip, VentBands, Gearcase, SideGrip, BackingDisc, Abrasive, SpindleNut |
| [TOOL_Pump.glb](<../viewer/bug_viewer/public/models/TOOL_Pump.glb>) | 0.201 × 0.158 × 0.131 | 15,848 | Feet, Motor, CoolingFins, Handle, Hose |
| [TOOL_Shovel.glb](<../viewer/bug_viewer/public/models/TOOL_Shovel.glb>) | 0.240 × 1.021 × 0.138 | 9,568 | Blade, Shaft, Socket, DGrip |
| [TOOL_SprayCan.glb](<../viewer/bug_viewer/public/models/TOOL_SprayCan.glb>) | 0.068 × 0.197 × 0.068 | 14,360 | PaintBody, Rims, Shoulder, Nozzle |
| [TOOL_Sprayer.glb](<../viewer/bug_viewer/public/models/TOOL_Sprayer.glb>) | 0.041 × 0.153 × 0.201 | 7,388 | Grip, Barrel, Trigger, Coupler |
| [TOOL_TractionBoards.glb](<../viewer/bug_viewer/public/models/TOOL_TractionBoards.glb>) | 0.284 × 0.115 × 1.089 | 36,224 | Rails, CrossRibs, Cleats |
| [TOOL_Wrench.glb](<../viewer/bug_viewer/public/models/TOOL_Wrench.glb>) | 0.098 × 0.253 × 0.024 | 7,896 | BoxEnd, Shank, OpenJaw |

### Yard cleanup

| File | Dimensions (m) | Bytes | Meshes |
|---|---|---:|---|
| [YARD_Brush.glb](<../viewer/bug_viewer/public/models/YARD_Brush.glb>) | 1.709 × 0.510 × 1.422 | 50,060 | Branches, Twigs |
| [YARD_Cans.glb](<../viewer/bug_viewer/public/models/YARD_Cans.glb>) | 0.774 × 0.296 × 0.730 | 43,308 | Tin0, TopRims, PaperBands, Tin1, Tin2 |
| [YARD_Fridge.glb](<../viewer/bug_viewer/public/models/YARD_Fridge.glb>) | 0.750 × 1.620 × 0.772 | 18,340 | Cabinet, Doors, Pulls, Feet, Grille |
| [YARD_Papers.glb](<../viewer/bug_viewer/public/models/YARD_Papers.glb>) | 0.949 × 0.291 × 0.719 | 7,384 | Bundles0, Bundles1, Bundles2, Twine |

## Previously shipped models

| File | Status or source reference |
|---|---|
| [ACC_BullBar.glb](<../viewer/bug_viewer/public/models/ACC_BullBar.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>), [presets.json](<../viewer/bug_viewer/src/catalog/presets.json>) |
| [ACC_LightBar.glb](<../viewer/bug_viewer/public/models/ACC_LightBar.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>), [presets.json](<../viewer/bug_viewer/src/catalog/presets.json>) |
| [ACC_RoofRack.glb](<../viewer/bug_viewer/public/models/ACC_RoofRack.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>), [presets.json](<../viewer/bug_viewer/src/catalog/presets.json>) |
| [ACC_SpareCarrier.glb](<../viewer/bug_viewer/public/models/ACC_SpareCarrier.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>), [presets.json](<../viewer/bug_viewer/src/catalog/presets.json>) |
| [ENV_Desert.glb](<../viewer/bug_viewer/public/models/ENV_Desert.glb>) | Existing · [Desert.jsx](<../viewer/bug_viewer/src/worlds/Desert.jsx>), [RealScenery.jsx](<../viewer/bug_viewer/src/worlds/RealScenery.jsx>) |
| [ENV_Plants.glb](<../viewer/bug_viewer/public/models/ENV_Plants.glb>) | Existing · [Flora.jsx](<../viewer/bug_viewer/src/worlds/Flora.jsx>), [flora.js](<../viewer/bug_viewer/src/worlds/flora.js>) |
| [ENV_Trees.glb](<../viewer/bug_viewer/public/models/ENV_Trees.glb>) | Existing · [Flora.jsx](<../viewer/bug_viewer/src/worlds/Flora.jsx>), [RealScenery.jsx](<../viewer/bug_viewer/src/worlds/RealScenery.jsx>) |
| [MESHY_ExhaustHeaders.glb](<../viewer/bug_viewer/public/models/MESHY_ExhaustHeaders.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [MESHY_FiberglassClip.glb](<../viewer/bug_viewer/public/models/MESHY_FiberglassClip.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [PART_001_AllTerrainWheelSet.glb](<../viewer/bug_viewer/public/models/PART_001_AllTerrainWheelSet.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [SHOCK_001_Coilover.glb](<../viewer/bug_viewer/public/models/SHOCK_001_Coilover.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>), [presets.json](<../viewer/bug_viewer/src/catalog/presets.json>) |
| [SHOP_BatteryRack.glb](<../viewer/bug_viewer/public/models/SHOP_BatteryRack.glb>) | Earlier furniture pass, pending station and storage wiring |
| [SHOP_LumberRack.glb](<../viewer/bug_viewer/public/models/SHOP_LumberRack.glb>) | Earlier furniture pass, pending station and storage wiring |
| [SHOP_Sawhorses.glb](<../viewer/bug_viewer/public/models/SHOP_Sawhorses.glb>) | Earlier furniture pass, pending station and storage wiring |
| [SHOP_SteelRack.glb](<../viewer/bug_viewer/public/models/SHOP_SteelRack.glb>) | Earlier furniture pass, pending station and storage wiring |
| [SHOP_Workbench.glb](<../viewer/bug_viewer/public/models/SHOP_Workbench.glb>) | Earlier furniture pass, pending station and storage wiring |
| [STAGE2_PART_001_AllTerrainWheelSet.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_001_AllTerrainWheelSet.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [STAGE2_PART_002_FrontTubeBumper.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_002_FrontTubeBumper.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_003_RearEngineCage.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_003_RearEngineCage.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_006_TrailShockSet.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_006_TrailShockSet.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_007_CutBajaFenders.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_007_CutBajaFenders.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_008_ShortenedFrontHood.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_008_ShortenedFrontHood.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_009_RearEngineOpening.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_009_RearEngineOpening.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_010_FiberglassWideFenders.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_010_FiberglassWideFenders.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_PART_011_RockerGuards.glb](<../viewer/bug_viewer/public/models/STAGE2_PART_011_RockerGuards.glb>) | Existing · [parts.json](<../viewer/bug_viewer/src/catalog/parts.json>) |
| [STAGE2_VEH_001_Beetle_Imported.glb](<../viewer/bug_viewer/public/models/STAGE2_VEH_001_Beetle_Imported.glb>) | Existing · [bodies.json](<../viewer/bug_viewer/src/catalog/bodies.json>) |
| [TIRE_RuggedDeep.glb](<../viewer/bug_viewer/public/models/TIRE_RuggedDeep.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [TIRE_RuggedLite.glb](<../viewer/bug_viewer/public/models/TIRE_RuggedLite.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [TIRE_RuggedTextured.glb](<../viewer/bug_viewer/public/models/TIRE_RuggedTextured.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>), [Home.jsx](<../viewer/bug_viewer/src/worlds/Home.jsx>) |
| [TIRE_RuggedTread.glb](<../viewer/bug_viewer/public/models/TIRE_RuggedTread.glb>) | Existing · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [TIRE_DesertRacer.glb](<../viewer/bug_viewer/public/models/TIRE_DesertRacer.glb>) | Meshy white baja bug kit, rim cut off ([export_bugkit.py](<../assets/pipeline/export_bugkit.py>)) · [wheels.json](<../viewer/bug_viewer/src/catalog/wheels.json>) |
| [VEH_001_Beetle_Imported.glb](<../viewer/bug_viewer/public/models/VEH_001_Beetle_Imported.glb>) | Existing · [bodies.json](<../viewer/bug_viewer/src/catalog/bodies.json>) |
| [VEH_007_Grandpa7.glb](<../viewer/bug_viewer/public/models/VEH_007_Grandpa7.glb>) | Existing · [Home.jsx](<../viewer/bug_viewer/src/worlds/Home.jsx>), [OfficePhoto.jsx](<../viewer/bug_viewer/src/worlds/OfficePhoto.jsx>) |
| [VEH_010_Pickup.glb](<../viewer/bug_viewer/public/models/VEH_010_Pickup.glb>) | Existing · [Truck.jsx](<../viewer/bug_viewer/src/Truck.jsx>) |
| [WRECK_StepVan.glb](<../viewer/bug_viewer/public/models/WRECK_StepVan.glb>) | Existing · [roadsideLoot.js](<../viewer/bug_viewer/src/game/roadsideLoot.js>) |
| [WRECK_UnfinishedPickup.glb](<../viewer/bug_viewer/public/models/WRECK_UnfinishedPickup.glb>) | Existing · [roadsideLoot.js](<../viewer/bug_viewer/src/game/roadsideLoot.js>) |

## Source, archive and handoff GLBs

Folder names preserve the distinction between original source art, archived variants and handoff copies. The runtime table above identifies the files served by the game.

### `assets`

- [Meshy_AI_Glass_Labyrinth_1107045205_generate.glb](<../assets/Meshy_AI_Glass_Labyrinth_1107045205_generate.glb>)
- [Meshy_AI_White_Fiberglass_Hood_1107045219_texture.glb](<../assets/Meshy_AI_White_Fiberglass_Hood_1107045219_texture.glb>)

### `assets/archive/unused-models`

- [PART_002_FrontTubeBumper.glb](<../assets/archive/unused-models/PART_002_FrontTubeBumper.glb>)
- [PART_003_RearEngineCage.glb](<../assets/archive/unused-models/PART_003_RearEngineCage.glb>)
- [PART_004_BumperAuxLights.glb](<../assets/archive/unused-models/PART_004_BumperAuxLights.glb>)
- [PART_005_FrontSkidPlate.glb](<../assets/archive/unused-models/PART_005_FrontSkidPlate.glb>)
- [PART_006_TrailShockSet.glb](<../assets/archive/unused-models/PART_006_TrailShockSet.glb>)
- [PART_007_CutBajaFenders.glb](<../assets/archive/unused-models/PART_007_CutBajaFenders.glb>)
- [PART_008_ShortenedFrontHood.glb](<../assets/archive/unused-models/PART_008_ShortenedFrontHood.glb>)
- [PART_009_RearEngineOpening.glb](<../assets/archive/unused-models/PART_009_RearEngineOpening.glb>)
- [PART_010_FiberglassWideFenders.glb](<../assets/archive/unused-models/PART_010_FiberglassWideFenders.glb>)
- [PART_011_RockerGuards.glb](<../assets/archive/unused-models/PART_011_RockerGuards.glb>)
- [PART_012_AirCooledRearEngine.glb](<../assets/archive/unused-models/PART_012_AirCooledRearEngine.glb>)
- [PART_013_SuspensionAssembly.glb](<../assets/archive/unused-models/PART_013_SuspensionAssembly.glb>)
- [PART_014_InteriorRollCage.glb](<../assets/archive/unused-models/PART_014_InteriorRollCage.glb>)
- [PART_015_FrontCageReinforcement.glb](<../assets/archive/unused-models/PART_015_FrontCageReinforcement.glb>)
- [PART_016_RearCageBracing.glb](<../assets/archive/unused-models/PART_016_RearCageBracing.glb>)
- [VEH_001_Bug_Base_v01.glb](<../assets/archive/unused-models/VEH_001_Bug_Base_v01.glb>)
- [VEH_002_Stage2Baja.glb](<../assets/archive/unused-models/VEH_002_Stage2Baja.glb>)

### `assets/bug`

- [Meshy_AI_Glass_Labyrinth_1107045205_generate.glb](<../assets/bug/Meshy_AI_Glass_Labyrinth_1107045205_generate.glb>)
- [Meshy_AI_Off_Road_Beetle_Conve_1107045135_texture.glb](<../assets/bug/Meshy_AI_Off_Road_Beetle_Conve_1107045135_texture.glb>)
- [Meshy_AI_Off_Road_Beetle_Conve_1107045334_generate.glb](<../assets/bug/Meshy_AI_Off_Road_Beetle_Conve_1107045334_generate.glb>)
- [Meshy_AI_White_Baja_Bug_1107045309_texture.glb](<../assets/bug/Meshy_AI_White_Baja_Bug_1107045309_texture.glb>)
- [Meshy_AI_White_Baja_Bug_1107045321_generate.glb](<../assets/bug/Meshy_AI_White_Baja_Bug_1107045321_generate.glb>)
- [Meshy_AI_White_Fiberglass_Hood_1107045219_texture.glb](<../assets/bug/Meshy_AI_White_Fiberglass_Hood_1107045219_texture.glb>)
- [PART_001_AllTerrainWheelSet.glb](<../assets/bug/PART_001_AllTerrainWheelSet.glb>)
- [PART_007_CutBajaFenders.glb](<../assets/bug/PART_007_CutBajaFenders.glb>)
- [PART_008_ShortenedFrontHood.glb](<../assets/bug/PART_008_ShortenedFrontHood.glb>)
- [PART_009_RearEngineOpening.glb](<../assets/bug/PART_009_RearEngineOpening.glb>)
- [PART_010_FiberglassWideFenders.glb](<../assets/bug/PART_010_FiberglassWideFenders.glb>)
- [STAGE2_PART_001_AllTerrainWheelSet.glb](<../assets/bug/STAGE2_PART_001_AllTerrainWheelSet.glb>)
- [STAGE2_PART_002_FrontTubeBumper.glb](<../assets/bug/STAGE2_PART_002_FrontTubeBumper.glb>)
- [STAGE2_PART_003_RearEngineCage.glb](<../assets/bug/STAGE2_PART_003_RearEngineCage.glb>)
- [STAGE2_PART_006_TrailShockSet.glb](<../assets/bug/STAGE2_PART_006_TrailShockSet.glb>)
- [STAGE2_PART_007_CutBajaFenders.glb](<../assets/bug/STAGE2_PART_007_CutBajaFenders.glb>)
- [STAGE2_PART_008_ShortenedFrontHood.glb](<../assets/bug/STAGE2_PART_008_ShortenedFrontHood.glb>)
- [STAGE2_PART_009_RearEngineOpening.glb](<../assets/bug/STAGE2_PART_009_RearEngineOpening.glb>)
- [STAGE2_PART_010_FiberglassWideFenders.glb](<../assets/bug/STAGE2_PART_010_FiberglassWideFenders.glb>)
- [STAGE2_PART_011_RockerGuards.glb](<../assets/bug/STAGE2_PART_011_RockerGuards.glb>)
- [STAGE2_PART_012_AirCooledRearEngine.glb](<../assets/bug/STAGE2_PART_012_AirCooledRearEngine.glb>)
- [STAGE2_VEH_001_Beetle_Imported.glb](<../assets/bug/STAGE2_VEH_001_Beetle_Imported.glb>)
- [VEH_001_Beetle_Imported.glb](<../assets/bug/VEH_001_Beetle_Imported.glb>)
- [VEH_002_Stage2Baja.glb](<../assets/bug/VEH_002_Stage2Baja.glb>)

### `assets/bug/optimized`

- [BODY_OffRoadBeetle.glb](<../assets/bug/optimized/BODY_OffRoadBeetle.glb>)
- [BODY_WhiteBaja.glb](<../assets/bug/optimized/BODY_WhiteBaja.glb>)
- [PART_FiberglassHood.glb](<../assets/bug/optimized/PART_FiberglassHood.glb>)
- [PART_GlassLabyrinth.glb](<../assets/bug/optimized/PART_GlassLabyrinth.glb>)

### `assets/generated`

- [buggy7_opt.glb](<../assets/generated/buggy7_opt.glb>)
- [buggy7_proxy.glb](<../assets/generated/buggy7_proxy.glb>)
- [buggy7_split.glb](<../assets/generated/buggy7_split.glb>)

### `assets/generated/raw`

- [body_enginecover_01.glb](<../assets/generated/raw/body_enginecover_01.glb>)
- [body_fender_01.glb](<../assets/generated/raw/body_fender_01.glb>)
- [body_hood_01.glb](<../assets/generated/raw/body_hood_01.glb>)
- [buggy7.glb](<../assets/generated/raw/buggy7.glb>)
- [bumper_front_01.glb](<../assets/generated/raw/bumper_front_01.glb>)
- [bumper_front_02.glb](<../assets/generated/raw/bumper_front_02.glb>)
- [grandpa_7_desert_buggy.glb](<../assets/generated/raw/grandpa_7_desert_buggy.glb>)
- [grandpa_7_opt.glb](<../assets/generated/raw/grandpa_7_opt.glb>)
- [grandpa_7_split.glb](<../assets/generated/raw/grandpa_7_split.glb>)
- [RaceCar_Grandpa7.glb](<../assets/generated/raw/RaceCar_Grandpa7.glb>)

### `assets/nissan frontier`

- [Nissan+Frontier+Pickup+Truck+2004.glb](<../assets/nissan frontier/Nissan+Frontier+Pickup+Truck+2004.glb>)

### `assets/plants`

- [Realistic+Trees+.glb](<../assets/plants/Realistic+Trees+.glb>)

### `assets/Shocks`

- [SHOCK_001_Coilover.glb](<../assets/Shocks/SHOCK_001_Coilover.glb>)

### `assets/Tires`

- [Meshy_AI_Rugged_Tread_1107045432_generate.glb](<../assets/Tires/Meshy_AI_Rugged_Tread_1107045432_generate.glb>)
- [Meshy_AI_Rugged_Wheel_Closeup_1107045349_texture.glb](<../assets/Tires/Meshy_AI_Rugged_Wheel_Closeup_1107045349_texture.glb>)
- [Meshy_AI_Rugged_Wheel_Closeup_1107045403_generate.glb](<../assets/Tires/Meshy_AI_Rugged_Wheel_Closeup_1107045403_generate.glb>)
- [Meshy_AI_Rugged_Wheel_Closeup_1107045421_generate.glb](<../assets/Tires/Meshy_AI_Rugged_Wheel_Closeup_1107045421_generate.glb>)
- [TIRE_AllTerrain_Normalized.glb](<../assets/Tires/TIRE_AllTerrain_Normalized.glb>)

### `handoff/project_baja_handoff/bug_asset`

- [PART_001_AllTerrainWheelSet.glb](<../handoff/project_baja_handoff/bug_asset/PART_001_AllTerrainWheelSet.glb>)
- [PART_002_FrontTubeBumper.glb](<../handoff/project_baja_handoff/bug_asset/PART_002_FrontTubeBumper.glb>)
- [PART_003_RearEngineCage.glb](<../handoff/project_baja_handoff/bug_asset/PART_003_RearEngineCage.glb>)
- [PART_004_BumperAuxLights.glb](<../handoff/project_baja_handoff/bug_asset/PART_004_BumperAuxLights.glb>)
- [PART_005_FrontSkidPlate.glb](<../handoff/project_baja_handoff/bug_asset/PART_005_FrontSkidPlate.glb>)
- [PART_006_TrailShockSet.glb](<../handoff/project_baja_handoff/bug_asset/PART_006_TrailShockSet.glb>)
- [PART_007_CutBajaFenders.glb](<../handoff/project_baja_handoff/bug_asset/PART_007_CutBajaFenders.glb>)
- [PART_008_ShortenedFrontHood.glb](<../handoff/project_baja_handoff/bug_asset/PART_008_ShortenedFrontHood.glb>)
- [PART_009_RearEngineOpening.glb](<../handoff/project_baja_handoff/bug_asset/PART_009_RearEngineOpening.glb>)
- [PART_010_FiberglassWideFenders.glb](<../handoff/project_baja_handoff/bug_asset/PART_010_FiberglassWideFenders.glb>)
- [PART_011_RockerGuards.glb](<../handoff/project_baja_handoff/bug_asset/PART_011_RockerGuards.glb>)
- [PART_012_AirCooledRearEngine.glb](<../handoff/project_baja_handoff/bug_asset/PART_012_AirCooledRearEngine.glb>)
- [PART_013_SuspensionAssembly.glb](<../handoff/project_baja_handoff/bug_asset/PART_013_SuspensionAssembly.glb>)
- [PART_014_InteriorRollCage.glb](<../handoff/project_baja_handoff/bug_asset/PART_014_InteriorRollCage.glb>)
- [PART_015_FrontCageReinforcement.glb](<../handoff/project_baja_handoff/bug_asset/PART_015_FrontCageReinforcement.glb>)
- [PART_016_RearCageBracing.glb](<../handoff/project_baja_handoff/bug_asset/PART_016_RearCageBracing.glb>)
- [VEH_001_Bug_Base_v01.glb](<../handoff/project_baja_handoff/bug_asset/VEH_001_Bug_Base_v01.glb>)

## Remaining station models

Eight additional station and broken-equipment GLBs are ready for wiring. Their measured dimensions and separate mesh names are in [the handoff](./CHATGPT_HANDOFF.md#remaining-stations-delivered). All use the small-prop material palette.
