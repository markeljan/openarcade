# OpenArcade launch team

Prepared 2026-10-28 from the repository and first-party platform documentation. This is an execution plan and a set of prompts; this planning pass did not implement, merge or deploy the features.

Start **12 execution sessions** in the OpenArcade project. Give every session the complete contents of its linked prompt file. Each prompt is standalone and includes the common worktree, subagent, ownership, PR and coordination rules. Configure the parent sessions for the user's GPT 6.1 / Ultra setting.

The initial brief may exist only in the original checkout at C:\Users\Marke\Projects\miniarcade-rea\docs\launch-team. Read it there if absent from a new worktree. S01 copies the complete directory into its isolated worktree and publishes it in its bootstrap PR, preserving unrelated local work.

## Architecture decision

**Keep Vite. Dismiss a full Next.js rewrite for this launch.**

The app already has a working Vite gallery, lazy-loaded game factories, shared player/preview behavior, Vercel Functions and Neon Postgres. Replacing the shell would consume time and create lifecycle regressions across 112 games. The requested authentication, leaderboard API, metadata and iframe routes do not require a framework migration. Clerk supports browser JavaScript plus backend request verification; Vercel supports Vite with Functions. Per-game HTML can be generated at build time so crawlers receive metadata without running JavaScript.

This is a decision for the current launch, based on the existing code. Revisit the framework only after a concrete unmet need justifies a migration.

Evidence:

- package.json: Vite, @neondatabase/serverless and @vercel/analytics; no Clerk/Next dependency.
- src/main.js: gallery, player/feed orchestration, lazy feature loading and existing ?game= deep links/share.
- api/feedback.js, src/engagement.js and db/feedback-schema.sql: existing anonymous shared feedback.
- docs/FEEDBACK.md: deployed Vercel/Neon setup; currently documented shared Preview/Production DB; plain Vite dev/preview does not run API Functions.
- docs/ADDING-GAMES.md and src/custom/canvas-game.js: opt-in finish callback, local best and preview/result contract.
- src/games.js, src/more-games.js, src/extra-games.js, src/extra-additions.js and feature modules: game-specific wrappers and scoring/reset semantics.

