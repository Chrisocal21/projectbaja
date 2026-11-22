import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from 'three';

// Linear roughness data. The green channel modulates the authored finish without tinting it.
function finishGrain(brushed) {
  const n = 128, data = new Uint8Array(n * n * 4);
  let seed = 419;
  const noise = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < n; y++) {
    const brushLine = brushed ? noise() * 42 : 0;
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const grain = Math.round((brushed ? 178 : 213) + brushLine + noise() * (brushed ? 34 : 41));
      data.set([grain, grain, grain, 255], i);
    }
  }
  const tex = new DataTexture(data, n, n, RGBAFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export const brushedFinish = finishGrain(true);
export const matteFinish = finishGrain(false);
