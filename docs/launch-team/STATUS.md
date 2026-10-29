# OPENARCADE S01 launch tracker

Updated 2026-10-29. S01 alone merges and releases. This execution record supersedes early estimates in the preserved planning briefs. Merged implementation and live release are separate milestones.

## Integrated source

PRs **#1–#36 and #38 are merged** in the public [markeljan/openarcade](https://github.com/markeljan/openarcade) repository. The tested implementation baseline is `0d9789a5236bfb7eb9256da1267628bbf7f76577`, the squash of source `7cfa81162ed74a53e85b561ebc51b70cdcf4b8e6`. Main subsequently reached `63dc4ecb7d8dfd2e6b75345265d6a2a9fdb95e95` through operations-only PR #38.

All **112 games** have explicit versioned numeric rules and paired human/AI terminal and provenance evidence: S06 32; S07–S10 20 each. The final registry joins exactly 112 unique catalog IDs. Scores are never inferred from canvas text. Scores API/schema, private pending results, account claims, explicit guest names, qualifying AI retention, Clerk comment protection, canonical routes, standalone embeds, branding, repository links and all actual-game social images are merged.

Final `npm test`: **3,388 pass, 0 fail, 1 gated database skip**. `npm run build` passed. The skipped database test was separately run against confirmed isolated Neon: **10 pass, 0 fail, 0 skipped**, including 24 concurrent AI submissions, top-10 pruning, private concurrent claims, expiry, moderation epochs and atomic limits. The large lazy Clerk chunk warning is nonblocking.

A newer direct user request prepares Vercel CI. Its owner works on `codex/vercel-ci` in the original checkout. Vercel's setup reports CI unavailable for public repositories; its initial hosted invocation resolved no jobs. PR #37 therefore retains an upgraded GitHub Actions fallback using the same task graph. These changes are independent of the source results above and remain under separate validation. S01 reviews the package/lock change serially.

## Session registry

All thread IDs are local. S01 uses the managed worktree `C:\Users\Marke\.codex\worktrees\openarcade-s01-integrator\miniarcade-rea`. Only the parent performs Git changes beneath its writers; no worker may merge/promote production independently.

| Session | Thread ID | Delivery | Ownership / prerequisite | Status |
| --- | --- | --- | --- | --- |
| S01 | `01a18389-4776-7462-9275-82f39882367e` | `codex/openarcade-s01-closeout`; PRs #4, #15, #36 | Plans/contracts/tracker, review, integration, release; reviewed worker PRs | All game batches merged; final provider checks/record |
| S02 | `01a18389-c482-7852-a76a-6225d4d05bef` | PRs #1, #22, #35 | Scores client/API/store/schema; S03 identity, S05 catalog | Merged and closed |
| S03 | `01a18389-ef60-7932-adde-d5867563c3b2` | PRs #3, #14 | Browser/server auth, comments/schema; S11 environment | Code merged; existing-app hosted verification active |
| S04 | `01a1838a-2876-7d22-b7bf-9984bd68e9fc` | PRs #5, #16, #33 | main.js/style.css/player UI; S02/S03/S05 hooks | Merged and closed |
| S05 | `01a1838a-8bea-7a00-8503-0c87d4d017bf` | PRs #6, #11, #28, #32, #34 | Catalog/loader, routes/build/metadata, embed; S04/S02 hooks | Merged and closed |
| S06 | `01a1838b-0110-7081-b8bb-378f0582e2c2` | PRs #2, #8, #27, #29, #30 | Four legacy modules/32 games; S02 contract, Snake first | All 32 merged and closed |
| S07 | `01a1838b-7e2f-74f0-8b62-396557ae3241` | PRs #21, #26, #31 | Feature modules 1–10/20 games; S02 contract | All 20 merged and closed |
| S08 | `01a1838b-aed6-7933-a61a-9484079144a3` | PRs #18, #20, #24 | Feature modules 11–20/20 games; S02 contract | All 20 merged and closed |
| S09 | `01a1838b-e19d-7e52-bc71-d371b807f9a4` | PRs #10, #13, #17 | Feature modules 21–30/20 games; S02 contract | All 20 merged and closed |
| S10 | `01a1838c-1a8b-7391-a121-f4d693063198` | PRs #9, #19, #25 | Feature modules 31–40/20 games; S02 contract | All 20 merged and closed |
| S11 | `01a1839f-88bd-7272-b7d5-9725a4d5f6f4` | PR #12; operations correction #38 | Existing Vercel/Neon, migrations, Clerk DNS; exact S01 target/artifacts | Isolated schema/env ready; production held |
| S12 | `01a183d8-e9ee-7143-b263-58987dee1d44` | PRs #7, #23; S12 evidence docs | Actual-game captures/harness, browser/HTTP/coverage; integrated staging | Merged and closed; hosted limits documented |

Two duplicate S11-labelled chats (`01a183a5-08c8-7ca0-b891-fab7c75390ec`, `01a183a5-0a41-7122-8a12-50a49ffb25c4`) supplied read-only audits and stopped without source/config changes. No launch owner created recurring automations. Other worktrees and original-checkout work are preserved. Session-owned branch names and exact reviewed heads are retained in the PR ledger in [CLOSEOUT.md](CLOSEOUT.md).

