# OPENARCADE S01 launch tracker

Updated 2026-10-28. S01 alone maintains this tracker and merges/releases. A session's work is ready for consumers only when its PR and merged commit are recorded. The original planning documents are retained verbatim alongside this execution tracker.

## Verified baseline

- Repository: public [markeljan/openarcade](https://github.com/markeljan/openarcade), default branch `main`; existing user has admin/push access.
- Foundation: `574f811ec06776c9137553d73fcd8377152cd533`.
- Vercel: W3GPT (`team_1emr0hddOspykkPdmXrV5RRx`), `openarcade` (`prj_OMjMAkAONyAnZ6NIjWNzq0pWcZFD`), Vite, Node 24.
- Baseline production deployment: `dpl_Dcky9C9SgDnx5gNofXbfyo1gxXnM`, `https://openarcade-1uf4ivv67-w3gpt.vercel.app`, READY, foundation SHA above.
- Canonical origin: `https://openarcade.io`, an existing verified custom domain discovered through the authoritative domain listing. `www.openarcade.io` and the vercel.app alias redirect there. The initial simplified project response omitted this domain.
- S11 successfully set `autoAssignCustomDomains=false` as the authorized release hold; independent read-back remains pending because the connector normalizes away that setting. S11 changed protection to Standard (`prod_deployment_urls_and_all_previews`), retaining preview/deployment URL protection. Public canonical-origin probes remain pending.
- Prefer a production-configured deployment staged without domains, then promote that same tested build. No runtime consumer requiring new configuration has been promoted.
- Existing documentation says Preview and Production share Neon. No staging write tests until S11 establishes isolated data and suitable Clerk configuration.
- Baseline `574f811`: build passed; full suite 2,667 tests, 2,665 pass, two fixture ENOENT failures before browser launch (308 seconds). Both fixtures omitted creation of the empty `src/custom/games` directory in fresh checkouts; S04 PR #5 fixes them and both focused browser checks pass. Score contract six focused tests and auth helper four real-RSA tests pass.

## Registry

All thread IDs are local. Branches are session-owned; no switching another session's checkout. S01 worktree: `C:\Users\Marke\.codex\worktrees\openarcade-s01-integrator\miniarcade-rea`.

| Session | Thread ID | Branch | Ownership | Prerequisite / first delivery | Status |
| --- | --- | --- | --- | --- | --- |
| S01 | `01a18389-4776-7462-9275-82f39882367e` | `codex/openarcade-s01-integration` | Plan/tracker/contracts; review, merge and release | Publish planning bootstrap | Bootstrap merged; coordinating integration |
| S02 | `01a18389-c482-7852-a76a-6225d4d05bef` | `codex/openarcade-s02-score-contract` (follow-up active) | `src/scores/*`, score API/helpers/schema/tests | S03 identity merged; S05 catalog next | Contract merged; API/client/schema in progress |
| S03 | `01a18389-ef60-7932-adde-d5867563c3b2` | `codex/openarcade-s03-identity` (follow-up active) | Browser/server auth; feedback/engagement; additive comments schema | S11 Clerk env for live checks | Helper merged; browser/comments and second dependency window |
| S04 | `01a1838a-2876-7d22-b7bf-9984bd68e9fc` | `codex/openarcade-s04-brand-share` (follow-up active) | `src/main.js`, `src/style.css`, UI modules/tests | S02 client, S03 browser, S05 routes | Branding/share merged; integration next |
| S05 | `01a1838a-8bea-7a00-8503-0c87d4d017bf` | `codex/openarcade-s05-playable-embeds` | Catalog/loader, canonical helpers, index/build/routing/embed | S04 canonical main hook; S02 guest scores | Metadata/catalog merged; standalone embed next |
| S06 | `01a1838b-0110-7081-b8bb-378f0582e2c2` | `codex/openarcade-s06-snake` | Four complete legacy modules, 32-game rule/evidence shards/tests | Merged S02 consumed; Snake first | 32-game audit merged; Snake in progress |
| S07 | `01a1838b-7e2f-74f0-8b62-396557ae3241` | `codex/openarcade-s07-feature-scoring` | Complete feature modules 1–10, 20-game shards/tests | Merged S02 consumed; modules 1–3 | 20-game audit complete; instrumentation active |
| S08 | `01a1838b-aed6-7933-a61a-9484079144a3` | Session branch confirmation pending | Complete feature modules 11–20, 20-game shards/tests | Merged S02 consumed; modules 11–13 | 20-game audit complete; instrumentation active |
| S09 | `01a1838b-e19d-7e52-bc71-d371b807f9a4` | `codex/openarcade-s09-feature-21-23` | Complete feature modules 21–30, 20-game shards/tests | Merged S02 consumed | 20-game audit complete; instrumentation active |
| S10 | `01a1838c-1a8b-7391-a121-f4d693063198` | `codex/openarcade-s10-feature-scoring` | Complete feature modules 31–40, 20-game shards/tests | Merged S02 consumed | 20-game audit complete; instrumentation active |
| S11 | `01a1839f-88bd-7272-b7d5-9725a4d5f6f4` | `codex/openarcade-s11-launch-ops` | External configuration, additive migrations, operations/runbook | Existing Clerk app access + isolated Neon permissions | Release hold set; external access blocked; runbook active |
| S12 | `01a183d8-e9ee-7143-b263-58987dee1d44` | Capture branch follow-up active | Actual-game social captures/harness and integrated evidence | Isolated staging for writes | All 112 images/homepage merged; HTTP/browser evidence next |

Two other S11-labelled chats (`01a183a5-08c8-7ca0-b891-fab7c75390ec`, `01a183a5-0a41-7122-8a12-50a49ffb25c4`) supplied read-only audit handoffs to primary S11 and stopped without source/configuration changes. Their clean review worktrees could not be archived by the tool because it considered them primary checkouts; they were left intact. They are not additional launch owners.

## Dependency and merge queue

1. S01 documentation bootstrap: no runtime/dependency/migration changes.
2. S02 independently mergeable run/rule/evidence contract and fixture; absent shards allowed, no game publicly enabled without complete rule and terminal evidence.
3. S03 server identity helper. First serialized `package.json`/lock window: `@clerk/backend`; browser `@clerk/clerk-js` follows after helper merge. Exact versions verified by S03.
4. S05 catalog/helpers/metadata and S04 independent branding can merge when reviewed, without waiting for scores.
5. S06 Snake + S02 API + S03 identity + S04 integration form the first real scored slice. S11 additive migrations/configuration must precede consumers; S12 verifies isolated staging.
6. Remaining S06–S10 game shards merge independently once the contract is frozen; S12 joins all 112 rules/evidence/assets.
7. Stage a production-configured build, verify and promote; record final SHA/URL/rollback and public checks.

Only S03 has announced dependency additions: exact `@clerk/backend@3.26.4` merged, then `@clerk/clerk-js@6.42.0` reserved for its follow-up. S02/S04/S05/S06–S12 report no dependency changes. S05 uses a Vite plugin without package-script changes. Game owners have narrow permission to resolve their existing data-URL test fixtures' new reporter import to its real absolute file URL; assertions stay intact. Explicit fresh-takeover assertions may change only in the range-specific tests authorized in handoffs.

## Release gates and evidence

| Gate | Evidence / status |
| --- | --- |
| 112 explicit score rules + human/AI terminal/provenance evidence | 0 merged of 112; worker shards pending; wrapper alone is insufficient |
| Account save survives login, cancel/reload/retry, no cross-user claim | Pending S02/S03/S04 isolated end-to-end checks |
| AI top 10 only, concurrency/ties/stable names | Pending real isolated Postgres checks; mocks do not establish this |
| Authenticated comment writes; historical anonymous reads/drafts preserved | Pending S03/S04 |
| All canonical pages, genuine 404, shares, isolated embeds | Pending S05/S04/S12 |
| Actual-game social images | PR #7 merged: 112/112 actual game images + homepage, 6.28 MB; IDs/dimensions/hash/source identity tests pass; capture baseline 574f811, current integrated metadata/browser evidence next |
| Public repo link, target/project/env/migrations | Repo public verified; remaining S04/S11 |
| External X client rendering | Unverified; public embed and image/link fallback required; new public posts need specific authorization |
| Final full suite/build and public smoke/logs | Pending integration |

## Rollback record

Baseline deployment above is the initial candidate. Verify its runtime/public alias before relying on it. Rollback command template: `vercel rollback <known-good-deployment> --scope w3gpt`; the project must be explicitly verified first. Rollback does not revert SQL migrations and disables automatic domain assignment until promotion restores it. Keep migrations additive and compatible with the previous application.

## PR ledger

| PR | Reviewed head | Merge SHA | Validation / ordering |
| --- | --- | --- | --- |
| [#4 S01 planning bootstrap](https://github.com/markeljan/openarcade/pull/4) | `de323e1` | `ff906838443174b59c3cf396e8a5a8687cd9d4ad` | Docs only; original files retained verbatim, including existing trailing blank lines |
| [#1 S02 run/rule contract](https://github.com/markeljan/openarcade/pull/1) | `ebd924b` | `6f27b944f627411f4a87ac91f8a53df938726ea0` | Sol review, six focused tests; empty shards enable no games; no packages/env/migrations |
| [#2 S06 legacy audit](https://github.com/markeljan/openarcade/pull/2) | `68b411f` | `4d56067db560a2607af1386dfc3844c5b9432c5e` | 32 explicit inventory rows; instrumentation/browser evidence remains pending |
| [#3 S03 identity helper](https://github.com/markeljan/openarcade/pull/3) | `409e170` | `1558d2926a39ce16736fc817f4b92c7de76b3636` | Sol security review, four real-RSA SDK tests; exact backend dependency; no consumers/migration; live Clerk unverified |
| [#5 S04 brand/share/help](https://github.com/markeljan/openarcade/pull/5) | `d9046a5` | `666009e51811c0680cb2bbb20478b4ba76dc02cf` | Four units + focused browser/build, hidden-help Escape regression fixed; both fresh-worktree fixture browser tests pass; no deps/env/migration |
| [#6 S05 catalog/metadata](https://github.com/markeljan/openarcade/pull/6) | `73c4e5d` | `f33268dd9b544eca6b6b5b74b8e7102eca07a407` | Six focused tests; homepage optional-alt fallback corrected, canonical openarcade.io; S04 route-playing hookup required before public promotion |
| [#7 S12 actual-game cards](https://github.com/markeljan/openarcade/pull/7) | `74d9849` | `e2221d16dfe5180a1374732ff4f93689011d9538` | Independent Terra review, three focused tests, 112 IDs/dimensions/hashes and recorded source hashes checked; representative visuals reviewed independently, owner reviewed contact sheets |

The combined score/auth/catalog foundation passes 16 focused tests in S01. First full integration batch is running. S04 must consume canonical route helpers before public game links work. S06 Snake PR #8 and S10 first-six PR #9 are under targeted review; no scored game has merged yet.

S11 has independently evidenced the release hold: openarcade.io still resolved deployment `dpl_HRKB1bNxonyQ81UyXR1icN9DPCWS` at `6f27b94` while newer main builds at `1558d29` and `666009e` were READY. Canonical homepage and feedback GET return 200, unknown paths 404. The held public build contains only documentation and the disabled score contract; route/embed 404s are expected until promotion.

## Current external blockers

- No existing Clerk application/configuration is accessible through current connections. The verified openarcade.io domain resolves the earlier custom-domain uncertainty. User has been asked for existing application identity/access, without requesting secret values.
- Neon integration listing returns 403; S11 needs console/integration permission to establish and prove Preview database isolation. No deployed write tests against the shared production database are authorized as staging evidence.
- Real Postgres top-10 races, login/account recovery, remote Clerk verification and complete embed saves remain unverified until isolated staging is supplied.
