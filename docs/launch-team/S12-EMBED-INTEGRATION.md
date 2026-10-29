# S12 embed integration evidence

## Scope and method

The S12 HTTP verifier checks the initial HTML of each catalog game and its dedicated `/embed/<id>` route, the game-specific canonical and OG metadata, image bytes and hashes, and unknown-game 404s. `--embeds` additionally requires the embed entry, script, `noindex`, correct game title and canonical URL, and no `X-Frame-Options` header. `--require-frame-policy` requires the deployment headers: the full site uses `frame-ancestors 'none'` and `X-Frame-Options: DENY`; embeds use exactly `'self'`, `https://x.com`, and `https://twitter.com` in `frame-ancestors`, with no X-Frame-Options. Vite preview does not serve `vercel.json` headers; do not use that flag against plain Vite preview.

Local source baseline: merged `f1390d37dbc1ac78a376135e07fd754835564bb7` (canonical integration #16 / `ada27671`, embed shell #11 / `acf4e7d`), plus S12-only harness changes. `npm run build` passed. Dedicated Vite preview port 4313, API/remote traffic blocked in isolated browser profiles.

- Raw HTTP **227/227 passed**: homepage, all 112 canonical game pages, all 112 embed pages and both unknown-game/embed 404s. Initial canonical/OG/Twitter data is game-specific; 113 mapped-local PNG responses matched dimensions and SHA-256 versions. Vercel framing headers are not asserted from Vite preview, and the actual advertised public image host remains unverified by this mapped-local check.
- Gallery/player browser smoke **112/112 IDs passed**, with all seven representative lifecycle/silence/input checks and no browser exceptions.
- Focused manifest/traffic-policy, score-registry contract and embed-control tests: **6 passed**, 0 failed/skipped.
- Shared score registry coverage at this baseline: **19/112 complete**, all 112 image IDs present. The exact remaining 93 scoring IDs come from `scripts/s12-coverage.mjs`; subsequent unmerged worker branches are outside this snapshot.
- Representative same-origin iframe Snake/Machine Hunt render/start/pause/restart checks passed. Full 112-embed render and canonical direct/reload evidence is recorded below when complete; no persistence is implied.

The first stricter HTTP rerun failed fetches after a tool-runtime refresh terminated the local server. The server was restarted on its now-free S12 port and the complete 227-check rerun passed. This was infrastructure failure, not an observed site defect.

## Mobile defect and owner handoff

At the baseline above, a 390 × 844 Machine Hunt iframe places arrow buttons at y=812.98–856.98 and Space/X/Shift at y=862.98–906.98. The bottom controls cannot be hit within the initial iframe viewport. S12 reported the functional clipping to S05 and S01; S05 independently reproduced it and prepared PR #28 (`e050bfff` at handoff), with measured wrapped-control layout and a static fallback link. The fix is **not verified by S12 until its merged SHA is consumed and the viewport matrix is rerun**. S12 does not own or edit the embed implementation.

## Observed hosted sample

S11 reported immutable deployment `dpl_2orGLyx4pTn8ELD4nDBqRWHqPE9Q`, commit `f1390d37`, at `https://openarcade-pb96bpiv3-w3gpt.vercel.app`: `/games/snake` returned 200 with `frame-ancestors 'none'` and `X-Frame-Options: DENY`; `/embed/snake` returned 200 with `frame-ancestors 'self' https://x.com https://twitter.com` and no X-Frame-Options. This is a reported single-route header sample, not a complete hosted route check. This deployment is not isolated database staging or a production promotion.

## Boundaries

The full-site link is constructed by JavaScript in the embed runtime for a valid game and is also used for disabled and load-failed embeds. The current initial HTML contains a loading message but no static full-site link; the raw HTTP verifier cannot establish link behavior, JavaScript execution, gameplay, score persistence, or embedded failure handling. Existing `tests/s05-embed-browser.test.js` covers a local Snake player, a Machine Hunt same-origin iframe and touch, sound preference and denied storage, and verifies the link's `rel`; it does not establish the failure/disabled link targets or external frame behavior. A successful local iframe and framing headers do not establish X Player Card approval or playback in X clients. No new social post is implied by this evidence.

No account/comment/guest/score writes, Neon or Clerk end-to-end tests were attempted. The production-configured candidate is not isolated write staging. Release and actual X-client behavior remain with the documented S01/S11 prerequisites.

## Verified merged mobile fix and closeout

Consumed merged mobile fix `e886b2baffee68ed989d65d206d99e97e97c3239` in the combined source baseline `8356b167c926f02e7802f54c822f397f85309124` (including auth/comments and score API code). Fresh `npm ci` and `npm run build` passed. The complete local iframe run passed **112/112 canvases and all eight representative checks**, with no browser exceptions. Canonical direct URL/reload, old `?game=snake`, desktop start/pause/restart and exact full-site link passed. Machine Hunt controls were present, at least 44 × 44, within the iframe viewport and center hit-testable at **320 × 568, 390 × 844, 512 × 512, 720 × 720 and 844 × 390**. Each size passed held touch down/up, synthetic blur key release, stopped drawing while blurred, focus resumption and touch-end release. This closes the reproduced mobile clipping defect in local evidence. Physical touch devices, genuine backgrounding and X clients remain unverified.

The final S12 capture-harness review also fixed partial/failed runs changing image bytes without updating the manifest: partial runs require separate output, full batches stage and validate all outputs, and publication uses backup/rollback while preserving unowned fallback assets. Four focused filesystem/guard tests pass, including generation failure and simulated install failure; existing published cards were not regenerated.

Closeout leaves only S12 harnesses, tests and evidence changes in PR #23. S01 remains the merger/release authority. Optional further protected-connector sampling is stopped. Isolated live Clerk/Neon, final combined auth/guest UI, public post-release checks and actual X clients are unfinished prerequisites, not reported passes. No recurring automation or future wakeup was created by S12.
