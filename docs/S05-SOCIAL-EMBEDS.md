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
- `VITE_X_PLAYER_ENABLED`: `true` opts into Player Card metadata on game pages. Default is an ordinary large image card. A build with this enabled requires the dedicated embed entry.
- `VITE_EMBEDS_ENABLED`: `false` disables playable shell and Player Card advertising; full-site links and image cards remain available.

S12 supplies `public/social/manifest.json`: `{version:1,games:{id:{path,width,height,alt,version}}}`. Game paths are `/social/games/<id>.png`; `version` is a safe content hash/revision and appears as `?v=` in the absolute image URL. Referenced files must exist at build time. Until a capture lands, pages use the actual branded `/social/site-card-v1.png` fallback; they never advertise nonexistent gameplay images. `scripts/create-site-card.py` recreates that card with Pillow as an optional authoring tool, not a runtime/build dependency.

## Framing and evidence

Only `/embed/` permits framing, with `frame-ancestors 'self' https://x.com https://twitter.com`. Other paths deny framing, including login/account routes. There is no conflicting X-Frame-Options on embed, no global COOP/COEP, no User-Agent-dependent HTML and no `og:video` claim.

[Rosebud's report](https://rosebud.ai/engineering/making-rosebud-games-playable-in-x-posts) describes 720 × 720 X Player Cards and dedicated anonymous iframe routes. This is evidence of their implementation. Both historical X Player Card documentation URLs redirected to [the general X docs](https://docs.x.com/overview) during S05 research; current official acceptance requirements and universal game rendering could not be established. OpenArcade must verify actual X clients independently. An image/link card is the supported fallback; no public post is authorized by this implementation.

Sources: [Open Graph](https://ogp.me/), [Vite plugin hooks](https://vite.dev/guide/api-plugin.html), [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel Vite routing](https://vercel.com/docs/frameworks/frontend/vite), [CSP frame ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

Focused checks: `node --test tests/s05-catalog.test.js tests/s05-social-pages.test.js`, `npm run build`, raw built HTML inspection. Deployment checks still required: public HTTPS origin, actual response/image MIME and framing headers, extensionless/trailing-slash/unknown routes, gallery route integration, API/guest persistence, iframe inputs and lifecycle, X desktop/mobile rendering. Unit fixtures do not establish those external behaviors.

