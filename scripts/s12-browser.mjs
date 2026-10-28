// S12's isolated, dependency-free Chromium driver. Never connects to a user's browser.
import {existsSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {spawn} from 'node:child_process';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export function localOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) || url.username || url.password) {
    throw new Error('S12 browser checks require an HTTP loopback URL, served without production Functions');
  }
  return url.origin;
}
export function allowedRequest(value, origin) {
  if (value === 'about:blank' || value.startsWith('data:') || value.startsWith('blob:')) return true;
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname).replaceAll('\\', '/');
    return url.origin === origin && !/^\/api(?:\/|$)/i.test(pathname);
  } catch { return false; }
}

export async function launchBrowser({url, origin: explicitOrigin, width = 1440, height = 1000} = {}) {
  const origin = localOrigin(url || explicitOrigin || 'http://127.0.0.1:4312/');
  const candidates = process.platform === 'win32'
    ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe']
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  const executable = process.env.S12_BROWSER || candidates.find(existsSync);
  if (!executable || !existsSync(executable)) throw new Error('Set S12_BROWSER to a Chromium executable');
  const tempRoot = realpathSync(tmpdir()), profile = mkdtempSync(join(tempRoot, 'openarcade-s12-'));
  const proc = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide: true, stdio: 'ignore'});
  let ws, seq = 0, closed = false, spawnError;
  const pending = new Map(), listeners = new Map(), errors = [], blocked = [];
  proc.on('error', error => { spawnError = error; });
  const on = (method, fn) => { const entries = listeners.get(method) || []; entries.push(fn); listeners.set(method, entries); };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, {resolve, reject, timer});
    ws.send(JSON.stringify({id, method, params}));
  });
  const close = async () => {
    if (closed) return;
    closed = true;
    if (ws?.readyState === WebSocket.OPEN) await Promise.race([call('Browser.close').catch(() => {}), sleep(1000)]);
    ws?.close();
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('S12 browser closed')); }
    pending.clear();
    if (proc.exitCode === null && proc.signalCode === null) proc.kill();
    for (let i = 0; i < 30 && proc.exitCode === null && proc.signalCode === null; i++) await sleep(100);
    const target = realpathSync(profile);
    if (dirname(target) !== tempRoot || !basename(target).startsWith('openarcade-s12-')) throw new Error('Unexpected S12 profile path');
    rmSync(target, {recursive: true, force: true, maxRetries: 12, retryDelay: 250});
  };
  try {
    let port;
    for (let i = 0; i < 200; i++) {
      if (spawnError) throw spawnError;
      try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); if (port) break; } catch {}
      await sleep(50);
    }
    if (!port) throw new Error('Isolated browser failed to start');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(entry => entry.type === 'page');
    if (!target) throw new Error('Isolated browser page missing');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    ws.onmessage = event => {
      const message = JSON.parse(event.data), entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
      for (const fn of listeners.get(message.method) || []) Promise.resolve(fn(message.params)).catch(error => errors.push(String(error)));
    };
    ws.onclose = () => { for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Browser disconnected')); } pending.clear(); };
    on('Runtime.exceptionThrown', params => errors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text));
    on('Fetch.requestPaused', async params => {
      if (allowedRequest(params.request.url, origin)) return call('Fetch.continueRequest', {requestId: params.requestId});
      blocked.push({url: params.request.url, method: params.request.method});
      return call('Fetch.failRequest', {requestId: params.requestId, errorReason: 'BlockedByClient'});
    });
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Fetch.enable', {patterns: [{urlPattern: '*', requestStage: 'Request'}]});
    await call('Network.enable');
    // WebSockets are not intercepted by Fetch. No remote sockets or same-origin API sockets.
    await call('Network.setBlockedURLs', {urls: ['ws://*', 'wss://*', '*/api', '*/api/*']});
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    await call('Page.bringToFront');
    const run = async expression => {
      const result = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    if (url) await call('Page.navigate', {url});
    return {call, run, close, on, errors, blocked, executable, origin};
  } catch (error) { await close(); throw error; }
}
