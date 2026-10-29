import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoreSession } from '../src/ui/score-session.js';

const run = (runId, gameId = 'a', actor = 'human') => ({ schemaVersion: 1, runId, gameId, ruleVersion: 1, score: 12, result: 'COMPLETE', durationMs: 1500, actor, context: actor === 'human' ? 'manual-player' : 'watch-player', provenance: 'client-reported', submissionEligible: true });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function until(predicate) { for (let i = 0; i < 100; i++) { if (predicate()) return; await Promise.resolve(); } assert.fail('Expected async operation to start'); }
function setup(options = {}) {
  const env = { changes: [], errors: [], enqueues: [], submits: [], prepares: [], pending: new Map(), states: new Map(), clientListeners: new Set(), authListeners: new Set(), state: options.authState || { status: 'signed-out' }, clientUnsubs: 0, authUnsubs: 0 };
  env.emit = value => { env.states.set(value.runId, value); for (const fn of env.clientListeners) fn(value); return value; };
  env.signIn = () => { env.state = { status: 'signed-in', user: { id: 'player' } }; for (const fn of env.authListeners) fn(env.state); };
  env.client = {
    getState: id => env.states.get(id) || null,
    subscribe(fn) { env.clientListeners.add(fn); return () => { env.clientListeners.delete(fn); env.clientUnsubs++; }; },
    async listPending() { return options.listPending ? options.listPending(env) : [...env.pending.values()]; },
    async enqueue(value) {
      env.enqueues.push(value);
      if (options.enqueue) return options.enqueue(value, env);
      env.pending.set(value.runId, { ...value, claimNonce: 'private-nonce' });
      return env.emit({ runId: value.runId, status: 'pending', durability: options.durability || 'persistent', redirectSafe: options.durability !== 'memory' });
    },
    async submit(id) {
      env.submits.push(id);
      if (options.submit) return options.submit(id, env);
      if (env.state.status !== 'signed-in' && env.pending.get(id)?.actor === 'human') return env.emit({ runId: id, status: 'queued-auth', receipt: { claimToken: 'private-token' } });
      env.pending.delete(id); return env.emit({ runId: id, status: 'saved', receipt: { claimToken: 'private-token' } });
    },
    async prepareSignIn(id) {
      env.prepares.push(id);
      if (options.prepare) return options.prepare(id, env);
      return env.emit({ runId: id, status: 'queued-auth', durability: options.durability || 'persistent', redirectSafe: options.durability !== 'memory', receipt: { claimToken: 'private-token' } });
    },
  };
  env.auth = { getState: () => env.state, subscribe(fn) { env.authListeners.add(fn); fn(env.state); return () => { env.authListeners.delete(fn); env.authUnsubs++; }; } };
  env.session = createScoreSession({ client: env.client, auth: env.auth, onChange: value => env.changes.push(value), onError: error => env.errors.push(error) });
  return env;
}

test('duplicate results enqueue once; every sign-in trigger shares a pipeline after the human commit', async () => {
  const gate = deferred(), order = [];
  const env = setup({ enqueue: async (value, env) => {
    await gate.promise; order.push('commit'); env.pending.set(value.runId, value);
    return env.emit({ runId: value.runId, status: 'pending', durability: 'persistent', redirectSafe: true });
  }, prepare: async (id, env) => { order.push('prepare'); return env.emit({ runId: id, status: 'queued-auth' }); } });
  const first = env.session.accept(run('one')), duplicate = env.session.accept(run('one'));
  assert.equal(first, duplicate);
  const signIn = env.session.prepareSignIn(); assert.equal(signIn, env.session.prepareSignIn());
  await tick(); assert.equal(env.enqueues.length, 1); assert.equal(env.prepares.length, 0); assert.equal(env.submits.length, 0);
  gate.resolve(); await first;
  assert.deepEqual(await signIn, { redirectSafe: true, runs: [] }); assert.deepEqual(order, ['commit', 'prepare']);
  assert.deepEqual(env.submits, ['one']); assert.equal(env.session.getResult('a').state.status, 'queued-auth');
  env.session.dispose();
});

test('restore never re-enqueues queued records and strips private capabilities from every public value', async () => {
  const env = setup();
  env.pending.set('old', { ...run('old'), claimNonce: 'private-nonce', receipt: { claimToken: 'private-token' }, guestName: undefined, attribution: 'private-extra', createdAt: 3, expiresAt: 999 });
  const restored = await env.session.restore();
  assert.equal(env.enqueues.length, 0); assert.deepEqual(env.submits, ['old']);
  assert.deepEqual(restored[0].run, run('old'));
  assert.equal(restored[0].state.status, 'queued-auth');
  const publicValues = JSON.stringify([restored, env.changes, env.session.getResult('a')]);
  for (const secret of ['private-nonce', 'private-token', 'claimNonce', 'claimToken', 'receipt', 'private-extra', 'expiresAt', 'guestName']) assert.equal(publicValues.includes(secret), false, secret);
  await env.session.accept(run('old')); assert.equal(env.enqueues.length, 0);
  env.session.dispose();
});

