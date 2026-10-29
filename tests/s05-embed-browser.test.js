import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createPortServer} from 'node:net';
import {preview} from 'vite';
const browser = (process.platform === 'win32' ? ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'] : ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome']).find(existsSync);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
test('built embed loads a game and provides accessible player controls', {skip: !browser || !existsSync('dist/embed/snake.html'), timeout: 60000}, async () => {
 const probe = createPortServer(); await new Promise(resolve => probe.listen(0,'127.0.0.1',resolve)); const port=probe.address().port; await new Promise(resolve=>probe.close(resolve));
 const server = await preview({preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'silent'}); const profile=mkdtempSync(join(tmpdir(),'embed-browser-')); const proc=spawn(browser,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'}); let ws;
 try {
  let debugPort; for(let i=0;i<100;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break}catch{await sleep(50)}} assert.ok(debugPort);
  const targets=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json(); ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl); await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject}); let seq=0; const pending=new Map(); ws.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))}); const evaluate=async expression=>{const out=await send('Runtime.evaluate',{expression,returnByValue:true});if(out.exceptionDetails)throw Error(out.exceptionDetails.text);return out.result.value};
  await send('Page.enable');await send('Runtime.enable');await send('Page.navigate',{url:`http://127.0.0.1:${port}/embed/snake`});
  for(let i=0;i<400;i++){if(await evaluate("document.querySelector('#start') && !document.querySelector('#start').disabled"))break;await sleep(25)}
  assert.equal(await evaluate("document.querySelector('h1')?.textContent"),'Snake'); assert.equal(await evaluate("document.querySelector('#sound').getAttribute('aria-pressed')"),'false');
  assert.equal(await evaluate("(()=>{let r=document.querySelector('canvas').getBoundingClientRect();return Math.abs(r.width/r.height-320/240)<.01})()"),true);
  for(const saved of ['on','off']){
    await evaluate(`localStorage.setItem('miniarcade-sound',${JSON.stringify(saved)});document.querySelector('#sound').click()`);
    assert.equal(await evaluate("document.querySelector('#sound').getAttribute('aria-pressed')"),'true');
    assert.equal(await evaluate("localStorage.getItem('miniarcade-sound')"),saved);
    await evaluate("document.querySelector('#sound').click()");
    assert.equal(await evaluate("document.querySelector('#sound').getAttribute('aria-pressed')"),'false');
    assert.equal(await evaluate("localStorage.getItem('miniarcade-sound')"),saved);
  }
  await evaluate("document.querySelector('#start').click()"); assert.equal(await evaluate("document.activeElement===document.querySelector('canvas')"),true); await evaluate("document.querySelector('#pause').click()"); assert.equal(await evaluate("document.querySelector('#pause').textContent"),'Resume');
  await evaluate("document.querySelector('#restart').click()"); assert.equal(await evaluate("document.querySelector('#pause').textContent"),'Pause'); assert.equal(await evaluate("document.querySelector('a').rel"),'noopener noreferrer'); assert.equal(await evaluate("document.querySelector('.gallery')===null"),true); assert.equal(await evaluate("performance.getEntriesByType('resource').some(e => e.name.includes('/main-') && e.name.endsWith('.js'))"),false);
  await evaluate("window.dispatchEvent(new Event('blur'));window.pausedImage=document.querySelector('canvas').toDataURL();true");
  await sleep(200);
  assert.equal(await evaluate("document.querySelector('canvas').toDataURL()===window.pausedImage"),true,'blur pauses the runtime and releases held keys');
  await evaluate("window.dispatchEvent(new Event('focus'))");
  const missing=await fetch(`http://127.0.0.1:${port}/embed/no-such-game`); assert.equal(missing.status,404); assert.match(await missing.text(),/Game not found/);
  await send('Emulation.setTouchEmulationEnabled',{enabled:true}); await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await send('Page.navigate',{url:`http://127.0.0.1:${port}/embed/machine-hunt`});
  for(let i=0;i<400;i++){if(await evaluate("document.querySelector('#start') && !document.querySelector('#start').disabled"))break;await sleep(25)}
  assert.equal(await evaluate("document.querySelector('h1')?.textContent"),'Machine Hunt'); assert.equal(await evaluate("getComputedStyle(document.querySelector('.touch')).display !== 'none'"),true);
  await evaluate("document.querySelector('#start').click();window.embedKeys=[];document.querySelector('canvas').addEventListener('keydown',e=>window.embedKeys.push('down:'+e.key));document.querySelector('canvas').addEventListener('keyup',e=>window.embedKeys.push('up:'+e.key));document.querySelector('#pause').click();true");
  assert.equal(await evaluate("window.embedKeys.includes('up:ArrowUp')"),true); assert.equal(await evaluate("performance.getEntriesByType('resource').some(e => e.name.includes('/main-') && e.name.endsWith('.js'))"),false);
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/404.html`}); await sleep(200);
  await evaluate("document.body.innerHTML='<iframe title=Game style=\"width:390px;height:800px;border:0\" src=\"/embed/machine-hunt\"></iframe>';true");
  for(let i=0;i<400;i++){if(await evaluate("document.querySelector('iframe')?.contentDocument?.querySelector('#start') && !document.querySelector('iframe').contentDocument.querySelector('#start').disabled"))break;await sleep(25)}
  assert.equal(await evaluate("document.querySelector('iframe').contentDocument.querySelector('h1').textContent"),'Machine Hunt');
  assert.equal(await evaluate("(()=>{let d=document.querySelector('iframe').contentDocument,r=d.querySelector('canvas').getBoundingClientRect();return Math.abs(r.width/r.height-320/720)<.01})()"),true);
  await evaluate("(()=>{let d=document.querySelector('iframe').contentDocument;d.querySelector('#start').click();window.frameKeys=[];d.querySelector('canvas').addEventListener('keydown',e=>window.frameKeys.push('down:'+e.key));d.querySelector('canvas').addEventListener('keyup',e=>window.frameKeys.push(e.key))})()");
  const frameControls=await evaluate("(()=>{let f=document.querySelector('iframe'),d=f.contentDocument;return [...d.querySelectorAll('button')].map(b=>{let r=b.getBoundingClientRect();return {id:b.id||b.dataset.key,x:r.x,y:r.y,w:r.width,h:r.height,frameHeight:f.clientHeight,frameWidth:f.clientWidth}})})()");
  for(const control of frameControls)assert.ok(control.x>=0&&control.y>=0&&control.x+control.w<=control.frameWidth&&control.y+control.h<=control.frameHeight,JSON.stringify(control));
  const pos=await evaluate("(()=>{let f=document.querySelector('iframe'),r=f.contentDocument.querySelector('[data-key=ArrowUp]').getBoundingClientRect(),a=f.getBoundingClientRect();return {x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2,w:r.width,h:r.height}})()"); assert.ok(pos.w>=44&&pos.h>=44);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pos.x,y:pos.y}]});
  assert.equal(await evaluate("window.frameKeys.includes('down:ArrowUp')"),true,'touch must reach the control before cancellation');
  await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}); assert.equal(await evaluate("window.frameKeys.includes('ArrowUp')"),true);
  await evaluate("document.querySelector('iframe').contentDocument.querySelector('#pause').click()"); assert.equal(await evaluate("document.querySelector('iframe').contentDocument.querySelector('#pause').textContent"),'Resume');
  for(const [width,height] of [[320,568],[512,512],[720,720],[844,390]]){
    await evaluate(`document.querySelector('iframe').style.width='${width}px';document.querySelector('iframe').style.height='${height}px'`);
    await sleep(80);
    const bounds=await evaluate("(()=>{let f=document.querySelector('iframe'),d=f.contentDocument;return [...d.querySelectorAll('button')].map(b=>{let r=b.getBoundingClientRect();return {id:b.id||b.dataset.key,x:r.x,y:r.y,w:r.width,h:r.height,frameHeight:f.clientHeight,frameWidth:f.clientWidth}})})()");
    for(const control of bounds)assert.ok(control.w>=44&&control.h>=44&&control.x>=0&&control.y>=0&&control.x+control.w<=control.frameWidth+.1&&control.y+control.h<=control.frameHeight+.1,JSON.stringify(control));
  }
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});"});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/embed/machine-hunt`});
  for(let i=0;i<400;i++){if(await evaluate("document.querySelector('#start') && !document.querySelector('#start').disabled"))break;await sleep(25)}
  assert.equal(await evaluate("document.querySelector('h1')?.textContent"),'Machine Hunt');
  assert.equal(await evaluate("document.querySelector('#start')?.disabled"),false,'storage denial must not prevent play');
  await evaluate("document.querySelector('#start').click()");
  assert.equal(await evaluate("document.activeElement===document.querySelector('canvas')"),true);
 } finally {ws?.close();proc.kill();await new Promise(resolve=>server.httpServer.close(resolve));await sleep(200);try{rmSync(profile,{recursive:true,force:true})}catch{}}
});
