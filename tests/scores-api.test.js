import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoresHandler, requestAddress} from '../server/scores-handler.js';
import {createScoreRegistry} from '../src/scores/registry.js';
const id = 'a2b0f99f-cb79-4885-a319-f017456ba9ca';
const run = {schemaVersion: 1, runId: id, gameId: 'fixture', ruleVersion: 1, score: 3, result: 'COLLISION', durationMs: 5000, actor: 'human', context: 'manual-player', provenance: 'client-reported', submissionEligible: true};
const rule = {schemaVersion: 1, gameId: 'fixture', source: 'fixture.js', metric: 'items', units: 'items', order: 'desc', version: 1, status: 'complete', bounds: {minScore: -5, maxScore: 10, integer: true, minDurationMs: 100, maxDurationMs: 60000}};
const evidence = {schemaVersion: 1, gameId: 'fixture', source: 'fixture.js', ruleVersion: 1, status: 'complete', human: {terminal: 'collision', provenance: 'fresh', tests: ['fixture.test.js']}, ai: {terminal: 'collision', provenance: 'same', tests: ['fixture.test.js']}};
const registry = createScoreRegistry([rule], [evidence]);
function setup(extra = {}) {
  const submissions = [], claims = [], limits = [];
  const store = {
    async submit(data) { submissions.push(data); return {status: 'accepted', runId: data.runId, expiresAt: '2026-11-04T00:00:00Z'}; },
    async claim(data) { claims.push(data); return {status: 'accepted', runId: data.runId}; },
    async rateLimit(data) { limits.push(data); return {allowed: true}; },
    async leaderboard() { return {entries: [], personalBest: null, epoch: 1, threshold: null}; },
  };
  const handler = createScoresHandler({store, registry, catalogIds: ['fixture'], allowedOrigins: ['https://arcade.example'], receiptSecret: 'test-only-secret'.repeat(4), writesEnabled: true, clientAddress: () => '127.0.0.1', verifyIdentity: async req => req.headers.authorization === 'Bearer verified' ? {status: 'authenticated', userId: 'user_real', displayName: 'Player'} : {status: 'unauthenticated'}, ...extra});
  return {handler, store, submissions, claims, limits};
}
async function call(handler, {method = 'POST', body = {action: 'pending', run, claimNonce: 'a'.repeat(43)}, headers = {}, url = '/api/scores?gameId=fixture'} = {}) {
  const res = {headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(text) { this.body = JSON.parse(text); }};
  await handler({method, body, url, headers: {origin: 'https://arcade.example', 'content-type': 'application/json', ...headers}, socket: {remoteAddress: '127.0.0.1'}}, res);
  return res;
}
test('pending retries reproduce private capability but a different nonce cannot recover it', async () => {
  const {handler, submissions} = setup();
  const first = await call(handler), retry = await call(handler);
  assert.equal(first.statusCode, 200); assert.equal(first.body.claimToken, retry.body.claimToken);
  assert.equal(submissions[0].claimHash.length, 64); assert.notEqual(submissions[0].claimHash, first.body.claimToken);
  const other = await call(handler, {body: {action: 'pending', run, claimNonce: 'b'.repeat(43)}});
  assert.notEqual(other.body.claimToken, first.body.claimToken); assert.notEqual(submissions[2].fingerprint, submissions[0].fingerprint);
});
test('authenticated owner comes only from verified helper; body identity spoof fields rejected', async () => {
  const {handler, submissions} = setup();
  assert.equal((await call(handler, {body: {action: 'submit', run, userId: 'victim'}, headers: {authorization: 'Bearer verified'}})).statusCode, 400);
  assert.equal((await call(handler, {body: {action: 'submit', run}, headers: {authorization: 'Bearer forged'}})).statusCode, 401);
  assert.equal((await call(handler, {body: {action: 'submit', run}, headers: {authorization: 'Bearer verified'}})).statusCode, 200);
  assert.equal(submissions.length, 1); assert.equal(submissions[0].userId, 'user_real');
});
test('unknown catalog, pending rules, invalid actor/context/version/bounds rejected', async () => {
  const {handler, submissions} = setup();
  for (const patch of [{score: Infinity}, {score: '3'}, {score: 100}, {score: 1.5}, {durationMs: 0}, {durationMs: 70000}, {actor: 'ai'}, {context: 'gallery-preview'}, {ruleVersion: 2}, {provenance: 'verified'}, {submissionEligible: false}, {runId: 'bad'}]) {
    assert.equal((await call(handler, {body: {action: 'pending', run: {...run, ...patch}, claimNonce: 'a'.repeat(43)}})).statusCode, 400);
  }
  assert.equal((await call(handler, {body: {action: 'pending', run: {...run, gameId: 'missing'}, claimNonce: 'a'.repeat(43)}})).body.error, 'unknown-game');
  assert.equal((await call(setup({registry: createScoreRegistry()}).handler)).statusCode, 409);
  assert.equal(submissions.length, 0);
});
test('negative values accepted within game-specific bounds', async () => {
  const {handler, submissions} = setup(); await call(handler, {body: {action: 'pending', run: {...run, score: -3}, claimNonce: 'a'.repeat(43)}});
  assert.equal(submissions[0].score, -3);
});
test('body size measured for string and already-parsed object; origins and write policy enforced', async () => {
  const {handler, submissions} = setup();
  for (const body of [{padding: 'x'.repeat(8193)}, JSON.stringify({padding: 'x'.repeat(8193)})]) assert.equal((await call(handler, {body})).statusCode, 413);
  assert.equal((await call(handler, {headers: {origin: 'https://arcade.example.attacker'}})).statusCode, 403);
  assert.equal((await call(handler, {headers: {'content-type': 'text/plain'}})).statusCode, 415);
  assert.equal((await call(setup({writesEnabled: false}).handler)).body.error, 'score-writes-disabled');
  assert.equal(submissions.length, 0);
});
test('separate guest embed validates four uppercase slots and has no account ownership', async () => {
  const {handler, submissions} = setup(); const guest = {action: 'guest', run: {...run, context: 'embed'}, guestName: 'ABCD', attribution: 'x'};
  assert.equal((await call(handler, {body: guest})).statusCode, 200);
  assert.equal(submissions[0].userId, null); assert.equal(submissions[0].displayName, 'ABCD'); assert.equal(submissions[0].details.attribution, 'x');
  for (const name of ['abcD', 'ABC', 'ABCDE', '1234', ['ABCD'], {value: 'ABCD'}, null, 1234]) assert.equal((await call(handler, {body: {...guest, guestName: name}})).statusCode, 400);
  assert.equal((await call(handler, {body: {...guest, run}})).statusCode, 400);
});
test('claim requires verified account/capability and maps duplicate owner/expiry rejection', async () => {
  const {handler, store, claims} = setup(); const body = {action: 'claim', runId: id, claimToken: 'a'.repeat(43)};
  assert.equal((await call(handler, {body})).statusCode, 401);
  assert.equal((await call(handler, {body, headers: {authorization: 'Bearer verified'}})).statusCode, 200);
  assert.equal(claims[0].userId, 'user_real');
  store.claim = async () => ({status: 'forbidden'});
  assert.equal((await call(handler, {body, headers: {authorization: 'Bearer verified'}})).statusCode, 403);
  store.claim = async () => ({status: 'expired'});
  assert.equal((await call(handler, {body, headers: {authorization: 'Bearer verified'}})).statusCode, 410);
});
test('durable limiter failures precede mutation; exception messages stay private', async () => {
  const {handler, store, submissions, limits} = setup();
  store.rateLimit = async data => { limits.push(data); return {allowed: false, retryAfter: 20}; };
  const limited = await call(handler); assert.equal(limited.statusCode, 429); assert.equal(limited.headers['Retry-After'], '20'); assert.equal(submissions.length, 0);
  assert.equal(limits[0].scope.includes('127.0.0.1'), false);
  store.rateLimit = async () => { throw Error('postgres://secret'); };
  assert.deepEqual((await call(handler)).body, {error: 'scores-unavailable'});
});
test('reads default Players; optional verified identity and ascending rule reach store', async () => {
  const {handler, store} = setup(); let args;
  store.leaderboard = async input => { args = input; return {entries: [], personalBest: null, epoch: 1, threshold: null}; };
  const response = await call(handler, {method: 'GET'}); assert.equal(response.body.filter, 'players'); assert.equal(args.userId, null);
  await call(handler, {method: 'GET', headers: {authorization: 'Bearer verified'}}); assert.equal(args.userId, 'user_real');
  assert.equal((await call(handler, {method: 'GET', url: '/?gameId=fixture&filter=other'})).statusCode, 400);
});
test('local forwarded IP spoofing cannot select limiter key', () => {
  const req = {headers: {'x-vercel-forwarded-for': '1.2.3.4'}, socket: {remoteAddress: '127.0.0.1'}};
  assert.equal(requestAddress(req), '127.0.0.1'); assert.equal(requestAddress(req, true), '1.2.3.4');
});
test('UUID and private capabilities require strings without regex coercion', async () => {
  const {handler, submissions, claims} = setup();
  for (const value of [['a'.repeat(43)], {value: 'a'.repeat(43)}, null, 123]) {
    assert.equal((await call(handler, {body: {action: 'pending', run, claimNonce: value}})).statusCode, 400);
    assert.equal((await call(handler, {body: {action: 'claim', runId: id, claimToken: value}, headers: {authorization: 'Bearer verified'}})).statusCode, 400);
  }
  assert.equal((await call(handler, {body: {action: 'pending', run: {...run, runId: [id]}, claimNonce: 'a'.repeat(43)}})).statusCode, 400);
  assert.equal((await call(handler, {body: {action: 'claim', runId: [id], claimToken: 'a'.repeat(43)}, headers: {authorization: 'Bearer verified'}})).statusCode, 400);
  assert.equal(submissions.length, 0); assert.equal(claims.length, 0);
});
