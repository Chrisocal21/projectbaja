import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions'; import {getBounds} from '@gltf-transform/functions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const d=await io.read('C:/Users/chris/Documents/code/projectbaja/viewer/bug_viewer/public/models/STAGE2_VEH_001_Beetle_Imported.glb');
for(const n of d.getRoot().listNodes()){ if(!n.getMesh()) continue; const b=getBounds(n); const c=b.min.map((v,i)=>(v+b.max[i])/2); const s=b.max.map((v,i)=>v-b.min[i]);
 if(b.max[2]>0.7 && c[1]>0.45 && Math.abs(c[0])<0.75) console.log(n.getName().padEnd(34),'center',c.map(v=>v.toFixed(2)).join(','),'size',s.map(v=>v.toFixed(2)).join('x')); }
