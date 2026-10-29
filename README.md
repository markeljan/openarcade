# OpenArcade

OpenArcade is a browser canvas arcade inspired by [miniarcade.dev](https://miniarcade.dev/). It presents self-playing game previews and lets you open a game, read its controls, play, restart, or watch its automated player.

Play at [openarcade.io](https://openarcade.io/). The public source repository is [markeljan/openarcade](https://github.com/markeljan/openarcade).

## Run locally

Install Node.js 20.19+ or 22.12+ and npm, then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates `dist/`; `npm run preview` serves the production build locally. The dev and preview scripts bind to `127.0.0.1`.

## What is here

The current catalog contains 112 independently implemented games across several simple arcade genres, including Snake, Breakout, Pong, Maze Runner and Star Defender. The gallery supports wall and row layouts, keyboard navigation, and a modal player with optional sound. It limits running previews to six visible cards and pauses them while a game is open; reduced-motion and data-saving preferences reduce preview activity.

The reference site had 80 games when inspected. OpenArcade is an independent interpretation: 80 games draw inspiration from that catalog alongside additional original games. Mechanics, artwork, audio, and session behavior vary by game, and the catalogs are not a one-to-one mapping. Some games and opt-in custom games persist best scores locally. See [the catalog comparison](docs/CATALOG-COMPARISON.md) for per-game status and known gaps.

## Architecture and adding a game

- `src/main.js` assembles the catalog, manages selection, preview lifecycles and the player dialog.
- `src/style.css` contains the gallery and player styling.
- `src/games.js`, `src/more-games.js` and `src/extra-games.js` define catalog entries, game factories and canvas instance wrappers. `src/extra-additions.js` adds factories and metadata to the last group. `src/feature-games.js` through `src/feature-games40.js` contain portrait reference-inspired games.

To add a game, run:

```sh
npm run new-game -- comet-chase "Comet Chase"
```

This creates `src/custom/games/comet-chase.js` with a small working example. Modules in that directory are discovered automatically; no gallery registration is needed. Replace the example's `create()` factory with your game. It returns `update(dt, auto)`, `draw(ctx)`, and optional `input(key, down)` and `pointer(x, y)` methods. `auto` drives the preview, while interactive mode receives input. The shared runtime provides a 320 × 720 drawing space, animation, input focus, pause/resume, restart and cleanup. Use a unique ID across the entire catalog. Check the preview, player controls, restart and cleanup in a browser, then run `npm test` and `npm run build`. Existing groups use the same lifecycle but have their own renderers. See [adding games](docs/ADDING-GAMES.md) for the full agent-facing contract and verification steps.

## Reference analysis and limitations

The reference-inspired games were developed using observations and source analysis of miniarcade.dev, including [REA](https://rea.tools/). They are independent implementations, and their rules, AI, graphics, audio, and session behavior can differ from the reference. Tests and bounded observations do not establish complete parity.

See the [catalog comparison](docs/CATALOG-COMPARISON.md) for game-by-game limitations, and the [investigation notes](docs/REA-INVESTIGATION.md) for the evidence behind specific changes. Those notes document work over time; later entries may supersede earlier observations.

## Feedback and activity

When you open a game, use the feed controls or swipe to watch more games, then press Play to take control. Games are ranked by upvotes; explicit play starts contribute to the play count. Votes and comments are shared through the feedback API, with one anonymous vote per browser and game. See [feedback setup](docs/FEEDBACK.md) for database configuration and local development, and [data and feedback](docs/PRIVACY.md) for storage and public-content information.

## Operations

See the [deployment and recovery runbook](docs/OPERATIONS.md) for environment names, isolated preview data, additive migrations, moderation and release checks. `.env.example` contains placeholders; keep real values in ignored local files or the provider's environment settings. Vite dev/preview serves the frontend only; use `vercel dev` with an isolated Development database for API testing.

The anonymous, read-only release probe is `node scripts/check-launch.mjs https://openarcade.io`. It checks routes, initial game metadata, an image and feedback reads. Game/embed checks require the corresponding launch features to be deployed. It does not test sign-in, writes or gameplay.
