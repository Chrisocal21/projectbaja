// Isolated local art-review browser only. CDP port, expression, optional screenshot path.
import { writeFile } from 'node:fs/promises';
const [port='4198',expression='document.body.innerText',shot]=process.argv.slice(2);
const pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
const page=pages.find(p=>p.type==='page' && /^http:\/\/(localhost|127\.0\.0\.1):/.test(p.url));if(!page)throw Error('No local review page');
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let id=0;const pending=new Map();
socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id)pending.get(m.id)?.(m);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error(method+' timed out'));},20000);pending.set(key,m=>{clearTimeout(timer);pending.delete(key);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});socket.send(JSON.stringify({id:key,method,params}));});
try {
  if(expression==='--close'){await send('Browser.close');process.exit(0);}
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  console.log(JSON.stringify(result));
  if(shot){const data=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(shot,Buffer.from(data.data,'base64'));}
} finally {socket.close();}
