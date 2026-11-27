import { CANS } from '../finishJobs.js';

const files = {
  junk: { jerrycan: 'JUNK_JerryCan', crate: 'JUNK_Crate', engineblock: 'JUNK_EngineBlock' },
  mat: { wood: 'MAT_Planks', steel: 'MAT_SquareTube', bolts: 'MAT_Fasteners', scrap: 'MAT_Scrap' },
  epart: {
    airCleaner: 'ENG_AirCleaner', carb: 'ENG_Carburetor', coil: 'ENG_IgnitionCoil',
    distributor: 'ENG_Distributor', plugs: 'ENG_SparkPlugs', fanBelt: 'ENG_FanBelt',
    alternator: 'ENG_Alternator', starter: 'ENG_Starter', exhaust: 'ENG_Exhaust',
    intakeManifold: 'ENG_IntakeManifold', valveCoverL: 'ENG_ValveCover',
    valveCoverR: 'ENG_ValveCover', oilFilter: 'ENG_OilFilter',
  },
  supply: { oil: 'SUP_Oil', bulb: 'SUP_Bulb', plug: 'SUP_PlugKit', wipers: 'SUP_Wipers', belt: 'ENG_FanBelt' },
  stock: { battery: 'STOCK_Battery' },
  fab: { shockHoops: 'FAB_ShockHoops' },
  tool: {
    wrench: 'TOOL_Wrench', jack: 'TOOL_FloorJack', grinder: 'TOOL_Grinder', buffer: 'TOOL_Buffer',
    gauge: 'TOOL_Gauge', hose: 'TOOL_Sprayer', airchuck: 'TOOL_AirChuck', pump: 'TOOL_Pump',
    boards: 'TOOL_TractionBoards', shovel: 'TOOL_Shovel',
  },
};

export function smallItemFile({ kind, id, uid }) {
  if (kind === 'junk' && id === 'drum') return uid % 2 ? 'JUNK_DrumGreen' : 'JUNK_DrumBlue';
  if (kind === 'tool' && CANS[id]) return 'TOOL_SprayCan';
  return files[kind]?.[id];
}
