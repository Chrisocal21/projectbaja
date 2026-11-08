// Render a quick visual-check image (top view silhouette, color-coded by node) of a split GLB.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
const [,, inp, outPrefix] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const W=1000,H=1000;
let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
const parts = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const prim = mesh.listPrimitives()[0];
  const Pos = prim.getAttribute('POSITION').getArray();
  const t = node.getTranslation();
  const pts = [];
  for (let i=0;i<Pos.length;i+=3){ const x=Pos[i]+t[0], y=Pos[i+1]+t[1], z=Pos[i+2]+t[2]; pts.push([x,y,z]); minX=Math.min(minX,x);maxX=Math.max(maxX,x); minY=Math.min(minY,y);maxY=Math.max(maxY,y); minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z); }
  parts.push({name: node.getName(), pts});
}
console.log('parts:', parts.map(p=>p.name+':'+p.pts.length).join(' '));
console.log('bbox X',minX.toFixed(3),maxX.toFixed(3),'Y',minY.toFixed(3),maxY.toFixed(3),'Z',minZ.toFixed(3),maxZ.toFixed(3));
const colors = {Body:[255,255,255], Wheel_FL:[255,60,60], Wheel_FR:[60,255,60], Wheel_RL:[80,160,255], Wheel_RR:[255,220,40], Shock_FL:[255,0,255], Shock_FR:[255,0,255], Shock_RL:[0,255,255], Shock_RR:[255,128,0]};
function render(axA, axB, rngA, rngB, name) {
  const buf = Buffer.alloc(W*H*3, 0);
  const [a0,a1]=rngA,[b0,b1]=rngB;
  for (const part of parts) {
    const col = colors[part.name] || [180,180,180];
    for (const p of part.pts) {
      const px = Math.round((p[axA]-a0)/(a1-a0)*(W-1));
      const py = Math.round((1-(p[axB]-b0)/(b1-b0))*(H-1));
      if (px>=0&&px<W&&py>=0&&py<H) { const o=(py*W+px)*3; buf[o]=col[0]; buf[o+1]=col[1]; buf[o+2]=col[2]; }
    }
  }
  return sharp(buf, {raw:{width:W,height:H,channels:3}}).png().toFile(outPrefix+'_'+name+'.png');
}
const pad=0.1;
await render(0,1, [minX-pad,maxX+pad], [minY-pad,maxY+pad], 'front');
await render(2,1, [minZ-pad,maxZ+pad], [minY-pad,maxY+pad], 'side');
await render(0,2, [minX-pad,maxX+pad], [minZ-pad,maxZ+pad], 'top');
