// Render simple orthographic point-splat profile images (top + front) of the rotated mesh,
// for visual measurement of wheel hub positions (no GPU/Blender needed).
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
const [,, inp, outPrefix] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const mesh = doc.getRoot().listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray();
const nv = P.length / 3;
const R = new Float32Array(nv * 3);
for (let i = 0; i < nv; i++) { R[i*3]=P[i*3+2]; R[i*3+1]=P[i*3+1]; R[i*3+2]=-P[i*3]; }
let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
for (let i=0;i<nv;i++){ const x=R[i*3],y=R[i*3+1],z=R[i*3+2]; minX=Math.min(minX,x);maxX=Math.max(maxX,x); minY=Math.min(minY,y);maxY=Math.max(maxY,y); minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z); }
const W=1000,H=1000;
function render(axA, axB, rngA, rngB, name) { // axA -> image x, axB -> image y (flipped)
  const buf = Buffer.alloc(W*H, 0);
  const [a0,a1]=rngA,[b0,b1]=rngB;
  for (let i=0;i<nv;i++){
    const va = R[i*3+axA], vb = R[i*3+axB];
    const px = Math.round((va-a0)/(a1-a0)*(W-1));
    const py = Math.round((1-(vb-b0)/(b1-b0))*(H-1));
    if (px>=0&&px<W&&py>=0&&py<H) buf[py*W+px] = 255;
  }
  // mark axis gridlines every 0.1 unit in A, label via brightness steps (can't draw text easily, so print scale separately)
  return sharp(buf, {raw:{width:W,height:H,channels:1}}).png().toFile(outPrefix+'_'+name+'.png');
}
const pad=0.05;
await render(0,1, [minX-pad,maxX+pad], [minY-pad,maxY+pad], 'front'); // X horiz, Y vert
await render(2,1, [minZ-pad,maxZ+pad], [minY-pad,maxY+pad], 'side');  // Z horiz, Y vert
await render(0,2, [minX-pad,maxX+pad], [minZ-pad,maxZ+pad], 'top');   // X horiz, Z vert
console.log('ranges: X', minX.toFixed(3), maxX.toFixed(3), 'Y', minY.toFixed(3), maxY.toFixed(3), 'Z', minZ.toFixed(3), maxZ.toFixed(3));
console.log('image is', W, 'x', H, 'px covering the padded range linearly (left/top = min-pad, right/bottom = max+pad for front/side; top view: vert axis is Z, min at top)');
