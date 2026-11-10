import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJunctions, isFreeway } from './junctions.js';

const B = { x0: -9000, x1: 9000, z0: -9000, z1: 9000 };
const line = (name, kind, ...pts) => ({ name, kind, pts });

test('freeway names', () => {
  assert.ok(isFreeway(line('I-8', 'major')) && isFreeway(line('Mex 2D', 'major')));
  assert.ok(!isFreeway(line('CA-86', 'secondary')) && !isFreeway(line('Mex 2', 'major')));
});

test('freeway x road: a diamond (off and on ramp each way on the road side)', () => {
  const r = [line('I-8', 'major', [-1500, 0], [0, 0], [1500, 0]), line('CA-1', 'secondary', [0, 0], [0, 1500])];
  const jn = buildJunctions([{ ...r[0], pts: [[-1500, 0], [-700, 0], [0, 0], [700, 0], [1500, 0]] }, { ...r[1], pts: [[0, 0], [0, 700], [0, 1500]] }], B);
  assert.equal(jn.junctions, 1);
  assert.equal(jn.ramps.filter(x => x.tag === 'off').length, 1);   // the south arm is on the right of eastbound only
  assert.equal(jn.ramps.filter(x => x.tag === 'on').length, 1);
  const off = jn.ramps.find(x => x.tag === 'off');
  assert.ok(Math.abs(off.pts[0][1]) < 1 && off.pts[0][0] < 0, 'leaves the freeway before the crossing');
  assert.ok(Math.abs(off.pts.at(-1)[0]) < 1 && off.pts.at(-1)[1] > 50, 'ends on the side road');
  assert.ok(jn.furniture.some(f => f.type === 'stop'));
});

test('freeway x freeway: four 270-degree loops that land on the other freeway', () => {
  const a1 = line('I-8', 'major', [-1500, 0], [-700, 0], [0, 0]), a2 = line('I-8', 'major', [0, 0], [700, 0], [1500, 0]);
  const b1 = line('I-5', 'major', [0, -1500], [0, -700], [0, 0]), b2 = line('I-5', 'major', [0, 0], [0, 700], [0, 1500]);
  const jn = buildJunctions([a1, a2, b1, b2], B);
  const loops = jn.ramps.filter(x => x.tag === 'loop'); assert.equal(loops.length, 4);
  for (const l of loops) {
    const e = l.pts.at(-2);   // the loop's last point before the run-on
    assert.ok(Math.min(Math.abs(e[0]), Math.abs(e[1])) < 2, 'ends on a freeway: ' + e);
    assert.ok(Math.max(Math.abs(e[0]), Math.abs(e[1])) > 60 && Math.max(Math.abs(e[0]), Math.abs(e[1])) < 90);
  }
});

test('road x road: stop sign on the minor road, lights; a lone end is a dead end', () => {
  const jn = buildJunctions([line('Mex 5', 'major', [-1000, 0], [0, 0], [1000, 0]), line('Hwy 4', 'secondary', [0, 0], [0, 500]), line('Hwy 9', 'secondary', [-1000, 0], [-1000, -800])], B);
  assert.equal(jn.furniture.filter(f => f.type === 'stop').length, 2);   // Hwy 4 and Hwy 9 both stop for Mex 5
  assert.ok(jn.furniture.some(f => f.type === 'light'));
  assert.ok(jn.deadEnds >= 1 && jn.furniture.some(f => f.type === 'deadend'));
});

test('road ends at the map edge are not dead ends', () => {
  const jn = buildJunctions([line('I-8', 'major', [-8950, 0], [0, 0])], B);
  assert.equal(jn.deadEnds, 1);   // only the inner end
});
test('at-grade freeway crossing has no overlapping ramps', () => {
  const roads = [line('I-8', 'major', [-500, 0], [0, 0]), line('I-8', 'major', [0, 0], [500, 0]),
    line('CA-86', 'secondary', [0, -500], [0, 0]), line('CA-86', 'secondary', [0, 0], [0, 500])];
  const jn = buildJunctions(roads, B, { atGrade: true });
  assert.equal(jn.ramps.length, 0);
  assert.ok(jn.furniture.some(f => f.type === 'stop'));
  assert.ok(jn.furniture.some(f => f.type === 'light'));
});
