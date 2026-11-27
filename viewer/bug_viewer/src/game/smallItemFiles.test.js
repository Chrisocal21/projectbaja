import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { smallItemFile } from './smallItemFiles.js';
import { ENGINE_SLOTS } from './engineRules.js';
import { FINISH_TOOL_ITEMS } from '../finishJobs.js';
import { PRESSURE_TOOL_ITEMS } from '../tirePressure.js';
import { RECOVERY_TOOLS } from '../bogDown.js';
import { MAT_ORDER } from './materials.js';
import { SUPPLIES } from './garageSupplies.js';

function readModel(file) {
  assert.ok(file, 'missing model mapping');
  const data = readFileSync(new URL('../../public/models/' + file + '.glb', import.meta.url));
  assert.equal(data.toString('ascii', 0, 4), 'glTF', file);
  return JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
}

test('all workshop items resolve to packaged meshes and held tools have grips', () => {
  const ids = {
    junk: ['crate', 'jerrycan', 'engineblock', 'drum'], mat: MAT_ORDER,
    epart: ENGINE_SLOTS.map(s => s.id), supply: Object.keys(SUPPLIES),
    stock: ['battery'], fab: ['shockHoops'],
    tool: ['jack', 'wrench', ...Object.keys({ ...FINISH_TOOL_ITEMS, ...PRESSURE_TOOL_ITEMS, ...RECOVERY_TOOLS })],
  };
  for (const [kind, group] of Object.entries(ids)) for (const id of group) {
    const model = readModel(smallItemFile({ kind, id }));
    assert.ok(model.meshes.length, id);
    if (kind === 'tool') assert.equal(model.scenes[0].extras.grip.filter(Number.isFinite).length, 3, id);
  }
  assert.notEqual(smallItemFile({kind:'junk', id:'drum', uid:1}), smallItemFile({kind:'junk', id:'drum', uid:2}));
  readModel(smallItemFile({kind:'junk', id:'drum', uid:1}));
});

test('each fitted procedural upgrade also ships a loose kit model', () => {
  const parts = JSON.parse(readFileSync(new URL('../catalog/parts.json', import.meta.url)));
  for (const p of parts.filter(p => Object.values(p.bodies).includes('proc'))) readModel('KIT_' + p.id);
});

test('stack quantities and container states can address their individual meshes', () => {
  for (const [file, names] of Object.entries({
    MAT_Planks: ['Plank1','Plank2','Plank3'], MAT_SquareTube: ['Tube1','Tube2','Tube3','Tube4'],
    PROP_Toolbox: ['Lid','Handle'], PROP_Drawers: ['UpperDrawer','UpperPull','DrawerTray'],
    PROP_Carton: ['LeftFlap','RightFlap'], JUNK_Crate: ['Lid','LidNails'], TOOL_SprayCan: ['PaintBody'],
  })) {
    const nodes = readModel(file).nodes.map(n => n.name);
    for (const name of names) assert.ok(nodes.includes(name), file + ' missing ' + name);
  }
});
