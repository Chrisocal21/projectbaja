// Move the stretch of a full-length body mesh (side trim / stripe) that crosses each door into its own door node,
// so it swings open and comes off with the door.
//
//   node split_door_trim.mjs <in.glb> <out.glb> [meshPrefix=B_SideTrim] [newPrefix=B_DoorTrim]
// writes nodes `${newPrefix}_DoorL` / `${newPrefix}_DoorR` (add them to the doorL / doorR pieces in bodies.json).
// New names must not start with meshPrefix, or the original piece's prefix match would pick them up too.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , inp, out, meshPrefix = 'B_SideTrim', newPrefix = 'B_DoorTrim'] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp), root = doc.getRoot();
const nodes = root.listNodes().filter(n => n.getMesh());
const xf = (w, x, y, z) => [w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14]];
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
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
};
const sides = [{ tag: 'DoorL', sign: 1, sil: silhouette(/^B_Body_Door_L/) }, { tag: 'DoorR', sign: -1, sil: silhouette(/^B_Body_Door_R/) }];
const esc = meshPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const srcs = nodes.filter(n => new RegExp(`^${esc}(_\\d+)?$`).test(n.getName()));
if (!srcs.length) throw new Error(`no mesh named ${meshPrefix}`);
for (const n of srcs) {
  const w = n.getWorldMatrix(), parent = n.getParentNode(), scene = root.listScenes()[0];
  const part = Object.fromEntries(sides.map(s => [s.tag, doc.createMesh(`${newPrefix}_${s.tag}`)]));
  let moved = 0;
  for (const p of n.getMesh().listPrimitives()) {
    const P = p.getAttribute('POSITION').getArray(), acc = p.getIndices(), I = acc.getArray(), keep = [], take = { DoorL: [], DoorR: [] };
    for (let t = 0; t < I.length; t += 3) {
      const c = [0, 1, 2].map(k => xf(w, P[I[t + k] * 3], P[I[t + k] * 3 + 1], P[I[t + k] * 3 + 2])).reduce((s, q) => s.map((v, i) => v + q[i] / 3), [0, 0, 0]);
      const side = sides.find(s => c[0] * s.sign > 0.3 && s.sil.some(tr => inTri([c[2], c[1]], tr)));
      (side ? take[side.tag] : keep).push(I[t], I[t + 1], I[t + 2]); if (side) moved++;
    }
    const arr = a => (a.every(v => v < 65536) ? new Uint16Array(a) : new Uint32Array(a));
    acc.setArray(arr(keep));
    for (const s of sides) if (take[s.tag].length) { const q = p.clone(); q.setIndices(doc.createAccessor().setType('SCALAR').setArray(arr(take[s.tag]))); part[s.tag].addPrimitive(q); }
  }
  for (const s of sides) {
    if (!part[s.tag].listPrimitives().length) { part[s.tag].dispose(); continue; }
    const nn = doc.createNode(`${newPrefix}_${s.tag}`).setMesh(part[s.tag]).setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale());
    nn.setExtras({ source_name: `${newPrefix}_${s.tag}`, original_source_name: n.getName() });
    (parent || scene).addChild(nn);
  }
  console.log(`${n.getName()}: moved ${moved} triangles into ${newPrefix}_DoorL/R`);
}
await io.write(out, doc);
