// Load the actual real-map height functions in Node for reproducible road audits.
// The tiny DOM adapter implements only border.js's PNG-to-pixels loading step.
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

function decodePNG(buffer) {
  let width, height, channels; const blocks = [];
  for (let p = 8; p < buffer.length;) {
    const n = buffer.readUInt32BE(p), type = buffer.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(p + 8); height = buffer.readUInt32BE(p + 12);
      if (buffer[p + 16] !== 8 || buffer[p + 17] !== 2 || buffer[p + 20] !== 0) throw Error('Expected 8-bit non-interlaced RGB terrain PNG');
      channels = 3;
    }
    if (type === 'IDAT') blocks.push(buffer.subarray(p + 8, p + 8 + n));
    p += n + 12;
  }
  const raw = inflateSync(Buffer.concat(blocks)), stride = width * channels, decoded = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const filter = raw[y * (stride + 1)], a = x >= channels ? decoded[y * stride + x - channels] : 0;
    const b = y ? decoded[(y - 1) * stride + x] : 0, c = y && x >= channels ? decoded[(y - 1) * stride + x - channels] : 0;
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? pa <= pb && pa <= pc ? a : pb <= pc ? b : c : 0;
    decoded[y * stride + x] = raw[y * (stride + 1) + 1 + x] + predicted;
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) { data.set(decoded.subarray(i * 3, i * 3 + 3), i * 4); data[i * 4 + 3] = 255; }
  return { width, height, data };
}

export async function loadReviewWorld() {
  globalThis.location = { search: '?realmap' };
  const fetch0 = globalThis.fetch, document0 = globalThis.document, bitmap0 = globalThis.createImageBitmap;
  globalThis.fetch = async path => {
    if (!String(path).startsWith('/terrain/')) throw Error('Unexpected review asset ' + path);
    return new Response(await readFile(new URL('../public' + path, import.meta.url)));
  };
  globalThis.createImageBitmap = async blob => decodePNG(Buffer.from(await blob.arrayBuffer()));
  globalThis.document = { createElement: () => {
    let image;
    return { getContext: () => ({ drawImage: bmp => { image = bmp; }, getImageData: () => ({ data: image.data }) }) };
  } };
  try { return await import('../src/worlds/county.js'); }
  finally { globalThis.fetch = fetch0; globalThis.document = document0; globalThis.createImageBitmap = bitmap0; }
}
