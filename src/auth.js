// The Clerk UI is loaded only when authentication is configured. Gameplay does
// not depend on this module becoming available.
async function loadClerkUI(key) {
  const encoded = key.split('_')[2];
  const decoded = atob(encoded);
  const domain = decoded.endsWith('$') ? decoded.slice(0, -1) : '';
  if (!/^[a-z0-9.-]+$/i.test(domain) || !domain.includes('.')) throw new Error('Invalid Clerk publishable key');
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error('Timed out loading Clerk UI'));
    }, 15000);
    script.src = `https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Failed to load Clerk UI')); };
    document.head.appendChild(script);
  });
  if (!window.__internal_ClerkUICtor) throw new Error('Failed to load Clerk UI');
  return window.__internal_ClerkUICtor;
}

function safeName(user) {
  const candidates = [user.fullName, [user.firstName, user.lastName].filter(Boolean).join(' '), user.username];
  return candidates.map((name) => typeof name === 'string' ? name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() : '')
    .find((name) => name && !name.includes('@'))?.slice(0, 60) || 'Player';
}

export function createAuthClient(options = {}) {
  const key = options.publishableKey ?? import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY;
  const listeners = new Set();
  let state = { status: 'loading', user: null };
  let clerk;
  let initialized;

  function setState(next) {
    if (state.status === next.status && state.user?.id === next.user?.id && state.user?.displayName === next.user?.displayName) return;
    state = next;
    for (const listener of listeners) {
      try { listener(getState()); } catch { /* One subscriber must not block others. */ }
    }
  }
  function getState() {
    return { status: state.status, user: state.user ? { ...state.user } : null };
  }
  function sync({ user, session }) {
    if (user === undefined || session === undefined) setState({ status: 'loading', user: null });
    else if (user && session && user.id) setState({ status: 'signed-in', user: { id: user.id, displayName: safeName(user) } });
    else setState({ status: 'signed-out', user: null });
  }
  function initialize() {
    if (initialized && (state.status !== 'unavailable' || !key)) return initialized;
    setState({ status: 'loading', user: null });
    initialized = (async () => {
      if (!key) { setState({ status: 'unavailable', user: null }); return; }
      try {
        const loadSdk = options.loadSdk ?? (() => import('@clerk/clerk-js'));
        const loadUI = options.loadUI ?? loadClerkUI;
        const [sdk, ui] = await Promise.all([loadSdk(), loadUI(key)]);
        clerk = new sdk.Clerk(key);
        await clerk.load({ ui: { ClerkUI: ui } });
        clerk.addListener(sync);
        sync({ user: clerk.user, session: clerk.session });
      } catch {
        clerk = undefined;
        setState({ status: 'unavailable', user: null });
      }
    })();
    return initialized;
  }
  async function getToken() {
    await initialize();
    const session = clerk?.session;
    const userId = state.user?.id;
    if (state.status !== 'signed-in' || !session) return null;
    try {
      const token = await session.getToken({ skipCache: true });
      return clerk?.session === session && state.user?.id === userId ? token || null : null;
    } catch {
      if (!clerk?.session) sync({ user: null, session: null });
      return null;
    }
  }
  function currentUrl() {
    const location = options.location ?? globalThis.location;
    if (!location?.href) throw new Error('Sign-in is unavailable');
    const url = new URL(location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Sign-in is unavailable');
    return url.href;
  }
  async function signIn() {
    const url = currentUrl();
    await initialize();
    if (!clerk) throw new Error('Sign-in is unavailable');
    await clerk.openSignIn({ forceRedirectUrl: url, signUpForceRedirectUrl: url });
  }
  async function mountSignIn(container) {
    if (!container || container.nodeType !== 1 || container.tagName?.toLowerCase() !== 'div') throw new TypeError('Sign-in container must be a div element');
    const url = currentUrl();
    await initialize();
    if (!clerk) throw new Error('Sign-in is unavailable');
    if (state.status === 'signed-in') return () => {};
    await clerk.mountSignIn(container, { routing: 'hash', oauthFlow: 'popup', forceRedirectUrl: url, signUpForceRedirectUrl: url });
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      clerk.unmountSignIn(container);
    };
  }
  async function signOut() {
    await initialize();
    if (!clerk) throw new Error('Sign-in is unavailable');
    await clerk.signOut();
    sync({ user: clerk.user, session: clerk.session });
  }
  const client = {
    getState,
    subscribe(listener) { listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },
    initialize,
    getToken,
    signIn,
    mountSignIn,
    signOut,
  };
  client.ready = initialize();
  return client;
}

export const auth = createAuthClient();
