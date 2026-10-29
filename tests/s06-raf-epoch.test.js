import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, factories} from '../src/games.js';

function harness(t, factory, options = {}) {
  const names = ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage'];
  const previous = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const original = factories.snake, random = Math.random;
  t.after(() => { Object.assign(globalThis, previous); factories.snake = original; Math.random = random; });
  const frames = new Map(), canceled = new Map(), listeners = new Map();
  let sequence = 0, now = 0, canvasDraws = 0;
  const noop = () => {};
  globalThis.window = {devicePixelRatio: 1};
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.localStorage = {getItem: () => null, setItem: noop};
  globalThis.requestAnimationFrame = callback => (frames.set(++sequence, callback), sequence);
  // Keep canceled callbacks available to model callbacks already queued by the browser.
  globalThis.cancelAnimationFrame = id => { canceled.set(id, frames.get(id)); frames.delete(id); };
  factories.snake = factory;
  const ctx = new Proxy({}, {get: (_, key) => key === 'setTransform' ? () => canvasDraws++ : noop, set: () => true});
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 240}), setAttribute: noop, focus: noop,
    addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name)};
  const player = createGame(canvas, 'snake', options);
  return {player, frames, canceled, listeners, get canvasDraws() { return canvasDraws; }, step() {
    assert.equal(frames.size, 1, 'one pending RAF');
    const [id, callback] = frames.entries().next().value;
    frames.delete(id); now += 17; callback(now);
  }};
}

test('delayed canceled RAF cannot consume the resumed slot, update, draw, or create another loop', t => {
  let updates = 0, draws = 0;
  const h = harness(t, () => ({input() {}, update() { updates++; }, draw() { draws++; }}), {interactive: true});
  const [oldId, stale] = h.frames.entries().next().value;
  h.player.pause(); h.player.resume();
  assert.equal(h.canceled.get(oldId), stale);
  const [newId, resumed] = h.frames.entries().next().value;
  stale(17);
  assert.deepEqual([updates, draws, h.canvasDraws], [0, 0, 0]);
  assert.equal(h.frames.get(newId), resumed, 'stale callback preserves the newer pending slot');
  assert.equal(h.frames.size, 1);
  h.step();
  assert.deepEqual([updates, draws], [1, 1]);
  stale(34);
  assert.deepEqual([updates, draws], [1, 1]);
  assert.equal(h.frames.size, 1);
  const outstanding = [...h.frames.values()];
  h.player.destroy();
  outstanding.forEach(callback => callback(51)); resumed(51); stale(51);
  assert.deepEqual([updates, draws], [1, 1]);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});

for (const action of ['restart', 'beginRun', 'setInteractive', 'pause', 'destroy']) test(`${action} invalidates RAF before release and factory cleanup hooks`, t => {
  let stale, invokeStale = false, created = 0;
  const updates = [], draws = [];
  const h = harness(t, () => {
    const instance = ++created;
    return {input(_key, down) { if (!down && invokeStale) stale(17); }, destroy() { if (invokeStale) stale(17); },
      update() { updates.push(instance); }, draw() { draws.push(instance); }};
  }, {interactive: true});
  stale = h.frames.values().next().value; invokeStale = true;
  if (action === 'beginRun') h.player.beginRun({interactive: true, context: 'manual-player'});
  else if (action === 'setInteractive') h.player.setInteractive(false);
  else h.player[action]();
  const replaced = !['pause', 'destroy'].includes(action);
  assert.equal(created, replaced ? 2 : 1);
  assert.deepEqual(updates, []); assert.deepEqual(draws, []);
  assert.equal(h.canvasDraws, 0);
  stale(17);
  assert.deepEqual(updates, []); assert.equal(h.frames.size, replaced ? 1 : 0);
  if (replaced) {
    h.step();
    assert.deepEqual(updates, [2]); assert.deepEqual(draws, [2]);
  }
  h.player.destroy();
  assert.equal(h.frames.size, 0);
});

for (const action of ['pause/resume', 'destroy']) test(`natural Snake terminal ${action} prevents the old tick from drawing`, t => {
  const naturalSnake = factories.snake;
  let h, terminalDraws, records = 0, gameDraws = 0;
  h = harness(t, end => {
    Math.random = () => 0;
    const game = naturalSnake(end);
    return {...game, draw(ctx) { gameDraws++; game.draw(ctx); }};
  }, {interactive: true, onResult(record) {
    records++;
    assert.equal(record.result, 'GAME OVER'); assert.equal(record.actor, 'human');
    terminalDraws = [gameDraws, h.canvasDraws];
    if (action === 'pause/resume') { h.player.pause(); h.player.resume(); }
    else h.player.destroy();
  }});
  for (let i = 0; i < 500 && !records; i++) h.step();
  assert.equal(records, 1, 'natural wall collision reported');
  assert.deepEqual([gameDraws, h.canvasDraws], terminalDraws, 'no canvas work after the callback invalidates the tick');
  assert.equal(h.frames.size, action === 'destroy' ? 0 : 1);
  if (action === 'pause/resume') { h.step(); assert.equal(gameDraws, terminalDraws[0] + 1); }
  h.player.destroy(); assert.equal(h.frames.size, 0);
});

test('AI terminal pause/resume creates a fresh factory before its next simulation', t => {
  let h, created = 0, records = 0;
  const updates = [], draws = [];
  h = harness(t, end => {
    const instance = ++created;
    return {input() {}, update() { updates.push(instance); if (instance === 1) end('END', 1); }, draw() { draws.push(instance); }};
  }, {onResult() { records++; h.player.pause(); h.player.resume(); }});
  h.step();
  assert.equal(records, 1); assert.deepEqual(updates, [1]); assert.deepEqual(draws, []);
  assert.equal(h.frames.size, 1);
  h.step();
  assert.equal(created, 2); assert.deepEqual(updates, [1, 2]); assert.deepEqual(draws, [2]);
  h.player.destroy(); assert.equal(h.frames.size, 0);
});
