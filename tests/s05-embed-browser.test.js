import {testBrowser} from '../scripts/browser-executable.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createPortServer} from 'node:net';
import {preview} from 'vite';
const browser = testBrowser;
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
  const frameControls=await evaluate("(()=>{let f=document.querySelector('iframe'),d=f.contentDocument;return [...d.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{let r=b.getBoundingClientRect();return {id:b.id||b.dataset.key,x:r.x,y:r.y,w:r.width,h:r.height,frameHeight:f.clientHeight,frameWidth:f.clientWidth}})})()");
  for(const control of frameControls)assert.ok(control.x>=0&&control.y>=0&&control.x+control.w<=control.frameWidth&&control.y+control.h<=control.frameHeight,JSON.stringify(control));
  const pos=await evaluate("(()=>{let f=document.querySelector('iframe'),r=f.contentDocument.querySelector('[data-key=ArrowUp]').getBoundingClientRect(),a=f.getBoundingClientRect();return {x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2,w:r.width,h:r.height}})()"); assert.ok(pos.w>=44&&pos.h>=44);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pos.x,y:pos.y}]});
  assert.equal(await evaluate("window.frameKeys.includes('down:ArrowUp')"),true,'touch must reach the control before cancellation');
  await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}); assert.equal(await evaluate("window.frameKeys.includes('ArrowUp')"),true);
  await evaluate("document.querySelector('iframe').contentDocument.querySelector('#pause').click()"); assert.equal(await evaluate("document.querySelector('iframe').contentDocument.querySelector('#pause').textContent"),'Resume');
  for(const [width,height] of [[320,568],[512,512],[720,720],[844,390]]){
    await evaluate(`document.querySelector('iframe').style.width='${width}px';document.querySelector('iframe').style.height='${height}px'`);
    await sleep(80);
    const bounds=await evaluate("(()=>{let f=document.querySelector('iframe'),d=f.contentDocument;return [...d.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{let r=b.getBoundingClientRect();return {id:b.id||b.dataset.key,x:r.x,y:r.y,w:r.width,h:r.height,frameHeight:f.clientHeight,frameWidth:f.clientWidth}})})()");
    for(const control of bounds)assert.ok(control.w>=44&&control.h>=44&&control.x>=0&&control.y>=0&&control.x+control.w<=control.frameWidth+.1&&control.y+control.h<=control.frameHeight+.1,JSON.stringify(control));
  }
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});"});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/embed/machine-hunt`});
  for(let i=0;i<400;i++){if(await evaluate("document.querySelector('#start') && !document.querySelector('#start').disabled"))break;await sleep(25)}
  assert.equal(await evaluate("document.querySelector('h1')?.textContent"),'Machine Hunt');
  assert.equal(await evaluate("document.querySelector('#start')?.disabled"),false,'storage denial must not prevent play');
  await evaluate("document.querySelector('#start').click()");
  assert.equal(await evaluate("document.activeElement===document.querySelector('canvas')"),true);
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError')}}});
    window.__scoreRequests=[];window.__guestAttempts=0;const realFetch=window.fetch.bind(window);
    window.fetch=async(url,options={})=>{if(!String(url).startsWith('/api/scores'))return realFetch(url,options);
      const body=JSON.parse(options.body),runId=body.run?.runId||body.runId;
      window.__scoreRequests.push({action:body.action,runId,guestName:body.guestName,attribution:body.attribution,actor:body.run?.actor,context:body.run?.context,credentials:options.credentials,hasAuthorization:!!options.headers?.Authorization});
      if(body.action==='guest'&&++window.__guestAttempts===1)return new Response(JSON.stringify({error:'scores-unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
      return new Response(JSON.stringify({runId,status:'accepted',...(body.action==='pending'?{claimToken:'private-browser-fixture',expiresAt:new Date(Date.now()+86400000).toISOString()}:{})}),{status:200,headers:{'Content-Type':'application/json'}});
    };`});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/embed/snake?source=x`});
  async function waitFor(expression,message){for(let i=0;i<400;i++){if(await evaluate(expression))return;await sleep(25)}assert.fail(message)}
  await waitFor("document.querySelector('#start') && !document.querySelector('#start').disabled",'storage-denied score embed must load');
  await evaluate("document.querySelector('#start').click()");
  await waitFor("document.querySelector('.embed-scores') && !document.querySelector('.embed-scores').hidden",'actual human Snake terminal must expose score choices');
  assert.equal(await evaluate("window.__scoreRequests.length"),0,'a preview/result must not automatically publish a guest score');
  assert.equal(await evaluate("document.querySelector('.embed-guest-form').textContent.includes('From X (unverified)')"),true);
  await evaluate("document.querySelector('.embed-guest-form').requestSubmit()");
  assert.equal(await evaluate("window.__scoreRequests.length===0 && document.querySelector('.embed-guest-form').textContent.includes('Enter four letters')"),true,'incomplete names cannot submit');
  await evaluate("document.querySelector('.embed-guest-form input').focus()");
  for(const letter of 'abcd')await send('Input.insertText',{text:letter});
  assert.equal(await evaluate("[...document.querySelectorAll('.embed-guest-form input')].map(i=>i.value).join('')"),'ABCD');
  await evaluate("document.querySelector('.embed-guest-form').requestSubmit();document.querySelector('.embed-guest-form').requestSubmit()");
  await waitFor("window.__scoreRequests.length===1 && document.querySelector('.embed-scores').textContent.includes('unavailable')",'failed guest save must offer retry');
  assert.equal(await evaluate("document.querySelector('.embed-scores').textContent.includes('reload')"),true,'memory fallback must disclose reload risk');
  assert.equal(await evaluate("document.querySelector('.embed-guest-form button').disabled"),false);
  await evaluate("document.querySelector('.embed-guest-form').requestSubmit()");
  await waitFor("document.querySelector('.embed-guest-form button').textContent==='Score saved'",'guest retry must acknowledge the exact run');
  assert.equal(await evaluate("window.__scoreRequests.length===2 && window.__scoreRequests[0].runId===window.__scoreRequests[1].runId && window.__scoreRequests.every(r=>r.action==='guest'&&r.guestName==='ABCD'&&r.attribution==='x'&&r.actor==='human'&&r.context==='embed'&&r.credentials==='omit'&&!r.hasAuthorization)"),true);
  await evaluate("document.querySelector('#restart').click()");
  await waitFor("!document.querySelector('.embed-scores').hidden",'fresh human result must expose new score choices');
  await evaluate("[...document.querySelectorAll('.embed-scores button')].find(b=>b.textContent==='Copy recovery code').click()");
  await waitFor("document.querySelector('.embed-scores textarea') && !document.querySelector('.embed-scores textarea').hidden",'denied clipboard must reveal a private selectable code');
  assert.equal(await evaluate("window.__scoreRequests.filter(r=>r.action==='pending').length"),1,'private result remains a pending receipt');
  assert.equal(await evaluate("document.querySelector('.embed-scores [role=status]').textContent.includes('private-browser-fixture')"),false,'capability must never appear in status text');
  assert.equal(await evaluate("(()=>{const r=JSON.parse(document.querySelector('.embed-scores textarea').value);return r.schemaVersion===1&&r.runId===window.__scoreRequests.at(-1).runId&&r.claimToken==='private-browser-fixture'})()"),true);
 } finally {ws?.close();proc.kill();await new Promise(resolve=>server.httpServer.close(resolve));await sleep(200);try{rmSync(profile,{recursive:true,force:true})}catch{}}
});
