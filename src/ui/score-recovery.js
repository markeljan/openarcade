function element(doc, tag, className, content) {
  const node = doc.createElement(tag); node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/** Ask the user to preserve tab-only runs before a potentially destructive navigation. */
export function prepareRecoveryStep(container, { client, runs, navigator: nav = globalThis.navigator, signal } = {}) {
  return new Promise(resolve => {
    const doc = container.ownerDocument, panel = element(doc, 'section', 'score-recovery-step');
    const status = element(doc, 'p', 'score-recovery-status', 'Stored only in this tab. Reload or external sign-in may lose this run.');
    status.setAttribute('role', 'status'); panel.append(status);
    let done = false;
    const outcomes = new Map();
    const setOutcome = (runId, outcome) => {
      outcomes.set(runId, outcome);
      const complete = runs.every(run => ['ready', 'failed'].includes(outcomes.get(run.runId)));
      proceed.disabled = !complete;
      proceed.textContent = runs.every(run => outcomes.get(run.runId) === 'ready') ? 'Continue' : 'Continue without recovery';
    };
    const finish = value => {
      if (done) return; done = true; signal?.removeEventListener('abort', abort); panel.remove(); resolve(value);
    };
    const abort = () => finish(false);
    for (const run of runs) {
      const row = element(doc, 'div', 'score-recovery-run');
      row.append(element(doc, 'p', '', `${run.gameId}: ${run.score} ${run.units || ''}`.trim()));
      const copy = element(doc, 'button', 'score-action', 'Copy recovery code'); copy.type = 'button';
      const field = element(doc, 'textarea', 'score-recovery-code'); field.readOnly = true; field.hidden = true;
      field.setAttribute('aria-label', 'Recovery code');
      const confirm = element(doc, 'button', 'score-action', 'I saved this code'); confirm.type = 'button'; confirm.hidden = true;
      copy.addEventListener('click', async () => {
        copy.disabled = true;
        field.value = ''; field.hidden = true; confirm.hidden = true;
        setOutcome(run.runId, 'pending');
        try {
          const recovery = await client.getRecovery(run.runId);
          if (done) return;
          if (!recovery) { setOutcome(run.runId, 'failed'); status.textContent = 'Recovery code unavailable. Continuing without it may lose this run.'; return; }
          const code = JSON.stringify(recovery);
          try {
            if (typeof nav?.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
            await nav.clipboard.writeText(code);
            if (!done) { setOutcome(run.runId, 'ready'); status.textContent = 'Recovery code copied. Keep it somewhere private.'; }
          } catch {
            if (!done) { field.value = code; field.hidden = false; confirm.hidden = false; status.textContent = 'Copy and save the recovery code shown below.'; }
          }
        } catch {
          if (!done) { setOutcome(run.runId, 'failed'); status.textContent = 'Recovery code unavailable. Continuing without it may lose this run.'; }
        } finally { if (!done) copy.disabled = false; }
      });
      confirm.addEventListener('click', () => { if (!done) { setOutcome(run.runId, 'ready'); field.value = ''; field.hidden = true; confirm.hidden = true; status.textContent = 'Recovery code marked as saved.'; } });
      row.append(copy, field, confirm); panel.append(row);
    }
    const proceed = element(doc, 'button', 'score-action', 'Continue without recovery'); proceed.type = 'button';
    proceed.disabled = runs.length > 0;
    proceed.addEventListener('click', () => { if (!proceed.disabled) finish(true); }); panel.append(proceed); container.append(panel);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}

/** Mount an explicit, private recovery-code claim form. */
export function mountScoreRecovery(root, { client, auth, onSignIn = () => {}, onRecovered = () => {} }) {
  const doc = root.ownerDocument, details = element(doc, 'details', 'score-recovery');
  const summary = element(doc, 'summary', '', 'Recover a score');
  const input = element(doc, 'textarea', 'score-recovery-input'); input.setAttribute('aria-label', 'Paste recovery code');
  const helper = element(doc, 'p', 'score-recovery-helper', 'Sign in, then paste your private recovery code.');
  const status = element(doc, 'p', 'score-recovery-status'); status.setAttribute('role', 'status');
  const signIn = element(doc, 'button', 'score-action', 'Sign in to recover'); signIn.type = 'button';
  const claim = element(doc, 'button', 'score-action', 'Recover score'); claim.type = 'button';
  details.append(summary, input, status, signIn, claim, helper); root.append(details);
  let disposed = false, pending = false, current = auth.getState();
  function render() {
    if (disposed) return;
    const signedIn = current.status === 'signed-in';
    input.hidden = !signedIn; helper.hidden = signedIn;
    signIn.hidden = signedIn; signIn.disabled = pending || current.status !== 'signed-out';
    claim.hidden = !signedIn; claim.disabled = pending;
  }
  const unsubscribe = auth.subscribe(state => { if (!disposed) { current = state; render(); } });
  signIn.addEventListener('click', () => {
    if (disposed || current.status !== 'signed-out') return;
    try {
      Promise.resolve(onSignIn()).catch(() => { if (!disposed) status.textContent = 'Sign-in unavailable. Try again.'; });
    } catch { if (!disposed) status.textContent = 'Sign-in unavailable. Try again.'; }
  });
  claim.addEventListener('click', async () => {
    if (disposed || pending || current.status !== 'signed-in') return;
    let recovery;
    const submitted = input.value;
    try {
      recovery = JSON.parse(submitted);
      if (!recovery || recovery.schemaVersion !== 1 || typeof recovery.runId !== 'string' || typeof recovery.claimToken !== 'string' || recovery.expiresAt == null) throw new Error('invalid');
    } catch { status.textContent = 'Invalid recovery code.'; return; }
    pending = true; render(); status.textContent = 'Recovering score…';
    try {
      const result = await client.claimReceipt(recovery);
      if (disposed) return;
      if (result?.status === 'saved') {
        if (input.value === submitted) input.value = '';
        status.textContent = 'Score recovered.';
        try { Promise.resolve(onRecovered(result)).catch(() => {}); } catch { /* Recovery already succeeded. */ }
      }
      else status.textContent = 'Score was not recovered. Check the code or try again.';
    } catch { if (!disposed) status.textContent = 'Score could not be recovered. Try again.'; }
    finally { if (!disposed) { pending = false; render(); } }
  });
  render();
  return { dispose() { if (disposed) return; disposed = true; unsubscribe(); details.remove(); } };
}