## Dependency map and frozen interfaces

S02 contract #1 and S03 identity #3 preceded consumers. S04 branding #5 and S05 catalog #6 merged independently. Snake #8 was the first real-game slice. S02 API/store #22 and S03 browser/comments #14 fed final UI #33, guest/embed #34 and denied-storage fix #35. Game shards merged independently; shared S07/S08 module changes were reconciled serially. PR #36 corrects catalog/test parity without changing gameplay.

Only S03 added launch runtime dependencies, through serialized exact Clerk backend/browser versions. No Next.js migration, LLM dependency, duplicate database service or new deployment pipeline was introduced for the launch. The newer user-requested Vercel CI migration is a separately reviewed development dependency window.

Frozen contracts are in [CONTRACTS.md](CONTRACTS.md): fresh factory-bound result callbacks, actor/context/run/version provenance, abandon before release/destructor, private pending human results, per-game/version AI top 10, exact acknowledgement, Clerk-required comment writes, canonical `/games/:id`, isolated `/embed/:id`, actual-game image paths. Scores are client-reported, never cheat-proof.

## Deployment and provider boundary

- Verified Vercel team `w3gpt` / `team_1emr0hddOspykkPdmXrV5RRx`, project `openarcade` / `prj_OMjMAkAONyAnZ6NIjWNzq0pWcZFD`, Vite, Node 24, iad1.
- **Live production remains** [openarcade.io](https://openarcade.io) at `dpl_HRKB1bNxonyQ81UyXR1icN9DPCWS`, SHA `6f27b944f627411f4a87ac91f8a53df938726ea0`, independently read back on 2026-10-29. Launch consumers have not been promoted. www/default aliases redirect to the canonical origin.
- `autoAssignCustomDomains=false` holds domains while newer main builds finish; behavior independently verified. Standard Protection retains authentication on previews/generated URLs.
- Stable staging branch `codex/openarcade-s01-staging`: [isolated Preview](https://openarcade-git-codex-openarcade-s01-staging-w3gpt.vercel.app). Source `9e8ea1df2114abbdb50f815fc56b3d88595a5572` has the tested source tree and rebuilds after branch-scoped test-write configuration. S01 and S11 independently read back READY deployment `dpl_98JXuStwGTh7odiTQ4af5nkX5Nb8` before S03's isolated browser write checks.
- Existing Neon project `openarcade-feedback` / `orange-cherry-09292655`; production `br-little-tooth-b8oi36rl`, endpoint `ep-wild-haze-b87hcogv`. Isolated schema-only child `openarcade-launch-preview` / `br-plain-salad-b8amuvnr`, endpoint `ep-old-shadow-b87sxbm8`, database `neondb`. No production data copied. Only the exact staging branch has the isolated override; other previews may share production and must not receive test writes.
- On that isolated branch only, S11 applied and reapplied baseline feedback, additive comments, then score schema; confirmed nine expected tables, four additive columns and five score functions. S01's real Neon checks passed. Ignored credential handoff removed. No production SQL applied.
- Existing Clerk app `app_3LKZoytv9iDRK8jv2tFu1lC4E7S` retained. Preview uses Development instance `ins_3LKZp2SDQOr2RHtoM9Dq34xYVnv`; production instance `ins_3LNe1QtYHxHPzD0xi1sAv33T3vm` uses openarcade.io. Five additive CNAMEs/TLS/JWKS verified. Production env binding and public authenticated flows remain release gates.
- Production and global Preview score writes remain false; true is scoped only to isolated staging after real DB checks. Config changes require a fresh build. No credentials, tokens or user comment bodies belong in tracked records.

## Remaining release gates

| Gate | Evidence / practical limit |
| --- | --- |
| All 112 scored games | Complete paired contracts/test links and final card/registry check pass. Some terminal fixtures shorten play or initialize near the terminal; not 112 full human playthroughs. |
| AI ranking, claims and persistence | Actual isolated Neon 10/10; mocks alone were not accepted. Hosted browser-to-API identity/recovery verification still required. |
| Clerk comments/account recovery | RSA/auth, draft/queue and actual Chromium storage checks pass; fresh Preview two-user/reload/expired-session behavior still required. |
| Routes/embed/cards | 112 real-game PNGs plus homepage; local gallery/iframe/HTTP/responsive checks documented at earlier revisions; final asset/contract check passes. Hosted sampling partial, with explicit timeouts. |
| X clients | No actual X-client evidence. Image/link and standalone-embed fallbacks exist; X playback is unverified. |
| Production release | Production schema/config, tested production-configured build, same-build promotion, public auth/persistence/card/embed/log checks and final rollback record remain required. |

Known held-live rollback candidate is `dpl_HRKB1bNxonyQ81UyXR1icN9DPCWS` (`6f27b944`). Command template: `vercel rollback <known-good-deployment> --scope w3gpt`, after verifying project/aliases. SQL is additive and rollback does not undo data. After authenticated comments ship, use an authenticated known-good handler or disable writes: the older handler permits anonymous posting and ignores moderation markers.

See [CLOSEOUT.md](CLOSEOUT.md) for the PR/evidence ledger, and [operations](../OPERATIONS.md) for procedures. S11's correction is merged in PR #38; the current dated records supersede the preserved initial-access observations.
