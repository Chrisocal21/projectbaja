// Bakes public/terrain/trails.json: long dirt trails that follow the real ground (src/worlds/trailRoutes.js).
// Usage: node tools/build_trails.mjs [debug.png]   (the optional PNG is a hillshade with highways white and trails orange)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { makeBorder } from '../src/worlds/border.js';
import { planTrails, length } from '../src/worlds/trailRoutes.js';

const dir = new URL('../public/terrain/', import.meta.url);
const meta = JSON.parse(fs.readFileSync(new URL('border.json', dir)));
const hw = JSON.parse(fs.readFileSync(new URL('highways.json', dir)));

function readPng(buf) {   // 8-bit RGB, non-interlaced (what west_dem.py writes)
  let p = 8, w = 0, h = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8); if (type === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); } if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len)); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c), pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; v += pr; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, px: out };
}
function writePng(w, h, rgb, file) {
  const crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const raw = Buffer.alloc(h * (w * 3 + 1)); for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const png = readPng(fs.readFileSync(new URL(meta.file, dir)));
const n = meta.nx * meta.nz, H = new Float32Array(n), M = new Uint8Array(n);
for (let k = 0; k < n; k++) { H[k] = (png.px[k * 3] * 256 + png.px[k * 3 + 1] - 32768) / 10; M[k] = Math.round(png.px[k * 3 + 2] / 100); }
const border = makeBorder(meta, H, M);
// keep clear of the built places (same circles county.js uses for its "keep" list: home, Dry Wells, proving grounds, farm) - read from the game file's constants
const keep = JSON.parse(fs.readFileSync(new URL('../tools/keep.json', import.meta.url)));
const t0 = Date.now();
const trails = planTrails(border, hw.roads, keep);
console.log(trails.length, 'dirt roads,', (trails.reduce((s, t) => s + length(t.pts), 0) / 1000).toFixed(0), 'km total', Date.now() - t0, 'ms');
for (const t of trails) console.log((length(t.pts) / 1000).toFixed(1) + ' km', t.pts[0].join(','), '->', t.pts.at(-1).join(','));
fs.writeFileSync(new URL('trails.json', dir), JSON.stringify({ source: 'tools/build_trails.mjs', trails }));

if (process.argv[2]) {   // debug picture: 1 px = 60 m
  const S = 60, W = Math.floor((border.bounds.x1 - border.bounds.x0) / S), Hh = Math.floor((border.bounds.z1 - border.bounds.z0) / S), img = Buffer.alloc(W * Hh * 3);
  const hAt = (i, j) => border.heightAt(border.bounds.x0 + i * S, border.bounds.z0 + j * S);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = border.bounds.x0 + i * S, z = border.bounds.z0 + j * S, h = hAt(i, j), sh = (hAt(i - 1, j - 1) - hAt(i + 1, j + 1)) * 0.5, v = Math.max(0, Math.min(255, 150 + sh * 6 + h * 0.02)), o = (j * W + i) * 3;
    if (border.waterAt(x, z) != null) { img[o] = 100; img[o + 1] = 140; img[o + 2] = 180; } else { img[o] = v; img[o + 1] = v * 0.95; img[o + 2] = v * 0.85; }
  }
  const dot = (x, z, r, g, b) => { const i = Math.round((x - border.bounds.x0) / S), j = Math.round((z - border.bounds.z0) / S); if (i >= 0 && j >= 0 && i < W && j < Hh) { const o = (j * W + i) * 3; img[o] = r; img[o + 1] = g; img[o + 2] = b; } };
  const line = (pts, r, g, b) => { for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az); for (let d = 0; d <= l; d += 20) dot(ax + (bx - ax) * d / l, az + (bz - az) * d / l, r, g, b); } };
  for (const r of hw.roads) line(r.pts, 255, 255, 255);
  for (const t of trails) line(t.pts, 255, 90, 0);
  writePng(W, Hh, img, process.argv[2]);
}
