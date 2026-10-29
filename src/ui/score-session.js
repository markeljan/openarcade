const runFields = ['schemaVersion', 'runId', 'gameId', 'ruleVersion', 'score', 'result', 'durationMs', 'actor', 'context', 'provenance', 'submissionEligible'];
const statuses = new Set(['pending', 'saving', 'queued-auth', 'saved', 'retry', 'nonqualifying', 'unavailable', 'expired', 'ignored', 'abandoned']);
const finished = new Set(['saved', 'nonqualifying', 'expired', 'ignored', 'abandoned']);

function publicRun(value) {
  if (!value || typeof value.runId !== 'string' || typeof value.gameId !== 'string') return null;
  return Object.freeze(Object.fromEntries(runFields.filter(key => Object.hasOwn(value, key) && ['string', 'number', 'boolean'].includes(typeof value[key])).map(key => [key, value[key]])));
}

/**
 * Own UI submission work without implementing persistence. Client subscriptions
 * are per-run and not immediate; auth subscriptions are authoritative/immediate.
 * All public results contain only canonical run facts and safe status fields.
 */
export function createScoreSession({ client, auth, onChange = () => {}, onError = () => {} }) {
  const records = new Map(), humans = new Map(), ais = new Map(), published = new Map();
  let disposed = false, preparing = null, restoring = null;
  let authState = auth.getState(), authEpoch = authState.status === 'signed-in' ? 1 : 0;

  function report(error) {
    if (disposed) return;
    try { Promise.resolve(onError(error)).catch(() => {}); } catch { /* A UI callback cannot interrupt queue work. */ }
  }
  function snapshot(record) { return Object.freeze({ gameId: record.run.gameId, run: record.run, state: record.state }); }
  function getResult(gameId) {
    const record = humans.get(gameId) || ais.get(gameId);
    return record ? snapshot(record) : null;
  }
  function notify(gameId) {
    if (disposed) return;
    const result = getResult(gameId), previous = published.get(gameId);
    if (!result || (previous?.run === result.run && previous.state === result.state)) return;
    published.set(gameId, result);
    try { Promise.resolve(onChange(result)).catch(report); } catch (error) { report(error); }
  }
  function update(record, value) {
    if (disposed || !value || value.runId !== record.run.runId) return;
    if (['saved', 'nonqualifying', 'abandoned'].includes(record.state.status) && value.status !== record.state.status) return;
    if (['memory', 'persistent'].includes(value.durability)) record.durability = value.durability;
    if (typeof value.redirectSafe === 'boolean') record.redirectSafe = value.redirectSafe;
    if (record.durability === 'memory') record.redirectSafe = false;
    const state = Object.freeze({
      runId: record.run.runId,
      status: statuses.has(value.status) ? value.status : 'unavailable',
      ...(record.durability ? { durability: record.durability } : {}),
      redirectSafe: record.redirectSafe === true,
    });
    if (JSON.stringify(record.state) === JSON.stringify(state)) return;
    record.state = state;
    notify(record.run.gameId);
  }
  function failure(record, error, local = false) {
    update(record, { runId: record.run.runId, status: 'retry', ...(local ? { durability: 'memory', redirectSafe: false } : {}) });
    report(error);
  }
  function register(raw, restored = false) {
    const run = publicRun(raw);
    if (!run || run.submissionEligible !== true || run.context === 'gallery-preview' || !['human', 'ai'].includes(run.actor)) return null;
    if (records.has(run.runId)) return records.get(run.runId);
    const record = {
      run, restored, createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
      privateHuman: run.actor === 'human' && !raw.guestName,
      enqueued: restored, redirectSafe: false, durability: undefined,
      state: Object.freeze({ runId: run.runId, status: 'pending', redirectSafe: false }),
      enqueuePromise: null, submitPromise: null, preparePromise: null, work: Promise.resolve(), recoveredEpoch: -1,
    };
    records.set(run.runId, record);
    const selected = run.actor === 'human' ? humans : ais, previous = selected.get(run.gameId);
    // Restoring an old queue must not replace a result accepted during the read.
    if (!previous || !restored || (previous.restored && record.createdAt >= previous.createdAt)) selected.set(run.gameId, record);
    const state = client.getState(run.runId);
    if (state) update(record, state);
    notify(run.gameId);
    return record;
  }
  function enqueue(record) {
    if (disposed || record.enqueued) return Promise.resolve(record.enqueued);
    if (record.enqueuePromise) return record.enqueuePromise;
    record.enqueuePromise = Promise.resolve().then(async () => {
      try {
        const state = await client.enqueue(record.run);
        if (disposed) return false;
        update(record, state);
        record.enqueued = state?.runId === record.run.runId && state.status === 'pending';
        if (!record.enqueued && !finished.has(record.state.status)) failure(record, Error('Score queue did not confirm the run.'), true);
        return record.enqueued;
      } catch (error) { failure(record, error, true); return false; }
    }).finally(() => { record.enqueuePromise = null; });
    return record.enqueuePromise;
  }
  function schedule(record, task) {
    const operation = record.work.then(() => disposed ? null : task());
    record.work = operation.catch(() => {});
    return operation;
  }
  function submit(record) {
    if (disposed || !record.enqueued || finished.has(record.state.status)) return Promise.resolve(snapshot(record));
    if (record.submitPromise) return record.submitPromise;
    record.submitPromise = schedule(record, async () => {
      if (finished.has(record.state.status)) return snapshot(record);
      const startedEpoch = authEpoch;
      try { update(record, await client.submit(record.run.runId)); }
      catch (error) { failure(record, error); }
      // A signed-in retry may have joined the client's earlier signed-out
      // in-flight request. Once that request settles, make one fresh attempt.
      if (!disposed && authState.status === 'signed-in' && record.recoveredEpoch !== authEpoch &&
        (record.state.status === 'queued-auth' || (record.state.status === 'retry' && startedEpoch !== authEpoch))) {
        record.recoveredEpoch = authEpoch;
        try { update(record, await client.submit(record.run.runId)); }
        catch (error) { failure(record, error); }
      }
      return snapshot(record);
    }).finally(() => { record.submitPromise = null; });
    return record.submitPromise;
  }
  async function retry(runId) {
    const record = records.get(runId);
    if (disposed || !record) return null;
    if (finished.has(record.state.status)) return snapshot(record);
    if (!record.enqueued && !await enqueue(record)) return snapshot(record);
    if (disposed) return null;
    return submit(record);
  }
  function accept(raw) {
    if (disposed) return Promise.resolve(null);
    const record = register(raw);
    if (!record) return Promise.resolve(null);
    // Keep this promise even after acknowledgment. Duplicate terminal callbacks
    // must never re-enqueue a completed run with a different private nonce.
    record.acceptPromise ??= record.restored ? Promise.resolve(snapshot(record)) : retry(record.run.runId);
    return record.acceptPromise;
  }
  async function readPending() {
    try {
      const pending = await client.listPending();
      if (disposed) return [];
      return pending.map(raw => register(raw, true)).filter(Boolean);
    } catch (error) { report(error); return null; }
  }
  function restore() {
    if (disposed) return Promise.resolve([]);
    if (restoring) return restoring;
    restoring = (async () => {
      const pending = await readPending();
      if (!pending) return [];
      await Promise.allSettled(pending.map(submit));
      return disposed ? [] : pending.map(snapshot);
    })().finally(() => { restoring = null; });
    return restoring;
  }
  function prepare(record) {
    if (record.preparePromise) return record.preparePromise;
    record.preparePromise = schedule(record, async () => {
      if (!record.enqueued || finished.has(record.state.status)) return;
      try { update(record, await client.prepareSignIn(record.run.runId)); }
      catch (error) { failure(record, error); }
    }).finally(() => { record.preparePromise = null; });
    return record.preparePromise;
  }
  function prepareSignIn() {
    if (disposed) return Promise.resolve({ redirectSafe: false, runs: [] });
    if (preparing) return preparing;
    preparing = (async () => {
      // Include all pending human runs, even if another game/result is visible.
      const pending = await readPending();
      const visited = new Set();
      while (!disposed) {
        await Promise.allSettled([...records.values()].filter(record => record.privateHuman).map(record => record.enqueuePromise).filter(Boolean));
        const humans = [...records.values()].filter(record => record.privateHuman && !visited.has(record));
        if (!humans.length) break;
        await Promise.allSettled(humans.map(record => record.enqueuePromise).filter(Boolean));
        await Promise.allSettled(humans.map(record => {
          visited.add(record);
          return record.enqueued ? prepare(record) : Promise.resolve();
        }));
      }
      const outstanding = [...records.values()].filter(record => record.privateHuman && !finished.has(record.state.status));
      const unsafe = outstanding.filter(record => !record.enqueued || record.redirectSafe !== true);
      return { redirectSafe: !disposed && pending !== null && !unsafe.length, runs: disposed ? [] : unsafe.map(record => record.run) };
    })().catch(error => { report(error); return { redirectSafe: false, runs: [] }; }).finally(() => { preparing = null; });
    return preparing;
  }

  const unsubscribeClient = client.subscribe(state => {
    const record = records.get(state?.runId);
    if (record) update(record, state);
  });
  const unsubscribeAuth = auth.subscribe(next => {
    if (disposed) return;
    const wasSignedIn = authState.status === 'signed-in', oldUser = authState.user?.id;
    authState = next;
    if (next.status === 'signed-in' && (!wasSignedIn || oldUser !== next.user?.id)) {
      authEpoch++;
      for (const record of records.values()) if (record.privateHuman) void retry(record.run.runId).catch(report);
    }
  });
  return { accept, restore, prepareSignIn, retry, getResult, dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribeClient(); unsubscribeAuth();
  } };
}
