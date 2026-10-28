# Mini Arcade

A local canvas arcade inspired by [miniarcade.dev](https://miniarcade.dev/). It presents self-playing game previews and lets you open a game, read its controls, play, restart, or watch its automated player.

## Run locally

Install Node.js 20.19+ or 22.12+ and npm, then:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates `dist/`; `npm run preview` serves the production build locally. The dev and preview scripts bind to `127.0.0.1`.

## What is here

The current catalog contains 112 independently implemented games across several simple arcade genres, including Snake, Breakout, Pong, Maze Runner and Star Defender. The gallery supports wall and row layouts, keyboard navigation, and a modal player. It limits running previews to six visible cards and pauses them while a game is open; reduced-motion and data-saving preferences reduce preview activity.

The reference site had 80 games when inspected. This project is an independent interpretation, not a full reproduction: its games and visual style differ, and it does not implement the reference games' complete mechanics, full audio or session flow. Best scores are currently persisted for the six classic bonus games, Machine Hunt, Meat Lad, Turbo Arena, Jelly Dash and custom games that opt in. The two catalogs are not a one-to-one mapping. Eighty games are directly inspired by the reference catalog; their mechanics and art are independent approximations. See [the catalog comparison](docs/CATALOG-COMPARISON.md) for per-game status and known gaps.

## Architecture and adding a game

- `src/main.js` assembles the catalog, manages selection, preview lifecycles and the player dialog.
- `src/style.css` contains the gallery and player styling.
- `src/games.js`, `src/more-games.js` and `src/extra-games.js` define catalog entries, game factories and canvas instance wrappers. `src/extra-additions.js` adds factories and metadata to the last group. `src/feature-games.js` through `src/feature-games40.js` contain portrait reference-inspired games.

To add a game, run:

```sh
npm run new-game -- comet-chase "Comet Chase"
```

This creates `src/custom/games/comet-chase.js` with a small working example. Modules in that directory are discovered automatically; no gallery registration is needed. Replace the example's `create()` factory with your game. It returns `update(dt, auto)`, `draw(ctx)`, and optional `input(key, down)` and `pointer(x, y)` methods. `auto` drives the preview, while interactive mode receives input. The shared runtime provides a 320 × 720 drawing space, animation, input focus, pause/resume, restart and cleanup. Use a unique ID across the entire catalog. Check the preview, player controls, restart and cleanup in a browser, then run `npm test` and `npm run build`. Existing groups use the same lifecycle but have their own renderers. See [adding games](docs/ADDING-GAMES.md) for the full agent-facing contract and verification steps.

## REA investigation

REA 6.8.0 was configured for Codex and used via its CLI with Node 24.22.1. A static analysis of a captured site sample inventoried eight files and parsed six JavaScript files. The initial pass skipped inline HTML scripts; a later REA MCP pass analyzed the extracted gallery and Machine Hunt scripts with partial coverage. The Machine Hunt controls and scoring observations in [the investigation report](docs/REA-INVESTIGATION.md) were also checked manually in the captured source. No execution was inferred from the static graph.

For a fresh Codex setup, follow the [REA setup guide](https://rea.tools/get-started/) and review the proposed configuration before applying it. The CLI can inspect a captured JavaScript tree without an MCP connection or native provider:

```powershell
fnm exec --using 24.22.1 npx.cmd -y rea-agents@6.8.0 analyze-javascript-application "C:\path\to\capture" --json
```

Use a supported Node version and adjust the path and invocation for your environment. REA's Codex integration requires a client restart after setup.

On this Windows installation, the Codex REA MCP entry invokes `fnm exec --using 24.22.1` explicitly so it does not depend on the Node version inherited by Codex. The entry uses the installed absolute `fnm.exe` path and pins REA 6.8.0. If fnm or that Node installation moves, update the REA entry in `~/.codex/config.toml`; restart Codex to load changes. A backup of the preceding REA configuration is `~/.codex/config.toml.rea-node-24.backup`.
