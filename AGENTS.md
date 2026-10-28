# Repository guidance

OpenArcade is a Vite canvas-game gallery. Preserve existing games and the shared player lifecycle when making changes.

- For a new independent game, use `npm run new-game -- game-id "Game Name"`. The generated module in `src/custom/games/` is discovered automatically; choose an ID unique across the catalog. Read `docs/ADDING-GAMES.md` for the current contract and verification workflow. The project skill `.agents/skills/add-arcade-game/SKILL.md` covers this task.
- A game factory returns fresh state with `update(dt, auto)` and `draw(ctx)`; inputs and cleanup are optional. AI previews and manual play should use the same game rules. The shared runtime owns the loop, focus, resizing, pause and restart. Do not add game-owned timers or network dependencies.
- Preserve silent previews, support releasing held inputs, and keep touch controls accurate. Scores and result screens are opt-in; use the documented `finish` callback instead of inferring scores from rendered text.
- Before changing an existing game, inspect its module and tests; many feature modules contain two games. Keep sibling behavior and shared audio intact. Reference fidelity claims need evidence; distinguish retained source, observed runtime and approximation.
- Validate appropriately: run focused tests for the change, `npm test` and `npm run build` for a new game, and exercise its preview and player in a browser. Report unverified behavior and test limitations.
