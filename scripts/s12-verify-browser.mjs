import {writeFile} from 'node:fs/promises';
import {launchBrowser} from './s12-browser.mjs';

// The helper blocks all /api and non-loopback traffic. This is a smoke check,
// not a score, identity, persistence, gameplay-completion or fidelity test.
const url = process.env.S12_URL || 'http://127.0.0.1:4312/';
const target = new URL(url);
if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw Error('S12_URL must be loopback');
const arg = process.argv.indexOf('--output');
if (arg >= 0 && !process.argv[arg + 1]) throw Error('--output requires a path');
const output = arg >= 0 ? process.argv[arg + 1] : null;
const representativeOnly = process.argv.includes('--representative-only');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = {url, revision: process.argv.find(value=>value.startsWith('--revision='))?.slice(11)||'unspecified', startedAt: new Date().toISOString(), catalog: [], checks: [], limitations: ['API and external traffic blocked', 'Canvas smoke does not establish gameplay, scoring, fidelity, or social metadata', 'Mobile checks use emulation', 'AudioContext instrumentation does not cover HTML media or offline audio', 'Player draw counter covers common 2D methods, not WebGL or all canvas APIs']};
const browser = await launchBrowser({origin: target.origin});
const {call, run} = browser;
async function until(expression, label, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await run(expression)) return; await sleep(50); }
  throw Error(`Timed out: ${label}`);
}
async function check(name, fn) {
  try { const details = await fn(); result.checks.push({name, status: 'pass', ...(details === undefined ? {} : {details})}); }
  catch (e) { result.checks.push({name, status: 'fail', error: String(e.message || e)}); }
}
const mode = value => until(`document.querySelector('#dialog')?.dataset.mode === ${JSON.stringify(value)}`, `mode ${value}`);
const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
try {
  result.browser = (await call('Browser.getVersion')).product;
  await call('Page.enable'); await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', {source: `(() => {
    window.__s12draws=0; window.__s12errors=[]; window.__s12keys=[]; window.__s12audio=0;
    const NativeAudio=window.AudioContext || window.webkitAudioContext;
    if (NativeAudio) { class MonitoredAudio extends NativeAudio { constructor(...args) { super(...args); window.__s12audio++; } } window.AudioContext=MonitoredAudio; window.webkitAudioContext=MonitoredAudio; }
    addEventListener('error', e => __s12errors.push(String(e.message)));
    addEventListener('unhandledrejection', e => __s12errors.push(String(e.reason)));
    for (const name of ['fillRect','strokeRect','fillText','strokeText','drawImage','fill','stroke','putImageData']) {
      const original=CanvasRenderingContext2D.prototype[name];
      CanvasRenderingContext2D.prototype[name]=function(...args) { if(this.canvas.id==='play-canvas') __s12draws++; return original.apply(this,args) };
    }
  })()`});
  await call('Page.navigate', {url});
  await until("document.querySelectorAll('#gallery .card-button').length > 0", 'gallery');
  const names = await run("[...document.querySelectorAll('#gallery .card-button')].map(e=>e.getAttribute('aria-label'))");
  await check('catalog count and unique names', async () => {
    if (names.length !== 112 || new Set(names).size !== 112 || names.some(n => !n?.startsWith('Play '))) throw Error(`Expected 112 unique labeled games, found ${names.length}/${new Set(names).size}`);
    return {count:names.length};
  });
  for (let i=0; !representativeOnly && i<names.length; i++) {
    let id = null;
    try {
      await run(`{ const c=document.querySelector('#play-canvas'); c.width=c.width; document.querySelectorAll('#gallery .card-button')[${i}].click(); }`);
      await mode('watching');
      id = await run("new URL(location.href).searchParams.get('game') || location.pathname.match(/^\\/games\\/([^/]+)\\/?$/)?.[1]");
      const before = await run('window.__s12draws');
      // ResizeObserver can clear the backing store between a draw and a later
      // read. Poll drawing and pixel readiness together through that transition.
      await until(`(() => { if(window.__s12draws <= ${before})return false; const c=document.querySelector('#play-canvas'); if(!c.width||!c.height)return false; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=4)if(d[i])return true; return false })()`, `${names[i]} rendered pixels`, 10000);
      if (!id) throw Error('Missing game ID');
      result.catalog.push({name:names[i].slice(5), id, status:'pass'});
    } catch(e) { result.catalog.push({name:names[i].slice(5), id, status:'fail', error:String(e.message||e)}); }
    try { if (await run("document.querySelector('#dialog')?.open")) { await click('#close'); await until("!document.querySelector('#dialog').open", 'close'); } } catch(e) { result.catalog.at(-1).closeError=String(e.message||e); }
  }
  if (!representativeOnly) await check('unique catalog IDs', async () => {const ids=result.catalog.map(x=>x.id);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('Missing or duplicate IDs');return {count:ids.length}});
  await check('silent gallery previews', async () => {
    await until("document.querySelectorAll('[data-preview=playing]').length>0",'active gallery preview');
    await sleep(1200); const count=await run('window.__s12audio');
    if(count!==0)throw Error(`Preview created ${count} AudioContext(s)`); return {audioContexts:count};
  });
  await check('reduced motion stops previews', async () => {
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await until("document.querySelectorAll('[data-preview=playing]').length===0",'reduced motion previews');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  });
  async function openIndex(index) { await run(`document.querySelectorAll('#gallery .card-button')[${index}].click()`); await mode('watching'); }
  await check('desktop lifecycle and keyboard release', async () => {
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await openIndex(0);
    await until("document.querySelectorAll('[data-preview=playing]').length===0",'modal pauses previews');
    if(await run('window.__s12audio')!==0)throw Error('Muted watch created audio');
    await click('#feed-play'); await mode('playing');
    await run(`document.querySelector('#play-canvas').addEventListener('keydown',e=>__s12keys.push('down:'+e.key));document.querySelector('#play-canvas').addEventListener('keyup',e=>__s12keys.push('up:'+e.key))`);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
    const keys=await run('window.__s12keys'); if(!keys.includes('down:ArrowRight')||!keys.includes('up:ArrowRight'))throw Error('Key events did not reach canvas');
    await click('#restart'); await mode('playing'); await click('#auto'); await mode('watching');
    await click('#feed-next'); await click('#feed-next'); await mode('watching'); await click('#close'); await until("!document.querySelector('#dialog').open",'desktop close');
    await sleep(300); const closedDraws=await run('window.__s12draws'); await sleep(350);
    if(await run('window.__s12draws')!==closedDraws)throw Error('Player drew after close');
    return {keys,closedDraws};
  });
  await check('visibility pause and resume', async () => {
    await openIndex(0);
    await run("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");
    await sleep(300); const paused=await run('window.__s12draws'); await sleep(350);
    const still=await run('window.__s12draws');
    await run("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");
    if(still!==paused) throw Error(`Player drew while hidden: ${paused} -> ${still}`);
    await until(`window.__s12draws > ${still}`,'visibility resume draw');
    await click('#close'); await until("!document.querySelector('#dialog').open",'visibility close');
    return {pausedDraws:paused};
  });
  await check('mobile touch and pointer cancellation', async () => {
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2}); await openIndex(0); await click('#feed-play'); await mode('playing');
    const metrics=await run(`(() => {const c=document.querySelector('#play-canvas').getBoundingClientRect();const b=[...document.querySelectorAll('.touch-controls [data-key]:not([hidden])')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {key:e.dataset.key,disabled:e.disabled,x:r.x,y:r.y,w:r.width,h:r.height}});return {canvas:{w:c.width,h:c.height},buttons:b}})()`);
    if(!metrics.buttons.length || metrics.buttons.some(b=>b.disabled||b.x<0||b.y<0||b.x+b.w>390||b.y+b.h>844))throw Error('Touch controls missing, disabled, or outside viewport');
    await run(`window.__s12keys=[];document.querySelector('#play-canvas').addEventListener('keydown',e=>__s12keys.push('down:'+e.key));document.querySelector('#play-canvas').addEventListener('keyup',e=>__s12keys.push('up:'+e.key))`);
    const b=metrics.buttons.find(x=>x.key==='ArrowRight'), up=metrics.buttons.find(x=>x.key==='ArrowUp');
    if(!b||!up)throw Error('Directional controls missing');
    const point=(x,id)=>({x:x.x+x.w/2,y:x.y+x.h/2,id});
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(b,1)]});
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(b,1),point(up,2)]});
    await until("__s12keys.includes('down:ArrowRight') && __s12keys.includes('down:ArrowUp')",'two held touch inputs');
    await call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await until("__s12keys.includes('up:ArrowRight') && __s12keys.includes('up:ArrowUp')",'both touch cancellation releases');
    await click('#close'); await until("!document.querySelector('#dialog').open",'mobile close');
    return metrics;
  });
  result.browserErrors = [...new Set([...(await run('window.__s12errors')), ...browser.errors])];
  result.blockedRequests = browser.blocked.length;
} catch(e) { result.fatal=String(e.stack||e); }
finally { try { await browser.close(); } catch(error) { result.cleanupError=String(error.message||error); } }
result.finishedAt=new Date().toISOString();
result.mode=representativeOnly?'representative-only':'full';
result.status = result.fatal || result.cleanupError || result.catalog.some(x=>x.status==='fail'||x.closeError) || result.checks.some(x=>x.status==='fail') || result.browserErrors?.length ? 'fail' : 'pass';
const json=JSON.stringify(result,null,2)+'\n'; if(output) await writeFile(output,json); else process.stdout.write(json); if(result.status==='fail') process.exitCode=1;



