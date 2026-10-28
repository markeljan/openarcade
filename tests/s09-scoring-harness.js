// Deterministic canvas and animation-frame fixture for S09 wrapper tests.
// Call setup(t), then h.make(factory, id, options). Globals are restored by t.after.
export function setup(t, { seed: initialSeed = 42 } = {}) {
  const names = ['window', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const originals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const originalRandom = Math.random;
  let seed = initialSeed >>> 0, now = 0, sequence = 0, disposed = false;
  const scheduled = new Map(), instances = new Set(), labelSets = new Set();
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = callback => { const id = ++sequence; scheduled.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = id => scheduled.delete(id);
  const noop = () => {};

  function make(factory, id, options = {}) {
    const listeners = new Map(), labels = [], results = [];
    const context = new Proxy({ fillText(value) { labels.push(String(value)); } }, {
      get: (object, key) => key in object ? object[key] : noop,
      set: (object, key, value) => (object[key] = value, true),
    });
    const canvas = {
      width: 320, height: 720, tabIndex: -1,
      getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 720 }),
      setAttribute: noop, focus: noop,
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
    };
    const onResult = options.onResult;
    const game = factory(canvas, id, { ...options, onResult: (...args) => { results.push(args); onResult?.(...args); } });
    instances.add(game);
    labelSets.add(labels);
    function key(value, down = true) {
      listeners.get(down ? 'keydown' : 'keyup')?.({ key: value, isTrusted: true, preventDefault: noop });
    }
    return { game, canvas, listeners, labels, results, key, press(value) { key(value, true); key(value, false); } };
  }
  // Each frame runs only callbacks pending at its start, matching browser RAF.
  function frame(seconds = 1 / 30) {
    now += seconds * 1000;
    for (const labels of labelSets) labels.length = 0;
    const pending = [...scheduled.values()];
    scheduled.clear();
    for (const callback of pending) callback(now);
  }
  function advance(seconds, step = 1 / 30) {
    if (!(seconds >= 0) || !(step > 0)) throw new RangeError('Invalid duration or step');
    const count = Math.floor(seconds / step + 1e-10);
    for (let i = 0; i < count; i++) frame(step);
    const remainder = seconds - count * step;
    if (remainder > 1e-10) frame(remainder);
  }
  function teardown() {
    if (disposed) return;
    disposed = true;
    for (const game of instances) game.destroy();
    Math.random = originalRandom;
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
  t.after(teardown);
  return { make, frame, advance, teardown, scheduled, get now() { return now; }, pendingCallbacks: () => [...scheduled.values()], invoke(callback, timestamp = now) { callback(timestamp); } };
}