test('enqueue failures retain the original human result with a memory warning and explicit retry', async () => {
  let fail = true;
  const env = setup({ authState: { status: 'signed-in' }, enqueue: async (value, env) => {
    if (fail) throw Error('local write failed');
    env.pending.set(value.runId, value); return env.emit({ runId: value.runId, status: 'pending', durability: 'persistent', redirectSafe: true });
  } });
  await env.session.accept(run('one')); await env.session.accept(run('one'));
  assert.equal(env.enqueues.length, 1); assert.equal(env.submits.length, 0);
  const result = env.session.getResult('a'); assert.deepEqual(result.run, run('one'));
  assert.deepEqual(result.state, { runId: 'one', status: 'retry', durability: 'memory', redirectSafe: false });
  assert.deepEqual(await env.session.prepareSignIn(), { redirectSafe: false, runs: [run('one')] });
  fail = false; await env.session.retry('one');
  assert.equal(env.enqueues.length, 2); assert.equal(env.session.getResult('a').state.status, 'saved');
  await env.session.accept(run('one')); await env.session.retry('one');
  assert.equal(env.enqueues.length, 2); assert.equal(env.submits.length, 1); assert.equal(env.errors.length, 1);
  env.session.dispose();
});

test('sparse error states preserve durability and preparation failure never pretends a score saved', async () => {
  for (const durability of ['memory', 'persistent']) {
    const env = setup({ durability, prepare: async () => { throw Error('scores API offline'); } });
    await env.session.accept(run('one'));
    env.emit({ runId: 'one', status: 'retry', error: 'untrusted-private-error', receipt: { claimToken: 'private-token' } });
    assert.equal(env.session.getResult('a').state.redirectSafe, durability === 'persistent');
    assert.deepEqual(await env.session.prepareSignIn(), { redirectSafe: durability === 'persistent', runs: durability === 'persistent' ? [] : [run('one')] });
    assert.equal(env.session.getResult('a').state.status, 'retry'); assert.equal(env.session.getResult('a').state.durability, durability);
    assert.equal(JSON.stringify(env.changes).includes('private'), false); assert.equal(env.errors.length, 1);
    env.session.dispose();
  }
});

test('sign-in during an unauthenticated submission performs one fresh claim after the joined request settles', async () => {
  const gate = deferred();
  const env = setup({ submit: async (id, env) => {
    if (env.submits.length === 1) { await gate.promise; return env.emit({ runId: id, status: 'queued-auth' }); }
    env.pending.delete(id); return env.emit({ runId: id, status: 'saved' });
  } });
  const accepted = env.session.accept(run('one')); await until(() => env.submits.length === 1);
  env.signIn(); await tick(); assert.equal(env.submits.length, 1);
  assert.notEqual(env.session.getResult('a').state.status, 'saved');
  gate.resolve(); await accepted; await tick();
  assert.equal(env.enqueues.length, 1); assert.deepEqual(env.submits, ['one', 'one']);
  assert.equal(env.session.getResult('a').state.status, 'saved');
  env.signIn(); await tick(); assert.equal(env.submits.length, 2);
  env.session.dispose();
});

test('a persistent 401 has at most one follow-up per auth transition, with no automatic retry loop', async () => {
  const env = setup({ authState: { status: 'signed-in' }, submit: async (id, env) => env.emit({ runId: id, status: 'queued-auth' }) });
  await env.session.accept(run('one')); await tick();
  assert.equal(env.submits.length, 2); assert.equal(env.session.getResult('a').state.status, 'queued-auth');
  env.signIn(); await tick(); const afterTransition = env.submits.length;
  assert.ok(afterTransition <= 4); env.signIn(); await tick(); assert.equal(env.submits.length, afterTransition);
  env.session.dispose();
});

test('human results survive AI timeout and old-run callbacks cannot overwrite a newer human or another game', async () => {
  const env = setup();
  await env.session.accept(run('human-old')); await env.session.accept(run('human-new'));
  await env.session.accept(run('other-game', 'b'));
  const beforeAI = env.changes.length;
  await env.session.accept(run('ai-timeout', 'a', 'ai'));
  assert.equal(env.session.getResult('a').run.runId, 'human-new'); assert.equal(env.changes.length, beforeAI);
  env.emit({ runId: 'human-old', status: 'saved' });
  assert.equal(env.session.getResult('a').run.runId, 'human-new'); assert.equal(env.changes.length, beforeAI);
  assert.equal(env.session.getResult('b').run.runId, 'other-game');
  assert.equal(env.session.getResult('b').state.status, 'queued-auth');
  env.session.dispose();
});

