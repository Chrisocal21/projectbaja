import * as T from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile } from 'node:fs/promises';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result=b; this.onloadend?.(); }); }
};
const output=new URL('../public/models/',import.meta.url);
for (let variant=0;variant<3;variant++) {
  const root=new T.Group();root.name='Customer';
  const bones=[], locations={};
  function bone(name,parent,position) {
    const b=new T.Bone();b.name=name;b.position.set(...position);parent.add(b);bones.push(b);locations[name]=b;return b;
  }
  const hips=bone('Hips',root,[0,.915,0]);
  const spine=bone('Spine',hips,[0,.15,0]);
  const head=bone('Head',spine,[0,.43,0]);
  for(const side of [-1,1]) {
    const suffix=side<0?'L':'R';
    const thigh=bone('Thigh'+suffix,hips,[side*.105,-.015,0]);
    const shin=bone('Shin'+suffix,thigh,[0,-.42,0]);
    bone('Foot'+suffix,shin,[0,-.41,0]);
    const arm=bone('UpperArm'+suffix,spine,[side*.235,.29,0]);
    bone('Forearm'+suffix,arm,[0,-.27,0]);
  }
  root.updateMatrixWorld(true);
  const skeleton=new T.Skeleton(bones);
  const skin=['#b98968','#76513e','#c39473'][variant], shirt=['#486774','#a46942','#637257'][variant];
  const materials={skin:new T.MeshStandardMaterial({color:skin,roughness:.94}),shirt:new T.MeshStandardMaterial({color:shirt,roughness:.93}),pants:new T.MeshStandardMaterial({color:'#39434b',roughness:.95}),shoe:new T.MeshStandardMaterial({color:'#373331',roughness:.87}),hair:new T.MeshStandardMaterial({color:['#403329','#272523','#776450'][variant],roughness:1})};
  function piece(name,b,geometry,offset,material) {
    geometry.translate(...offset);geometry.applyMatrix4(b.matrixWorld);
    const count=geometry.attributes.position.count, indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
    for(let i=0;i<count;i++){indices[i*4]=bones.indexOf(b);weights[i*4]=1;}
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const mesh=new T.SkinnedMesh(geometry,materials[material]);mesh.name=name;root.add(mesh);mesh.bind(skeleton);
  }
  piece('Shirt',spine,new T.CylinderGeometry(.195,.16,.36,8),[0,.19,0],'shirt');
  piece('Pelvis',hips,new T.BoxGeometry(.31,.17,.19),[0,-.015,0],'pants');
  piece('Face',head,new T.SphereGeometry(.108,8,6),[0,.13,.008],'skin');
  piece('Hair',head,new T.SphereGeometry(.110,8,4,0,Math.PI*2,0,Math.PI*.50),[0,.16,0],'hair');
  piece('Nose',head,new T.BoxGeometry(.035,.04,.04),[0,.125,.107],'skin');
  for (const side of [-1,1]) piece('Eye'+side,head,new T.BoxGeometry(.013,.011,.007),[side*.039,.149,.104],'shoe');
  for(const suffix of ['L','R']) {
    piece('Trouser'+suffix,locations['Thigh'+suffix],new T.CylinderGeometry(.078,.062,.42,8),[0,-.21,0],'pants');
    piece('ShinMesh'+suffix,locations['Shin'+suffix],new T.CylinderGeometry(.061,.05,.40,8),[0,-.20,0],'pants');
    piece('Shoe'+suffix,locations['Foot'+suffix],new T.BoxGeometry(.12,.11,.25),[0,-.015,.055],'shoe');
    piece('Sleeve'+suffix,locations['UpperArm'+suffix],new T.CylinderGeometry(.070,.057,.23,8),[0,-.105,0],'shirt');
    piece('Arm'+suffix,locations['Forearm'+suffix],new T.CylinderGeometry(.046,.034,.24,8),[0,-.12,0],'skin');
    piece('Hand'+suffix,locations['Forearm'+suffix],new T.BoxGeometry(.068,.10,.065),[0,-.27,.005],'skin');
  }
  const times=[0,.25,.5,.75,1];
  function rotation(name,axis,values) {
    const quats=values.flatMap(a=>new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis),a).toArray());
    return new T.QuaternionKeyframeTrack(name+'.quaternion',times,quats);
  }
  const idle=new T.AnimationClip('idle',1,[rotation('Spine',[0,0,1],[0,.012,0,-.012,0])]);
  const walk=new T.AnimationClip('walk',1,[
    ...['L','R'].flatMap((s,i)=>{const k=i?1:-1;return [
      rotation('Thigh'+s,[1,0,0],[k*.48,0,-k*.48,0,k*.48]),
      rotation('Shin'+s,[1,0,0],[.1,i?.65:.1,.1,i?.1:.65,.1]),
      rotation('UpperArm'+s,[1,0,0],[-k*.30,0,k*.30,0,-k*.30])];})
  ]);
  const talk=new T.AnimationClip('talk',1,[rotation('Head',[0,1,0],[0,.10,0,-.08,0]),rotation('ForearmR',[1,0,0],[-.5,-.85,-.65,-1,-.5]),rotation('UpperArmR',[0,0,1],[.1,.25,.18,.3,.1])]);
  const sit=new T.AnimationClip('sit',1,[
    ...['L','R'].flatMap(s=>[rotation('Thigh'+s,[1,0,0],Array(5).fill(-Math.PI/2)),rotation('Shin'+s,[1,0,0],Array(5).fill(Math.PI/2))]),
    new T.VectorKeyframeTrack('Hips.position',times,times.flatMap(()=>[0,.495,0])),
    rotation('Spine',[1,0,0],[.04,.05,.04,.03,.04])
  ]);
  const glb=await new GLTFExporter().parseAsync(root,{binary:true,animations:[idle,walk,talk,sit]});
  await writeFile(new URL('PERSON_Customer'+(variant+1)+'.glb',output),Buffer.from(glb));
}
