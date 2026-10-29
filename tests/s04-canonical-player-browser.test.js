import {testBrowser} from '../scripts/browser-executable.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync,cpSync,copyFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createPortServer} from 'node:net';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

const executable=testBrowser,sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('canonical and legacy routes preserve player, sharing and custom catalog',{skip:!executable,timeout:150000},async()=>{
 const probe=createPortServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const sourceRoot=mkdtempSync(join(tmpdir(),'takeover-source-'));cpSync(join(process.cwd(),'src'),join(sourceRoot,'src'),{recursive:true});copyFileSync(join(process.cwd(),'index.html'),join(sourceRoot,'index.html'));writeFileSync(join(sourceRoot,'index.html'),readFileSync(join(sourceRoot,'index.html'),'utf8').replace('<script type="module" src="/src/analytics.js"></script>',''));mkdirSync(join(sourceRoot,'src/custom/games'),{recursive:true});writeFileSync(join(sourceRoot,'src/custom/games/minimal.js'),"export const metadata={id:'minimal-example',name:'Minimal Example'};export function create(){return {update(){},draw(c){c.fillRect(0,0,320,720)}}}");const server=await createServer({root:sourceRoot,configFile:false,resolve:{alias:{'@clerk/clerk-js':fileURLToPath(import.meta.resolve('@clerk/clerk-js'))}},server:{host:'127.0.0.1',port,strictPort:true,hmr:false},logLevel:'silent'});await server.listen();const profile=mkdtempSync(join(tmpdir(),'jelly-ui-test-'));
 const proc=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});let ws;
 try{
  let browserPort;for(let i=0;i<100;i++){try{browserPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}}assert.ok(browserPort,'browser debugging port');
  let targets=await(await fetch(`http://127.0.0.1:${browserPort}/json`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0,currentLoader=null;const pending=new Map(),browserErrors=[],loaded=new Set();ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.method==='Page.frameNavigated'&&!v.params.frame.parentId)currentLoader=v.params.frame.loaderId;if(v.method==='Page.lifecycleEvent'&&v.params.name==='DOMContentLoaded')loaded.add(v.params.loaderId);if(v.method==='Runtime.exceptionThrown')browserErrors.push(v.params.exceptionDetails.exception?.description||v.params.exceptionDetails.text);if(v.method==='Log.entryAdded'&&v.params.entry.level==='error')browserErrors.push(v.params.entry.text);if(v.id&&pending.has(v.id)){let q=pending.get(v.id);pending.delete(v.id);v.error?q.reject(v.error):q.resolve(v.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  async function evalValue(expression){const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(out.exceptionDetails.exception?.description||out.exceptionDetails.text);return out.result.value}
  async function until(expression,message){for(let i=0;i<1600;i++){if(await evalValue(expression))return;await sleep(25)}const state=await evalValue("JSON.stringify({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText?.slice(0,1000)})");assert.fail(message+'; page='+state+'; errors='+JSON.stringify(browserErrors))}
  await send('Page.enable');await send('Page.setLifecycleEventsEnabled',{enabled:true});await send('Runtime.enable');await send('Log.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async url=>{window.copied=url}},configurable:true});`});
  const newDocument=async previous=>{for(let i=0;i<1600;i++){if(currentLoader&&currentLoader!==previous&&loaded.has(currentLoader))return;await sleep(25)}assert.fail('navigation did not commit a new document')};
   const go=async path=>{const previous=currentLoader;await send('Page.navigate',{url:`http://127.0.0.1:${port}${path}`});await newDocument(previous);await until("document.querySelector('#dialog')?.dataset.mode==='watching'",'player did not load')};
  await go('/games/snake?stale=1#old');
  assert.equal(await evalValue("document.querySelector('#play-title').textContent"),'SNAKE');
  await until("(()=>{const c=document.querySelector('#play-canvas');return c.width>1&&c.height>1&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v!==0)})()",'Snake canvas did not paint');
  assert.equal(await evalValue("(async()=> (await import('/src/catalog.js')).gameCatalog.length)()"),112);
  assert.equal(await evalValue("document.querySelectorAll('.card-button').length"),await evalValue("(async()=> (await import('/src/catalog.js')).gameCatalog.length+1)()"));
  await evalValue("document.querySelector('#share').click();true");await until("window.copied",'share did not copy');assert.equal(await evalValue('window.copied'),`http://127.0.0.1:${port}/games/snake`);
  await evalValue("document.querySelector('#feed-next').click();true");await until("location.pathname!=='/games/snake'&&document.querySelector('#dialog').dataset.mode==='watching'",'next did not load');const next=await evalValue('location.pathname');assert.match(next,/^\/games\//);
  await evalValue('history.back();true');await until("location.pathname==='/games/snake'&&document.querySelector('#dialog').dataset.mode==='watching'&&document.querySelector('#play-title').textContent==='SNAKE'",'back did not restore Snake');
  const beforeReload=currentLoader;await send('Page.reload');await newDocument(beforeReload);await until("document.querySelector('#dialog')?.dataset.mode==='watching'",'reload did not load');assert.equal(await evalValue("document.querySelector('#play-title').textContent"),'SNAKE');
  await evalValue("document.querySelector('#close').click();true");await until("!document.querySelector('#dialog').open&&location.pathname==='/'",'close');assert.equal(await evalValue('location.pathname+location.search+location.hash'),'/');
  await go('/?game=snake');assert.equal(await evalValue("document.querySelector('#play-title').textContent"),'SNAKE');
  await go('/games/minimal-example');assert.equal(await evalValue("document.querySelector('#play-title').textContent"),'MINIMAL EXAMPLE');assert.equal(await evalValue("document.querySelector('[aria-label=\"Play Minimal Example\"]')!==null"),true);

 }finally{ws?.close();proc.kill();await server.close();await sleep(200);try{rmSync(profile,{recursive:true,force:true});rmSync(sourceRoot,{recursive:true,force:true})}catch{}}
});

