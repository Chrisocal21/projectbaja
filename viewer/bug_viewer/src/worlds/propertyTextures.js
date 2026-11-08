import * as THREE from 'three';

// Reuse the supplied terrain atlas, not synthetic substitutes for gravel/concrete.
// Layer provenance lives in public/textures/ground/SOURCES.md.
const textures = new Map();
export function propertyTexture(layer, repeatX = 1, repeatY = 1, normal = false) {
  const key = `${layer}:${repeatX}:${repeatY}:${normal}`;
  if (textures.has(key)) return textures.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = normal ? '#8080ff' : '#a69a87';
  ctx.fillRect(0, 0, 1024, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  if (!normal) texture.colorSpace = THREE.SRGBColorSpace;
  new THREE.ImageLoader().load(`/textures/ground/${normal ? 'normal' : 'albedo'}.jpg`, image => {
    ctx.drawImage(image, 0, layer * 1024, 1024, 1024, 0, 0, 1024, 1024);
    texture.needsUpdate = true;
  });
  textures.set(key, texture);
  return texture;
}
