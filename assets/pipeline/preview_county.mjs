// Render Baja County top-down (hillshade + surfaces + roads + sites) to a BMP, without the game: for checking the layout and terrain.
//   node preview_county.mjs <out.bmp> [px=1000] [cx=0 cz=0 span=6000]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), PUB = path.join(HERE, '..', '..', 'viewer', 'bug_viewer', 'public');
globalThis.fetch = async url => { const b = fs.readFileSync(path.join(PUB, url)); return { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
const t0 = performance.now();
const C = await import('../../viewer/bug_viewer/src/worlds/county.js');
console.log(`county.js init ${(performance.now() - t0).toFixed(0)} ms`);
const [, , out = 'county.bmp', pxArg = '1000', cxA = '0', czA = '0', spanA = String(C.SIZE)] = process.argv;
const W = +pxArg, cx = +cxA, cz = +czA, span = +spanA, step = span / W;
const rgb = new Uint8Array(W * W * 3), hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
let hmin = 1e9, hmax = -1e9; const t1 = performance.now();
for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
  const x = cx - span / 2 + (i + 0.5) * step, z = cz + span / 2 - (j + 0.5) * step;   // north (+z) up
  const h = C.height(x, z), hx = C.height(x + step, z), hz = C.height(x, z + step);
  hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
  const nx = -(hx - h) / step, nz = -(hz - h) / step, l = Math.hypot(nx, 1, nz), shade = Math.max(0.25, (nx * -0.55 + 1 * 0.7 + nz * 0.45) / l);
  let c = hex(C.surface(x, z).color);
  const elev = Math.min(1, Math.max(0, (h + 10) / 140));
  c = c.map(v => v * shade * (0.85 + 0.3 * elev));
  rgb.set(c.map(v => Math.min(255, v * 255)), (j * W + i) * 3);
}
for (const s of Object.values(C.SITES)) { const i = Math.round((s.x - cx + span / 2) / step), j = Math.round((cz + span / 2 - s.z) / step); for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const k = ((j + b) * W + i + a) * 3; if (k >= 0 && k < rgb.length) rgb.set([230, 30, 30], k); } }
console.log(`render ${(performance.now() - t1).toFixed(0)} ms, height ${hmin.toFixed(1)}..${hmax.toFixed(1)} m`);
// 24-bit BMP, rows bottom-up
const row = Math.ceil(W * 3 / 4) * 4, buf = Buffer.alloc(54 + row * W);
buf.write('BM'); buf.writeUInt32LE(buf.length, 2); buf.writeUInt32LE(54, 10); buf.writeUInt32LE(40, 14); buf.writeInt32LE(W, 18); buf.writeInt32LE(W, 22);
buf.writeUInt16LE(1, 26); buf.writeUInt16LE(24, 28); buf.writeUInt32LE(row * W, 34);
for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const s = (j * W + i) * 3, d = 54 + (W - 1 - j) * row + i * 3; buf[d] = rgb[s + 2]; buf[d + 1] = rgb[s + 1]; buf[d + 2] = rgb[s]; }
fs.writeFileSync(out, buf); console.log('wrote', out);
