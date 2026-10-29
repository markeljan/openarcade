# OPENARCADE S02 score contract v1

This independently mergeable foundation enables no games by itself. Existing games and local bests retain their behavior until their owner instruments the real terminal boundary. Public scores are client-reported; neither run IDs nor receipts prove gameplay.

## Run adapter

Import `createRunReporter` from `src/scores/run.js`. A canvas wrapper accepts `options.onResult(record)` and optional `options.onError(error, record)`. Its internal game factory receives `finish({score, result})`; `onResult` is the public wrapper notification, not a second terminal callback.

```js
const reports = createRunReporter({gameId: id, ruleVersion: 1,
  actor: options.interactive ? 'human' : 'ai',
  context: options.context ?? (options.interactive ? 'manual-player' : 'gallery-preview'),
  onResult: options.onResult, onError: options.onError});
function fresh({interactive, context}) {
  reports.abandon(); // invalidate old finish BEFORE release/destroy callbacks
  releaseHeldInputs();
  game?.destroy?.();
  const finish = reports.beginRun({actor: interactive ? 'human' : 'ai', context});
  game = factory({finish}); // legacy factories adapt end(message, score) here
}
// Count the runtime's active dt before game.update, never draw or wall time.
reports.advance(dt);
game.update(dt, auto);
```

Every restart, takeover and change of actor creates a fresh factory and bound finish closure. Invalidate the previous callback with `reports.abandon()` before invoking input-release or destruction hooks, since those hooks can call game code. Close invalidates before cleanup too. Expose `player.beginRun({interactive, context})` to perform this atomically; the UI must prefer it over the old restart-then-setInteractive sequence. `setInteractive` must enforce fresh state on actor changes even for callers outside main. Restart in the same mode preserves its context and creates another ID. `reports.setPaused(true/false)` mirrors pause/resume; pause excludes duration and suppresses late completion. `reports.abandon()` invalidates a callback without reporting; `reports.destroy()` invalidates permanently. Close, mode changes and stale callbacks cannot complete abandoned runs. Finish once at the actual terminal boundary, before any AI reset; best-score updates and HUD text are not terminal evidence. After reporting an AI result, start a new factory/reporter run before the next simulation.

The frozen record has exactly these contract fields:

| Field | Type / meaning |
| --- | --- |
| schemaVersion | integer `1` |
| runId | cryptographic UUID, unique per fresh factory run |
| gameId | canonical catalog ID |
| ruleVersion | positive integer, must equal enabled rule version |
| score | finite number, zero/negatives allowed by adapter; rule sets actual bounds |
| result | nonempty terminal label, up to 80 characters |
| durationMs | integer active simulation milliseconds; paused time excluded |
| actor | `human` or `ai`, bound before factory creation |
| context | `gallery-preview`, `watch-player`, `manual-player`, `embed` |
| provenance | `client-reported` |
| submissionEligible | false for gallery previews; true for other contexts |

Gallery previews and watch players are AI; manual players are human; embeds may run AI attract mode or a fresh human run. Gallery outcomes establish lifecycle coverage but must never call the public submission API or update the human local best. Watch-player is an intentional AI leaderboard run. Network and login remain in the shared score client. Callback errors are isolated from rendering and forwarded to optional onError.

## Disjoint rollout shards

Each scoring owner replaces only `src/scores/rules/sXX.js` and `src/scores/coverage/sXX.js` for S06–S10. Each default export is an array. Empty arrays and pending entries are valid during rollout. `src/scores/registry.js` validates and joins them without importing games or maintaining a second catalog. S05 owns the single browser-safe catalog manifest. The final join is `scoreRegistry.checkCatalog(catalogIds, {complete: true})`: require 112 unique catalog IDs and no problems. Do not demand completeness before the consumer PRs land.

Rule schema v1 (`validateRule` is the executable schema):

```js
export default [{
  schemaVersion: 1, gameId: 'example', source: 'src/example-games.js',
  metric: 'items collected before collision', units: 'items',
  order: 'desc', // asc for lower-is-better
  version: 1, status: 'complete', // pending disables public submissions
  bounds: {minScore: 0, maxScore: 100, integer: true,
    minDurationMs: 0, maxDurationMs: 3600000}
}];
```

Coverage schema v1 (`validateCoverage` is the executable schema):

```js
export default [{
  schemaVersion: 1, gameId: 'example', source: 'src/example-games.js',
  ruleVersion: 1, status: 'complete',
  human: {terminal: 'collision before reset', provenance: 'fresh manual factory',
    tests: ['tests/sXX-example.test.js']},
  ai: {terminal: 'same collision before reset', provenance: 'same rules, AI decisions only',
    tests: ['tests/sXX-example.test.js']}
}];
```

Pending coverage needs schemaVersion/gameId/source/ruleVersion/status only. Complete evidence must describe both actors and link meaningful tests. A game enables only when complete rule and evidence share the exact game ID, source and version. Use honest game-specific bounds and terminal evidence, not generic invented scores. Fixtures in `tests/scores-run.test.js` and `tests/scores-registry.test.js` test the foundation; they do not prove a consumer game or database integration.

## Persistence decisions for the next S02 slice

Default public filter is Players, including account humans and explicitly labeled guests. AI qualification is each game's versioned AI top 10. Only qualifying AI leaderboard rows remain, with atomic pruning; bounded receipt metadata may outlive displaced rows. Ties favor earlier server acceptance then run UUID; cutoff equality does not displace an older row. Stable AI names are assigned server-side. Account personal bests remain available below public top 10.

Persist a completed human run before starting Clerk. Acknowledge or abandon a specific run ID only; never clear a shared latest-result slot. IndexedDB stores independent records; unavailable storage falls back to memory with an explicit reload-durability limitation. Expiring server claim capabilities bind a run and immutable payload, not a visitor UUID. A verified account may claim once, with same-account retries idempotent. Guests have no account ownership. Embed guests enter four uppercase A–Z letters; route attribution such as From X is unverified and must be visibly labeled. Guest comments remain forbidden.

The API and migrations follow as a separate PR, consuming S03's merged verified identity helper. No environment variables, migrations or dependencies are introduced by this contract PR.
