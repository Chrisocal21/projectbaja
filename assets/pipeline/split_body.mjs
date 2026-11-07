// Bake orientation/scale, drop to ground, and split 4 wheels out of a fused Meshy car mesh.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
import fs from 'fs';
import sharp from 'sharp';
const [,, inp, out, specPath] = process.argv;
const spec = JSON.parse(fs.readFileSync(specPath,'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot(), scene = root.listScenes()[0];
const mesh = root.listMeshes()[0]; if (root.listMeshes().length!==1 || mesh.listPrimitives().length!==1) throw new Error('expected 1 mesh / 1 primitive');
const node0 = root.listNodes()[0]; console.log('node0 TRS', node0.getTranslation(), node0.getRotation(), node0.getScale());
const prim = mesh.listPrimitives()[0], mat = prim.getMaterial();
const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL')?.getArray(), UV = prim.getAttribute('TEXCOORD_0')?.getArray(), I = prim.getIndices().getArray();
const nv = P.length/3, nt = I.length/3; console.log('attrs', prim.listSemantics(), 'verts', nv, 'tris', nt);
const S = spec.scale;
// rotated-normalized frame: x'=z, z'=-x
const R = new Float32Array(nv*3); let minY = 1e9;
for (let i=0;i<nv;i++){ R[i*3]=P[i*3+2]; R[i*3+1]=P[i*3+1]; R[i*3+2]=-P[i*3]; minY=Math.min(minY,R[i*3+1]); }
const shiftY = -minY*S;
const wheels = []; // {name, c:[x,y,z] in rotated-normalized frame, r}
for (const [zc,key] of [[spec.frontZ,'F'],[spec.rearZ,'R']]) for (const [sx,side] of [[1,'L'],[-1,'R']]) wheels.push({name:`Wheel_${key}${side}`, c:[sx*spec.wheelX, spec.wheelY, zc], sx, r:spec.wheelR, tris:[]});
const body = [];
let tex=null; if (spec.removeRed) { const img=mat.getBaseColorTexture().getImage(); const {data,info}=await sharp(Buffer.from(img)).removeAlpha().raw().toBuffer({resolveWithObject:true}); tex={data,w:info.width,h:info.height}; }
const redAt=(u,v)=>{ const x=Math.min(tex.w-1,Math.max(0,Math.floor(((u%1)+1)%1*tex.w))), y=Math.min(tex.h-1,Math.max(0,Math.floor(((v%1)+1)%1*tex.h))); const i=(y*tex.w+x)*3; const r=tex.data[i],g=tex.data[i+1],b=tex.data[i+2]; return r>110 && r>g*1.8 && r>b*1.8; };
let removed = 0;
for (let t=0;t<nt;t++){
  const a=I[t*3],b=I[t*3+1],c=I[t*3+2];
  const cx=(R[a*3]+R[b*3]+R[c*3])/3, cy=(R[a*3+1]+R[b*3+1]+R[c*3+1])/3, cz=(R[a*3+2]+R[b*3+2]+R[c*3+2])/3;
  if (spec.remove && spec.remove.some(q=>cy<q.yBelow && Math.abs(cx)<q.absXBelow && cz>=q.zMin && cz<=q.zMax)) { removed++; continue; }
  if (tex && cy < spec.removeRed.yBelow && cz>=spec.removeRed.zMin && cz<=spec.removeRed.zMax && Math.abs(cx)<spec.removeRed.absXBelow && redAt((UV[a*2]+UV[b*2]+UV[c*2])/3,(UV[a*2+1]+UV[b*2+1]+UV[c*2+1])/3)) { removed++; continue; }
  let w=null;
  for (const wh of wheels){ if (cx*wh.sx>=spec.wheelInner && cx*wh.sx<=spec.wheelOuter && Math.hypot(cy-wh.c[1], cz-wh.c[2])<=wh.r*spec.k && Math.abs(cz-wh.c[2])<1) { w=wh; break; } }
  (w?w.tris:body).push(t);
}
console.log('removed', removed, 'body tris', body.length, wheels.map(w=>w.name+':'+w.tris.length).join(' '));
function build(triList, center){ // returns new Primitive with positions (scaled, shifted, minus center)
  const map=new Map(), pos=[], nor=[], uv=[], idx=[];
  for (const t of triList) for (let k=0;k<3;k++){ const v=I[t*3+k]; let nvi=map.get(v); if(nvi===undefined){ nvi=pos.length/3; map.set(v,nvi);
    pos.push(R[v*3]*S-center[0], R[v*3+1]*S+shiftY-center[1], R[v*3+2]*S-center[2]);
    if(N) nor.push(N[v*3+2], N[v*3+1], -N[v*3]);
    if(UV) uv.push(UV[v*2],UV[v*2+1]); } idx.push(nvi); }
  const p=doc.createPrimitive().setMaterial(mat);
  p.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)));
  if(N) p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)));
  if(UV) p.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)));
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)));
  return p;
}
scene.listChildren().forEach(n=>scene.removeChild(n));
const bodyNode = doc.createNode('Body').setMesh(doc.createMesh('Body').addPrimitive(build(body,[0,0,0])));
scene.addChild(bodyNode);
const manifest = {wheels:{}, scale:S};
for (const w of wheels){
  const c=[w.c[0]*S, w.c[1]*S+shiftY, w.c[2]*S];
  const n=doc.createNode(w.name).setMesh(doc.createMesh(w.name).addPrimitive(build(w.tris,c))).setTranslation(c);
  scene.addChild(n); manifest.wheels[w.name]={center:c.map(v=>+v.toFixed(3)), radius:+(w.r*S).toFixed(3), halfWidth:+(((spec.wheelOuter-spec.wheelInner)/2)*S).toFixed(3)};
}
root.listNodes().filter(n=>n!==bodyNode && !n.getName().startsWith('Wheel_') && !scene.listChildren().includes(n)).forEach(n=>n.dispose());
mesh.dispose();
await doc.transform(prune());
await io.write(out, doc); fs.writeFileSync(out.replace('.glb','.json'), JSON.stringify(manifest,null,1));
console.log(out.split(/[\/]/).pop(), (fs.statSync(out).size/1e6).toFixed(1)+' MB', JSON.stringify(manifest.wheels.Wheel_FL));
