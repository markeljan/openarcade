import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync,cpSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createPortServer} from 'node:net';
import {createServer} from 'vite';

const browserCandidates=process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
const executable=browserCandidates.find(existsSync),sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('taking over Snake starts a fresh scored run',{skip:!executable,timeout:150000},async()=>{
 const probe=createPortServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const sourceRoot=mkdtempSync(join(tmpdir(),'takeover-source-'));cpSync(join(process.cwd(),'src'),join(sourceRoot,'src'),{recursive:true});copyFileSync(join(process.cwd(),'index.html'),join(sourceRoot,'index.html'));const server=await createServer({root:sourceRoot,configFile:false,server:{host:'127.0.0.1',port,strictPort:true,hmr:false},logLevel:'silent'});await server.listen();const profile=mkdtempSync(join(tmpdir(),'jelly-ui-test-'));
 const proc=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});let ws;
 try{
  let browserPort;for(let i=0;i<100;i++){try{browserPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}}assert.ok(browserPort,'browser debugging port');
  let targets=await(await fetch(`http://127.0.0.1:${browserPort}/json`)).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0;const pending=new Map(),browserErrors=[];ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.method==='Runtime.exceptionThrown')browserErrors.push(v.params.exceptionDetails.exception?.description||v.params.exceptionDetails.text);if(v.method==='Log.entryAdded'&&v.params.entry.level==='error')browserErrors.push(v.params.entry.text);if(v.id&&pending.has(v.id)){let q=pending.get(v.id);pending.delete(v.id);v.error?q.reject(v.error):q.resolve(v.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  async function evalValue(expression){const out=await send('Runtime.evaluate',{expression,returnByValue:true});if(out.exceptionDetails)throw Error(out.exceptionDetails.text);return out.result.value}
  async function until(expression,message){for(let i=0;i<1600;i++){if(await evalValue(expression))return;await sleep(25)}const state=await evalValue("JSON.stringify({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText?.slice(0,1000)})");assert.fail(message+'; page='+state+'; errors='+JSON.stringify(browserErrors))}
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`{let t=0;Math.random=()=>.4;window.requestAnimationFrame=fn=>setTimeout(()=>fn(t+=50),0);window.cancelAnimationFrame=id=>clearTimeout(id);const original=CanvasRenderingContext2D.prototype.fillText;window.__snakeScore=null;window.__over=false;CanvasRenderingContext2D.prototype.fillText=function(s,...args){if(this.canvas.id==='play-canvas'){const m=/^SCORE  (\\d+)$/.exec(s);if(m)window.__snakeScore=Number(m[1]);if(s==='GAME OVER')window.__over=true;}return original.call(this,s,...args)}}`});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/?game=snake`});await until("document.querySelector('#dialog')?.open",'game dialog did not open');
  await evalValue("localStorage.removeItem('tiny-arcade.best.snake');document.querySelector('#auto').click();true");await until('window.__snakeScore>=3','preview did not score');const preview=await evalValue('window.__snakeScore');assert.ok(preview>=3);
  await evalValue("window.__snakeScore=null;document.querySelector('#auto').click();true");await until('window.__snakeScore!==null','fresh game did not render');assert.equal(await evalValue('window.__snakeScore'),0,'AI score carried into manual run');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp'});await until('window.__over','manual run did not end');const manual=await evalValue('window.__snakeScore');const best=await evalValue("Number(localStorage.getItem('tiny-arcade.best.snake')||0)");assert.equal(best,manual);assert.ok(best<preview,'preview score was saved as the manual best');
 }finally{ws?.close();proc.kill();await server.close();await sleep(200);try{rmSync(profile,{recursive:true,force:true});rmSync(sourceRoot,{recursive:true,force:true})}catch{}}
});
