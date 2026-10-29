# OPENARCADE S05: canonical pages and embeds

S05 owns `index.html`, `src/catalog.js`, `src/legacy-catalog.js`, `src/game-loader.js`, `src/social/`, `scripts/social-pages.mjs`, `vite.config.js`, `vercel.json`, `src/embed/`, and social/embed tests. S04 owns gallery integration in `main.js`/`style.css`. No package, lockfile, database or game module changes are required for this slice.

## Shared interface

`src/catalog.js` exports `gameCatalog` and `getGame(id)`. The launch catalog contains all 112 existing games and imports metadata only. Each entry retains original game metadata plus `modulePath`, `factoryExport`, `width` and `height`. Features are 320 × 720; legacy games are 320 × 240. The legacy snapshot is checked against the original metadata by `tests/s05-catalog.test.js`; existing feature-registry parity checks remain applicable. Custom scaffold discovery remains in the gallery's custom runtime; newly added custom games need inclusion in the static metadata catalog before publication.

`src/game-loader.js` exports `loadGameFactory(game)`, resolving to the existing `(canvas,id,options)` factory without constructing it. Check that a request is still current before calling the factory. Owners retain the existing runtime's pause/restart/input release/disposal behavior.

`src/social/urls.js` exports `gameUrl(id,origin?)`, `embedUrl(id,origin?)` (URL objects), and `gameIdFromLocation(location|URL|string)`. Null game IDs produce `/`. Canonical paths are `/games/:id`; `/embed/:id` is separate. Legacy `/?game=:id` remains readable. S04 replaces its inline URL helper and initial/popstate parsing with these exports after this PR merges; it must retain custom-game fallback when consuming the launch catalog.

## Build and routing

Vite emits homepage metadata, 112 `games/<id>.html` pages, a sitemap and useful `404.html`. Every game uses the existing Vite application bundle. `cleanUrls` serves extensionless paths on Vercel. There is deliberately no catch-all SPA rewrite: unknown game/embed IDs must return genuine HTTP 404. The Vite dev/preview plugin also recognizes the game paths and returns 404 for unknown IDs. Development servers do not execute Vercel Functions.

Environment variable names (public build settings, no secrets):

- `VITE_SITE_ORIGIN`: exact HTTPS production origin, no path/query. Default is `https://openarcade.io`, verified by S11 from the project domain list; override before release if the canonical domain changes.
- `VITE_X_PLAYER_ENABLED`: Player Card metadata is enabled by default on game and embed pages; `false` selects the image-card fallback. Production explicitly sets `true`. A build with this enabled requires the dedicated embed entry.
- `VITE_EMBEDS_ENABLED`: `false` disables playable shell and Player Card advertising; full-site links and image cards remain available.

Sharing defaults to `/embed/:id`, which opens the standalone playable shell and advertises its own Player Card. `/games/:id` also points X to that same player, so full-site game links remain shareable. The homepage keeps its image card. When embeds are disabled (or a custom game has no generated embed route), sharing uses the full-site game link. Clipboard copying also exposes the selected URL for manual copying. X's own cache and viewer client still determine when an existing post refreshes and whether it displays an inline player; metadata and standalone browser verification do not prove that external behavior.

S12 supplies `public/social/manifest.json`: `{version:1,games:{id:{path,width,height,alt,version}}}`. Game paths are `/social/games/<id>.png`; `version` is a safe content hash/revision and appears as `?v=` in the absolute image URL. Referenced files must exist at build time. Until a capture lands, pages use the actual branded `/social/site-card-v1.png` fallback; they never advertise nonexistent gameplay images. `scripts/create-site-card.py` recreates that card with Pillow as an optional authoring tool, not a runtime/build dependency.

## Framing and evidence

Only `/embed/` permits framing, with `frame-ancestors 'self' https://x.com https://twitter.com`. Other paths deny framing, including login/account routes. There is no conflicting X-Frame-Options on embed, no global COOP/COEP, no User-Agent-dependent HTML and no `og:video` claim.

