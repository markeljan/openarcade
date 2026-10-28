# Adding games

Run `npm run new-game -- comet-chase "Comet Chase"` to create a starter module in `src/custom/games/`. The gallery discovers it automatically. Choose an ID that is unique across the existing catalog; the scaffold refuses to overwrite or duplicate one.

A module exports `metadata` and a `create()` function. Each call to `create()` must return a fresh game with `update(dt, auto)` and `draw(ctx)`. Optional `input(key, down)` and `pointer(x, y)` handlers receive player actions. Draw in a 320 × 720 coordinate space. The shared runtime supplies the animation loop, letterboxing, keyboard and pointer focus, preview throttling, pause, restart and cleanup. `dt` is seconds and is capped after interruptions. Do not create separate timers or network dependencies in a game.

When `auto` is true, implement decisions that use the same game rules as the player. When false, use the received inputs; support key releases and do not leave movement stuck after focus changes. Make failure and recovery understandable to the player. Keep previews silent, and start any optional audio from a manual user gesture. Specify controls accurately in metadata. Test both takeover and returning to AI.

Run `npm test` and `npm run build`, then open the game in the browser and check its preview, instructions, controls, restart, AI takeover, and close behavior. The lifecycle test covers the built-in catalogs; a new custom game also needs an actual browser check. Check touch controls if the game uses multiple simultaneous actions. See [the catalog comparison](CATALOG-COMPARISON.md) for existing gaps; do not claim reference parity solely because the theme or title matches.

Example coding-agent prompt: “Create a new `comet-chase` game with the custom scaffold. Make a playable comet-collecting game with keyboard controls and a rule-based autoplayer using the same collision rules. Add clear instructions, test manual and AI play, and report any limitations.”

For an exploratory autoplay check, run `npm run audit:autoplay` or pass selected IDs, for example `npm run audit:autoplay -- snake meat-lad --seed=42`. The seed offset lets you reproduce different random runs. It simulates a seeded 60-second preview and prints canvas HUD snapshots at four times. This helps locate stalls; movement or changing text alone does not prove that the game is winnable, faithful, or safe under every random seed. Add a focused regression test when the audit exposes a real problem.

The custom runtime accepts printable keys, arrow keys, Enter and Shift while the game canvas is focused. Browser and screen-reader shortcuts using Ctrl, Alt or Meta are left alone. Pointer coordinates are relative to the 320 × 720 game area; taps in the letterboxed margins are ignored.


For touch play, metadata may specify `touchKeys: [' ', 'x', 'b', 'Enter']`. The array overrides the action keys inferred from the controls description; use printable single characters, a space for Space, or `Enter` and `Shift`. Arrow buttons are always available. Buttons are inactive until the player starts, and multiple buttons can be held together. If `touchKeys` is omitted, the gallery infers its standard action keys from the controls text.

Custom games can opt into scored runs by accepting `create({ finish })` and calling `finish({ score, result })` when a run ends. Pass a finite numeric score and a short result label. The runtime stops the manual run, displays the result and the highest score saved locally for that game ID, and keeps it visible for about 12 seconds; Enter or Restart starts a fresh run, and the timeout returns to AI play. Escape leaves the result visible. A preview displays the result briefly and starts a new run without saving its score. Taking over a finished preview starts a fresh run. Storage can be unavailable; play still works and the best remains available for that session. Higher scores are better. Existing games only use this behavior if they call `finish`. Optional `destroy()` cleans up game-owned resources on restart or close.

The player wrapper may optionally expose `getSessionState()`, returning `result` while a result card is shown and `playing` otherwise. The custom canvas runtime supplies this automatically; existing games without it keep their current behavior.
