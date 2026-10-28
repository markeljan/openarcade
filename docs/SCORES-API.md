# OPENARCADE S02 score persistence

Depends on score contract PR #1 / `6f27b944`, S03 identity PR #3 / `1558d292` and S05 single catalog PR #6 / `f33268dd`. No dependency or lockfile changes. Games are enabled by their complete matching rule and coverage shards; no game list is duplicated in the API. Snake is S06's first consumer, followed by the other shards. Pending coverage does not block deploying this infrastructure.

## Migration and configuration order

1. S01 confirms a separate isolated Preview/Development database. Existing feedback documentation warns that Preview/Production originally share data. Never infer isolation from a deployment name.
2. Apply `db/feedback-schema.sql` if this is an empty database, then the complete `db/score-schema.sql`. The latter is additive and idempotent, runs with invoker rights, and seeds nothing. It can be applied twice. Existing feedback tables are untouched.
3. Supply `DATABASE_URL`, `SCORE_RECEIPT_SECRET` (32 or more cryptographically random characters), `SCORE_ALLOWED_ORIGINS` (comma-separated exact origins), and `SCORE_WRITES_ENABLED=false`. S03's `CLERK_*` configuration is documented separately. Use distinct receipt secrets and data in Preview/Production. Do not commit or log values.
4. Deploy, verify reads and disabled writes, then S01 enables writes only on the confirmed isolated target for integration testing. Capture environments keep the server switch false. A browser flag alone is insufficient.
5. S01 controls production migration/deployment/enabling after isolated verification. Rollback can disable writes immediately and roll back application code; leave additive schema in place. No migration was executed on a remote or production database by S02.

