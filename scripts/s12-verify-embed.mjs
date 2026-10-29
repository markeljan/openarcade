import {readFile, writeFile} from 'node:fs/promises';
import {launchBrowser} from './s12-browser.mjs';

// Built Vite preview only; the driver blocks /api and non-loopback requests.
const base = process.env.S12_EMBED_URL || 'http://127.0.0.1:4313/';
const parsed = new URL(base);
if (parsed.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)) throw Error('Loopback HTTP origin required');
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && !process.argv[outputIndex+1]) throw Error('--output requires a path');
const representative = process.argv.includes('--representative-only');
const ids = Object.keys(JSON.parse(await readFile(new URL('../public/social/manifest.json',import.meta.url),'utf8')).games);
const report = {url:parsed.origin,revision:process.argv.find(x=>x.startsWith('--revision='))?.slice(11)||'unspecified', mode:representative?'representative-only':'full', startedAt:new Date().toISOString(), checks:[], embeds:[], limitations:['Local same-origin iframe only; no evidence of X playback','API and external traffic blocked; no auth, scores or database verification','Canvas pixels and draw calls establish rendering smoke, not playable mechanics or fidelity','Mobile viewport and touch are emulated']};
const browser = await launchBrowser({origin:parsed.origin}); const {call,run}=browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expr,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await run(expr))return;await sleep(50)}throw Error(`Timed out: ${label}`)}
async function check(name,fn){try{report.checks.push({name,status:'pass',details:await fn()})}catch(e){report.checks.push({name,status:'fail',error:String(e.message||e)})}}
const frame="document.querySelector('#s12-frame')?.contentDocument";
async function navigate(path){const href=new URL(path,parsed.origin).href;await call('Page.navigate',{url:href});await until(`location.href===${JSON.stringify(href)} && document.readyState==='complete'`,path)}
async function iframe(id){await run(`document.body.innerHTML='<iframe id="s12-frame" title="Game" style="position:fixed;inset:0;width:100%;height:100%;border:0" src="/embed/${encodeURIComponent(id)}"></iframe>'`);await until(`${frame}?.querySelector('#start') && !${frame}.querySelector('#start').disabled`,`${id} embed readiness`)}
try {
 report.browser=(await call('Browser.getVersion')).product;
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{window.__s12draw=0; for(const n of ['fillRect','strokeRect','fillText','strokeText','drawImage','fill','stroke','putImageData']) {const f=CanvasRenderingContext2D.prototype[n]; CanvasRenderingContext2D.prototype[n]=function(...a){if(this.canvas.closest('#embed'))window.__s12draw++;return f.apply(this,a)} }})()`});
 await check('canonical direct and reload',async()=>{
  await navigate('/games/snake'); await until("document.querySelector('#dialog')?.open && document.querySelector('#dialog').dataset.mode==='watching'",'canonical player');
  const initial=await run("({path:location.pathname,title:document.querySelector('#play-title').textContent})"); if(initial.path!=='/games/snake'||!/^snake$/i.test(initial.title))throw Error(JSON.stringify(initial));
  await call('Page.reload'); await until("document.querySelector('#dialog')?.open && document.querySelector('#dialog').dataset.mode==='watching'",'canonical reload');
  if(!/^snake$/i.test(await run("document.querySelector('#play-title').textContent")))throw Error('Reload selected wrong game'); return initial;
 });
 await check('legacy query link',async()=>{await navigate('/?game=snake');await until("document.querySelector('#dialog')?.open && document.querySelector('#dialog').dataset.mode==='watching'",'old link');const title=await run("document.querySelector('#play-title').textContent");if(!/^snake$/i.test(title))throw Error(`Wrong title ${title}`);return {title,url:await run('location.href')}});
 await navigate('/404.html');
 for(const id of representative?['snake','machine-hunt']:ids){try{
  await iframe(id);const before=await run("document.querySelector('#s12-frame').contentWindow.__s12draw");
  await until(`(()=>{const f=document.querySelector('#s12-frame'),c=f.contentDocument.querySelector('canvas');if(f.contentWindow.__s12draw<=${before}||!c.width||!c.height)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i])return true;return false})()`,`${id} draw`);
  report.embeds.push({id,status:'pass'});
 }catch(e){report.embeds.push({id,status:'fail',error:String(e.message||e)})}}
 await check('desktop iframe lifecycle',async()=>{
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await iframe('snake');
  const state=await run(`(()=>{const d=${frame};return {title:d.querySelector('h1').textContent,sound:d.querySelector('#sound').getAttribute('aria-pressed'),touch:getComputedStyle(d.querySelector('.touch')).display}})()`);
  if(state.title!=='Snake'||state.sound!=='false')throw Error(JSON.stringify(state));
  await run(`${frame}.querySelector('#start').click()`);await until(`${frame}.querySelector('.status').textContent==='Playing'`,'start');
  await run(`${frame}.querySelector('#pause').click()`);await until(`${frame}.querySelector('.status').textContent==='Paused'`,'pause');
  await run(`${frame}.querySelector('#restart').click()`);await until(`${frame}.querySelector('.status').textContent==='Playing'`,'restart');
  const link=await run(`${frame}.querySelector('a').href`);if(!new URL(link).pathname.endsWith('/games/snake'))throw Error('Wrong canonical link');
  return {...state,link};
 });
 for (const [width,height] of [[320,568],[390,844],[512,512],[720,720],[844,390]]) await check(`mobile iframe ${width}x${height}`,async()=>{
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await iframe('machine-hunt');
  await run(`${frame}.querySelector('#start').click()`);
  const metrics=await run(`(()=>{const f=document.querySelector('#s12-frame'),d=f.contentDocument,fr=f.getBoundingClientRect();return [...d.querySelectorAll('.touch button, .actions button')].map(e=>{const r=e.getBoundingClientRect(),x=r.x+fr.x+r.width/2,y=r.y+fr.y+r.height/2;return {label:e.getAttribute('aria-label')||e.textContent,key:e.dataset.key||null,disabled:e.disabled,x:r.x+fr.x,y:r.y+fr.y,w:r.width,h:r.height,hit:x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&d.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}})})()`);
  const bad=metrics.filter(b=>b.x<0||b.y<0||b.x+b.w>width||b.y+b.h>height||b.w<44||b.h<44||!b.hit);if(bad.length)throw Error('Controls outside viewport, too small or not hit-testable: '+JSON.stringify(bad));
  await run(`window.__keys=[];${frame}.querySelector('canvas').addEventListener('keydown',e=>window.__keys.push('down:'+e.key));${frame}.querySelector('canvas').addEventListener('keyup',e=>window.__keys.push('up:'+e.key))`);
  const b=metrics.find(x=>x.key==='ArrowUp');if(!b||b.disabled)throw Error('Up control unavailable');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.w/2,y:b.y+b.h/2}]});
  await until("window.__keys.includes('down:ArrowUp')",'held touch');
  await run("document.querySelector('#s12-frame').contentWindow.dispatchEvent(new Event('blur'))");
  await until("window.__keys.includes('up:ArrowUp')",'blur release');
  await until(`${frame}.querySelector('.status').textContent==='Paused'`,'blur pause');
  await call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});return {metrics};
 });
 report.browserErrors=browser.errors;report.blockedRequests=browser.blocked.length;
}catch(e){report.fatal=String(e.stack||e)}finally{try{await browser.close()}catch(e){report.cleanupError=String(e)}}
report.finishedAt=new Date().toISOString();report.status=report.fatal||report.cleanupError||report.checks.some(x=>x.status==='fail')||report.embeds.some(x=>x.status==='fail')||report.browserErrors?.length?'fail':'pass';
const json=JSON.stringify(report,null,2)+'\n';if(outputIndex>=0)await writeFile(process.argv[outputIndex+1],json);else process.stdout.write(json);if(report.status==='fail')process.exitCode=1;
