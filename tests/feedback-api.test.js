import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createFeedbackHandler, insertCommentSql } from '../api/feedback.js';

const visitor = 'a2b0f99f-cb79-4885-a319-f017456ba9ca';
const other = 'b2b0f99f-cb79-4885-a319-f017456ba9ca';
const timestamp = '2026-01-01T00:00:00.000Z';
const authenticated = userId => async () => ({ status: 'authenticated', userId, displayName: 'Untrusted name' });

// This mock checks the SQL/parameter contract; it does not prove Postgres concurrency or migrations.
function memoryQuery() {
  const plays = new Map(), votes = new Map(), comments = [], budgets = new Map(), calls = [];
  const query = async (sql, args) => {
    calls.push({sql, args});
    const [id, who, value] = args;
    if (sql === insertCommentSql) {
      const [userId, displayName, game, body] = args;
      const budget = budgets.get(userId) || {minute: 0, day: 0};
      if (budget.minute >= 5 || budget.day >= 50) return [];
      budgets.set(userId, {minute: budget.minute + 1, day: budget.day + 1});
      comments.unshift({game, body, author_clerk_user_id: userId, author_display_name: displayName, created_at: timestamp});
      return [{id: comments.length}];
    }
    if (sql.startsWith('INSERT INTO arcade_plays')) { plays.set(id, (plays.get(id) || 0) + 1); return []; }
    if (sql.startsWith('INSERT INTO arcade_votes')) { votes.set(`${id}:${who}`, value); return []; }
    if (sql.startsWith('DELETE FROM arcade_votes')) { votes.delete(`${id}:${who}`); return []; }
    if (sql.startsWith('SELECT plays FROM')) return plays.has(id) ? [{plays: plays.get(id)}] : [];
    if (sql.startsWith('SELECT COUNT(*)')) {
      const matching = [...votes].filter(([key]) => key.startsWith(`${id}:`));
      return [{upvotes: matching.filter(([,v]) => v === 1).length, downvotes: matching.filter(([,v]) => v === -1).length, user_vote: votes.get(`${id}:${who}`) || 0}];
    }
    if (sql.startsWith('SELECT body,created_at')) {
      assert.match(sql, /removed_at IS NULL/);
      return comments.filter(c => c.game === id && !c.removed_at);
    }
    if (sql.startsWith('SELECT COALESCE(p.game_id')) {
      const ids = new Set([...plays.keys(), ...[...votes.keys()].map(key => key.split(':')[0])]);
      return [...ids].map(game_id => ({game_id, plays: plays.get(game_id) || 0, upvotes: [...votes].filter(([k,v]) => k.startsWith(`${game_id}:`) && v === 1).length, downvotes: [...votes].filter(([k,v]) => k.startsWith(`${game_id}:`) && v === -1).length}));
    }
    throw Error('Unexpected query');
  };
  return {query, comments, budgets, calls};
}
async function call(handler, {method = 'GET', url = '/?gameId=snake', body, who = visitor, headers = {}} = {}) {
  const res = {headers: {}, setHeader(k,v) { this.headers[k] = v; }, end(data) { this.body = JSON.parse(data); }};
  await handler({method, url, body, headers: {'x-arcade-visitor': who, ...headers}}, res);
  return res;
}
const post = (handler, action, fields = {}, options = {}) => call(handler, {method: 'POST', body: {gameId: 'snake', action, ...fields}, ...options});

test('anonymous reads, plays and per-visitor votes remain available; old comments have anonymous authors', async () => {
  const db = memoryQuery();
  db.comments.push({game:'snake', body:'old comment', created_at:timestamp, author_clerk_user_id:null});
  const handler = createFeedbackHandler(db.query);
  await post(handler, 'play'); await post(handler, 'play', {}, {who:other});
  await post(handler, 'vote', {value:1}); await post(handler, 'vote', {value:-1}, {who:other});
  assert.deepEqual((await call(handler)).body, {plays:2, upvotes:1, downvotes:1, userVote:1, comments:[{text:'old comment', createdAt:timestamp, author:{kind:'anonymous', displayName:'Anonymous'}}]});
  assert.equal((await call(handler, {who:other})).body.userVote, -1);
  await post(handler, 'vote', {value:0});
  assert.deepEqual((await call(handler, {url:'/?all=1'})).body, {snake:{plays:2, upvotes:0, downvotes:1}});
});

