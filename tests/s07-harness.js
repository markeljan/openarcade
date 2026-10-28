// Deterministic DOM and animation-frame harness for feature wrapper tests.
export function createHarness(factory, id, options = {}, {seed = 42, initialStorage = {}} = {}) {
  const names = ['window', 'localStorage', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const random = Math.random;
  let state = seed >>> 0, now = 0, nextId = 0;
  const frames = new Map(), handlers = new Map(), data = new Map(Object.entries(initialStorage));
  const writes = [], labels = [], results = [], attract = [];
  const noop = () => {};
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem(key, value) { data.set(key, String(value)); writes.push([key, String(value)]); },
    removeItem: key => data.delete(key),
    clear: () => data.clear(),
  };
  Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  globalThis.window = {devicePixelRatio: 1, localStorage: storage};
  globalThis.localStorage = storage;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = fn => { const id = ++nextId; frames.set(id, fn); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const ctx = new Proxy({fillText(value) { labels.push(String(value)); }}, {
    get: (target, key) => target[key] ?? noop,
    set: (target, key, value) => (target[key] = value, true),
  });
  const canvas = {
    width: 320, height: 720, tabIndex: -1,
    getContext: () => ctx,
    getBoundingClientRect: () => ({left: 0, top: 0, width: 320, height: 720}),
    setAttribute: noop, focus: noop, setPointerCapture: noop, releasePointerCapture: noop,
    addEventListener(type, fn) { handlers.set(type, fn); },
    removeEventListener(type, fn) { if (handlers.get(type) === fn) handlers.delete(type); },
  };
  let game;
  function cleanup() {
    game?.destroy();
    Math.random = random;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
  try {
    game = factory(canvas, id, {...options,
      onAttract(...args) { attract.push(args); options.onAttract?.(...args); },
      onResult(record) { results.push(record); options.onResult?.(record); },
    });
  } catch (error) { cleanup(); throw error; }
  function dispatch(type, event = {}) {
    handlers.get(type)?.({preventDefault: noop, isTrusted: true, ...event});
  }
  return {
    game, canvas, ctx, handlers, storage, writes, labels, results, attract, cleanup,
    get pendingFrames() { return frames.size; },
    step(count = 1, dt = 1000 / 60) {
      for (let i = 0; i < count; i++) {
        labels.length = 0;
        now += dt;
        const pending = [...frames.values()]; frames.clear();
        for (const callback of pending) callback(now);
      }
      return labels;
    },
    key(key, down = true) { dispatch(down ? 'keydown' : 'keyup', {key}); },
    press(key) { this.key(key); this.key(key, false); },
    pointer(type, x = 160, y = 360, extra = {}) {
      dispatch(type, {clientX: x, clientY: y, pointerId: 1, ...extra});
    },
    dispatch,
  };
}