[Rosebud's report](https://rosebud.ai/engineering/making-rosebud-games-playable-in-x-posts) describes 720 × 720 X Player Cards and dedicated anonymous iframe routes. This is evidence of their implementation. Both historical X Player Card documentation URLs redirected to [the general X docs](https://docs.x.com/overview) during S05 research; current official acceptance requirements and universal game rendering could not be established. OpenArcade must verify actual X clients independently. An image/link card is the supported fallback; no public post is authorized by this implementation.

Sources: [Open Graph](https://ogp.me/), [Vite plugin hooks](https://vite.dev/guide/api-plugin.html), [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel Vite routing](https://vercel.com/docs/frameworks/frontend/vite), [CSP frame ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

Focused checks: `node --test tests/s05-catalog.test.js tests/s05-social-pages.test.js`, `npm run build`, raw built HTML inspection. Deployment checks still required: public HTTPS origin, actual response/image MIME and framing headers, extensionless/trailing-slash/unknown routes, gallery route integration, API/guest persistence, iframe inputs and lifecycle, X desktop/mobile rendering. Unit fixtures do not establish those external behaviors.

## Dedicated playable shell

The second S05 slice adds `embed.html` and `src/embed/`, producing 112 `/embed/:id` documents. The shell loads only the selected existing factory module, preserving its rules and lifecycle. It starts in silent preview; Start/Restart prefer the shared `beginRun({interactive:true,context:'embed'})` contract when supported. Older uninstrumented wrappers retain their normal local play. Pause, visibility, touch cancellation, blur and navigation release input; pagehide destroys the instance and a restored BFCache entry reloads cleanly. It has no gallery, Clerk, comments or third-party-cookie requirement.

Sound begins off while retaining the full site's stored preference. Explicit sound toggling is a user gesture. Canvas sizing uses each game's logical aspect ratio; touch keys retain the gallery's metadata mapping. The full-site link opens safely in another tab. `VITE_EMBEDS_ENABLED=false` produces an unavailable message plus this link; Player Card advertising is also disabled at build time.

Validation: build passes, `node --test tests/s05-embed-controls.test.js tests/s05-embed-browser.test.js` passes in headless Chrome. Evidence includes desktop Snake Start/Pause/Restart and focus, separate mobile Machine Hunt iframe with 320:720 canvas, 44-pixel touch target and real touch-down/cancel key release, genuine unknown-ID 404 and no gallery entry fetched. Measured controls remain inside 320×568, 390×800, 512×512, 720×720 and 844×390 frames; blur pauses the existing runtime. The browser test explicitly skips if no browser or no built embed output is present; build first. Local preview does not validate Vercel CSP or database persistence. Player Card metadata remains opt-in pending real X-client verification.

## Guest results and private recovery

The final S05 slice consumes merged S02 PR22 / `8356b167c926f02e7802f54c822f397f85309124` and fit PR28 / `e886b2baffee68ed989d65d206d99e97e97c3239`. It uses the shared score client and pending queue with anonymous defaults; it imports no Clerk UI and sends no cookies or account identity. A denied IndexedDB getter selects the shared memory fallback. Ordinary play remains available when saving fails.

Only an enriched, eligible human `embed` result for the selected game offers score choices. Neither previews nor terminal events automatically publish scores. Four accessible A–Z slots normalize uppercase and support paste. The first submission fixes the name and mode for that run; retries retain the UUID and metadata because the API treats that payload as immutable. A public guest save requires the client's exact-run `saved` acknowledgement. Guest names have no account ownership; From X is visibly unverified route/referrer attribution.

The separate Copy recovery code action queues a private pending receipt. Its `queued-auth` status is not a public save. Only after this explicit action does the UI copy `JSON.stringify(await scores.getRecovery(runId))`; denied clipboard access reveals a selectable private field. Capability text never enters URLs, status messages or public data. The user opens the normal safe full-site link, signs in, and uses S04's Recover a score panel. There is no automatic popup/postMessage protocol. Memory storage warns about reload loss until a server acknowledgement or successful recovery copy. Pending receipts expire after seven days under the shared API contract.

Focused form/controller tests cover invalid names, immutable retries, acknowledgement mismatch, stale requests, guest labels and private-copy fallback. The browser test plays Snake to its real terminal boundary, uses the actual shared client with a fixture HTTP response, denies both localStorage and IndexedDB getters, checks no automatic publication, retries a failed guest save with the same UUID, verifies cookie-free requests, and checks private-copy fallback. The HTTP fixture does not establish deployed Neon persistence, Clerk claims, third-party-browser storage policy, or X rendering. Those remain S01/S12 release checks. No database migration or new environment variable is introduced by this UI slice; follow `docs/SCORES-API.md` before enabling isolated writes.

