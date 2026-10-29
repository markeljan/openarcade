/** Mount controls that reflect the injected auth service's authoritative state. */
export function mountAuthControls(root, { auth, onBeforeSignIn = () => {}, onError = () => {} }) {
  const doc = root.ownerDocument;
  const container = doc.createElement('div');
  container.className = 'auth-controls';
  const label = doc.createElement('span');
  label.className = 'auth-label';
  label.setAttribute('role', 'status');
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'auth-action';
  container.append(label, button);
  root.append(container);

  let state = auth.getState();
  let disposed = false;
  let pending = false;
  let errorMessage = '';
  let revision = 0;
  function render() {
    if (disposed) return;
    const signedIn = state.status === 'signed-in';
    label.textContent = errorMessage || (signedIn ? `Signed in as ${state.user?.displayName || 'Player'}` :
      state.status === 'loading' ? 'Checking sign-in…' :
      state.status === 'unavailable' ? 'Sign-in unavailable' : 'Signed out');
    button.hidden = state.status !== 'signed-in' && state.status !== 'signed-out';
    button.disabled = pending;
    button.textContent = signedIn ? 'Sign out' : 'Sign in';
  }
  function update(next) {
    if (disposed) return;
    state = next;
    revision++;
    errorMessage = '';
    render();
  }
  async function handleClick() {
    if (disposed || pending || (state.status !== 'signed-in' && state.status !== 'signed-out')) return;
    const signingIn = state.status === 'signed-out';
    const startedAt = revision;
    pending = true;
    errorMessage = '';
    render();
    try {
      if (signingIn) {
        onBeforeSignIn();
        await auth.signIn();
      } else {
        await auth.signOut();
      }
    } catch (error) {
      if (!disposed && revision === startedAt) {
        errorMessage = signingIn ? 'Could not sign in. Please try again.' : 'Could not sign out. Please try again.';
        onError(error);
      }
    } finally {
      if (!disposed) {
        pending = false;
        render();
      }
    }
  }
  button.addEventListener('click', handleClick);
  const unsubscribe = auth.subscribe(update);
  render();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      button.removeEventListener('click', handleClick);
      container.remove();
    }
  };
}
