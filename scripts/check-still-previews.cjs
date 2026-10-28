// Requires Node with WebSocket support, Microsoft Edge at its standard Windows path, and Vite at http://127.0.0.1:5179/.
// Run: node scripts/check-still-previews.cjs
const net = require('node:net');
const {spawn, spawnSync} = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const tempRoot = fs.realpathSync(os.tmpdir()), prefix = 'miniarcade-preview-check-';
  const profile = fs.mkdtempSync(path.join(tempRoot, prefix));
  let proc, ws, call;
  try {
    proc = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
      '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port='+port,
      `--user-data-dir=${profile}`, 'about:blank'
    ], {windowsHide:true, stdio:'ignore'});
    let spawnError;
    proc.on('error', error => { spawnError = error; });
    let info;
    for (let i=0; i<100; i++) {
      if (spawnError) throw spawnError;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5179/`, {method:'PUT'});
        if (!response.ok) throw Error(`Debug endpoint returned ${response.status}`);
        info = await response.json(); break;
      } catch { await sleep(100); }
    }
    if (!info?.webSocketDebuggerUrl) throw Error('Edge debugging endpoint did not become ready');
    ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout=setTimeout(()=>reject(Error('Edge debugging connection timed out')),5000);
      ws.onopen=()=>{clearTimeout(timeout);resolve()};
      ws.onerror=()=>{clearTimeout(timeout);reject(Error('Edge debugging connection failed'))};
    });
    let id=0; const pending=new Map();
    ws.onmessage=event=>{const message=JSON.parse(event.data),entry=pending.get(message.id);if(entry){pending.delete(message.id);clearTimeout(entry.timeout);message.error?entry.reject(Error(JSON.stringify(message.error))):entry.resolve(message.result)}};
    ws.onclose=()=>{for(const entry of pending.values()){clearTimeout(entry.timeout);entry.reject(Error('Edge debugging connection closed'))}pending.clear()};
    call=(method,params={})=>new Promise((resolve,reject)=>{
      const n=++id, timeout=setTimeout(()=>{pending.delete(n);reject(Error(`Timed out: ${method}`))},5000);
      pending.set(n,{resolve,reject,timeout});
      try { ws.send(JSON.stringify({id:n,method,params})); } catch(error) {clearTimeout(timeout);pending.delete(n);reject(error)}
    });
    const run=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await call('Page.reload'); await sleep(2500);
    const inspect=()=>run(`Array.from(document.querySelectorAll('[data-preview="still"] canvas')).map(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<a.length;i+=4){if(a[i+3])colors.add([a[i]>>3,a[i+1]>>3,a[i+2]>>3].join(','));if(colors.size>=8)break}return {width:c.width,height:c.height,colors:colors.size}})`);
    const initial=await inspect();
    await call('Emulation.setDeviceMetricsOverride',{width:700,height:800,deviceScaleFactor:1,mobile:false}); await sleep(1500);
    const resized=await inspect();
    if(!initial.length||!initial.every(x=>x.colors>=8)||!resized.length||!resized.every(x=>x.colors>=8))throw Error('A reduced-motion still preview was blank or monochrome: '+JSON.stringify({initial,resized}));
    console.log(JSON.stringify({initial,resized}));
  } finally {
    // Browser.close requests a graceful shutdown of all Edge children. The
    // socket is closed even when a CDP call or the assertion above fails.
    if (ws?.readyState===WebSocket.OPEN && call) {
      try { await Promise.race([call('Browser.close').catch(()=>{}),sleep(1000)]); } catch {}
    }
    if (ws && (ws.readyState===WebSocket.OPEN || ws.readyState===WebSocket.CONNECTING)) { try { ws.close(); } catch {} }
    if (proc?.pid) {
      // /T targets only the process tree we launched; no unrelated Edge instance.
      if (process.platform==='win32') spawnSync('taskkill',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
      else proc.kill();
      for(let i=0;i<40 && proc.exitCode===null && proc.signalCode===null;i++) await sleep(100);
    }
    // Check the resolved final target before any recursive deletion.
    if (fs.existsSync(profile)) {
      const target=fs.realpathSync(profile);
      if(path.dirname(target)!==tempRoot||!path.basename(target).startsWith(prefix))throw Error('Unexpected temporary profile path');
      let failure;
      for(let i=0;i<40;i++) {
        try { fs.rmSync(target,{recursive:true,force:true}); failure=null; break; }
        catch(error) { failure=error; if(!['EPERM','EBUSY','ENOTEMPTY'].includes(error.code))break; await sleep(250); }
      }
      if(failure)throw failure;
    }
  }
})().catch(error=>{console.error(error);process.exitCode=1});
