import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../src/auth.js';

function fixture() {
  let instance;
  class Clerk {
    constructor(key) { this.key = key; this.user = null; this.session = null; instance = this; }
    async load(options) { this.loadOptions = options; }
    addListener(listener) { this.listener = listener; return () => {}; }
    emit(user, session) { this.user = user; this.session = session; this.listener({ user, session }); }
    openSignIn(options) { this.signInOptions = options; }
    mountSignIn(node, options) { this.mounted = { node, options }; }
    unmountSignIn(node) { this.unmounted ??= []; this.unmounted.push(node); }
    async signOut() { this.emit(null, null); }
  }
  const client = createAuthClient({ publishableKey: 'test', loadSdk: async () => ({ Clerk }), loadUI: async () => 'ui', location: { href: 'https://arcade.test/play?game=asteroids#scores' } });
  return { client, get clerk() { return instance; } };
}

test('missing configuration does not load SDK and reports unavailable', async () => {
  const client = createAuthClient({ publishableKey: '', loadSdk: () => { throw new Error('should not load'); } });
  await client.ready;
  assert.deepEqual(client.getState(), { status: 'unavailable', user: null });
  assert.equal(await client.getToken(), null);
  await assert.rejects(client.signIn(), /Sign-in is unavailable/);
});

test('subscribers observe account changes, safe names and sign out', async () => {
  const f = fixture();
  const seen = [];
  const unsubscribe = f.client.subscribe((state) => seen.push(state));
  await f.client.ready;
  assert.deepEqual(f.clerk.loadOptions, { ui: { ClerkUI: 'ui' } });
  const session = { getToken: async () => 'token' };
  f.clerk.emit({ id: 'one', fullName: 'Ada' }, session);
  f.clerk.emit({ id: 'two', fullName: 'name@example.com', username: 'name@example.com' }, session);
  assert.deepEqual(f.client.getState(), { status: 'signed-in', user: { id: 'two', displayName: 'Player' } });
  await f.client.signOut();
  unsubscribe();
  f.clerk.emit({ id: 'three', username: 'Sam' }, session);
  assert.deepEqual(seen.map((s) => s.status), ['loading', 'signed-out', 'signed-in', 'signed-in', 'signed-out']);
});

test('requests fresh tokens and rejects a token from a replaced session', async () => {
  const f = fixture();
  await f.client.ready;
  let resolve;
  const session = { getToken: (options) => { assert.deepEqual(options, { skipCache: true }); return new Promise((r) => { resolve = r; }); } };
  f.clerk.emit({ id: 'one', username: 'A' }, session);
  const token = f.client.getToken();
  await Promise.resolve();
  f.clerk.emit({ id: 'two', username: 'B' }, { getToken: async () => 'new' });
  resolve('old');
  assert.equal(await token, null);
  assert.equal(await f.client.getToken(), 'new');
  f.clerk.emit(null, null);
  assert.equal(await f.client.getToken(), null);
});

test('modal preserves current URL for sign in and sign up', async () => {
  const f = fixture();
  await f.client.signIn();
  assert.deepEqual(f.clerk.signInOptions, { forceRedirectUrl: 'https://arcade.test/play?game=asteroids#scores', signUpForceRedirectUrl: 'https://arcade.test/play?game=asteroids#scores' });
});

test('embedded sign in requests an OAuth popup, preserves return URL and disposes once', async () => {
  const f = fixture();
  const node = { nodeType: 1, tagName: 'DIV' };
  const dispose = await f.client.mountSignIn(node);
  assert.deepEqual(f.clerk.mounted, { node, options: { routing: 'hash', oauthFlow: 'popup', forceRedirectUrl: 'https://arcade.test/play?game=asteroids#scores', signUpForceRedirectUrl: 'https://arcade.test/play?game=asteroids#scores' } });
  f.clerk.emit({ id: 'one', fullName: 'Ada' }, { getToken: async () => 'token' });
  assert.equal(f.client.getState().status, 'signed-in');
  dispose(); dispose();
  assert.deepEqual(f.clerk.unmounted, [node]);
  f.clerk.mounted = null;
  const noop = await f.client.mountSignIn(node);
  noop();
  assert.equal(f.clerk.mounted, null);
  assert.deepEqual(f.clerk.unmounted, [node]);
  await assert.rejects(f.client.mountSignIn({}), /div element/);
});

test('display names strip controls and are limited to 60 characters', async () => {
  const f = fixture();
  await f.client.ready;
  f.clerk.emit({ id: 'one', fullName: `A\u0000${'b'.repeat(80)}\n` }, {});
  assert.equal(f.client.getState().user.displayName, `A${'b'.repeat(59)}`);
});

test('SDK and token failures do not escape into gameplay', async () => {
  const client = createAuthClient({ publishableKey: 'test', loadSdk: async () => { throw new Error('offline'); }, loadUI: async () => 'ui' });
  await client.ready;
  assert.equal(client.getState().status, 'unavailable');
  await assert.rejects(client.signIn(), /Sign-in is unavailable/);
  const f = fixture();
  await f.client.ready;
  f.clerk.emit({ id: 'one' }, { getToken: async () => { throw new Error('offline'); } });
  assert.equal(await f.client.getToken(), null);
});

test('initialization can retry a temporary Clerk loading failure', async () => {
  let attempts = 0;
  class Clerk {
    user = null;
    session = null;
    async load() {}
    addListener() {}
  }
  const client = createAuthClient({publishableKey: 'test', loadUI: async () => 'ui', loadSdk: async () => {
    if (++attempts === 1) throw new Error('offline');
    return {Clerk};
  }});
  await client.ready;
  assert.equal(client.getState().status, 'unavailable');
  await client.initialize();
  assert.equal(client.getState().status, 'signed-out');
  assert.equal(attempts, 2);
});
