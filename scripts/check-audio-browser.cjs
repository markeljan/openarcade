// Requires Node with WebSocket support, Microsoft Edge, and a local server.
// Run against an isolated local build; set AUDIO_PORT to its server port.
const net=require('node:net'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const portToTest=Number(process.env.AUDIO_PORT||5192);
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
  await call('Page.enable');await call('Page.bringToFront');await call('Emulation.setFocusEmulationEnabled',{enabled:true});await sleep(2000);
await run(`window.aud={created:0,started:0,closed:0,states:[]};const Native=window.AudioContext||window.webkitAudioContext;class MonitoredAudio extends Native{constructor(...a){super(...a);window.aud.created++;window.lastAudio=this}createOscillator(...a){const osc=super.createOscillator(...a),start=osc.start.bind(osc);osc.start=(...args)=>{window.aud.started++;return start(...args)};return osc}close(...a){window.aud.closed++;return super.close(...a)}}window.AudioContext=MonitoredAudio`);
const click=async selector=>{const p=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1})};
await sleep(1000);console.log('PREVIEW',await run('window.aud'));if(await run('window.aud.created!==0'))throw Error('Preview created audio');
await run(`document.querySelector('[aria-label="Play Pottery House"]').click();document.querySelector('#auto').click()`);await sleep(2000);console.log('MUTED WATCH',await run('window.aud'));if(await run('window.aud.created!==0'))throw Error('Muted watch created audio');
await click('#sound');for(let i=0;i<60;i++){if(await run('window.aud.started>0'))break;await sleep(500)}let on=await run('({...window.aud,state:window.lastAudio?.state})');console.log('ENABLED WATCH',on);if(!on.created||!on.started)throw Error('Watch did not play audio');
await run(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`);await sleep(500);await run(`Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))`);await sleep(5000);console.log('RESTORED WATCH',await run('({...window.aud,state:window.lastAudio?.state})'));if(!await run('window.aud.created===2 && window.aud.closed===1 && window.lastAudio.state==="running"'))throw Error('Watch audio did not resume');
// Take over, steer to the clay station with real keyboard input, and perform work.
await run(`window.heroPos=null;window.potteryText=[];const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){if(this.canvas.id==='play-canvas'&&this.fillStyle==='#f5e0bd'&&r===7)window.heroPos={x,y:y+13,frame:(window.heroPos?.frame||0)+1};return arc.call(this,x,y,r,...args)};const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...args){if(this.canvas.id==='play-canvas'){window.potteryText.push(String(t));if(window.potteryText.length>400)window.potteryText.splice(0,200)}return fill.call(this,t,...args)}`);
await run("document.querySelector('#auto').click()");
const dispatch=async(type,key)=>call('Input.dispatchKeyEvent',{type,key,code:key===' '?'Space':key,windowsVirtualKeyCode:key===' '?32:0});
const fresh=async after=>{const end=Date.now()+4000;while(Date.now()<end){let pos=await run('window.heroPos');if(pos?.frame>after)return pos;await sleep(50)}throw Error('Player canvas stopped painting')};
const go=async(x,y)=>{const end=Date.now()+12000;while(Date.now()<end){let p=await fresh(0),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<8&&Math.abs(dy)<8)return;const horizontal=Math.abs(dx)>=8,key=horizontal?(dx<0?'ArrowLeft':'ArrowRight'):(dy<0?'ArrowUp':'ArrowDown'),axis=horizontal?'x':'y',goal=horizontal?x:y,sign=(goal-p[axis])<0?-1:1;await dispatch('keyDown',key);try{const until=Date.now()+600;while(Date.now()<until){p=await fresh(p.frame);if((goal-p[axis])*sign<=7)break}}finally{await dispatch('keyUp',key)}}throw Error('Could not reach clay station')};
await go(42,402);const before=await run('window.aud.started');await dispatch('keyDown',' ');try{const end=Date.now()+6000;while(Date.now()<end){if(await run('window.potteryText.includes("CLAY VESSEL")'))break;await sleep(60)}}finally{await dispatch('keyUp',' ')}const action=await run('({started:window.aud.started,clay:window.potteryText.includes("CLAY VESSEL"),state:window.lastAudio.state})');console.log('RESTORED MANUAL CLAY',action);if(!action.clay||action.started<=before||action.state!=='running')throw Error('Manual clay action did not sound after visibility restore');
await click('#sound');await sleep(1000);console.log('MUTED',await run('({...window.aud,preference:localStorage.getItem("miniarcade-sound")})'));
await click('#sound');await sleep(1000);await run("document.querySelector('#close').click()");await sleep(500);console.log('CLOSED',await run('({...window.aud,preference:localStorage.getItem("miniarcade-sound")})'));if(!await run('window.aud.created===window.aud.closed'))throw Error('Player audio leaked');
await run(`document.querySelector('[aria-label="Play Pottery House"]').click()`);console.log('REOPEN',await run('document.querySelector("#sound").getAttribute("aria-pressed")'));if(!await run('document.querySelector("#sound").getAttribute("aria-pressed")=="true"'))throw Error('Preference not restored');


 }finally{
  if(ws?.readyState===WebSocket.OPEN&&call)await Promise.race([call('Browser.close').catch(()=>{}),sleep(1000)]);if(ws)try{ws.close()}catch{}
  if(proc?.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else proc.kill();for(let i=0;i<40&&proc.exitCode===null&&proc.signalCode===null;i++)await sleep(100)}
  const target=fs.realpathSync(profile);if(path.dirname(target)!==root||!path.basename(target).startsWith(prefix))throw Error('Unexpected temporary profile path');fs.rmSync(target,{recursive:true,force:true,maxRetries:8,retryDelay:250});
 }
})().catch(e=>{console.error(e);process.exitCode=1});






