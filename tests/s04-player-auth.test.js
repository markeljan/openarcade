import test from 'node:test';
import assert from 'node:assert/strict';
import { mountPlayerAuth } from '../src/ui/player-auth.js';

class Element {
  constructor(doc, tag) { this.ownerDocument = doc; this.tagName = tag; this.children = []; this.handlers = {}; this.attributes = {}; this.open = false; }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of this.children) child.parent = null; this.children = []; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, fn) { (this.handlers[name] ??= new Set()).add(fn); }
  removeEventListener(name, fn) { this.handlers[name]?.delete(fn); }
  dispatch(type, values = {}) {
    const event = { target: this, stopped: false, defaultPrevented: false, stopPropagation() { this.stopped = true; }, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (let node = this; node; node = node.parent) {
      for (const handler of node.handlers[type] ?? []) handler(event);
      if (event.stopped) break;
    }
    return event;
  }
  showModal() { this.open = true; }
  close() { this.open = false; queueMicrotask(() => this.dispatch('close')); }
  click() { this.dispatch('click'); }
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup(mountSignIn = async () => () => {}, options = {}) {
  const doc = { createElement: tag => new Element(doc, tag) }, parent = new Element(doc, 'dialog'); parent.open = true;
  let state = { status: 'signed-out' }, listener, unsubscribed = 0;
  const changes = [], mounts = [];
  const auth = {
    getState: () => state,
    subscribe(fn) { listener = fn; fn(state); return () => { unsubscribed++; }; },
    mountSignIn(host) { mounts.push(host); return mountSignIn(host); }
  };
  const controller = mountPlayerAuth(parent, { auth, onOpenChange: value => changes.push(value), ...options });
  const dialog = () => parent.children[0];
  const parts = () => { const [heading, status, host, actions] = dialog().children; return { heading, status, host, retry: actions.children[0], cancel: actions.children[1] }; };
  return { controller, parent, auth, changes, mounts, dialog, parts, get unsubscribed() { return unsubscribed; }, emit(next) { state = next; listener(next); } };
}

test('owns a named nested native dialog; repeated opens mount once and only signed-in state closes', async () => {
  let cleanups = 0;
  const env = setup(async () => () => { cleanups++; });
  env.controller.open(); env.controller.open();
  assert.equal(env.dialog().tagName, 'dialog');
  assert.equal(env.dialog().open, true);
  assert.equal(env.dialog().attributes['aria-label'], 'Sign in to OpenArcade');
  assert.equal(env.parts().status.attributes.role, 'status');
  assert.equal(env.parts().cancel.textContent, 'Cancel');
  assert.equal(env.mounts.length, 1);
  await tick();
  assert.equal(env.dialog().open, true, 'mount resolution is not authentication');
  env.emit({ status: 'loading' }); assert.equal(env.dialog().open, true);
  env.emit({ status: 'signed-in' });
  assert.equal(env.parent.children.length, 0); assert.equal(cleanups, 1);
  assert.deepEqual(env.changes, [true, false]);
  env.controller.open(); assert.equal(env.mounts.length, 1);
  env.controller.dispose(); env.controller.dispose(); assert.equal(env.unsubscribed, 1);
});

test('cancel and Escape do not reach player keyboard, cancel or close handlers', async () => {
  const env = setup(), outer = [];
  for (const type of ['keydown', 'keyup', 'cancel', 'close']) env.parent.addEventListener(type, () => outer.push(type));
  env.controller.open();
  assert.equal(env.parts().cancel.dispatch('keydown', { key: 'Escape' }).defaultPrevented, true);
  await tick(); assert.deepEqual(outer, []); assert.equal(env.parent.open, true);
  env.controller.open();
  const cancel = env.dialog().dispatch('cancel');
  assert.equal(cancel.defaultPrevented, true);
  await tick(); assert.deepEqual(outer, []);
  env.controller.open(); env.parts().cancel.click(); await tick();
  assert.deepEqual(outer, []); assert.deepEqual(env.changes, [true, false, true, false, true, false]);
  env.controller.dispose();
});

test('late provider mounts and queued close events cannot affect a reopened host', async () => {
  const first = deferred(), second = deferred(), cleanups = [];
  const env = setup(() => env.mounts.length === 1 ? first.promise : second.promise);
  env.controller.open(); const oldDialog = env.dialog(), oldHost = env.mounts[0];
  env.controller.close(); env.controller.open(); const newDialog = env.dialog(), newHost = env.mounts[1];
  assert.notEqual(oldHost, newHost); assert.notEqual(oldDialog, newDialog);
  first.resolve(() => { cleanups.push(oldHost); oldHost.replaceChildren(); });
  await tick();
  assert.equal(env.dialog(), newDialog); assert.equal(newDialog.open, true);
  assert.equal(env.parts().host.children[0], newHost); assert.deepEqual(cleanups, [oldHost]);
  assert.deepEqual(env.changes, [true, false, true]);
  second.resolve(() => cleanups.push(newHost)); await tick();
  env.controller.close(); env.controller.close();
  assert.deepEqual(cleanups, [oldHost, newHost]); assert.deepEqual(env.changes, [true, false, true, false]);
  env.controller.dispose();
});

test('failed mounts offer retry with a fresh host, and cancel always releases pause', async () => {
  const env = setup(async () => { if (env.mounts.length === 1) throw Error('provider unavailable'); return () => {}; });
  env.controller.open(); await tick();
  assert.match(env.parts().status.textContent, /Could not load/);
  assert.equal(env.parts().retry.hidden, false);
  const failedHost = env.mounts[0]; env.parts().retry.click(); env.parts().retry.click();
  assert.equal(env.mounts.length, 2); assert.notEqual(env.mounts[1], failedHost);
  await tick(); assert.equal(env.parts().retry.hidden, true);
  env.parts().cancel.click(); assert.deepEqual(env.changes, [true, false]);
  env.controller.dispose();
});

test('dispose and parent close settle immediately while mounts are still pending', async () => {
  const pending = deferred(); let cleanups = 0;
  const env = setup(() => pending.promise);
  env.controller.open(); env.controller.dispose(); env.controller.dispose();
  assert.deepEqual(env.changes, [true, false]); assert.equal(env.parent.children.length, 0);
  pending.resolve(() => { cleanups++; }); await tick(); assert.equal(cleanups, 1);
  env.emit({ status: 'signed-in' }); env.controller.open(); assert.equal(env.parent.children.length, 0);
  const other = setup(); other.controller.open(); other.parent.close(); await tick();
  assert.equal(other.parent.children.length, 0); assert.deepEqual(other.changes, [true, false]); other.controller.dispose();
});

test('native showModal failure releases pause without starting a provider mount', () => {
  const env = setup();
  const create = env.parent.ownerDocument.createElement;
  env.parent.ownerDocument.createElement = tag => {
    const element = create(tag); if (tag === 'dialog') element.showModal = () => { throw Error('not connected'); }; return element;
  };
  env.controller.open(); assert.deepEqual(env.changes, [true, false]); assert.equal(env.mounts.length, 0);
  assert.equal(env.parent.children.length, 0); env.controller.dispose();
});

test('preparation pauses first, receives a private host, and must approve before Clerk mounts', async () => {
  const ready = deferred(), requests = [];
  const env = setup(undefined, { prepare: request => { requests.push(request); return ready.promise; } });
  env.controller.open();
  assert.deepEqual(env.changes, [true]); assert.equal(env.mounts.length, 0);
  assert.equal(requests[0].signal.aborted, false);
  const recovery = env.parent.ownerDocument.createElement('p'); requests[0].container.append(recovery);
  assert.equal(env.parts().host.children[0], requests[0].container);
  ready.resolve(true); await tick();
  assert.equal(env.mounts.length, 1); assert.equal(env.mounts[0], requests[0].container);
  assert.equal(env.mounts[0].children.length, 0, 'recovery UI is cleared before Clerk mounts');
  assert.equal(env.dialog().open, true); env.controller.dispose();
  assert.equal(requests[0].signal.aborted, true);
});

test('cancel aborts preparation immediately and stale approval cannot mount into a reopen', async () => {
  const first = deferred(), second = deferred(), requests = [];
  const env = setup(undefined, { prepare: request => { requests.push(request); return requests.length === 1 ? first.promise : second.promise; } });
  env.controller.open(); const oldHost = requests[0].container;
  env.parts().cancel.click(); assert.equal(requests[0].signal.aborted, true);
  env.controller.open(); const newDialog = env.dialog(), newHost = requests[1].container;
  assert.notEqual(oldHost, newHost); assert.deepEqual(env.changes, [true, false, true]);
  first.resolve(true); await tick();
  assert.equal(env.mounts.length, 0); assert.equal(env.dialog(), newDialog);
  second.resolve(true); await tick(); assert.deepEqual(env.mounts, [newHost]);
  env.controller.dispose();
});

test('declined preparation closes; rejected or late preparation cannot escape cleanup', async () => {
  const declined = setup(undefined, { prepare: async () => false });
  declined.controller.open(); await tick();
  assert.equal(declined.parent.children.length, 0); assert.deepEqual(declined.changes, [true, false]); assert.equal(declined.mounts.length, 0); declined.controller.dispose();
  const late = deferred(), requests = [];
  const env = setup(undefined, { prepare: request => { requests.push(request); return requests.length === 1 ? late.promise : Promise.resolve(true); } });
  env.controller.open(); env.controller.close(); env.controller.open(); await tick();
  late.reject(Error('late recovery failure')); await tick();
  assert.equal(env.dialog().open, true); assert.equal(env.mounts.length, 1); assert.equal(env.parts().retry.hidden, true);
  env.controller.dispose();
  let attempts = 0;
  const failed = setup(undefined, { prepare: async () => { if (++attempts === 1) throw Error('recovery failed'); return true; } });
  failed.controller.open(); await tick(); assert.equal(failed.parts().retry.hidden, false); assert.equal(failed.mounts.length, 0);
  failed.parts().retry.click(); await tick(); assert.equal(failed.mounts.length, 1); failed.controller.dispose();
});
