// keep only triangles whose centroid |x| <= limit (in the model's own units); recentres nothing
import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions'; import {prune} from '@gltf-transform/functions'; import fs from 'fs';
const [,, inp, out, limit]=process.argv; const L=+limit;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const d=await io.read(inp);
for(const m of d.getRoot().listMeshes()) for(const p of m.listPrimitives()){
  const P=p.getAttribute('POSITION').getArray(), I=p.getIndices().getArray(); const keep=[];
  for(let t=0;t<I.length;t+=3){ const cx=(P[I[t]*3]+P[I[t+1]*3]+P[I[t+2]*3])/3; if(Math.abs(cx)<=L) keep.push(I[t],I[t+1],I[t+2]); }
  p.getIndices().setArray(new Uint32Array(keep)); console.log('kept',keep.length/3,'of',I.length/3);
}
await d.transform(prune()); await io.write(out,d);
