import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRecoveryStep, mountScoreRecovery } from '../src/ui/score-recovery.js';
class Element {
  constructor(doc) { this.ownerDocument = doc; this.children = []; this.handlers = {}; this.attributes = {}; this.value = ''; }
  append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
  remove() { this.parent.children = this.parent.children.filter(n => n !== this); }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(k, f) { this.handlers[k] = f; }
  click() { return this.handlers.click?.(); }
}
function root() { const doc = { createElement: () => new Element(doc) }; return new Element(doc); }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const recovery = { schemaVersion: 1, runId: 'r1', claimToken: 'SECRET', expiresAt: '2030-01-01' };
function auth(initial = 'signed-out') {
  let listener, state = { status: initial };
  return { getState: () => state, subscribe(fn) { listener = fn; fn(state); return () => {}; }, emit(status) { state = { status }; listener(state); } };
}
test('recovery is obtained only on click and private fallback stays out of status', async () => {
  const el = root(), calls = [];
  const pending = prepareRecoveryStep(el, { client: { getRecovery: async id => { calls.push(id); return recovery; } }, runs: [{ runId: 'r1', gameId: 'g', score: 5 }], navigator: {} });
  const panel = el.children[0], status = panel.children[0], row = panel.children[1], proceed = panel.children[2];
  assert.deepEqual(calls, []);
  assert.equal(proceed.disabled, true);
  await row.children[1].click();
  assert.deepEqual(calls, ['r1']);
  assert.equal(JSON.parse(row.children[2].value).claimToken, 'SECRET');
  assert.equal(status.textContent.includes('SECRET'), false);
  assert.equal(proceed.disabled, true);
  row.children[3].click();
  assert.equal(proceed.textContent, 'Continue');
  proceed.click(); assert.equal(await pending, true);
});
test('every run needs an attempt and only retrieval failures permit bypass', async () => {
  const el = root();
  const pending = prepareRecoveryStep(el, { client: { getRecovery: async id => { if (id === 'r1') throw new Error('offline'); return null; } }, runs: [{ runId: 'r1', gameId: 'a', score: 1 }, { runId: 'r2', gameId: 'b', score: 2 }] });
  const panel = el.children[0], proceed = panel.children[3];
  await panel.children[1].children[1].click();
  assert.equal(proceed.disabled, true);
  await panel.children[2].children[1].click();
  assert.equal(proceed.disabled, false);
  assert.equal(proceed.textContent, 'Continue without recovery');
  proceed.click(); assert.equal(await pending, true);
});
test('abort ignores a late retrieval and resolves false', async () => {
  const el = root(), d = deferred(), abort = new AbortController();
  const pending = prepareRecoveryStep(el, { client: { getRecovery: () => d.promise }, runs: [{ runId: 'r1', gameId: 'g', score: 1 }], signal: abort.signal });
  const row = el.children[0].children[1], clicked = row.children[1].click();
  abort.abort(); d.resolve(recovery); await clicked;
  assert.equal(await pending, false); assert.equal(row.children[2].value, ''); assert.equal(el.children.length, 0);
});
test('claim requires explicit action and only saved acknowledgement clears private input', async () => {
  const el = root(), account = auth(), calls = [], signIns = [];
  const controller = mountScoreRecovery(el, { auth: account, client: { claimReceipt: async value => { calls.push(value); return { status: calls.length === 1 ? 'retry' : 'saved' }; } }, onSignIn: () => signIns.push(true) });
  const [, input, status, signIn, claim, helper] = el.children[0].children;
  assert.equal(input.hidden, true);
  assert.equal(helper.textContent, 'Sign in, then paste your private recovery code.');
  signIn.click();
  assert.equal(signIns.length, 1); assert.equal(calls.length, 0);
  account.emit('signed-in'); assert.equal(input.hidden, false); assert.equal(helper.hidden, true);
  input.value = JSON.stringify(recovery); await claim.click();
  assert.match(status.textContent, /not recovered/); assert.equal(input.value.includes('SECRET'), true);
  await claim.click(); assert.equal(status.textContent, 'Score recovered.'); assert.equal(input.value, '');
  controller.dispose();
});
test('disposed claim cannot clear input or announce a late saved result', async () => {
  const el = root(), d = deferred(), account = auth('signed-in'), recovered = [];
  const controller = mountScoreRecovery(el, { auth: account, client: { claimReceipt: () => d.promise }, onRecovered: r => recovered.push(r) });
  const [, input, status, , claim] = el.children[0].children;
  input.value = JSON.stringify(recovery); const pending = claim.click(); controller.dispose(); d.resolve({ status: 'saved' }); await pending;
  assert.equal(input.value.includes('SECRET'), true); assert.equal(status.textContent, 'Recovering score…'); assert.deepEqual(recovered, []);
});
test('a saved claim preserves a newer pasted code and isolates callback errors', async () => {
  const el = root(), d = deferred(), account = auth('signed-in');
  mountScoreRecovery(el, { auth: account, client: { claimReceipt: () => d.promise }, onRecovered: () => { throw new Error('callback'); } });
  const [, input, status, , claim] = el.children[0].children;
  input.value = JSON.stringify(recovery); const pending = claim.click();
  input.value = 'new code'; d.resolve({ status: 'saved' }); await pending;
  assert.equal(input.value, 'new code'); assert.equal(status.textContent, 'Score recovered.');
});
test('asynchronous sign-in failure reports generic status', async () => {
  const el = root(), account = auth();
  mountScoreRecovery(el, { auth: account, client: {}, onSignIn: () => Promise.reject(new Error('private')) });
  const [, , status, signIn] = el.children[0].children;
  signIn.click(); await Promise.resolve(); await Promise.resolve();
  assert.equal(status.textContent, 'Sign-in unavailable. Try again.');
});
