import {createPendingQueue} from './pending.js';

function privateNonce() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function createScoreClient({fetch: request = globalThis.fetch?.bind(globalThis), getToken = async () => null, queue = createPendingQueue(), endpoint = '/api/scores', makeNonce = privateNonce} = {}) {
  const listeners = new Set(), states = new Map(), inflight = new Map(), thresholds = new Map(), abandoned = new Set();
  function emit(runId, status, extra = {}) {
    const state = Object.freeze({runId, status, ...extra}); states.set(runId, state);
    for (const listener of listeners) { try { listener(state); } catch {} }
    return state;
  }
  async function send(body, authenticated = false) {
    const runId = body.runId ?? body.run?.runId;
    const token = authenticated ? await getToken() : null;
    if (abandoned.has(runId)) throw Error('run-abandoned');
    if (authenticated && !token) throw Object.assign(Error('sign-in-required'), {status: 401});
    if (!request) throw Error('network-unavailable');
    const response = await request(endpoint, {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}, body: JSON.stringify(body)});
    const data = await response.json();
    if (abandoned.has(runId)) throw Error('run-abandoned');
    if (!response.ok) throw Object.assign(Error(data.error || 'scores-unavailable'), {status: response.status});
    if (data.runId !== (body.runId ?? body.run?.runId)) throw Error('invalid-acknowledgment');
    return data;
  }
  function single(runId, operation) {
    if (inflight.has(runId)) return inflight.get(runId);
    const promise = operation().finally(() => inflight.delete(runId)); inflight.set(runId, promise); return promise;
  }
  function problem(runId, error) {
    return emit(runId, error.status === 401 ? 'queued-auth' : error.status === 410 ? 'expired' : 'retry', {error: error.message});
  }
  async function leaderboard(gameId, {filter = 'players'} = {}) {
    const token = await getToken();
    const url = endpoint + '?gameId=' + encodeURIComponent(gameId) + '&filter=' + encodeURIComponent(filter);
    const response = await request(url, {credentials: 'omit', headers: token ? {Authorization: 'Bearer ' + token} : {}});
    const board = await response.json();
    if (!response.ok) throw Object.assign(Error(board.error || 'scores-unavailable'), {status: response.status});
    if (filter === 'ai') {
      // Hints support UI only. Atomic qualification remains in Postgres because
      // removal/reset may occur immediately after this read.
      const key = gameId + ':' + board.ruleVersion;
      const previous = thresholds.get(key);
      if (previous?.epoch !== board.epoch) thresholds.delete(key);
      thresholds.set(key, {epoch: board.epoch, threshold: board.threshold, order: board.order});
    }
    return board;
  }
  async function enqueue(run, {guestName, attribution} = {}) {
    if (abandoned.has(run?.runId)) return states.get(run.runId);
    if (!run?.submissionEligible || run.context === 'gallery-preview') return emit(run?.runId, 'ignored');
    if (run.actor === 'ai') {
      try {
        const board = await leaderboard(run.gameId, {filter: 'ai'});
        if (board.ruleVersion !== run.ruleVersion) return emit(run.runId, 'unavailable', {error: 'score-rule-changed'});
      } catch (error) { return problem(run.runId, error); }
    }
    if (abandoned.has(run.runId)) return states.get(run.runId);
    // This completes before any caller is permitted to start a redirect login.
    const saved = await queue.enqueue({...run, claimNonce: run.actor === 'human' && !guestName ? makeNonce() : undefined, guestName, attribution});
    if (abandoned.has(run.runId)) { await queue.abandon(run.runId); return states.get(run.runId); }
    return emit(run.runId, 'pending', {durability: saved.durability, redirectSafe: saved.durability === 'persistent'});
  }
  async function pendingReceipt(item) {
    if (abandoned.has(item.runId)) throw Error('run-abandoned');
    if (item.receipt?.claimToken) return item.receipt;
    const receipt = await send({action: 'pending', run: wireRun(item), claimNonce: item.claimNonce, ...(item.attribution ? {attribution: item.attribution} : {})});
    if (abandoned.has(item.runId)) throw Error('run-abandoned');
    await queue.update(item.runId, {receipt});
    return receipt;
  }
  const runKeys = ['schemaVersion', 'runId', 'gameId', 'ruleVersion', 'score', 'result', 'durationMs', 'actor', 'context', 'provenance', 'submissionEligible'];
  function wireRun(item) { return Object.fromEntries(runKeys.map(key => [key, item[key]])); }
  async function performClaim(item) {
    if (abandoned.has(item.runId)) return states.get(item.runId);
    emit(item.runId, 'saving');
    const receipt = await pendingReceipt(item);
    if (abandoned.has(item.runId)) return states.get(item.runId);
    const result = await send({action: 'claim', runId: item.runId, claimToken: receipt.claimToken}, true);
    if (abandoned.has(item.runId)) return states.get(item.runId);
    await queue.acknowledge(item.runId);
    return emit(item.runId, 'saved', {receipt: result});
  }
  function submit(runId) {
    return single(runId, async () => {
      const item = await queue.get(runId); if (!item) return states.get(runId) ?? emit(runId, 'unavailable', {error: 'pending-run-missing'});
      try {
        if (item.actor === 'human' && !item.guestName) {
          const token = await getToken();
          // Always create the same pending receipt first. This also recovers a
          // response lost before login rather than changing the endpoint/owner.
          if (!token) {
            const receipt = await pendingReceipt(item);
            return emit(runId, 'queued-auth', {receipt: {runId: receipt.runId, expiresAt: receipt.expiresAt}, durability: queue.durability, redirectSafe: queue.durability === 'persistent'});
          }
          return await performClaim(item);
        }
        emit(runId, 'saving');
        const result = await send({action: item.actor === 'ai' ? 'ai' : 'guest', run: wireRun(item), ...(item.guestName ? {guestName: item.guestName} : {}), ...(item.attribution ? {attribution: item.attribution} : {})});
        await queue.acknowledge(runId);
        return emit(runId, result.status === 'rejected' ? 'nonqualifying' : 'saved', {receipt: result});
      } catch (error) { return abandoned.has(runId) ? states.get(runId) : problem(runId, error); }
    });
  }
  function claim(runId) {
    return single(runId, async () => {
      const item = await queue.get(runId); if (!item) return emit(runId, 'unavailable', {error: 'pending-run-missing'});
      try { return await performClaim(item); } catch (error) { return abandoned.has(runId) ? states.get(runId) : problem(runId, error); }
    });
  }
  async function prepareSignIn(runId) {
    const item = await queue.get(runId);
    if (!item) return emit(runId, 'unavailable', {error: 'pending-run-missing'});
    try {
      await pendingReceipt(item);
      if (abandoned.has(runId)) return states.get(runId);
      // A server receipt cannot be recovered on reload without its private local
      // capability. Prefer modal sign-in when local storage is unavailable.
      return emit(runId, 'queued-auth', {durability: queue.durability, redirectSafe: queue.durability === 'persistent'});
    } catch (error) { return abandoned.has(runId) ? states.get(runId) : problem(runId, error); }
  }
  async function getRecovery(runId) {
    const item = await queue.get(runId);
    if (!item || item.actor !== 'human' || item.guestName || abandoned.has(runId)) return null;
    const receipt = await pendingReceipt(item);
    return Object.freeze({schemaVersion: 1, runId, claimToken: receipt.claimToken, expiresAt: receipt.expiresAt});
  }
  function claimReceipt(recovery) {
    return single(recovery.runId, async () => {
      try {
        const result = await send({action: 'claim', runId: recovery.runId, claimToken: recovery.claimToken}, true);
        await queue.acknowledge(recovery.runId);
        return emit(recovery.runId, 'saved', {receipt: result});
      } catch (error) { return abandoned.has(recovery.runId) ? states.get(recovery.runId) : problem(recovery.runId, error); }
    });
  }
  return {
    enqueue, submit, claim, prepareSignIn, getRecovery, claimReceipt, leaderboard,
    listPending: () => queue.list(),
    async abandon(runId) { abandoned.add(runId); await queue.abandon(runId); return emit(runId, 'abandoned'); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getState(runId) { return runId ? states.get(runId) ?? null : [...states.values()]; },
  };
}
