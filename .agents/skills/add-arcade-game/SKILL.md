---
name: add-arcade-game
description: Add a new independent playable game to this OpenArcade repository using its custom-game scaffold and shared player lifecycle.
---

# Add an arcade game

1. Read `docs/ADDING-GAMES.md` and inspect relevant existing games and tests. Choose an ID unique across the whole catalog. Run `npm run new-game -- game-id "Game Name"`; the resulting module in `src/custom/games/` is discovered automatically. Do not edit the built-in registry for a custom game.
2. Replace the starter with a fresh-state `create()` factory returning `update(dt, auto)` and `draw(ctx)`, and optional `input`, `pointer`, and `destroy` methods. Draw in the 320 × 720 game space. The shared runtime handles timing, focus, resizing, pause, restart and cleanup; do not introduce separate timers or network dependencies.
3. Build a playable manual mode and an AI preview using the same rules. Handle held-key release, clear objectives and failure/recovery, and accurate metadata controls. Previews must be silent. Supply `touchKeys` when inference from the control description is insufficient.
4. If the game has a scored ending, use `create({ finish })` and `finish({ score, result })` as documented. The runtime handles manual best scores, result display, restart and preview isolation. Do not infer a score from canvas text or require scoring for an unscored game.
5. Run focused checks, `npm test`, and `npm run build`. Exercise preview, manual input, takeover, returning to AI, restart and close in a browser; check touch interactions when applicable. Report failures or unverified behavior. If reproducing a reference, use available evidence and identify approximations; do not assert parity from a title or theme alone.
