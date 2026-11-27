import { loadReviewWorld } from './load-review-world.mjs';
import { readFile } from 'node:fs/promises';
const w = await loadReviewWorld(), hw=w.highways();
const {rows}=JSON.parse(await readFile(new URL('../dist/review/trail-audit.json',import.meta.url)));
for (const row of rows.filter(r=>[1,4,5,14,20,21,24].includes(r.trail))) {
  const {x,z}=row.worst, r=w.trailRoutes()[row.trail-1];
  let i=0; for(let j=1;j<r.pts.length;j++)if(Math.hypot(r.pts[j].x-x,r.pts[j].z-z)<Math.hypot(r.pts[i].x-x,r.pts[i].z-z))i=j;
  console.log('TRAIL',row.trail,'WORST',row.worst);
  console.log('POINTS',r.pts.slice(Math.max(0,i-2),i+3).map(p=>[p.x,p.z,p.hs,w.height(p.x,p.z)]));
  const near=[];
  for (const road of hw.roads) {
    let best={d:Infinity};
    for(let j=1;j<road.pts.length;j++){const a=road.pts[j-1],b=road.pts[j],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);if(d<best.d)best={d,h:a.hs+(b.hs-a.hs)*t,name:road.name,kind:road.kind};}
    if(best.d<40)near.push(best);
  }
  console.log('NEAR',near);
}
