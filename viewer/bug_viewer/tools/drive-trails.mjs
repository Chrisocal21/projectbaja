// Reproducible low-speed rigid-body drive on the actual world height/surfaces.
// This harness omits scene streaming, game obstacles, fuel and player controls.
import { loadReviewWorld } from './load-review-world.mjs';
import { createBody, stepBody, readBody } from '../src/rigid.js';
import { writeFile, mkdir } from 'node:fs/promises';
const world = await loadReviewWorld();
const dims = { wheelbase:2.38, track:1.5, offroad:true, lift:0, bellyHeight:.28, cabEye:[.31,1.32,-.15],
  mounts:['FL','FR','RL','RR'].map(name=>({name,radius:.38,center:[name.endsWith('L')?.75:-.75,.38,name.startsWith('F')?1.19:-1.19]})) };
const selected = process.argv[2] ? [+process.argv[2]-1] : world.trailRoutes().map((_,i)=>i);
const results=[];
for (const index of selected) {
  const road=world.trailRoutes()[index],pts=road.pts, distance=[0];
  for(let i=1;i<pts.length;i++) distance[i]=distance[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);
  const first=pts[0], h=Math.atan2(pts[1].x-first.x,pts[1].z-first.z);
  const body=createBody(dims,{x:first.x,z:first.z,y:world.height(first.x,first.z)+.2,h});
  let nearest=0,offRoad=0,minUp=1,lastProgress=0,lastProgressTime=0,status='timeout',steps=0;
  const trace=[],state={};
  const env={height:world.height,mu:.72,rr:1,ACC:11,MAXV:40,DRG:.3*11/1600};
  const maxTime=distance.at(-1)/3+90;
  for(let t=0;t<maxTime;t+=1/120) {
    readBody(body,state); steps++;
    let d=Infinity,ni=nearest;
    for(let j=Math.max(0,nearest-3);j<Math.min(pts.length,nearest+8);j++) {
      const m=Math.hypot(state.x-pts[j].x,state.z-pts[j].z);if(m<d){d=m;ni=j;}
    }
    nearest=ni;offRoad=Math.max(offRoad,d);
    if(distance[nearest]>lastProgress+2){lastProgress=distance[nearest];lastProgressTime=t;}
    if(nearest>=pts.length-2 && Math.hypot(state.x-pts.at(-1).x,state.z-pts.at(-1).z)<6){status='reached end';break;}
    if(state.upY<.45){status='rolled';break;}
    if(d>20){status='left route';break;}
    if(t-lastProgressTime>30){status='stalled';break;}
    let target=nearest;while(target<pts.length-1 && distance[target]-distance[nearest]<8)target++;
    const angle=Math.atan2(pts[target].x-state.x,pts[target].z-state.z)-state.h;
    const err=Math.atan2(Math.sin(angle),Math.cos(angle));
    const steer=Math.max(-.5,Math.min(.5,Math.atan(2*dims.wheelbase*Math.sin(err)/8)));
    const goal=Math.abs(err)>.35?4:8;
    const ctl={steer,throttle:state.v<goal?Math.min(.8,.2+(goal-state.v)*.18):0,brake:state.v>goal+1};
    const sf=world.surface(state.x,state.z);env.mu=sf.mu;env.rr=sf.rr;
    stepBody(body,dims,ctl,env,1/120);minUp=Math.min(minUp,state.upY);
    if(steps%120===0)trace.push([+state.x.toFixed(2),+state.y.toFixed(2),+state.z.toFixed(2),+state.v.toFixed(2)]);
  }
  const result={trail:index+1,status,progressPct:+(distance[nearest]/distance.at(-1)*100).toFixed(1),maxDistanceToSample:+offRoad.toFixed(2),minUp:+minUp.toFixed(3),stop:[state.x,state.z],trace};
  results.push(result);console.log(JSON.stringify({...result,trace:undefined}));
}
await mkdir(new URL('../dist/review/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/review/trail-drives.json',import.meta.url),JSON.stringify(results));
