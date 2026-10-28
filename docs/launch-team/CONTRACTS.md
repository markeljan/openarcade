# OPENARCADE S01 interface decisions

Status: execution alignment, 2026-10-28. S02 run/rule schema is frozen by merged PR #1 (`6f27b94`); S03 server identity by merged PR #3 (`1558d29`). Browser auth, score API/client and S05 catalog/routes are still being integrated. Exact merged SHAs are recorded in STATUS.md before consumers rebase and use them.

## Game outcomes and run ownership

- Games emit finite numeric `{score, result}` at real terminal boundaries through factory `options.onResult`; preserve the documented custom-game `finish` callback through an adapter. Never parse rendered text, call the network in games, or invent generic scores.
- S02's controller enriches an immutable outcome with opaque unique run ID, game ID, score-rule version, active duration, actor and context. One terminal report per run. Each factory/run captures its generation; stale callbacks are ignored.
- Contexts distinguish silent gallery previews, intentional watched AI, manual player and embed. Gallery previews still expose outcomes for coverage but do not submit public scores. Intentional watched AI is eligible under the versioned AI top-10 policy.
- Manual takeover begins fresh state with human provenance. Restart, mode transition and disposal invalidate the old run; pause does not add gameplay duration. Changing mode and creating the fresh run must be atomic. Existing main start/watch restarts before switching interactive mode, so S04 must integrate an explicit mode-aware start contract rather than infer provenance from that order.
- Abandon the old reporter generation before releasing inputs or destroying the old game: those hooks may run game code. Then create the new bound finish closure/factory. Destroy or abandon the reporter before close cleanup as well.
- Preserve silent previews, held-input release, focus, pause, restart, local/offline play, result cards and cleanup. AI must not write a human local best.
- S02 owns versioned rule/evidence schemas and registry assembly. S06–S10 own disjoint complete-game shards and unique tests. Public scoring stays disabled until a game's rule and explicit human/AI terminal evidence land. Final join must contain exactly the catalog's 112 IDs once each.

## Identity, score API and pending saves

- S03 server helper: `server/auth.js` / `verifyRequestIdentity(req)` returns explicit authenticated (`userId`, `displayName`), unauthenticated or unavailable state. Verify Clerk token/issuer/authorized parties; never trust payload identity.
- S03 browser helper: `src/auth.js` with state, token, sign-in, sign-out and subscription hooks. S03 publishes exact shapes to S02/S04. Anonymous play/read/votes and historical anonymous comments remain available; new comment writes require verified Clerk identity.
- S02 owns leaderboard read/submit/claim API and browser client. Default board is Players, with separate AI and optional combined views; human guests are labelled and do not acquire account ownership through visitor UUIDs. AI names are server assigned, stable across retries.
- Persist human result before opening login. Queue by run ID and clear only the acknowledged item. Test cancel, redirects/reload, retries, blocked storage and two users. Memory-only fallback must expose its reload limitation.
- AI retention is the per-game/rule-version AI top 10. Reject lower AI without retaining their leaderboard score rows; atomic SQL qualification/pruning and durable idempotency/rate limits need isolated Postgres evidence. Account personal bests may remain below the public cutoff. Scores are client-reported, not cheat-proof.
- S02 publishes final route/body/response details before S04/S05 consume the API. S11 applies additive migrations and environment configuration before deployed consumers.

## Catalog, routes and images

- S05 extracts the single browser-safe catalog/loader and URL helpers; S04 consumes them through coordinated edits to main.js. Preserve lazy module loading and stale-instance disposal. Build/embed must not import side-effectful main.js.
- Canonical routes: `/games/:id`; isolated playable iframe routes: `/embed/:id`; retain old `?game=:id` links. Unknown IDs return a genuine 404. Navigation/reload/close/popstate and query cleanup need checks.
- Public canonical origin is `https://openarcade.io`, confirmed as an existing verified custom domain through S11's authoritative domain listing. The vercel.app and www aliases redirect there. Social/canonical URLs are absolute HTTPS and present in initial HTML.
- Proposed image paths: `/social/games/<id>.png` plus a homepage image; S05/S12 finalize exact asset manifest together. Every final image must capture actual rendered gameplay with name and OpenArcade framing.
- Embed uses shared game rules/lifecycle, isolated UI, accurate touch controls and full-site fallback. Four uppercase A–Z guest-name slots; server validation; route/source labels are unverified attribution. Do not rely on third-party cookies.
- Public embed/iframe evidence does not establish X client support. Record actual desktop/mobile evidence separately; ship image/link fallback and report unsupported or unverified clients honestly.

## Ownership and release boundary

S04 owns main.js/style.css and player hooks; S05 owns index/build/routing/embed/catalog; S02 owns score infrastructure; S03 owns auth/feedback; game batches own complete modules; S11 owns external setup/runbook; S12 owns captures/verification. S01 owns contract decisions/tracker and alone merges/promotes. Request a concrete patch from the owner unless ownership is explicitly handed over. Package/lock edits are announced and merged serially. Preserve Vite, Vercel Functions and Neon; no launch framework migration.

## Approved scoring boundaries

S06's genuinely endless classic games use visible 60-active-second rounds with the same existing points/penalties for both actors, including Balance Box (earlier fall, seconds balanced) and Bumper Ball (earlier loss, bumper-hit points). Maze Runner, Slide Puzzle and Coin Maze use elapsed active milliseconds on completed solves, ascending order; incomplete solves cannot claim a fast winning time. Keep other existing natural terminals.

Genuinely endless feature games use visible 120-active-second version-1 rounds unless an approved meaningful completion event exists. Explicit game metrics still require numeric source-state instrumentation and actor tests; a generic wrapper alone is not coverage. S09 Harbor Hoist measures actual cargo mass safely dispatched. Pauses exclude time; completed runs stop accumulation, show a result and start fresh next time.

Approved event boundaries include S07 Meat Lad fifth death, Machine Hunt fatal depletion, Ghost Shift completed deposit, Wingrush first fort toppled, Pico first glade clear and Pursuit first bust. S08 may end Coral at a full reef cycle, Beacon at eight saved ships/first dawn, Railway after eight deliveries through district progression, and Pottery at a three-pot gallery set. Both actors use the same events and scoring, including finale bonuses before reporting. Existing finite finales retain their natural terminal instead of a generic time cap.