`SCORE_ALLOWED_ORIGINS` must include `https://openarcade.io` for production and the exact approved Preview origin separately; no wildcard. In an embed the request origin is the app's iframe origin, not the parent social site. No third-party cookie is required. Vercel's `x-vercel-forwarded-for` is used for rate limiting only when the server environment says `VERCEL=1`; local runs use the socket IP. See [Vercel headers](https://vercel.com/docs/headers/request-headers). Request parsing uses the existing [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js) req/res interface.

## Browser integration

```js
import {createScoreClient} from './scores/client.js';
const scores = createScoreClient({getToken: () => auth.getToken()});
scores.subscribe(state => renderSaveState(state));
async function onResult(run) {
  const state = await scores.enqueue(run); // IDB transaction finishes first
  if (state.status === 'pending') await scores.submit(run.runId);
}
// Before showing Clerk:
const state = await scores.prepareSignIn(runId);
if (state.redirectSafe) auth.signIn();
else showMemoryOnlyNoticeAndRecoveryOption();
// After login/cancel/reload: listPending() and submit(id) each retained run.
```

Methods: `enqueue(run, {guestName?, attribution?})`, `submit(runId)`, `claim(runId)`, `prepareSignIn(runId)`, `listPending()`, `abandon(runId)`, `leaderboard(gameId, {filter})`, `subscribe(listener) -> unsubscribe`, `getState(runId?)`. `filter` is `players` by default, `ai` or `all`. Independent run records live in IndexedDB `openarcade-scores-v1/pending`; the first private nonce, immutable payload and seven-day expiry survive retries. An acknowledgment deletes only its own run. Receipt updates cannot overwrite immutable run facts. No gallery result is queued or submitted.

Events include `runId`, `status` and optional `error`, `durability`, `redirectSafe`, `receipt`. Statuses are `pending`, `saving`, `queued-auth`, `saved`, `retry`, `nonqualifying`, `unavailable`, `expired`, `abandoned`, `ignored`. Result panels should persist independently of canvas timeout. For guest embeds, call `enqueue(run, {guestName:'ABCD', attribution:'x'})` then `submit(runId)`. The server validates exactly four uppercase A–Z letters. Display Guest and an unverified source label; From X denotes route attribution only. Guest scores have no account ownership; guest comment writes are unsupported.

If IndexedDB is blocked/aborted/unavailable, the queue retains a page-memory copy and reports `durability:'memory', redirectSafe:false`. **Reload, navigation or external sign-in can lose this copy, even with modal/popup auth.** Show that limitation. An explicit user recovery option can copy `JSON.stringify(await scores.getRecovery(runId))`; `claimReceipt(recovery)` after verified login recovers the server receipt without local gameplay data. The recovery code is a private bearer capability: do not log it, expose it on leaderboards or place it in URLs. This explicit copy is optional; memory fallback alone does not promise reload durability.

Normal pending-login runs stay private: the server saves the human payload in a seven-day receipt without a leaderboard row. Verified claim atomically creates the account row and consumes ownership; two accounts cannot claim the same run. The same account can retry. Cancelling login or abandoning the local queue does not publish a Guest score. Expiry cleanup removes private unclaimed payload and claim hash. A request already accepted by the server cannot be cancelled retroactively; abandonment prevents later client continuations. Explicit guest submission is the only unauthenticated path creating a public human row.

## API and integrity

`GET /api/scores?gameId=snake&filter=players` returns `{gameId,ruleVersion,metric,units,order,filter,integrity:'client-reported',entries,personalBest,epoch,threshold}`. Entries expose `runId,score,displayName,actor,guest,context,attribution,createdAt`, never account IDs or claim/fingerprint data. Personal best is returned only for a verified requesting account and is retained below top 10. Invalid supplied authorization is not silently treated as a guest.

`POST /api/scores` uses JSON bodies at most 8192 UTF-8 bytes (including already-parsed objects), an exact allowed Origin, and the server write policy. Actions:

| action | data / authority |
| --- | --- |
| pending | run + private 32-byte base64url claimNonce; private pre-login receipt |
| claim | runId + claimToken + verified Clerk Bearer session |
| submit | run + verified Clerk Bearer session (direct account integration) |
| guest | human embed run + guestName + optional attribution `x`/`direct` |
| ai | intentional watch/embed AI run |

Run fields follow `SCORE-CONTRACT.md`; rules constrain finite score, integer requirements and plausible active duration/bounds per game. Body-supplied account/author IDs are rejected. Canonical fingerprints bind action, immutable run, nonce/guest attribution and verified initial owner. Reusing a run ID with another payload/owner/action conflicts. The pending token is server HMAC-derived from the private nonce and fingerprint, making lost-response retries stable without making public payload sufficient to recover it. Only its hash is stored. A cryptographic capability grants claim authority, not proof of gameplay.

Durable IP and verified-account rate limits are independent committed Postgres upserts (120 and 60 writes/minute respectively). Rejected score transactions cannot roll back counts. A shared secret HMAC hashes IP/account limiter keys; visitor UUIDs do not establish ownership. Malformed payloads/config/storage failures return stable safe error codes; logs include only `scores-unavailable`, never tokens, body, account IDs or SQL errors. All public results are client-reported, not replay-verified or cheat-proof.

## AI top 10, ties and retention

Qualification is **per game/rule-version AI board**, separate from default Players. Every writer takes a global run advisory lock and then a board row lock before reading the cutoff. At READ COMMITTED, later statements see committed changes after lock waits; the submit function performs qualification, stable server naming, receipt and insert/prune in one transaction. This uses one parameterized Neon HTTP query, consistent with its [noninteractive transaction model](https://neon.com/docs/serverless/serverless-driver) and [Postgres row/advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html).

Order is the game's `asc` or `desc`, then earlier server acceptance and run UUID. A new score equal to a full board's cutoff is rejected. Accepted names cycle server-side through AI-Albert/AI-Tom-style labels; receipt replay returns the original outcome/name even after displacement, without reinsertion. Only ten AI score rows remain; rejected AI results never create leaderboard rows or store their score in receipt metadata. Human account scores remain available for personal-best queries.

Threshold hints cache by version/epoch and reset on epoch changes. They support presentation only: deletion may occur immediately after any browser read, so only the locked SQL operation may reject. No per-frame transport exists; each terminal run submits once and concurrent/repeated same-run client requests coalesce. Replays do not create new score rows. Nonqualifying attempts may update durable limiter counts and retain fixed-size idempotency receipts, not rejected score records.

`arcade_score_cleanup()` deletes expired limiter buckets and clears expired unclaimed private payload/token hashes. It intentionally keeps minimal fixed-size UUID/fingerprint/outcome replay markers for global idempotency, including displaced/rejected AI; total marker count grows with unique runs and needs capacity monitoring. It is not an unlimited gameplay history or a promise of bounded total database size. S01/S11 should schedule cleanup via their operations process; no new cron/framework is introduced here.

## Moderation and verification

Operator-only SQL `SELECT arcade_score_set_removed('RUN-UUID'::uuid,true);` hides a row under the same board lock and increments epoch. For human rollback, pass false. AI restoration is refused to avoid inserting an unchecked eleventh row; preserve its receipt evidence and let a new legitimate run qualify. Use a new rule version for a scoring reset; all boards and caches are version-scoped. These helpers are not public API actions. Never delete receipt markers to reset a board.

Focused command: `node --test tests/scores-run.test.js tests/scores-registry.test.js tests/scores-api.test.js tests/scores-client.test.js tests/scores-pending.test.js`. Database tests require both `SCORE_TEST_DATABASE_ISOLATED=1` and a separate `SCORE_TEST_DATABASE_URL`; there is deliberately no DATABASE_URL fallback. For local PostgreSQL, optionally set `SCORE_TEST_PG_MODULE_PATH` to an externally installed pg module. Neon HTTP runs expect the migration applied separately through psql/editor. The pg module is not a runtime dependency.

S02 verified 37 focused checks on 2026-10-28 including 24 concurrent local PostgreSQL 17 submissions, ascending negative/fractional scores, ties, pruning/replay/conflicts, two-account claim races, private pending state, below-top10 personal best, expiry cleanup, durable limits, removal epochs and rollback. Seven real Chromium/IndexedDB checks passed at `tests/browser/scores.html`, including actual reload, concurrent database connections, immutable nonce, run-specific acknowledgment and memory fallback. Build passed. Later recovery-code test adds one focused check. These results do not establish deployed Vercel/Neon transport, actual Clerk login/redirect/two-user identity, embed third-party behavior or the final 112-game instrumentation join; S01/S12 must verify those on isolated staging before production writes are enabled.
