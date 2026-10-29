import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const executable = (process.platform === 'win32'
  ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']).find(existsSync);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// This verifies actual browser top-layer/focus behavior with a synthetic mount
// provider. It does not verify Clerk's SDK, network, credentials or sign-in flow.
test('nested native sign-in traps focus, isolates Escape and survives stale mounts', { skip: !executable, timeout: 45000 }, async () => {
  const profile = mkdtempSync(join(tmpdir(), 's04-auth-browser-'));
  const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'silent', plugins: [{
    name: 's04-auth-fixture',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url !== '/s04-auth-fixture.html') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><title>Auth lifecycle fixture</title><dialog id="player" aria-label="Game player" style="width:900px;height:500px"><button id="trigger">Sign in</button><button id="restart">Restart</button></dialog>');
      });
    }
  }] });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let browserPort;
    for (let i = 0; i < 100; i++) {
      try { browserPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); break; }
      catch { await sleep(50); }
    }
    assert.ok(browserPort, 'browser debugging port');
    const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const message = JSON.parse(event.data), request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      message.error ? request.reject(message.error) : request.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const value = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const until = async expression => {
      for (let i = 0; i < 100; i++) { if (await value(expression)) return; await sleep(25); }
      assert.fail(`Timed out: ${expression}`);
    };
    const key = async name => {
      const windowsVirtualKeyCode = name === 'Escape' ? 27 : 9;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode });
    };
    await send('Page.enable');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/s04-auth-fixture.html` });
    await until('Boolean(document.querySelector("#player"))');
    await value(`(async () => {
      const { mountPlayerAuth } = await import('/src/ui/player-auth.js');
      const player = document.querySelector('#player');
      const env = window.env = { player, mounts: [], cleanups: [], changes: [], outerKeys: 0, outerCloses: 0, outerCancels: 0, restarts: 0, hidden: false, paused: false, releases: 0, state: { status: 'signed-out' } };
      env.mountPlayerAuth = mountPlayerAuth;
      player.addEventListener('keydown', () => env.outerKeys++);
      player.addEventListener('close', () => env.outerCloses++);
      player.addEventListener('cancel', () => env.outerCancels++);
      document.querySelector('#restart').addEventListener('click', () => env.restarts++);
      const auth = {
        getState: () => env.state,
        subscribe(fn) { env.listener = fn; fn(env.state); return () => env.unsubscribed = true; },
        mountSignIn(host) { return new Promise((resolve, reject) => env.mounts.push({ host, resolve, reject })); }
      };
      env.auth = auth;
      env.complete = index => {
        const { host, resolve } = env.mounts[index];
        const input = document.createElement('input'); input.setAttribute('aria-label', 'Synthetic email');
        const button = document.createElement('button'); button.textContent = 'Synthetic continue';
        host.append(input, button); input.focus();
        resolve(() => { env.cleanups.push(index); host.replaceChildren(); });
      };
      env.controller = mountPlayerAuth(player, { auth, onOpenChange(open) {
        env.changes.push(open); if (open) env.releases++; env.paused = env.hidden || open;
      } });
      player.showModal(); document.querySelector('#trigger').focus(); env.controller.open();
    })()`);
    assert.equal(await value('env.player.matches(":modal") && env.player.firstElementChild.tagName === "BUTTON" && document.querySelector(".player-auth-dialog").matches(":modal")'), true);
    assert.equal(await value('document.querySelector(".player-auth-dialog").parentElement === env.player'), true);
    assert.equal(await value('env.paused && env.releases === 1 && env.mounts.length === 1'), true);
    await value('env.controller.open(); env.complete(0)');
    await until('document.activeElement.getAttribute("aria-label") === "Synthetic email"');
    assert.equal(await value('env.mounts.length'), 1);
    for (let i = 0; i < 7; i++) {
      await key('Tab');
      const focus = await value('({ inside: document.querySelector(".player-auth-dialog").contains(document.activeElement), tag: document.activeElement.tagName, id: document.activeElement.id, pageFocused: document.hasFocus() })');
      // Native dialogs permit the browser chrome to receive focus at a tab
      // boundary. Within the document, focus must stay in the child modal.
      assert.ok(focus.inside || (!focus.pageFocused && focus.tag === 'BODY'), `Tab cannot enter parent controls: ${JSON.stringify(focus)}`);
    }
    const point = await value('(() => { const r = document.querySelector("#restart").getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    assert.equal(await value('env.restarts'), 0, 'parent controls are inert');
    await key('Escape');
    await until('!document.querySelector(".player-auth-dialog")');
    assert.deepEqual(await value('[env.outerKeys,env.outerCloses,env.outerCancels,env.restarts]'), [0, 0, 0, 0]);
    assert.equal(await value('env.player.open && !env.paused && document.activeElement.id === "trigger"'), true);
    assert.deepEqual(await value('env.cleanups'), [0]);

    await value('env.controller.open(); env.controller.close(); env.controller.open(); env.complete(2)');
    await until('document.activeElement.getAttribute("aria-label") === "Synthetic email"');
    await value('env.activeHost = env.mounts[2].host; env.activeFocus = document.activeElement; env.complete(1)');
    await until('env.cleanups.includes(1)');
    assert.equal(await value('document.activeElement === env.activeFocus && env.activeHost.isConnected && document.querySelectorAll(".player-auth-dialog").length === 1 && env.paused'), true);
    await value('env.hidden = true; env.state = { status: "signed-in" }; env.listener(env.state)');
    await until('!document.querySelector(".player-auth-dialog")');
    assert.equal(await value('env.paused && env.player.open && env.outerCloses === 0'), true, 'page-hidden pause remains owned by caller');
    assert.deepEqual(await value('env.cleanups'), [0, 1, 2]);

    await value('env.state = { status: "signed-out" }; env.hidden = false; env.controller.open(); env.mounts[3].reject(Error("synthetic failure"))');
    await until('!document.querySelector(".player-auth-actions button").hidden');
    await value('document.querySelector(".player-auth-actions button").click()');
    assert.equal(await value('env.mounts.length'), 5);
    await value('document.querySelector(".player-auth-actions button:last-child").click(); env.complete(4)');
    await until('env.cleanups.includes(4)');
    assert.equal(await value('!env.paused && env.player.open && env.outerCloses === 0 && env.outerCancels === 0'), true);
    await value('env.controller.dispose()'); assert.equal(await value('env.unsubscribed'), true);

    await value(`env.preparations = []; env.controller = env.mountPlayerAuth(env.player, {
      auth: env.auth,
      onOpenChange(open) { env.paused = open; },
      prepare({ container, signal }) { return new Promise(resolve => {
        const button = document.createElement('button'); button.textContent = 'Continue after recovery';
        button.onclick = () => resolve(true); container.append(button);
        env.preparations.push({ container, signal, approve: () => resolve(true) });
      }); }
    }); env.controller.open()`);
    assert.equal(await value('env.paused && env.mounts.length === 5 && env.preparations.length === 1'), true);
    await key('Escape');
    assert.equal(await value('env.preparations[0].signal.aborted && !env.paused && env.player.open && env.outerCloses === 0'), true);
    await value('env.controller.open(); env.preparations[0].approve()');
    assert.equal(await value('env.mounts.length'), 5, 'stale recovery approval cannot mount Clerk');
    await value('env.preparations[1].container.querySelector("button").click()');
    await until('env.mounts.length === 6'); await value('env.complete(5)');
    await until('document.activeElement.getAttribute("aria-label") === "Synthetic email"');
    assert.equal(await value('!env.preparations[1].container.textContent.includes("Continue after recovery") && env.player.open'), true);
    await value('env.controller.dispose()'); assert.equal(await value('env.preparations[1].signal.aborted && !env.paused'), true);
  } finally {
    socket?.close(); browser.kill(); await server.close();
    await sleep(200);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Windows may still be releasing browser profile files. */ }
  }
});
