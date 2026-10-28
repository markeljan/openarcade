import test from 'node:test';
import assert from 'node:assert/strict';

const modules = await Promise.all(Array.from({length: 10}, (_, i) => import(`../src/feature-games${i + 31}.js`)));
const games = modules.flatMap((module, i) => module[`featureGames${i + 31}`].map(({id}) => [id, module[`createFeatureGame${i + 31}`]]));

function harness(make, id, options = {}) {
  const names = ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const old = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const frames = new Map(), handlers = new Map(), records = [];
  let sequence = 0, now = 0, disconnected = false;
  const noop = () => {};
  globalThis.window = {devicePixelRatio: 1};
  globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  globalThis.requestAnimationFrame = fn => { frames.set(++sequence, fn); return sequence; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const ctx = new Proxy({}, {get: (o, k) => o[k] ?? noop, set: (o, k, v) => (o[k] = v, true)});
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 720}), setAttribute: noop, focus: noop, addEventListener: (k, fn) => handlers.set(k, fn), removeEventListener: k => handlers.delete(k)};
  const game = make(canvas, id, {...options, onResult: record => { records.push(record); options.onResult?.(record); }});
  return {game, canvas, frames, handlers, records, step(ms = 50) { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); }, advanceTime(ms) { now += ms; }, close() { game.destroy(); assert.equal(frames.size, 0); assert.equal(handlers.size, 0); assert.equal(disconnected, true); Object.assign(globalThis, old); }};
}

for (const [id, make] of games) {
  test(`${id}: actor changes, restart, pause, and destroy use the wrapper lifecycle`, () => {
    const h = harness(make, id);
    try {
      assert.equal(typeof h.game.beginRun, 'function');
      h.step(); h.step();
      h.game.beginRun({interactive: true});
      assert.equal(h.canvas.tabIndex, 0);
      assert.equal(h.game.getSessionState(), 'playing');
      h.step();
      h.game.pause();
      assert.equal(h.frames.size, 0);
      let prevented = false;
      h.handlers.get('keydown')({key: 'x', preventDefault() { prevented = true; }});
      assert.equal(prevented, false, 'paused game must ignore input');
      h.advanceTime(60000);
      assert.equal(h.records.length, 0);
      h.game.resume(); h.step();
      h.game.restart();
      assert.equal(h.game.getSessionState(), 'playing');
      h.game.setInteractive(false);
      assert.equal(h.canvas.tabIndex, -1);
      h.step();
      h.game.beginRun({interactive: true, context: 'embed'});
      assert.equal(h.canvas.tabIndex, 0);
      h.step();
      assert.equal(h.records.length, 0);
    } finally { h.close(); }
  });
}

test('timed real runs bind actor and context atomically and exclude paused time', () => {
  const make = modules[2].createFeatureGame33;
  let handoffs = 0;
  const h = harness(make, 'essence-workshop', {onAttract: () => handoffs++});
  try {
    h.step(); h.step();
    h.game.beginRun({interactive: true, context: 'embed'});
    for (let i = 0; i < 400; i++) h.step();
    h.game.pause(); h.advanceTime(600000); h.game.resume();
    for (let i = 0; i < 3000 && !h.records.length; i++) h.step();
    assert.equal(h.records.length, 1);
    const first = h.records[0];
    assert.equal(first.actor, 'human'); assert.equal(first.context, 'embed');
    assert.equal(first.submissionEligible, true);
    assert.ok(first.durationMs >= 119900 && first.durationMs <= 120050, `active duration ${first.durationMs}`);
    assert.equal(h.game.getSessionState(), 'result');
    h.game.pause(); h.advanceTime(60000); h.game.resume(); h.step();
    assert.equal(handoffs, 0);
    assert.equal(h.game.getSessionState(), 'result');
    for (let i = 0; i < 250 && !handoffs; i++) h.step();
    assert.equal(handoffs, 1);
    assert.equal(h.canvas.tabIndex, -1);
    assert.equal(h.game.getSessionState(), 'playing');
    for (let i = 0; i < 4000 && h.records.length < 2; i++) h.step();
    assert.equal(h.records.length, 2);
    assert.equal(h.records[1].actor, 'ai');
    assert.equal(h.records[1].context, 'embed', 'result timeout must retain the embed context');
    assert.equal(h.records[1].submissionEligible, true);
    h.game.beginRun({interactive: false, context: 'gallery-preview'});
    for (let i = 0; i < 4000 && h.records.length < 3; i++) h.step();
    assert.equal(h.records.length, 3);
    assert.equal(h.records[2].actor, 'ai'); assert.equal(h.records[2].context, 'gallery-preview');
    assert.equal(h.records[2].submissionEligible, false);
    assert.notEqual(h.records[2].runId, first.runId);
  } finally { h.close(); }
});




test('a synchronous result handler can start a new run without restoring the old result', () => {
  const oldRandom = Math.random;
  let seed = 42, h;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  try {
    h = harness(modules[6].createFeatureGame37, 'phase-foundry', {
      onResult() { h.game.beginRun({interactive: true, context: 'manual-player'}); }
    });
    for (let i = 0; i < 20000 && !h.records.length; i++) h.step(1000 / 30);
    assert.equal(h.records.length, 1, 'AI should reach its actual terminal');
    assert.equal(h.canvas.tabIndex, 0);
    assert.equal(h.game.getSessionState(), 'playing');
  } finally { h?.close(); Math.random = oldRandom; }
});