GitHub metadata confirms [markeljan/openarcade](https://github.com/markeljan/openarcade) is **already public**, with main as its default branch. Recheck at execution time; add the visible GitHub logo/link instead of creating another repository. package.json private:true concerns npm publication and does not control GitHub visibility.

## Exact session list

| Session | Prompt | Ownership / first useful delivery |
| --- | --- | --- |
| S01 | [Integrator and release coordinator](01-integrator.txt) | Team registry, contracts, PR review/merge, integration and production promotion |
| S02 | [Score contract, leaderboard API and persistence](02-score-foundation.txt) | Score/run interface first; then API, Neon schema, pending-login queue and top-10 retention |
| S03 | [Clerk login and authenticated comments](03-clerk-comments.txt) | Shared server auth helper first; then existing Clerk instance and authenticated comments |
| S04 | [OpenArcade branding and integrated player UI](04-ui-rebrand.txt) | main.js/style.css: branding, GitHub link, share controls and auth/leaderboard UI |
| S05 | [Canonical links, metadata and playable embeds](05-social-embeds.txt) | Canonical game pages, initial HTML metadata, routing and standalone playable embed |
| S06 | [Scoring for 32 classic and legacy games](06-scores-legacy.txt) | 32 legacy games across games/more/extra/extra-additions |
| S07 | [Scoring for feature modules 1–10](07-scores-feature-01-10.txt) | 20 games in feature modules 1–10, where module 1 is feature-games.js |
| S08 | [Scoring for feature modules 11–20](08-scores-feature-11-20.txt) | 20 games in feature modules 11–20 |
| S09 | [Scoring for feature modules 21–30](09-scores-feature-21-30.txt) | 20 games in feature modules 21–30 |
| S10 | [Scoring for feature modules 31–40](10-scores-feature-31-40.txt) | 20 games in feature modules 31–40 |
| S11 | [Production setup, public repository and launch operations](11-launch-ops.txt) | Existing production/Clerk/Neon setup, repo audit, operations and release readiness |
| S12 | [Actual-game social images and launch verification](12-captures-validation.txt) | 112 actual-game social images and end-to-end launch evidence |

Each feature file contains two games. Assign whole files to workers so sibling behavior and shared audio stay under one owner. The inventory is **32 legacy + 80 feature = 112 games**, with no current custom game modules.

## Start order and dependency flow

1. Start S01 first. It discovers the team/project, registers sessions, checks whether main auto-deploys, and prepares a short contract/ownership tracker. No prolonged discovery phase.
2. Start S02, S03, S04, S05, S11 and S12 immediately afterward. They work concurrently. S02 first publishes an independently mergeable score interface/fixture without waiting for shards or Clerk; S03 first publishes its identity helper. After the contract S06 supplies Snake as the real-game slice. S04 branding and S05/S12 metadata/captures can precede completed scoring.
3. Start S06–S10 immediately as well. Their first task is a complete audit of their assigned games and focused preparation. They consume S02's merged contract before broad instrumentation. They should not invent five separate result APIs while waiting.
4. S01 merges ready, backward-compatible work in small PRs. Auth-dependent score writes wait for S03's helper; game scoring waits for S02's interface; UI/embed scoring waits for working score API. Independent branding, repo, environment, cards and asset work does not wait.
5. S01 supplies isolated preview/staging with separate data and suitable Clerk config. S12 verifies integrated slices before production; owners fix concrete defects. S01 promotes working batches, then completes remaining batches and final coverage. A partial deployment is progress, not completion.

The critical dependency graph is:

```text
S03 server identity helper ───────────────> S02 authenticated score save/claim
S02 score contract ──────────────────────> S06/S07/S08/S09/S10 game batches
S02 + S03 ───────────────────────────────> S04 score/login/comment integration
S02 + S05 ───────────────────────────────> embedded guest highscore flow
S12 actual captures ─────────────────────> S05 final per-game social images
S11 environment + additive migrations ──> S01 production release
all ready slices ───────────────────────> S12 integrated verification -> S01 promotion
```

Blocked workers continue useful independent investigation, preparation or review, and send the exact missing artifact to S01. S01 wakes them when prerequisites merge. The prompts explicitly authorize project-specific messaging between the 12 chats. Do not assume sessions can find or message one another without that authorization or thread registration.

## Model and concurrency policy

- Parent sessions: the user's configured GPT 6.1 with Ultra reasoning.
- Routine subagents: **gpt-6.1-terra / medium**.
- Complex architecture, lifecycle, race conditions, identity and integration: **gpt-6.1-sol / high or max**. “Soul” was interpreted as the available Sol model.
- Fresh subagents with model overrides use fork_turns none and a sufficient task brief.
- Start two useful subagents per session; the game batch leads may use three implementation agents on whole-file partitions plus a reviewer. Expand only where work is independent. Reduce parallelism if account/machine limits erase the benefit.

More top-level sessions would mostly divide shared wrappers and central files, adding merge collisions. The five scoring leads already divide the bulk work into parallel file groups using their subagents.

## Merge and ownership rules

S01 is the sole merger and production release authority. Workers use isolated managed worktrees, codex/openarcade-sXX-* branches, small commits and PRs; they never independently merge or promote. S01 can use parallel review subagents but serializes integration, migrations and promotion.

S04 normally owns src/main.js and src/style.css. S05 owns index.html, routing/build metadata and embed entry points. S02 owns the shared score interface/client/API/schema; S03 owns auth and existing feedback code. S06–S10 own disjoint complete game modules and shard files. S11 owns operations/docs; S12 owns capture assets/harness/evidence. Shared registry/test and manifest/lockfile changes must be announced and serialized.

Use ready PR URLs and merged SHAs as handoff artifacts. Every PR gives dependency PRs/SHAs, validation, environment names, migration order and limitations. Attach each PR to its originating chat. Only S01 edits the central status tracker; individual workers supply their own coverage shards.

## Product decisions that avoid hidden gaps

- **Scores for all games require explicit game work.** The current custom finish contract is not a universal callback already used by 112 games. Several AI paths reset before reporting an outcome. A wrapper or HUD-text parser is not enough.
- **Run ownership is explicit.** Manual takeover begins a fresh eligible human run. Restart, return to AI, disposal and retries cannot double-submit or mix AI and human progress.
- **Human saves survive login.** Queue the completed score before Clerk sign-in and clear it only after acknowledged save. Test cancel, redirect, reload, blocked storage and retry.
- **AI is clearly labeled.** Default leaderboard view is Players; provide AI and optionally combined views. Names such as AI-Albert/AI-Tom come from the server. The plan interprets “top-10-worthy” as the top 10 of each game's versioned AI board, retaining no lower AI results; personal human bests remain saved below the top 10. Change that product interpretation once, centrally, if the owner prefers a combined-only cutoff.
- **“AI” refers to the existing game autoplayers.** No LLM API is needed to play each preview or invent leaderboard scores.
- **Client scores are client-reported.** Idempotency, bounds, run receipts and durable rate limits reduce abuse but do not prove gameplay. Do not promise tamper-proof rankings.
- **Clerk is required for new comments.** Keep anonymous reads/gameplay and historical comments; do not misattribute old comments. Tooltip: “Feedback may be used by AI agents to improve gameplay and fix bugs.” This is not a claim that an autonomous feedback-to-code pipeline has been built.
- **X guests choose a four-letter guest name.** Uppercase A–Z slots are the launch input choice. Guest scores appear in Players with guest labels, distinct from account ownership. “From X” is unverified route attribution, not proof of identity or referral.
- **Branding remains truthful.** Rename the current product, preserve historical references and attribution, and avoid breaking existing storage/deep links.

## Social cards and X limitations

Generate actual rendered-game captures and initial per-game HTML; changing meta tags after page load is insufficient for crawler delivery. Prefer build-generated pages and absolute HTTPS asset URLs. Provide normal OG image cards and a playable dedicated iframe route.

[Rosebud's first-party implementation article](https://rosebud.ai/engineering/making-rosebud-games-playable-in-x-posts) describes X Player Cards, an isolated /embed route, anonymous sessions, scoped framing, sizing and fallback behavior. Adapt those ideas to this canvas app rather than copying a nested-host architecture or square viewport blindly.

[Open Graph](https://ogp.me/) describes rich metadata; it does not define universal interactive HTML game embeds. X-specific inline play must be tested in actual clients. At research time, former X Player Card documentation redirected to a general documentation landing page, leaving current approval/client support unverified. Deliver the working public embed, metadata and image/link fallback, and report actual live X evidence separately. A local iframe is not proof of X rendering.

New public posts or messages to social accounts require specific authorization; prepare the exact test draft/link if such a test is necessary. This does not block shipping the metadata/embed implementation or the rest of the site.

## Proportional launch checks

Workers run focused tests for meaningful behavior. S01 runs the full existing npm test and npm run build on integration batches and before final release. S12 smoke-checks every game/page/asset and deeply checks representative wrappers and high-risk flows. Avoid demanding exhaustive manual playthroughs or repeated entire-suite runs for each small edit.

Launch blockers are concrete: broken gameplay/lifecycle, identity bypass, lost scores, wrong DB target, exposed credentials, destructive migrations, broken public routes, missing game-score coverage or false claims of verification. Cosmetic refinements and optional monitoring dashboards do not block usable slices.

Before final completion, confirm:

- OpenArcade branding and public GitHub logo/link.
- Clerk-protected new comment writes, accessible feedback help, preserved draft/historical reads.
- Every catalog game has documented real scoring and human/AI completion reporting.
- User personal best persists, login preserves pending result, duplicate saves are idempotent.
- Concurrent AI qualification retains only the intended top 10, labeled correctly.
- Homepage and all game links return initial social metadata and real image cards.
- Canonical/old deep links, share controls, dedicated embeds and guest entry work.
- External X behavior is evidenced or stated as an unresolved platform/client limitation with fallback.
- Confirmed production domain/project, environment isolation, additive migrations, basic abuse/removal tools and error visibility.
- Final deployment SHA/URL, known-good rollback and concise post-release checks.

## Primary sources

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [Clerk backend request verification](https://clerk.com/docs/reference/backend/authenticate-request)
- [Rosebud playable X implementation](https://rosebud.ai/engineering/making-rosebud-games-playable-in-x-posts)
- [Open Graph protocol](https://ogp.me/)
- [Official OpenAI multi-agent guidance](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)

Platform details should be rechecked by the relevant owner when implementing. This plan did not inspect secret values or change external configuration.
