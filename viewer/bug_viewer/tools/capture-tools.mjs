import { writeFile } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9228/json')).json();
const page = pages.find(p => p.type === 'page');
if (!page) throw Error('No review browser tab');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise(resolve => { const key = ++id; pending.set(key, resolve); ws.send(JSON.stringify({ id: key, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:5173/tool-review.html' });
await new Promise(resolve => setTimeout(resolve, 7000));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(new URL('../dist/review/held-tools.png', import.meta.url), Buffer.from(shot.data, 'base64'));
ws.close();
