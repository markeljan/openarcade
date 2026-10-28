import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'vite';

const browser=(process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome']).find(existsSync);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('representative scored wrappers run on browser canvas',{skip:!browser,timeout:120000},async()=>{
 const server=await createServer({configFile:false,plugins:[{name:'s08-blank',configureServer(server){server.middlewares.use('/__s08',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body></body></html>')})}}],server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'silent'});await server.listen();
 const port=server.httpServer.address().port,profile=mkdtempSync(join(tmpdir(),'s08-browser-'));
 const proc=spawn(browser,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});let ws;
 try{
  let debugPort;for(let i=0;i<100;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}}assert.ok(debugPort);
  const pages=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails.text);if(v.id&&pending.has(v.id)){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(v.error):p.resolve(v.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  async function evaluate(expression,awaitPromise=false){const r=await send('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
  await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:`http://127.0.0.1:${port}/__s08`});
  for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'"))break;await sleep(50)}
  const result=await evaluate(`(async()=>{
   const mods=await Promise.all([11,15,17,20].map(n=>import('/src/feature-games'+n+'.js')));
   const cases=[[11,'tower-panic'],[15,'gravity-claw'],[17,'star-roller'],[20,'railway-rush']];
   const originalRaf=window.requestAnimationFrame,originalCancel=window.cancelAnimationFrame;
   let clock=0,serial=0;const tasks=new Map(),channel=new MessageChannel();
   channel.port1.onmessage=()=>{const batch=[...tasks];tasks.clear();clock+=50;for(const [,fn] of batch)fn(clock)};
   window.requestAnimationFrame=fn=>{const id=++serial;tasks.set(id,fn);channel.port2.postMessage(0);return id};window.cancelAnimationFrame=id=>tasks.delete(id);
   const wait=()=>new Promise(r=>setTimeout(r,0)),until=async(fn,label)=>{for(let i=0;i<15000;i++){if(fn())return;await wait()}throw Error(label)};
   const results=[];
   try{for(let i=0;i<cases.length;i++){
    const [number,id]=cases[i],canvas=document.createElement('canvas');canvas.style.cssText='width:320px;height:720px';document.body.append(canvas);let events=[];
    let player;player=mods[i]['createFeatureGame'+number](canvas,id,{interactive:false,context:'gallery-preview',onResult:r=>{events.push(r);if(id==='tower-panic'&&r.actor==='human')player.pause()}});
    await wait();player.beginRun({interactive:true,context:'manual-player'});canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));player.pause();canvas.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));player.resume();player.restart();
    player.setInteractive(false);player.beginRun({interactive:false,context:'watch-player'});
    if(id==='tower-panic'){
     await until(()=>events.length>0,'tower watch terminal');if(events[0].actor!=='ai'||events[0].context!=='watch-player'||!Number.isFinite(events[0].score))throw Error('bad watch record');
     const first=events[0].runId;player.beginRun({interactive:true,context:'manual-player'});await until(()=>events.some(r=>r.actor==='human'),'tower manual terminal');
     const manual=events.find(r=>r.actor==='human');if(manual.context!=='manual-player'||manual.runId===first)throw Error('bad manual record');
     if(player.getSessionState()!=='result')throw Error('missing tower result');player.resume();canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));if(player.getSessionState()!=='playing')throw Error('Enter did not restart');
    }
    player.destroy();const count=events.length;await wait();if(events.length!==count)throw Error('report after destroy');canvas.remove();results.push({id,records:events.map(r=>({actor:r.actor,context:r.context,score:r.score,runId:r.runId}))});
   }}finally{window.requestAnimationFrame=originalRaf;window.cancelAnimationFrame=originalCancel;channel.port1.close();channel.port2.close()}
   return results;
  })()`,true);
  assert.deepEqual(result.map(r=>r.id),['tower-panic','gravity-claw','star-roller','railway-rush']);assert.ok(result[0].records.some(r=>r.actor==='ai'));assert.ok(result[0].records.some(r=>r.actor==='human'));assert.deepEqual(errors,[]);
 }finally{ws?.close();proc.kill();await server.close();await sleep(200);try{rmSync(profile,{recursive:true,force:true})}catch{}}
});
