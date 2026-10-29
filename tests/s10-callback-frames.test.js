import test from 'node:test';
import assert from 'node:assert/strict';

const modules = await Promise.all(Array.from({length: 10}, (_, i) => import(`../src/feature-games${i + 31}.js`)));
const games = modules.flatMap((module, i) => module[`featureGames${i + 31}`].map(({id}) => [id, module[`createFeatureGame${i + 31}`]]));

function runToTerminal(make, id, action) {
  const names = ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const old = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const oldRandom = Math.random;
  let seed = 1, nextId = 0, now = 0, draws = 0, atCallback = 0, records = 0, game;
  const frames = new Map(), listeners = new Map(), noop = () => {};
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  globalThis.window = {devicePixelRatio: 1};
  globalThis.ResizeObserver = class {observe() {} disconnect() {}};
  globalThis.requestAnimationFrame = fn => { frames.set(++nextId, fn); return nextId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const ctx = new Proxy({}, {get: () => () => { draws++; }, set: () => true});
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 720}), setAttribute: noop, focus: noop, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key)};
  try {
    game = make(canvas, id, {context: 'watch-player', onResult() {
      records++;
      action(game);
      atCallback = draws;
    }});
    for (let i = 0; i < 120000 && !records; i++) {
      assert.equal(frames.size, 1, `${id}: expected one scheduled animation frame before terminal`);
      const [key, fn] = frames.entries().next().value;
      frames.delete(key);
      fn(now += 1000 / 30);
    }
    assert.equal(records, 1, `${id}: AI did not reach a terminal`);
    return {game, canvas, frames, listeners, draws, atCallback, cleanup() { try { game.destroy(); } finally { Object.assign(globalThis, old); Math.random = oldRandom; } }};
  } catch (error) {
    try { game?.destroy(); } finally { Object.assign(globalThis, old); Math.random = oldRandom; }
    throw error;
  }
}

for (const [id, make] of games) {
  test(`${id}: pause and resume inside onResult leave exactly one frame`, () => {
    const h = runToTerminal(make, id, game => {game.pause(); game.resume();});
    try { assert.equal(h.frames.size, 1); } finally { h.cleanup(); }
  });
  test(`${id}: destroy inside onResult prevents drawing and scheduling`, () => {
    const h = runToTerminal(make, id, game => game.destroy());
    try {
      assert.equal(h.frames.size, 0);
      assert.equal(h.listeners.size, 0);
      assert.equal(h.draws, h.atCallback, 'destroyed wrapper drew after callback');
    } finally { h.cleanup(); }
  });
  test(`${id}: starting a fresh run then pausing and resuming leaves one frame`, () => {
    const h = runToTerminal(make, id, game => {game.beginRun({interactive: true, context: 'manual-player'}); game.pause(); game.resume();});
    try {
      assert.equal(h.frames.size, 1);
      assert.equal(h.game.getSessionState(), 'playing');
      assert.equal(h.canvas.tabIndex, 0);
    } finally { h.cleanup(); }
  });
}


for (const [id, make] of games) {
  test(`${id}: a canceled frame replay after resume does nothing`, () => {
    const names = ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
    const old = Object.fromEntries(names.map(name => [name, globalThis[name]]));
    const frames = new Map(), listeners = new Map(), records = [];
    let serial = 0, draws = 0, game;
    const noop = () => {};
    globalThis.window = {devicePixelRatio: 1};
    globalThis.ResizeObserver = class {observe() {} disconnect() {}};
    globalThis.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    const ctx = new Proxy({}, {get: () => () => { draws++; }, set: () => true});
    const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 720}), setAttribute: noop, focus: noop, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key)};
    try {
      game = make(canvas, id, {context: 'watch-player', onResult: result => records.push(result)});
      const stale = frames.values().next().value;
      game.pause(); game.resume();
      assert.equal(frames.size, 1);
      const live = frames.values().next().value;
      stale(100000000);
      assert.equal(draws, 0, 'canceled frame must not draw or advance');
      assert.equal(records.length, 0);
      assert.equal(frames.size, 1);
      assert.equal(frames.values().next().value, live);
    } finally { game?.destroy(); Object.assign(globalThis, old); }
  });
}
