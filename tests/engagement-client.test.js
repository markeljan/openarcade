import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommentDraftStore, createEngagementClient } from '../src/engagement.js';

const visitor = '12345678-1234-4234-8234-123456789abc';
function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function fixture({ getToken = async () => 'fresh-token', getAuthState = () => ({ status: 'signed-out' }), fetch: fetchOverride, draftStorage = memoryStorage() } = {}) {
  const calls = [];
  const local = memoryStorage();
  const drafts = createCommentDraftStore({ storage: () => draftStorage });
  const fetch = fetchOverride ?? (async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; });
  const client = createEngagementClient({ fetch, getToken, getAuthState, drafts, storage: () => local, randomUUID: () => visitor });
  return { client, calls, local, drafts, draftStorage };
}

test('anonymous reads, plays and votes use a stable visitor without authentication', async () => {
  const f = fixture({ getToken: () => { throw Error('unexpected token request'); } });
  await f.client.getEngagement('snake');
  await f.client.getAllEngagement();
  await f.client.recordPlay('snake');
  await f.client.setVote('snake', 1);
  assert.equal(f.calls[1].url, '/api/feedback?all=1');
  assert.deepEqual(JSON.parse(f.calls[3].options.body), { gameId: 'snake', action: 'vote', value: 1 });
  assert.ok(f.calls.every(c => c.options.headers['X-Arcade-Visitor'] === visitor && !('Authorization' in c.options.headers)));
  assert.equal(f.local.getItem('openarcade:visitor'), visitor);
});

test('comments request fresh bearer tokens and send only game, action and text', async () => {
  let count = 0;
  const f = fixture({ getToken: async () => `token-${++count}` });
  await f.client.addComment('snake', ' Nice ');
  await f.client.addComment('snake', 'Again');
  assert.equal(f.calls[0].options.headers.Authorization, 'Bearer token-1');
  assert.equal(f.calls[1].options.headers.Authorization, 'Bearer token-2');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { gameId: 'snake', action: 'comment', text: 'Nice' });
  assert.equal(f.drafts.get('snake'), '');
  assert.ok(!JSON.stringify([...f.local.data, ...f.draftStorage.data]).includes('token-'));
});

test('signed-out and token failure preserve raw draft without contacting feedback', async () => {
  for (const [getToken, status, code] of [[async () => null, 401, 'sign_in_required'], [async () => { throw Error('offline'); }, 503, 'auth_unavailable']]) {
    const f = fixture({ getToken });
    await assert.rejects(f.client.addComment('snake', '  hello  '), error => error.status === status && error.code === code);
    assert.equal(f.calls.length, 0);
    assert.equal(f.drafts.get('snake'), '  hello  ');
  }
});

test('null token while signed in, unavailable or loading reports unavailable', async () => {
  for (const status of ['signed-in', 'unavailable', 'loading']) {
    const f = fixture({ getToken: async () => null, getAuthState: () => ({ status }) });
    await assert.rejects(f.client.addComment('snake', 'draft'), error => error.status === 503 && error.code === 'auth_unavailable');
    assert.equal(f.calls.length, 0);
    assert.equal(f.drafts.get('snake'), 'draft');
  }
});

test('expired response retains draft and retry clears it only after acknowledgement', async () => {
  let count = 0;
  const f = fixture({ fetch: async () => ++count === 1 ? { ok: false, status: 401, json: async () => ({ code: 'session_expired', error: 'Expired' }) } : { ok: true, status: 200, json: async () => ({ ok: true }) } });
  await assert.rejects(f.client.addComment('snake', 'retry me'), error => error.status === 401 && error.code === 'session_expired');
  assert.equal(f.drafts.get('snake'), 'retry me');
  await f.client.addComment('snake', f.drafts.get('snake'));
  assert.equal(f.drafts.get('snake'), '');
});

test('acknowledgement does not clear edits made while request is in flight', async () => {
  let reply;
  const f = fixture({ fetch: () => new Promise(resolve => { reply = resolve; }) });
  const submission = f.client.addComment('snake', 'first');
  await Promise.resolve();
  f.drafts.save('snake', 'edited');
  reply({ ok: true, status: 200, json: async () => ({ ok: true }) });
  await submission;
  assert.equal(f.drafts.get('snake'), 'edited');
});

test('drafts survive store recreation per game and fall back to memory when storage is blocked', () => {
  const storage = memoryStorage();
  const first = createCommentDraftStore({ storage: () => storage });
  first.save('snake', 'snake draft'); first.save('tetris', 'tetris draft');
  const restored = createCommentDraftStore({ storage: () => storage });
  assert.equal(restored.get('snake'), 'snake draft');
  assert.equal(restored.get('tetris'), 'tetris draft');
  assert.equal(restored.clear('snake', 'different'), false);
  assert.equal(restored.get('snake'), 'snake draft');
  const blocked = createCommentDraftStore({ storage: () => { throw Error('blocked'); } });
  blocked.save('snake', 'memory draft');
  assert.equal(blocked.get('snake'), 'memory draft');
  assert.equal(blocked.clear('snake', 'memory draft'), true);
  assert.equal(blocked.get('snake'), '');
});

test('comment length counts Unicode code points, and invalid text sends nothing', async () => {
  const f = fixture();
  await f.client.addComment('snake', '🎮'.repeat(280));
  for (const value of ['🎮'.repeat(281), '   ']) {
    await assert.rejects(f.client.addComment('snake', value), error => error.status === 400 && error.code === 'invalid_comment');
  }
  assert.equal(f.calls.length, 1);
});

test('raw whitespace around a valid maximum-length comment survives failure and clears on retry', async () => {
  let count = 0;
  const f = fixture({ fetch: async () => ++count === 1 ? { ok: false, status: 401, json: async () => ({ code: 'session_expired' }) } : { ok: true, status: 200, json: async () => ({ ok: true }) } });
  const raw = ` ${'🎮'.repeat(280)} `;
  await assert.rejects(f.client.addComment('snake', raw));
  assert.equal(f.drafts.get('snake'), raw);
  const recovered = createCommentDraftStore({ storage: () => f.draftStorage });
  assert.equal(recovered.get('snake'), raw);
  await f.client.addComment('snake', raw);
  assert.equal(f.drafts.get('snake'), '');
});

test('network and server failures remain visible', async () => {
  const offline = fixture({ fetch: async () => { throw Error('offline'); } });
  await assert.rejects(offline.client.getEngagement('snake'), /unavailable/i);
  const server = fixture({ fetch: async () => ({ ok: false, status: 503, json: async () => ({ error: 'Feedback is not configured yet.' }) }) });
  await assert.rejects(server.client.recordPlay('snake'), /not configured/i);
});
