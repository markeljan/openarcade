import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync,cpSync,copyFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createPortServer} from 'node:net';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

const browserCandidates=process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
const executable=browserCandidates.find(existsSync),sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('player transitions use atomic run contexts and clean up instances',{skip:!executable,timeout:150000},async()=>{
 const probe=createPortServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const sourceRoot=mkdtempSync(join(tmpdir(),'takeover-source-'));cpSync(join(process.cwd(),'src'),join(sourceRoot,'src'),{recursive:true});copyFileSync(join(process.cwd(),'index.html'),join(sourceRoot,'index.html'));writeFileSync(join(sourceRoot,'index.html'),readFileSync(join(sourceRoot,'index.html'),'utf8').replace('<script type="module" src="/src/analytics.js"></script>',''));mkdirSync(join(sourceRoot,'src/custom/games'),{recursive:true});writeFileSync(join(sourceRoot,'src/custom/games/minimal.js'),"export const metadata={id:'minimal-example',name:'Minimal Example'};export function create(){return {update(){},draw(c){c.fillRect(0,0,320,720)}}}");writeFileSync(join(sourceRoot,'src/game-loader.js'), `export async function loadGameFactory(game) { return (canvas,id,opts) => { const n=window.__instances=(window.__instances||0)+1; const log=(method,data)=>window.__calls.push({n,id,method,data}); log('create',{context:opts.context,interactive:opts.interactive,onResult:typeof opts.onResult}); canvas.tabIndex=0; return {beginRun(data){log('beginRun',data)},setInteractive(value){log('setInteractive',value)},restart(){log('restart')},getSessionState(){return window.__result?'result':'playing'},pause(){log('pause')},resume(){log('resume')},destroy(){log('destroy')}}; }; }`);const server=await createServer({root:sourceRoot,configFile:false,resolve:{alias:{'@clerk/clerk-js':fileURLToPath(import.meta.resolve('@clerk/clerk-js'))}},server:{host:'127.0.0.1',port,strictPort:true,hmr:false},logLevel:'silent'});await server.listen();const profile=mkdtempSync(join(tmpdir(),'jelly-ui-test-'));
 const proc=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});let ws;
 try{
  let browserPort;for(let i=0;i<100;i++){try{browserPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}}assert.ok(browserPort,'browser debugging port');
  let targets=await(await fetch(`http://127.0.0.1:${browserPort}/json`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0;const pending=new Map(),browserErrors=[];ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.method==='Runtime.exceptionThrown')browserErrors.push(v.params.exceptionDetails.exception?.description||v.params.exceptionDetails.text);if(v.method==='Log.entryAdded'&&v.params.entry.level==='error')browserErrors.push(v.params.entry.text);if(v.id&&pending.has(v.id)){let q=pending.get(v.id);pending.delete(v.id);v.error?q.reject(v.error):q.resolve(v.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  async function evalValue(expression){const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(out.exceptionDetails.text);return out.result.value}
  async function until(expression,message){for(let i=0;i<1600;i++){if(await evalValue(expression))return;await sleep(25)}const state=await evalValue("JSON.stringify({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText?.slice(0,1000)})");assert.fail(message+'; page='+state+'; errors='+JSON.stringify(browserErrors))}
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__calls=[];window.__result=false;`});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until("window.__calls.some(x=>x.method==='create'&&x.data.context==='gallery-preview')",'gallery preview missing');
  assert.equal(await evalValue("window.__calls.filter(x=>x.method==='create'&&x.data.context==='gallery-preview').every(x=>x.data.interactive===false&&x.data.onResult==='undefined')"),true);
  await evalValue("document.querySelector('[aria-label=\"Play Snake\"]').click();true");await until("document.querySelector('#dialog').dataset.mode==='watching'",'player missing');
  const initial=await evalValue("window.__calls.filter(x=>x.method==='create'&&x.data.context==='watch-player').at(-1)");assert.equal(initial.id,'snake');assert.equal(initial.data.interactive,false);const n=initial.n;
  await evalValue("document.querySelector('#feed-play').click();true");assert.equal(await evalValue("document.activeElement===document.querySelector('#play-canvas')"),true);
  const calls=()=>evalValue(`window.__calls.filter(x=>x.n===${n}&&['beginRun','restart','setInteractive'].includes(x.method))`);
  assert.deepEqual(await calls(),[{n,id:'snake',method:'beginRun',data:{interactive:true,context:'manual-player'}}]);
  await evalValue("document.querySelector('#restart').click();true");await evalValue("document.querySelector('#auto').click();true");await evalValue("document.querySelector('#restart').click();true");
  assert.deepEqual((await calls()).map(x=>[x.method,x.data]),[['beginRun',{interactive:true,context:'manual-player'}],['beginRun',{interactive:true,context:'manual-player'}],['beginRun',{interactive:false,context:'watch-player'}],['beginRun',{interactive:false,context:'watch-player'}]]);
  await evalValue("document.querySelector('#feed-play').click();window.__result=true;true");const count=(await calls()).length;
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evalValue("document.querySelector('#dialog').open&&document.querySelector('#dialog').dataset.mode==='playing'"),true);assert.equal((await calls()).length,count);
  await evalValue("window.__result=false;document.querySelector('#feed-next').click();true");await until(`document.querySelector('#dialog').dataset.mode==='watching'&&window.__calls.some(x=>x.n===${n}&&x.method==='destroy')`,'navigation did not destroy old player');
  const next=await evalValue("window.__calls.filter(x=>x.method==='create'&&x.data.context==='watch-player').at(-1)");assert.notEqual(next.n,n);assert.equal(next.data.interactive,false);
  await evalValue("document.querySelector('#close').click();true");await until(`!document.querySelector('#dialog').open&&window.__calls.some(x=>x.n===${next.n}&&x.method==='destroy')`,'close did not destroy');
  await evalValue("document.querySelector('[aria-label=\"Play Snake\"]').click();true");await until("document.querySelector('#dialog').dataset.mode==='watching'",'reopen');const reopened=await evalValue("window.__calls.filter(x=>x.method==='create'&&x.data.context==='watch-player').at(-1)");assert.notEqual(reopened.n,n);assert.notEqual(reopened.n,next.n);assert.equal(reopened.data.interactive,false);assert.equal((await calls()).length,count);

 }finally{ws?.close();proc.kill();await server.close();await sleep(200);try{rmSync(profile,{recursive:true,force:true});rmSync(sourceRoot,{recursive:true,force:true})}catch{}}
});

