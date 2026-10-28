export const SCORE_SCHEMA_VERSION = 1;
export const RUN_CONTEXTS = Object.freeze(['gallery-preview', 'watch-player', 'manual-player', 'embed']);
function checkMode(actor, context) {
  if (!['human', 'ai'].includes(actor) || !RUN_CONTEXTS.includes(context)) throw new TypeError('Invalid score run mode');
  if (['gallery-preview', 'watch-player'].includes(context) && actor !== 'ai') throw new TypeError('AI context requires AI actor');
  if (context === 'manual-player' && actor !== 'human') throw new TypeError('Manual context requires human actor');
}

/** Terminal callbacks belong to a fresh game instance. No timers or IO. */
export function createRunReporter({gameId, ruleVersion, actor = 'ai', context = 'gallery-preview', onResult, onError, createId = () => globalThis.crypto.randomUUID()} = {}) {
  if (typeof gameId !== 'string' || !gameId || !Number.isInteger(ruleVersion) || ruleVersion < 1) throw new TypeError('Game ID and rule version required');
  checkMode(actor, context);
  let current = null, paused = false, disposed = false;
  function abandon() { current = null; }
  function beginRun(next = {}) {
    if (disposed) throw new Error('Score reporter disposed');
    const nextActor = next.actor ?? actor, nextContext = next.context ?? context;
    checkMode(nextActor, nextContext); actor = nextActor; context = nextContext;
    const run = {runId: createId(), actor, context, elapsed: 0, completed: false};
    current = run;
    return function finish({score, result = 'RUN COMPLETE'} = {}) {
      if (disposed || paused || current !== run || run.completed || typeof score !== 'number' || !Number.isFinite(score)) return null;
      if (typeof result !== 'string' || !result.trim()) return null;
      run.completed = true;
      const record = Object.freeze({schemaVersion: 1, runId: run.runId, gameId, ruleVersion, score, result: result.trim().slice(0, 80), durationMs: Math.round(run.elapsed * 1000), actor: run.actor, context: run.context, provenance: 'client-reported', submissionEligible: run.context !== 'gallery-preview'});
      try { Promise.resolve(onResult?.(record)).catch(error => { try { onError?.(error, record); } catch {} }); }
      catch (error) { try { onError?.(error, record); } catch {} }
      return record;
    };
  }
  return {
    beginRun,
    advance(dt) { if (current && !current.completed && !paused && !disposed && Number.isFinite(dt) && dt > 0) current.elapsed += dt; },
    setPaused(value) { paused = !!value; },
    abandon,
    destroy() { disposed = true; abandon(); },
    getRun() { return current ? Object.freeze({runId: current.runId, actor: current.actor, context: current.context, completed: current.completed, durationMs: Math.round(current.elapsed * 1000)}) : null; },
  };
}
