import test from 'node:test';
import assert from 'node:assert/strict';
import { mountAuthControls } from '../src/ui/auth-controls.js';

class Element {
  constructor(doc) { this.ownerDocument = doc; this.children = []; this.handlers = {}; this.attributes = {}; }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  removeEventListener(name) { delete this.handlers[name]; }
  click() { return this.handlers.click?.(); }
}
function setup(initial = { status: 'signed-out', user: null }, overrides = {}) {
  const doc = { createElement: () => new Element(doc) }, root = new Element(doc);
  let state = initial, listener, unsubscribed = false;
  const auth = {
    getState: () => state,
    subscribe(fn) { listener = fn; fn(state); return () => { unsubscribed = true; }; },
    signIn: async () => {}, signOut: async () => {}, ...overrides
  };
  const mount = options => {
    const controller = mountAuthControls(root, { auth, ...options });
    const [label, button] = root.children[0].children;
    return { controller, label, button };
  };
  return { root, mount, emit(next) { state = next; listener(next); }, get unsubscribed() { return unsubscribed; } };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('renders authoritative auth state, including untrusted display name as text', () => {
  const env = setup({ status: 'loading', user: null });
  const { label, button } = env.mount();
  assert.equal(button.hidden, true);
  assert.equal(label.attributes.role, 'status');
  env.emit({ status: 'signed-in', user: { id: '1', displayName: '<img onerror=alert(1)>' } });
  assert.equal(label.textContent, 'Signed in as <img onerror=alert(1)>');
  assert.equal(button.textContent, 'Sign out');
  env.emit({ status: 'unavailable', user: null });
  assert.equal(button.hidden, true);
  assert.equal(label.textContent, 'Sign-in unavailable');
});

test('pre-sign-in and sign-in run synchronously in order; resolution does not imply authentication', async () => {
  const pending = deferred(), calls = [];
  const env = setup(undefined, { signIn: () => { calls.push('signIn'); return pending.promise; } });
  const { label, button } = env.mount({ onBeforeSignIn: () => calls.push('before') });
  const result = button.click();
  assert.deepEqual(calls, ['before', 'signIn']);
  assert.equal(button.disabled, true);
  pending.resolve();
  await result;
  assert.equal(label.textContent, 'Signed out');
  assert.equal(button.disabled, false);
});

test('reports sign-in and sign-out failures and keeps state authoritative', async () => {
  const failure = new Error('failed'), errors = [];
  const env = setup(undefined, { signIn: () => Promise.reject(failure), signOut: () => { throw failure; } });
  const { label, button } = env.mount({ onError: error => errors.push(error) });
  await button.click();
  assert.equal(label.textContent, 'Could not sign in. Please try again.');
  env.emit({ status: 'signed-in', user: { id: '1', displayName: 'Ada' } });
  await button.click();
  assert.equal(label.textContent, 'Could not sign out. Please try again.');
  assert.deepEqual(errors, [failure, failure]);
});

test('disposal unsubscribes and suppresses pending failures and stale updates', async () => {
  const pending = deferred(), errors = [];
  const env = setup(undefined, { signIn: () => pending.promise });
  const { controller, label, button } = env.mount({ onError: error => errors.push(error) });
  const result = button.click();
  controller.dispose();
  controller.dispose();
  env.emit({ status: 'signed-in', user: { id: '1', displayName: 'Ada' } });
  pending.reject(new Error('late'));
  await result;
  assert.equal(label.textContent, 'Signed out');
  assert.deepEqual(errors, []);
  assert.equal(env.unsubscribed, true);
  assert.equal(env.root.children.length, 0);
});

test('a newer signed-in state is not overwritten by an old sign-in rejection', async () => {
  const pending = deferred(), errors = [];
  const env = setup(undefined, { signIn: () => pending.promise });
  const { label, button } = env.mount({ onError: error => errors.push(error) });
  const result = button.click();
  env.emit({ status: 'signed-in', user: { id: '1', displayName: 'Ada' } });
  pending.reject(new Error('stale'));
  await result;
  assert.equal(label.textContent, 'Signed in as Ada');
  assert.equal(button.disabled, false);
  assert.deepEqual(errors, []);
});
