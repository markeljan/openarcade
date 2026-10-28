import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLaunch, siteOrigin} from '../scripts/check-launch.mjs';

const origin = 'https://arcade.example';
function fixture(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url: String(url), options});
    const path = new URL(url).pathname;
    if (overrides[path]) return overrides[path](url);
    if (path === '/games/snake') return new Response(`<link href="${origin}/games/snake" rel="canonical"><meta content='${origin}/social/snake.png' property='og:image'>`, {headers: {'content-type': 'text/html'}});
    if (path === '/social/snake.png') return new Response(new Uint8Array([1, 2, 3]), {headers: {'content-type': 'image/png'}});
    if (path === '/__openarcade_launch_missing__') return new Response('missing', {status: 404});
    if (path === '/api/feedback') return Response.json({plays: 0, comments: []});
    return new Response('<title>OpenArcade</title>', {headers: {'content-type': 'text/html'}});
  };
  return {calls, fetchImpl};
}

test('launch probe performs only anonymous GETs and validates metadata/assets/API', async () => {
  const {calls, fetchImpl} = fixture();
  const results = await checkLaunch(origin, {fetchImpl});
  assert.equal(results.length, 6);
  assert.ok(results.every(result => result.ok), JSON.stringify(results));
  assert.equal(calls.length, 6);
  for (const {url, options} of calls) {
    assert.ok(url.startsWith(origin));
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
  }
});

test('launch probe catches Vercel protection, false 404s and image HTML fallbacks', async () => {
  const {fetchImpl} = fixture({
    '/': () => new Response(null, {status: 302, headers: {location: 'https://vercel.com/login?secret=not-printed'}}),
    '/social/snake.png': () => new Response('<html>fallback</html>', {headers: {'content-type': 'text/html'}}),
    '/__openarcade_launch_missing__': () => new Response('SPA fallback'),
    '/api/feedback': () => Response.json({error: 'unavailable'}, {status: 503}),
  });
  const results = await checkLaunch(origin, {fetchImpl});
  assert.deepEqual(results.filter(result => !result.ok).map(result => result.name), ['homepage', 'game social image', 'unknown route 404', 'feedback read']);
  assert.ok(!JSON.stringify(results).includes('not-printed'));
});

test('metadata must be in initial HTML and must not fetch arbitrary external images', async () => {
  const {calls, fetchImpl} = fixture({'/games/snake': () => new Response(`<link rel="canonical" href="${origin}/games/snake"><meta property="og:image" content="https://other.example/image.png">`, {headers: {'content-type': 'text/html'}})});
  const results = await checkLaunch(origin, {fetchImpl});
  assert.ok(results.find(result => result.name === 'game initial metadata').ok === false);
  assert.ok(calls.every(call => call.url.startsWith(origin)));
});

test('probe rejects credentials, query strings, paths and insecure public origins', () => {
  for (const value of ['https://user:password@arcade.example', `${origin}?token=private`, `${origin}/some-path`, 'http://arcade.example']) assert.throws(() => siteOrigin(value));
  assert.equal(siteOrigin('http://localhost:3000'), 'http://localhost:3000');
});

test('probe accepts content-versioned social assets and rejects other image queries', async () => {
  for (const [query, expected] of [['?v=' + 'a'.repeat(64), true], ['?token=private', false]]) {
    const {calls, fetchImpl} = fixture({'/games/snake': () => new Response(`<link rel="canonical" href="${origin}/games/snake"><meta property="og:image" content="${origin}/social/snake.png${query}">`, {headers: {'content-type': 'text/html'}})});
    const results = await checkLaunch(origin, {fetchImpl});
    assert.equal(results.find(result => result.name === 'game initial metadata').ok, expected);
    assert.equal(results.find(result => result.name === 'game social image').ok, expected);
    assert.equal(calls.some(call => call.url.includes('/social/snake.png' + query)), expected);
  }
});
