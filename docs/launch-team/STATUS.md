# OPENARCADE S01 launch tracker

Updated 2026-10-28. S01 alone maintains this tracker and merges/releases. A session's work is ready for consumers only when its PR and merged commit are recorded. The original planning documents are retained verbatim alongside this execution tracker.

## Verified baseline

- Repository: public [markeljan/openarcade](https://github.com/markeljan/openarcade), default branch `main`; existing user has admin/push access.
- Foundation: `574f811ec06776c9137553d73fcd8377152cd533`.
- Vercel: W3GPT (`team_1emr0hddOspykkPdmXrV5RRx`), `openarcade` (`prj_OMjMAkAONyAnZ6NIjWNzq0pWcZFD`), Vite, Node 24.
- Baseline production deployment: `dpl_Dcky9C9SgDnx5gNofXbfyo1gxXnM`, `https://openarcade-1uf4ivv67-w3gpt.vercel.app`, READY, foundation SHA above.
- Public alias to verify: `https://openarcade.vercel.app`. SSO protection reports `all_except_custom_domains`; public anonymous access still needs testing.
- Treat merges to main as potentially live. Confirm Git auto-assignment before consumer merges. Prefer a production-configured deployment staged without domains, then promote that same tested build.
- Existing documentation says Preview and Production share Neon. No staging write tests until S11 establishes isolated data and suitable Clerk configuration.
- Baseline tests/build: running in S01 worktree; result pending.

## Registry

All thread IDs are local. Branches are session-owned; no switching another session's checkout. S01 worktree: `C:\Users\Marke\.codex\worktrees\openarcade-s01-integrator\miniarcade-rea`.

| Session | Thread ID | Branch | Ownership | Prerequisite / first delivery | Status |
| --- | --- | --- | --- | --- | --- |
| S01 | `01a18389-4776-7462-9275-82f39882367e` | `codex/openarcade-s01-bootstrap` | Plan/tracker/contracts; review, merge and release | Publish planning bootstrap | Active; baseline checks |
| S02 | `01a18389-c482-7852-a76a-6225d4d05bef` | `codex/openarcade-s02-score-contract` | `src/scores/*`, score API/helpers/schema/tests | Independent contract/fixture, then S03 identity + S05 catalog | Active; first PR pending |
| S03 | `01a18389-ef60-7932-adde-d5867563c3b2` | `codex/openarcade-s03-identity` | Browser/server auth; feedback/engagement; additive comments schema | Identity helper first; S11 Clerk env for live checks | Active; first dependency window |
| S04 | `01a1838a-2876-7d22-b7bf-9984bd68e9fc` | `codex/openarcade-s04-brand-share` | `src/main.js`, `src/style.css`, UI modules/tests | Independent branding/share; later S02/S03/S05 | Active; first PR pending |
| S05 | `01a1838a-8bea-7a00-8503-0c87d4d017bf` | `codex/openarcade-s05-social-embeds` | Catalog/loader, canonical helpers, index/build/routing/embed | Metadata/catalog first; S12 assets; later S02 guest scores | Resume requested |
| S06 | `01a1838b-0110-7081-b8bb-378f0582e2c2` | `codex/openarcade-s06-legacy-scoring` | Four complete legacy modules, 32-game rule/evidence shards/tests | Audit; merged S02 then Snake slice | Waiting for contract |
| S07 | `01a1838b-7e2f-74f0-8b62-396557ae3241` | `codex/openarcade-s07-feature-scoring` | Complete feature modules 1–10, 20-game shards/tests | Audit; merged S02 then modules 1–3 | Waiting for contract |
| S08 | `01a1838b-aed6-7933-a61a-9484079144a3` | Pending confirmation | Complete feature modules 11–20, 20-game shards/tests | Audit; merged S02 then modules 11–13 | Registration received |
| S09 | `01a1838b-e19d-7e52-bc71-d371b807f9a4` | Pending confirmation | Complete feature modules 21–30, 20-game shards/tests | Audit; merged S02 | Registration requested |
| S10 | `01a1838c-1a8b-7391-a121-f4d693063198` | Pending confirmation | Complete feature modules 31–40, 20-game shards/tests | Audit; merged S02 | Registration requested |
| S11 | `01a1839f-88bd-7272-b7d5-9725a4d5f6f4` | Pending confirmation | External configuration, additive migrations, operations/runbook | Verify target, main promotion, isolated DB + Clerk | Resume/registration requested |
| S12 | `01a183d8-e9ee-7143-b263-58987dee1d44` | Pending confirmation | Actual-game social captures/harness and integrated evidence | Image contract with S05; isolated staging for writes | Resume/registration requested |

Two other S11-labelled chats (`01a183a5-08c8-7ca0-b891-fab7c75390ec`, `01a183a5-0a41-7122-8a12-50a49ffb25c4`) stopped during discovery. They are not additional owners; primary S11 is the single thread registered above. No work or configuration was observed in those duplicate chats.

## Dependency and merge queue

1. S01 documentation bootstrap: no runtime/dependency/migration changes.
2. S02 independently mergeable run/rule/evidence contract and fixture; absent shards allowed, no game publicly enabled without complete rule and terminal evidence.
3. S03 server identity helper. First serialized `package.json`/lock window: `@clerk/backend`; browser `@clerk/clerk-js` follows after helper merge. Exact versions verified by S03.
4. S05 catalog/helpers/metadata and S04 independent branding can merge when reviewed, without waiting for scores.
5. S06 Snake + S02 API + S03 identity + S04 integration form the first real scored slice. S11 additive migrations/configuration must precede consumers; S12 verifies isolated staging.
6. Remaining S06–S10 game shards merge independently once the contract is frozen; S12 joins all 112 rules/evidence/assets.
7. Stage a production-configured build, verify and promote; record final SHA/URL/rollback and public checks.

Only S03 has announced dependency additions. S02/S04/S05/S06/S07/S08 report no dependency changes. S05 plans a Vite plugin without package-script changes. Shared registry/test or dependency changes are serialized through S01.

## Release gates and evidence

| Gate | Evidence / status |
| --- | --- |
| 112 explicit score rules + human/AI terminal/provenance evidence | 0 merged of 112; worker shards pending; wrapper alone is insufficient |
| Account save survives login, cancel/reload/retry, no cross-user claim | Pending S02/S03/S04 isolated end-to-end checks |
| AI top 10 only, concurrency/ties/stable names | Pending real isolated Postgres checks; mocks do not establish this |
| Authenticated comment writes; historical anonymous reads/drafts preserved | Pending S03/S04 |
| All canonical pages, genuine 404, shares, isolated embeds | Pending S05/S04/S12 |
| Actual-game social images | Pending S12, 112 game images + homepage |
| Public repo link, target/project/env/migrations | Repo public verified; remaining S04/S11 |
| External X client rendering | Unverified; public embed and image/link fallback required; new public posts need specific authorization |
| Final full suite/build and public smoke/logs | Pending integration |

## Rollback record

Baseline deployment above is the initial candidate. Verify its runtime/public alias before relying on it. Rollback command template: `vercel rollback <known-good-deployment> --scope w3gpt`; the project must be explicitly verified first. Rollback does not revert SQL migrations and disables automatic domain assignment until promotion restores it. Keep migrations additive and compatible with the previous application.

## PR ledger

No PRs merged yet. Record PR URL, reviewed head, merge SHA, validation, migration/config ordering and limitations here as each artifact lands.
