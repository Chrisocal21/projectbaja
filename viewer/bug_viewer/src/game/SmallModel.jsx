import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CANS } from '../finishJobs.js';

const paint = new Map();
function canFinish(material, id) {
  if (!paint.has(id)) {
    const finish = material.clone();
    finish.color.set(CANS[id][1]);
    paint.set(id, finish);
  }
  return paint.get(id);
}

function hinge(mesh, point, axis, angle) {
  const pivot = new THREE.Vector3(...point);
  const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  mesh.position.sub(pivot).applyQuaternion(rotation).add(pivot);
  mesh.quaternion.premultiply(rotation);
}

function LoadedModel({ file, id, count, inHand, open }) {
  const { scene } = useGLTF('/models/' + file + '.glb');
  const object = useMemo(() => {
    const model = scene.clone(true);
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const name = mesh.name;
      if (file === 'MAT_Planks' || file === 'MAT_SquareTube') mesh.visible = Number(name.slice(-1)) <= (count || 1);
      if (name === 'PaintBody' && CANS[id]) mesh.material = canFinish(mesh.material, id);
      if (!open) return;
      if (file === 'PROP_Toolbox' && ['Lid', 'Handle'].includes(name))
        hinge(mesh, [0, .22, -.13], new THREE.Vector3(1, 0, 0), -1.9);
      if (file === 'PROP_Carton' && name.endsWith('Flap')) {
        const side = name === 'LeftFlap' ? -1 : 1;
        hinge(mesh, [side * .275, .4, 0], new THREE.Vector3(0, 0, 1), -side * 2.2);
      }
      if (file === 'PROP_Drawers' && ['UpperDrawer', 'UpperPull', 'DrawerTray'].includes(name)) mesh.position.z += .29;
      if (file === 'JUNK_Crate' && name.startsWith('Lid')) {
        hinge(mesh, [.30, .48, 0], new THREE.Vector3(0, 0, 1), -1.45);
        mesh.position.setX(mesh.position.x + .035);
        mesh.position.y -= .44;
      }
    });
    if (inHand && scene.userData.grip) {
      model.position.fromArray(scene.userData.grip).negate();
    } else if (['TOOL_Wrench','TOOL_Shovel','TOOL_Grinder','TOOL_Sprayer','TOOL_AirChuck','TOOL_Gauge'].includes(file)) {
      model.rotation.x = -Math.PI / 2;
      const bounds = new THREE.Box3().setFromObject(model);
      model.position.set(0, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);
    }
    return model;
  }, [scene, file, id, count, inHand, open]);
  return <primitive object={object} dispose={null} />;
}

export default function SmallModel(props) {
  return <Suspense fallback={null}><LoadedModel {...props} /></Suspense>;
}
