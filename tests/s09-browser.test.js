import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'vite';

const candidates=process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
const executable=candidates.find(existsSync),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const page=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#10151c}canvas{display:block;width:320px;height:720px}</style><canvas id="game"></canvas><script type="module">
const modules=await Promise.all(Array.from({length:10},(_,i)=>import('/src/feature-games'+(i+21)+'.js')));
let now=0,seq=0,pending=new Map(),game,records=[];
window.requestAnimationFrame=fn=>{const id=++seq;pending.set(id,fn);return id};window.cancelAnimationFrame=id=>pending.delete(id);
window.fixture={ids:modules.flatMap((m,i)=>m['featureGames'+(i+21)].map(g=>g.id)),
 start(id){game?.destroy();pending.clear();records=[];now=0;const i=modules.findIndex((m,n)=>m['featureGames'+(n+21)].some(g=>g.id===id));game=modules[i]['createFeatureGame'+(i+21)](document.querySelector('canvas'),id,{interactive:false,onResult:r=>records.push(r)});},
 step(n){for(let i=0;i<n;i++){now+=1000/30;const next=[...pending.values()];pending.clear();for(const fn of next)fn(now)}},
 pause(){game.pause()},resume(){game.resume()},takeover(){game.setInteractive(true)},destroy(){game.destroy()},
 state(){return {records,state:game.getSessionState(),scheduled:pending.size}}};
</script>`;

test('S09 wrappers render and complete fresh AI and human runs in Chrome',{skip:!executable,timeout:240000},async()=>{
 const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'silent',plugins:[{name:'s09-browser-fixture',configureServer(v){v.middlewares.use('/__s09-browser',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(page)})}}]});await server.listen();const port=server.httpServer.address().port;
 const profile=mkdtempSync(join(tmpdir(),'s09-browser-'));const proc=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});let ws;
 try{
  let browserPort;for(let i=0;i<100;i++){try{browserPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}}assert.ok(browserPort,'Chrome debugging port');
  const targets=await(await fetch(`http://127.0.0.1:${browserPort}/json`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0;const pending=new Map();ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id&&pending.has(v.id)){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(Error(v.error.message)):p.resolve(v.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
  async function until(expression){for(let i=0;i<400;i++){if(await evaluate(expression))return;await sleep(25)}throw Error('Timed out: '+expression)}
  async function screenshot(name){if(!process.env.S09_SCREENSHOT_DIR)return;mkdirSync(process.env.S09_SCREENSHOT_DIR,{recursive:true});const data=await evaluate("document.querySelector('#game').toDataURL('image/png').split(',')[1]");writeFileSync(join(process.env.S09_SCREENSHOT_DIR,`s09-${name}.png`),Buffer.from(data,'base64'))}
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:`http://127.0.0.1:${port}/__s09-browser`});await until('!!window.fixture');
  const ids=await evaluate('fixture.ids');assert.equal(ids.length,20);
  for(const id of ids){
   await evaluate(`fixture.start(${JSON.stringify(id)});true`);await sleep(50);await evaluate('fixture.step(1);fixture.step(300);true');
   if(['hive-heist','rune-rebound','harbor-hoist'].includes(id))await screenshot(`${id}-playing`);
   await evaluate('fixture.pause();fixture.step(600);fixture.resume();fixture.step(1);fixture.step(3302);true');
   let s=await evaluate('fixture.state()');assert.equal(s.records.length,1,`${id} AI result`);assert.equal(s.records[0].actor,'ai',id);assert.equal(s.records[0].context,'gallery-preview',id);assert.equal(s.records[0].durationMs,120000,id);assert.equal(s.state,'result',id);
   if(['hive-heist','rune-rebound','harbor-hoist'].includes(id))await screenshot(`${id}-result`);
   await evaluate('fixture.takeover();fixture.step(1);fixture.step(3602);true');s=await evaluate('fixture.state()');assert.equal(s.records.length,2,`${id} human result`);assert.equal(s.records[1].actor,'human',id);assert.equal(s.records[1].context,'manual-player',id);assert.equal(s.records[1].durationMs,120000,id);assert.notEqual(s.records[0].runId,s.records[1].runId,id);await evaluate('fixture.destroy();true');
  }
  // Exercise the real gallery independently, using its normal browser animation loop.
  for(const id of ['hive-heist','rune-rebound','harbor-hoist']){await send('Page.navigate',{url:`http://127.0.0.1:${port}/?game=${id}`});await until("document.querySelector('#dialog')?.dataset.mode==='watching'");await evaluate("document.querySelector('#feed-play').click();true");await until("document.querySelector('#dialog').dataset.mode==='playing'");await evaluate("document.querySelector('#restart').click();document.querySelector('#auto').click();true");await until("document.querySelector('#dialog').dataset.mode==='watching'");await evaluate("document.querySelector('#close').click();true");assert.equal(await evaluate("document.querySelector('#dialog').open"),false)}
 }finally{ws?.close();proc.kill();await server.close();await sleep(200);try{rmSync(profile,{recursive:true,force:true})}catch{}}
});
