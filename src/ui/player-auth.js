/**
 * Mount sign-in inside an already modal player dialog. The caller composes
 * onOpenChange with its other pause reasons and releases held inputs on open.
 * mountSignIn resolves when its UI mounts; only auth state confirms sign-in.
 */
export function mountPlayerAuth(parentNativeDialog, { auth, onOpenChange = () => {}, prepare }) {
  const doc = parentNativeDialog.ownerDocument;
  let disposed = false, current = null;

  function unmount(session) {
    const cleanup = session.cleanup;
    session.cleanup = null;
    // A provider cleanup failure must not leave the player paused or modal open.
    try { cleanup?.(); } catch { /* The host is still removed by close(). */ }
  }

  function closeSession(session) {
    if (!session || current !== session) return;
    current = null;
    session.abort.abort();
    unmount(session);
    if (session.dialog.open) session.dialog.close();
    session.dialog.remove();
    onOpenChange(false);
  }

  function preparation(session, container) {
    const { signal } = session.abort;
    if (signal.aborted) return Promise.resolve(false);
    // A caller may still be awaiting IO when the user cancels. Settle our side
    // immediately even if that caller does not observe the abort signal.
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (value, error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', aborted);
        error ? reject(error) : resolve(value === true);
      };
      const aborted = () => finish(false);
      signal.addEventListener('abort', aborted, { once: true });
      try { Promise.resolve(prepare({ container, signal })).then(value => finish(value), error => finish(false, error)); }
      catch (error) { finish(false, error); }
    });
  }

  async function mount(session) {
    if (disposed || current !== session || session.pending) return;
    session.pending = true;
    session.retry.hidden = true;
    session.status.textContent = 'Loading sign-in…';
    const host = doc.createElement('div');
    host.className = 'player-auth-host';
    session.host.replaceChildren(host);
    try {
      if (prepare) {
        session.status.textContent = 'Preparing sign-in…';
        const ready = await preparation(session, host);
        if (disposed || current !== session || session.abort.signal.aborted) return;
        if (!ready) { closeSession(session); return; }
        host.replaceChildren();
        session.status.textContent = 'Loading sign-in…';
      }
      const cleanup = await auth.mountSignIn(host);
      if (disposed || current !== session) {
        try { cleanup?.(); } catch { /* A stale mount owns only its detached host. */ }
        return;
      }
      session.cleanup = cleanup;
      session.status.textContent = 'Sign in to post comments and save scores.';
    } catch {
      if (disposed || current !== session) return;
      host.remove();
      session.status.textContent = 'Could not load sign-in. Please try again.';
      session.retry.hidden = false;
    } finally {
      session.pending = false;
    }
  }

  function close() { closeSession(current); }

  function open() {
    if (disposed || current || !parentNativeDialog.open || auth.getState().status === 'signed-in') return;
    // Each open owns a distinct dialog and host, including while a provider mount
    // is pending. Old native close events and async cleanups cannot close a reopen.
    const dialog = doc.createElement('dialog');
    dialog.className = 'player-auth-dialog';
    dialog.setAttribute('aria-label', 'Sign in to OpenArcade');
    const heading = doc.createElement('h3');
    heading.textContent = 'Sign in to OpenArcade';
    const status = doc.createElement('p');
    status.className = 'player-auth-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const host = doc.createElement('div');
    host.className = 'player-auth-mount';
    const actions = doc.createElement('div');
    actions.className = 'player-auth-actions';
    const retry = doc.createElement('button');
    retry.type = 'button'; retry.className = 'action'; retry.textContent = 'Retry sign-in'; retry.hidden = true;
    const cancel = doc.createElement('button');
    cancel.type = 'button'; cancel.className = 'action'; cancel.textContent = 'Cancel'; cancel.autofocus = true;
    actions.append(retry, cancel);
    dialog.append(heading, status, host, actions);
    const session = { dialog, status, host, retry, cleanup: null, pending: false, abort: new AbortController() };
    retry.addEventListener('click', () => { void mount(session); });
    cancel.addEventListener('click', () => closeSession(session));
    dialog.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); closeSession(session); }
    });
    dialog.addEventListener('keyup', event => event.stopPropagation());
    dialog.addEventListener('cancel', event => {
      event.preventDefault(); event.stopPropagation(); closeSession(session);
    });
    dialog.addEventListener('close', event => {
      event.stopPropagation(); closeSession(session);
    });
    parentNativeDialog.append(dialog);
    current = session;
    onOpenChange(true);
    // A synchronous auth update or caller teardown may have closed this session.
    if (current !== session) return;
    try { dialog.showModal(); }
    catch { closeSession(session); return; }
    void mount(session);
  }

  const unsubscribe = auth.subscribe(state => {
    if (!disposed && state.status === 'signed-in') close();
  });
  const parentClosed = event => { if (event.target === parentNativeDialog) close(); };
  parentNativeDialog.addEventListener('close', parentClosed);
  return {
    open, close,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      parentNativeDialog.removeEventListener('close', parentClosed);
      close();
    }
  };
}
