# OPENARCADE S12 capture delivery

The delivery contains 112 actual rendered-game cards and one branded homepage mosaic, all PNG at 1200 × 630. `public/social/manifest.json` is the S05 integration interface: `version: 1`, `games[id]` and `homepage`, each with `path`, `width`, `height`, `alt` and a SHA-256 `version`. Use that version as the image query parameter for cache invalidation. All 112 launch IDs are present; none is missing or blank by the capture checks and contact-sheet review.

The cards use the existing game factories and wrappers, not invented game art. Portrait and landscape playfields fit without stretching or cropping. The homepage uses six of those real captures. Combined game PNG size is about 6 MiB; there are no extra recordings or raw screenshots in the repository.

## Reproduce locally

Use Node 24 with native WebSocket support and Chromium/Edge installed. No new package dependency is required. `S12_BROWSER` may name an installed Chromium executable.

1. In this checkout, run `npm ci`, then `npm run dev -- --port 4312 --strictPort`.
2. Run a representative capture first: `node scripts/s12-capture.mjs snake machine-hunt --out=<temporary directory>`. Partial runs intentionally do not publish a manifest.
3. Run `node scripts/s12-capture.mjs` for all cards, homepage and provenance.
4. Run `node scripts/s12-review-cards.mjs --out=<temporary directory>`, then visually review both contact sheets and representative full cards.
5. Run `node --test tests/s12-captures.test.js tests/feature-registry.test.js`.

Use a separate port/checkout and the generated temporary browser profile. Stop only the server you started. The capture page imports factories directly without importing the gallery or score client. It uses noninteractive autoplay, disables game audio and local storage writes, and drives a seeded random generator plus 240 animation-frame steps. The browser helper intercepts API and nonlocal HTTP requests and blocks WebSockets. The local Vite server does not run Vercel Functions. This capture workflow cannot establish deployed API/database behavior.

`public/social/provenance.json` records source hashes, each image hash, source playfield dimensions, color sample count, recent frame HUD labels and signatures, and the selected frame. The supplied captures used this worktree's parent-owned Vite server; their source binding was an operator check. The harness now additionally verifies Vite raw source imports against local hashes before future captures. Most recent rendered labels are retained across skipped 30 fps preview ticks. Obvious loading, instruction and result text excludes a sampled frame; nonuniform pixels alone do not prove gameplay. Contact-sheet review remains required.

## Recorded evidence, 2026-10-28

- Captured source baseline: `574f811ec06776c9137553d73fcd8377152cd533`. The source hashes in provenance are authoritative for the captures; future score/UI changes can require a retake.
- Browser: Microsoft Edge `156.0.4314.50`, Windows, headless Chromium canvas; fixed device scale 1.
- Snake and Machine Hunt reviewed at full card size before batching. Both final contact sheets (112 IDs) and the homepage mosaic reviewed after capture. No loading, instructions or result overlay was observed. Every ID has nonempty sampled HUD labels and changing sampled raster signatures.
- Focused manifest/traffic-policy checks and feature catalog check passed: 3 tests, 0 failures, 0 skips.
- Local gallery/player smoke on the same baseline passed 112 unique IDs, watching mode, a later canvas draw, and nontransparent pixels. Representative desktop takeover, key down/up, restart, watch, rapid next, close, simulated visibility pause/resume, and emulated 390 × 844 touch cancellation passed. No browser exceptions. This is finite smoke evidence, not exhaustive gameplay or score verification.

Seeded randomness and stepped animation improve repeatability, but `performance.now()`, browser fonts/rasterization and environment differences can change bytes. Captures show existing autoplay states, not guaranteed winning runs or source-game fidelity. Frame HUD text is used only to exclude overlays; it never supplies scores.

S01 remains the merge/release authority. No environment variables, migrations, package/lock changes or production writes are part of this PR. Integrated score, identity, database, embeds, published social metadata and actual X clients remain pending their deployed prerequisites. An iframe or these static cards do not demonstrate X inline gameplay.

The capture uses Chromium's documented [Page screenshot/canvas tooling](https://chromedevtools.github.io/devtools-protocol/tot/Page/) and the metadata contract follows [Open Graph image properties](https://ogp.me/). Current former X Player Card documentation redirects to the [general X documentation](https://docs.x.com/overview); actual client support is not inferred from that page.