test('real verifier rejects missing and spoofed identity, including an expired signed token', async () => {
  const db = memoryQuery(), handler = createFeedbackHandler(db.query);
  for (const options of [{}, {headers:{'x-user-id':'user_spoof', 'x-clerk-user-id':'user_spoof'}}]) {
    const res = await post(handler, 'comment', {text:'hello', userId:'user_spoof', displayName:'Spoof'}, options);
    assert.equal(res.statusCode, 401);
  }
  const keys = generateKeyPairSync('rsa', {modulusLength:2048});
  const saved = Object.fromEntries(['CLERK_ISSUER','CLERK_AUTHORIZED_PARTIES','CLERK_JWT_KEY','CLERK_SECRET_KEY'].map(key => [key, process.env[key]]));
  try {
    process.env.CLERK_ISSUER = 'https://clerk.example.com';
    process.env.CLERK_AUTHORIZED_PARTIES = 'https://game.example.com';
    process.env.CLERK_JWT_KEY = keys.publicKey.export({type:'spki', format:'pem'});
    assert.equal((await post(handler, 'comment', {text:'hello'}, {headers:{authorization:'Bearer forged'}})).statusCode, 401);
    const b64 = data => Buffer.from(JSON.stringify(data)).toString('base64url');
    const data = `${b64({alg:'RS256',typ:'JWT'})}.${b64({iss:process.env.CLERK_ISSUER,azp:process.env.CLERK_AUTHORIZED_PARTIES,sid:'sess_1',sub:'user_1',exp:Math.floor(Date.now()/1000)-60})}`;
    const jwt = `${data}.${sign('RSA-SHA256', Buffer.from(data), keys.privateKey).toString('base64url')}`;
    assert.equal((await post(handler, 'comment', {text:'hello'}, {headers:{authorization:`Bearer ${jwt}`}})).statusCode, 401);
  } finally {
    for (const [key,value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
  assert.equal(db.calls.some(c => c.sql === insertCommentSql), false);
});

test('verified accounts write with server identity; text remains data and removed comments are filtered', async () => {
  const db = memoryQuery(), a = createFeedbackHandler(db.query, {verifyIdentity:authenticated('user_a')}), b = createFeedbackHandler(db.query, {verifyIdentity:authenticated('user_b')});
  const malicious = '<img src=x onerror=alert(1)>';
  assert.equal((await post(a, 'comment', {text:`  ${malicious}  `, userId:'spoof', displayName:'Spoof'})).statusCode, 200);
  assert.equal((await post(b, 'comment', {text:'second'})).statusCode, 200);
  assert.deepEqual(db.calls.filter(c => c.sql === insertCommentSql).map(c => c.args), [['user_a','Player','snake',malicious], ['user_b','Player','snake','second']]);
  let comments = (await call(a)).body.comments;
  assert.deepEqual(comments.map(c => c.text), ['second', malicious]);
  assert.deepEqual(comments.map(c => c.author), [{kind:'account',displayName:'Player'}, {kind:'account',displayName:'Player'}]);
  db.comments[0].removed_at = timestamp;
  comments = (await call(a)).body.comments;
  assert.deepEqual(comments.map(c => c.text), [malicious]);
});

test('unavailable identity and expired credentials preserve drafts without inserting', async () => {
  const db = memoryQuery();
  for (const [status, expected] of [['unauthenticated',401], ['unavailable',503]]) {
    const handler = createFeedbackHandler(db.query, {verifyIdentity:async () => ({status})});
    const res = await post(handler, 'comment', {text:'draft'});
    assert.equal(res.statusCode, expected);
    assert.match(res.body.error, /draft is saved/i);
  }
  assert.equal(db.calls.some(c => c.sql === insertCommentSql), false);
});

test('comments count Unicode code points and enforce UTF-8 body bytes for all representations', async () => {
  const db = memoryQuery(), handler = createFeedbackHandler(db.query, {verifyIdentity:authenticated('user_a')});
  assert.equal((await post(handler, 'comment', {text:'😀'.repeat(280)})).statusCode, 200);
  assert.equal((await post(handler, 'comment', {text:'😀'.repeat(281)})).statusCode, 400);
  const body = {gameId:'snake', action:'play', extra:'é'.repeat(1050)};
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 2048);
  assert.equal((await call(handler, {method:'POST', body})).statusCode, 413);
  assert.equal((await call(handler, {method:'POST', body:JSON.stringify(body)})).statusCode, 413);
  assert.equal((await post(handler, 'play', {}, {headers:{'content-length':'2049'}})).statusCode, 413);
  const circular = {gameId:'snake', action:'play'}; circular.self = circular;
  assert.equal((await call(handler, {method:'POST', body:circular})).statusCode, 400);
});

test('database budget exhaustion returns 429 for minute and day limits', async () => {
  const db = memoryQuery(), handler = createFeedbackHandler(db.query, {verifyIdentity:authenticated('user_a')});
  assert.match(insertCommentSql, /minute_count < 5/);
  assert.match(insertCommentSql, /day_count < 50/);
  for (let i=0; i<5; i++) assert.equal((await post(handler, 'comment', {text:`comment ${i}`})).statusCode, 200);
  let res = await post(handler, 'comment', {text:'sixth'});
  assert.equal(res.statusCode, 429); assert.equal(res.body.code, 'comment_rate_limited'); assert.equal(res.headers['Retry-After'], '60');
  db.budgets.set('user_a', {minute:0, day:50});
  res = await post(handler, 'comment', {text:'day exhausted'});
  assert.equal(res.statusCode, 429);
});

test('invalid requests and storage errors return safe responses and log only stable codes', async () => {
  const db = memoryQuery(), handler = createFeedbackHandler(db.query);
  assert.equal((await call(handler, {who:'bad'})).statusCode, 400);
  assert.equal((await call(handler, {url:'/?gameId=../bad'})).statusCode, 400);
  assert.equal((await post(handler, 'vote', {value:7})).statusCode, 400);
  assert.equal((await call(createFeedbackHandler(null))).statusCode, 503);
  const logged = [];
  const broken = createFeedbackHandler(async () => {throw Error('secret token and comment');}, {onError: (...args) => logged.push(args)});
  const res = await call(broken);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(logged, [['feedback_unavailable']]);
  assert.doesNotMatch(JSON.stringify(res.body), /secret|token|comment/);
});