test('acknowledged scores cannot regress on late client events or be re-enqueued', async () => {
  const env = setup({ authState: { status: 'signed-in' } });
  await env.session.accept(run('one')); assert.equal(env.session.getResult('a').state.status, 'saved');
  env.emit({ runId: 'one', status: 'queued-auth' }); await env.session.accept(run('one')); await env.session.retry('one');
  assert.equal(env.session.getResult('a').state.status, 'saved'); assert.equal(env.enqueues.length, 1); assert.equal(env.submits.length, 1);
  env.session.dispose();
});

test('any sign-in prepares all private human games, including restored runs, while omitting guests and AI', async () => {
  const env = setup();
  await env.session.accept(run('one', 'a')); await env.session.accept(run('two', 'b'));
  env.pending.set('three', { ...run('three', 'c'), claimNonce: 'private' });
  env.pending.set('guest', { ...run('guest', 'd'), guestName: 'ABCD' });
  env.pending.set('ai', run('ai', 'e', 'ai'));
  assert.deepEqual(await env.session.prepareSignIn(), { redirectSafe: true, runs: [] });
  assert.deepEqual(env.prepares.sort(), ['one', 'three', 'two']);
  assert.deepEqual(env.enqueues.map(value => value.runId), ['one', 'two']);
  env.session.dispose();
});

test('a delayed restore cannot replace a live result and reports missing durability conservatively', async () => {
  const gate = deferred();
  const env = setup({ listPending: async () => { await gate.promise; return [{ ...run('old'), claimNonce: 'private', createdAt: 1 }]; } });
  const restored = env.session.restore(); await env.session.accept(run('live'));
  gate.resolve(); await restored;
  assert.equal(env.session.getResult('a').run.runId, 'live'); assert.equal(env.enqueues.length, 1);
  assert.deepEqual(await env.session.prepareSignIn(), { redirectSafe: true, runs: [] });
  env.session.dispose();
  const missing = setup({ listPending: async () => { throw Error('unreadable queue'); } });
  assert.deepEqual(await missing.session.restore(), []); assert.deepEqual(await missing.session.prepareSignIn(), { redirectSafe: false, runs: [] });
  assert.equal(missing.errors.length, 2); missing.session.dispose();
});

test('auth retry waits for preparation, so a late queued-auth preparation cannot overwrite saved', async () => {
  const gate = deferred();
  const env = setup({ prepare: async (id, env) => { await gate.promise; return env.emit({ runId: id, status: 'queued-auth' }); } });
  await env.session.accept(run('one')); const prepared = env.session.prepareSignIn();
  await until(() => env.prepares.length === 1); env.signIn(); await tick();
  assert.equal(env.submits.length, 1, 'claim is serialized behind receipt preparation');
  gate.resolve(); await prepared; await until(() => env.session.getResult('a').state.status === 'saved');
  assert.equal(env.submits.length, 2); assert.equal(env.enqueues.length, 1); env.session.dispose();
});

test('dispose unsubscribes once and suppresses pending work, callbacks and subsequent accepts', async () => {
  const gate = deferred();
  const env = setup({ enqueue: async (value, env) => { await gate.promise; return env.emit({ runId: value.runId, status: 'pending' }); } });
  const accepted = env.session.accept(run('one')); await tick();
  const count = env.changes.length; env.session.dispose(); env.session.dispose(); env.signIn();
  gate.resolve(); await accepted; await tick();
  assert.equal(env.changes.length, count); assert.equal(env.submits.length, 0);
  assert.equal(env.clientUnsubs, 1); assert.equal(env.authUnsubs, 1);
  assert.equal(await env.session.accept(run('two')), null); assert.deepEqual(await env.session.prepareSignIn(), { redirectSafe: false, runs: [] });
});

test('preview/ineligible runs are ignored and callback failures cannot interrupt queue persistence', async () => {
  const env = setup();
  assert.equal(await env.session.accept({ ...run('preview'), context: 'gallery-preview', actor: 'ai', submissionEligible: false }), null);
  assert.equal(env.enqueues.length, 0);
  env.session.dispose();
  const callbacks = setup(); callbacks.session.dispose();
  const session = createScoreSession({ client: callbacks.client, auth: callbacks.auth, onChange() { throw Error('render failed'); }, onError() { throw Error('report failed'); } });
  await session.accept(run('one')); assert.equal(callbacks.enqueues.length, 1); assert.equal(session.getResult('a').state.status, 'queued-auth'); session.dispose();
});
