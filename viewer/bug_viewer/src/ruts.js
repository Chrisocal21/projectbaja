// Tire ruts and skid marks: short dark quads laid on the ground behind each tire, in one ring buffer (one draw call). The oldest are overwritten, so
// the last few hundred metres of your driving stay on the ground. Tinted from the ground's own colour, darker where you slid or dug in.
import * as THREE from 'three';

export function createRuts(N = 2600) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);   // lies flat: width along X, length along Z, normal +Y
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true });
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const m = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), col = new THREE.Color();
  let next = 0, filled = 0;
  /** lay one mark centred at (x, y, z), pointing along (fx, fz), on ground with normal (nx, ny, nz) */
  function stamp(x, y, z, fx, fz, nx, ny, nz, width, length, color) {
    Y.set(nx, ny, nz).normalize(); Z.set(fx, 0, fz); Z.addScaledVector(Y, -Z.dot(Y)).normalize(); X.crossVectors(Y, Z);
    X.multiplyScalar(width); Z.multiplyScalar(length);
    m.makeBasis(X, Y, Z).setPosition(x + nx * 0.04, y + 0.04 * ny, z + nz * 0.04);
    mesh.setMatrixAt(next, m); mesh.setColorAt(next, col.copy(color));
    next = (next + 1) % N; filled = Math.min(N, filled + 1); mesh.count = filled;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, stamp, dispose: () => { geo.dispose(); mat.dispose(); mesh.dispose(); } };
}

/** how deep a surface takes a tyre mark (0 = none): paved ground only shows skids when sliding hard */
export const rutDepth = key => (({ asphalt: 0, concrete: 0, curb: 0, water: 0, rock: 0, sand: 1, looseDirt: 1, playa: 0.7, mud: 1 })[key] ?? 0.75);
