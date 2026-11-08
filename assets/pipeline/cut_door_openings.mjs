// Cut the door openings out of a car body GLB.
//
// Some imported bodies keep a full side panel in the main body mesh (B_Body*) behind each door skin (B_Body_Door_L/R*).
// With the door shut you can't tell, but when the door swings open (or comes off) that hidden panel makes the doorway
// look closed. This removes every body triangle on the door's side whose centre lies inside the door's side silhouette,
// eroded by EDGE metres so the jamb, pillars and sill around the opening stay.
//
//   node cut_door_openings.mjs <in.glb> <out.glb> [EDGE=0.015]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';

const [, , inp, out, edgeArg] = process.argv;
const EDGE = +(edgeArg || 0.015);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const nodes = doc.getRoot().listNodes().filter(n => n.getMesh());
const xf = (w, x, y, z) => [w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14]];

// the door's silhouette seen from the side, as (z, y) triangles
function silhouette(re) {
  const tris = [];
  for (const n of nodes.filter(n => re.test(n.getName()))) {
    const w = n.getWorldMatrix();
    for (const p of n.getMesh().listPrimitives()) {
      const P = p.getAttribute('POSITION').getArray(), I = p.getIndices().getArray();
      for (let t = 0; t < I.length; t += 3) tris.push([0, 1, 2].map(k => { const v = I[t + k], q = xf(w, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); return [q[2], q[1]]; }));
    }
  }
  return tris;
}
const inTri = ([px, py], [a, b, c]) => {
  const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); if (Math.abs(d) < 1e-12) return false;
  const u = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / d, v = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / d;
  return u >= 0 && v >= 0 && u + v <= 1;
};
const inside = (sil, z, y) => sil.some(t => inTri([z, y], t));
const deep = (sil, z, y) => [[0, 0], [EDGE, 0], [-EDGE, 0], [0, EDGE], [0, -EDGE]].every(([dz, dy]) => inside(sil, z + dz, y + dy));

const sides = [{ sign: 1, sil: silhouette(/^(B_Body_Door_L|B_SideWindows_DoorL)/) }, { sign: -1, sil: silhouette(/^(B_Body_Door_R|B_SideWindows_DoorR)/) }];   // glass fills the window hole
let removed = 0;
for (const n of nodes.filter(n => /^B_Body(_\d+)?$/.test(n.getName()))) {
  const w = n.getWorldMatrix();
  for (const p of n.getMesh().listPrimitives()) {
    const P = p.getAttribute('POSITION').getArray(), acc = p.getIndices(), I = acc.getArray(), keep = [];
    for (let t = 0; t < I.length; t += 3) {
      const c = [0, 1, 2].map(k => xf(w, P[I[t + k] * 3], P[I[t + k] * 3 + 1], P[I[t + k] * 3 + 2])).reduce((s, q) => s.map((v, i) => v + q[i] / 3), [0, 0, 0]);
      const side = sides.find(s => c[0] * s.sign > 0.45);
      if (side && side.sil.length && deep(side.sil, c[2], c[1])) { removed++; continue; }
      keep.push(I[t], I[t + 1], I[t + 2]);
    }
    acc.setArray(I.constructor === Uint16Array && keep.every(v => v < 65536) ? new Uint16Array(keep) : new Uint32Array(keep));
  }
}
await io.write(out, doc);
console.log(`${inp.split(/[\\/]/).pop()}: removed ${removed} body triangles behind the doors -> ${out.split(/[\\/]/).pop()} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, was ${(fs.statSync(inp).size / 1e6).toFixed(1)} MB)`);
