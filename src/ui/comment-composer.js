/** Coordinate comment drafts and submissions without owning the surrounding form. */
export function createCommentComposer({input, button, status, auth, getCommentDraft, saveCommentDraft, clearCommentDraft, submit, onSignIn}) {
  let gameId = null, generation = 0, disposed = false, pending = false;
  let authState = auth.getState();
  function render() {
    if (disposed) return;
    const signedIn = authState.status === 'signed-in';
    button.textContent = signedIn ? 'Post' : 'Sign in to post';
    button.disabled = !gameId || pending || !['signed-in', 'signed-out'].includes(authState.status);
  }
  function persist() {
    if (!disposed && gameId) saveCommentDraft(gameId, input.value);
  }
  input.addEventListener('input', persist);
  const unsubscribe = auth.subscribe(next => { if (!disposed) { authState = next; render(); } });
  function setGame(id) {
    if (disposed) return;
    generation++;
    gameId = id || null;
    pending = false;
    input.value = gameId ? (getCommentDraft(gameId) ?? '') : '';
    status.textContent = '';
    render();
  }
  async function post() {
    if (disposed || !gameId || pending) return;
    const id = gameId, raw = input.value, view = generation;
    saveCommentDraft(id, raw);
    if (authState.status === 'signed-out') {
      try { await onSignIn(); } catch { if (!disposed && generation === view) status.textContent = 'Sign-in unavailable. Your draft is saved.'; }
      return;
    }
    if (authState.status !== 'signed-in' || !raw.trim()) return;
    pending = true;
    status.textContent = '';
    render();
    try {
      await submit(id, raw);
      if (disposed) return;
      clearCommentDraft(id, raw);
      if (generation === view && gameId === id && input.value === raw) input.value = '';
    } catch (error) {
      if (!disposed && generation === view && gameId === id) {
        const code = Number(error?.status ?? error?.code);
        status.textContent = code === 401 ? 'Sign-in required. Your draft is saved.' :
          code === 503 ? 'Comments are unavailable. Your draft is saved.' :
          code === 429 ? 'Too many attempts. Please try again later.' : 'Could not post comment. Your draft is saved.';
      }
    } finally {
      if (!disposed && generation === view && gameId === id) { pending = false; render(); }
    }
  }
  render();
  return {setGame, submit: post, dispose() { if (disposed) return; disposed = true; generation++; unsubscribe(); input.removeEventListener('input', persist); }};
}
