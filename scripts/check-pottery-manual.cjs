// Requires Node with WebSocket support, Microsoft Edge, and a local server.
// Run: node scripts/check-pottery-manual.cjs (set POTTERY_PORT to override 5173).
const net=require('node:net'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const portToTest=Number(process.env.POTTERY_PORT||5173);
(async()=>{
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
 const root=fs.realpathSync(os.tmpdir()),prefix='miniarcade-player-check-',profile=fs.mkdtempSync(path.join(root,prefix));let proc,ws,call;
 try{
  proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-port='+port,`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let info,error;proc.on('error',e=>error=e);for(let i=0;i<100;i++){if(error)throw error;try{const res=await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:${portToTest}/`,{method:'PUT'});if(res.ok){info=await res.json();break}}catch{}await sleep(100)}if(!info?.webSocketDebuggerUrl)throw Error('Edge debugging endpoint did not become ready');
  ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Edge connection timed out')),5000);ws.onopen=()=>{clearTimeout(timeout);resolve()};ws.onerror=()=>reject(Error('Edge connection failed'))});
  let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timeout);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};ws.onclose=()=>{for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Edge connection closed'))}pending.clear()};
  call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timeout=setTimeout(()=>{pending.delete(n);reject(Error(`Timed out: ${method}`))},15000);pending.set(n,{resolve,reject,timeout});ws.send(JSON.stringify({id:n,method,params}))});
  const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  await call('Page.enable');await call('Page.bringToFront');await call('Emulation.setFocusEmulationEnabled',{enabled:true});await sleep(2500);await run(`document.querySelector('[aria-label="Play Pottery House"]').click()`);for(let i=0;i<100&&!await run("document.querySelector('#dialog').dataset.mode==='instructions'&&!document.querySelector('#start').disabled");i++)await sleep(100);if(!await run("document.querySelector('#dialog').dataset.mode==='instructions'&&!document.querySelector('#start').disabled"))throw Error('Pottery player did not load');await run(`document.querySelector('#start').click();window.potteryText=[];window.potteryHistory=[];const old=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...args){if(this.canvas.id==='play-canvas'){window.potteryText.push(String(t));if(!window.potteryHistory.includes(String(t)))window.potteryHistory.push(String(t));if(window.potteryText.length>500)window.potteryText.splice(0,200)}return old.call(this,t,...args)};const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){if(this.canvas.id==='play-canvas'&&this.fillStyle==='#f5e0bd'&&r===7)window.heroPos={x,y:y+13,frame:(window.heroPos?.frame||0)+1};return arc.call(this,x,y,r,...args)};`);
  const dispatch=async(type,k)=>call('Input.dispatchKeyEvent',{type,key:k,code:k===' '?'Space':k,windowsVirtualKeyCode:k===' '?32:0});
  const key=async(k,ms)=>{await dispatch('keyDown',k);try{await sleep(ms)}finally{await dispatch('keyUp',k)}await sleep(100)};
  const sample=async()=>run('({pos:window.heroPos,text:window.potteryText.slice(-30),history:window.potteryHistory,focused:document.activeElement?.id,mode:document.querySelector("#dialog").dataset.mode})');
  // Wait for a new painted frame so steering never acts on stale coordinates.
  const fresh=async(after=0)=>{const deadline=Date.now()+4000;while(Date.now()<deadline){const s=await sample();if(s.pos?.frame>after)return s;await sleep(50)}throw Error('Canvas stopped painting: '+JSON.stringify(await sample()))};
  const go=async(x,y)=>{const deadline=Date.now()+90000;while(Date.now()<deadline){let s=await fresh(),p=s.pos,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)+Math.abs(dy)<29)return;if(s.focused!=='play-canvas'){await run("document.querySelector('#play-canvas').focus()");s=await fresh(p.frame);p=s.pos;dx=x-p.x;dy=y-p.y}const horizontal=Math.abs(dx)>=Math.abs(dy),k=horizontal?(dx<0?'ArrowLeft':'ArrowRight'):(dy<0?'ArrowUp':'ArrowDown'),axis=horizontal?'x':'y',goal=horizontal?x:y,other=horizontal?Math.abs(dy):Math.abs(dx),tolerance=Math.max(2,28-other),sign=(goal-p[axis])<0?-1:1;let arrived=false;await dispatch('keyDown',k);try{const until=Date.now()+600;while(Date.now()<until){s=await fresh(p.frame);p=s.pos;if(Math.abs(x-p.x)+Math.abs(y-p.y)<29){arrived=true;break}if((goal-p[axis])*sign<=tolerance)break}}finally{await dispatch('keyUp',k)}if(arrived)return;await fresh(p.frame)}throw Error('Unable to reach '+x+','+y+': '+JSON.stringify(await sample()))};
  const holdUntil=async(predicate,timeout=15000)=>{await dispatch('keyDown',' ');try{const deadline=Date.now()+timeout;while(Date.now()<deadline){const s=await sample();if(predicate(s))return s;await sleep(60)}return await sample()}finally{await dispatch('keyUp',' ');await sleep(100)}};
  const station=async(x,y,expected)=>{for(let attempt=0;attempt<3;attempt++){await go(x,y);const result=await holdUntil(s=>s.text.includes(expected)||s.text.includes('CRACKED · WATER'));if(result.text.includes(expected))return;if(result.text.includes('CRACKED · WATER')){await go(30,296);await holdUntil(s=>s.text.includes('CRACK SMOOTHED'))}}throw Error('Station did not yield '+expected+': '+JSON.stringify(await sample()))};
  await station(42,402,'CLAY VESSEL');await station(114,393,'SHAPED VESSEL');await station(189,357,'GLAZED VESSEL');await station(189,409,'WOOD ASH GLAZE LOADED');
  await go(208.5,280.5);const stoked=await holdUntil(s=>{const label=[...s.text].reverse().find(t=>/^GALLERY 0    WOOD \d+$/.test(t));return label&&Number(label.match(/WOOD (\d+)/)[1])>=6});if(!stoked.text.some(t=>/^GALLERY 0    WOOD [6-7]$/.test(t)))throw Error('Could not stoke kiln: '+JSON.stringify(stoked));
  await go(166.5,243);const loaded=await holdUntil(s=>s.text.some(t=>/^ASH FIRING \d+%$/.test(t)));if(!loaded.text.some(t=>/^ASH FIRING \d+%$/.test(t)))throw Error('Could not load kiln: '+JSON.stringify(loaded));
  let ready=false;for(let i=0;i<120;i++){const s=await sample(),status=[...s.text].reverse().find(t=>/^ASH FIRING \d+%$/.test(t));if(status&&Number(status.match(/\d+/)[0])>=100){ready=true;break}await sleep(100)}if(!ready)throw Error('Kiln did not finish: '+JSON.stringify(await sample()));
  const unloaded=await holdUntil(s=>s.text.includes('ASH GLAZE: COOL IN WATER'));if(!unloaded.text.includes('ASH GLAZE: COOL IN WATER'))throw Error('Unload failed: '+JSON.stringify(unloaded));await station(30,296,'ASH CRYSTALS REVEALED');await station(61.5,186,'IRIDESCENT ASH REVEAL');
  const result=await sample();if(!result.history.some(t=>t.startsWith('GALLERY 1    ')))throw Error('Gallery did not update: '+JSON.stringify(result));console.log('Manual keyboard flow: fired ash, cooled in water, displayed iridescent piece (GALLERY 1).');


 }finally{
  if(ws?.readyState===WebSocket.OPEN&&call)await Promise.race([call('Browser.close').catch(()=>{}),sleep(1000)]);if(ws)try{ws.close()}catch{}
  if(proc?.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else proc.kill();for(let i=0;i<40&&proc.exitCode===null&&proc.signalCode===null;i++)await sleep(100)}
  const target=fs.realpathSync(profile);if(path.dirname(target)!==root||!path.basename(target).startsWith(prefix))throw Error('Unexpected temporary profile path');fs.rmSync(target,{recursive:true,force:true,maxRetries:8,retryDelay:250});
 }
})().catch(e=>{console.error(e);process.exitCode=1});





