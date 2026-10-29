# OpenArcade launch operations (S11)

S01 alone merges and releases production. S11 prepares existing project configuration and records evidence; S02 owns scores/schema, S03 identity/comments, S04 UI, and S05 routing/headers. Keep Vite, Vercel Functions, the existing Neon database and Vercel Analytics. No deployment job or database migration runs from the test workflow.

## Verified targets and release record

On 2026-10-28, `gh repo view markeljan/openarcade --json url,visibility,defaultBranchRef` returned public visibility and default branch `main`. Canonical repository: <https://github.com/markeljan/openarcade>. `package.json`'s `private` flag controls npm publication, not repository access.

Verified existing deployment target: Vercel team `w3gpt` / `team_1emr0hddOspykkPdmXrV5RRx`, project `openarcade` / `prj_OMjMAkAONyAnZ6NIjWNzq0pWcZFD`, Vite with Node `24.x`. The project domain list confirms verified canonical `https://openarcade.io`; `www.openarcade.io` and `openarcade.vercel.app` redirect there with 308. The simplified project summary's alias list omitted this custom domain; use the domain endpoint as evidence.

S11 set `autoAssignCustomDomains=false` through the project API on 2026-10-28 (successful update). The connector omits this property in normalized reads, so exact flag read-back remains unverified. Independent behavior confirms the hold: `openarcade.io` still resolved to `dpl_HRKB1bNxonyQ81UyXR1icN9DPCWS` / commit `6f27b944f627411f4a87ac91f8a53df938726ea0` after newer main builds `1558d292` and `666009e5` were READY; the newer build's aliases omitted `openarcade.io`. S11 changed Vercel Authentication from `all_except_custom_domains` to Standard Protection, `prod_deployment_urls_and_all_previews`, preserving preview/generated-deployment protection. No deployment was promoted. S01 controls when to lift the hold.

Anonymous checks at `https://openarcade.io`: homepage 200, feedback read 200 with expected shape, unknown path 404; planned `/games/snake` and `/embed/snake` 404 pending S05 deployment. Redirects to another origin are not by themselves evidence of authentication protection. Record current deployment ID/SHA, previous production deployment and isolated Neon branch IDs in the release PR. Never paste connection strings, key values, cookies, bypass tokens, or user comment bodies into a PR/log.

Configuration readiness: initial inspection found 16 sensitive `DATABASE_*` integration variables targeted to Preview and Production, none to Development and no Clerk/score bindings. S11 subsequently bound `VITE_SITE_ORIGIN` to the canonical origin and `SCORE_WRITES_ENABLED=false` for Production and Preview, created distinct sensitive cryptographic `SCORE_RECEIPT_SECRET` values for each, and set `SCORE_ALLOWED_ORIGINS` to the exact production origin for Production only. On 2026-10-29, S11 added branch-specific Preview overrides for `codex/openarcade-s01-staging`: `DATABASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_KEY`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES` and `SCORE_ALLOWED_ORIGINS`. The two origin allowlists use exactly `https://openarcade-git-codex-openarcade-s01-staging-w3gpt.vercel.app`. No secret values were printed or committed. Environment changes require a fresh deployment; their presence does not prove deployed sign-in or database behavior. Production database/auth bindings remain unchanged. Production and default Preview score writes remain disabled; S01 authorized `SCORE_WRITES_ENABLED=true` only for `codex/openarcade-s01-staging` after the isolated database tests passed. A fresh Preview deployment must consume that override before UI write tests.

Integration resource `store_0EAwHfKj1KKmkFuy` / configuration `icfg_MI5ckDu8EMTYukQG6x4qTJDN` is identified by environment metadata. Initial connector/CLI access was insufficient; the signed-in browser subsequently verified the existing Neon project `openarcade-feedback` / `orange-cherry-09292655`. Its production branch is `br-little-tooth-b8oi36rl`, endpoint `ep-wild-haze-b87hcogv`. S11 created a schema-only child, `openarcade-launch-preview` / `br-plain-salad-b8amuvnr`, endpoint `ep-old-shadow-b87sxbm8`, database `neondb`, and bound it only to the staging Git branch above. No production feedback data was copied. Other Preview deployments still require independent isolation checks before writes; the shared integration binding was preserved. S03 verified all five required Clerk DNS records for `openarcade.io` and the production instance's JWKS endpoint returned TLS/HTTP 200. Preview uses the existing development Clerk instance. Production Clerk environment bindings and deployment remain pending S01's release sequence. See [Clerk on Vercel](https://clerk.com/docs/guides/development/deployment/vercel).

## Configuration names and environment boundaries

[.env.example](../.env.example) contains placeholders only. These names are agreed with S02/S03/S05; their presence in an example does not establish that a deployed environment is configured.

| Name | Visibility | Configuration |
| --- | --- | --- |
| `DATABASE_URL` | Server only | Production: existing production branch. Preview/Development: confirmed separate branch/credentials. |
| `VITE_SITE_ORIGIN` | Public build | Canonical HTTPS production origin; preview behavior follows S05's generated metadata contract. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Public build | Existing Clerk instance; production key for production, development instance/key for isolated previews. |
| `CLERK_SECRET_KEY` **or** `CLERK_JWT_KEY` | Server only | Matching instance secret or PEM verification key; never a `VITE_` variable. |
| `CLERK_ISSUER` | Server config | Exact matching Clerk Frontend API URL. |
| `CLERK_AUTHORIZED_PARTIES` | Server config | Comma-separated exact application origins, including scheme and port. No wildcard. |
| `SCORE_RECEIPT_SECRET` | Server only | Separate random value, at least 32 characters, stable across function instances and ordinary redeploys. Rotation can invalidate outstanding receipts. |
| `SCORE_ALLOWED_ORIGINS` | Server config | Exact application origins for this environment; coordinate embed requirements with S02/S05. |
| `SCORE_WRITES_ENABLED` | Server config | Enable only after schema/identity checks; captures use `false`. This governs score writes, not feedback writes. |
| `SCORE_TEST_DATABASE_URL`, `SCORE_TEST_DATABASE_ISOLATED` | Local test only | Disposable confirmed branch and explicit `1`; never production or public CI credentials. |

Use actual `vercel dev` origin/port in local allowlists; plain Vite's URL is not an API environment. For Clerk, configure the existing instance's application domain/origins and the exact approved return locations with S03. A publishable key alone does not establish working sign-in or backend verification. Record production and stable preview origins, the matching issuer, sign-in/sign-out return paths, and successful two-account checks. Preserve pending scores through cancel, redirect and reload. Do not add wildcard redirect destinations or disable origin validation to make preview login work.

Before any mutation test, inspect the existing Neon integration's Preview Branching setting and the actual deployment's branch/endpoint identity. Project-level environment target labels alone do not prove isolation: Neon may inject deployment-specific credentials. Compare branch IDs/endpoint identity without printing secrets. Enable Preview Branching on the **existing** integration, or bind an existing isolated branch to Preview/Development. Do not provision a duplicate database, delete/reset tables, or change the production branch to a preview branch. A copied preview may contain production data; avoid sharing it and never export user records as test artifacts. Environment changes require a new deployment.

Official references: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Neon preview branching and production branch selection](https://neon.com/docs/guides/vercel-managed-integration).

## Migration order and rollback safety

Merged prerequisites: [S03 comments PR #14](https://github.com/markeljan/openarcade/pull/14), commit `ba1155a908db41d1f9d5c45c237e627146bbaca3`, and [S02 scores PR #22](https://github.com/markeljan/openarcade/pull/22), commit `8356b167c926f02e7802f54c822f397f85309124`. These checksums cover the canonical Git blob bytes, not a text pipeline or a checkout with converted line endings:

| File | Commit | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `db/feedback-schema.sql` | `8356b167` | 702 | `1a20a04b7388fd667174a90ed4f9b6539c4f9e3a12111b0de5df4f1371069fa3` |
| `db/comments-auth-schema.sql` | `ba1155a9` | 1,160 | `bfbca0211bab8ba648db1679b1e75ac9df3ab0af52ffcd7f09a32063b35ace72` |
| `db/score-schema.sql` | `8356b167` | 11,653 | `60dcafb3f015739c8efa46b62ada39c67b7ea957dcd290e62116a467017f0e43` |

1. Fetch the merged commits above and verify the intended migration content. S01 confirms the actual database branch/endpoint identity and records read-only table/column inventory before SQL execution. A checksum proves file identity, not database isolation or execution.
2. For a combined release, apply the feedback baseline if needed, then comments, then scores on confirmed isolated Preview first. Comments require the baseline and **must precede new-handler promotion** because reads reference the new columns. Scores are additive/idempotent, seed nothing, and have no dependency on the comments migration; an independent score-only migration can follow the baseline. See [feedback ordering](FEEDBACK.md) and [score ordering](SCORES-API.md).
3. Run each reviewed additive migration against the confirmed branch through the authenticated SQL editor/approved runner. Record filename, commit, branch ID and result, with no SQL credentials. Verify existing object shapes/constraints too: `IF NOT EXISTS` provides repeat protection, not evidence that an existing schema matches the expected one. Keep legacy feedback and anonymous comment history. Do not run destructive test cleanup against production.
4. S12/owners verify real Postgres behavior, two Clerk users, anonymous reads, authorization failures, concurrent rate limits, idempotent saves, score retention, and moderation. Mock API tests do not prove these.
5. Only after S01 sequences it, apply the same reviewed additive changes to production. Keep old columns/tables compatible with the previous deployment. Deploy backend configuration before enabling UI writes; repeat read-only health checks.

Deployment rollback changes code, not Neon data or Clerk settings. Leave additive schema in place. Do not drop new tables/columns or reverse migrations during an incident. An old anonymous-comment endpoint bypasses the new sign-in policy and ignores `removed_at`, potentially re-exposing hidden comments. Prefer an authenticated known-good handler when those policies must remain; S01 coordinates any temporary feedback-write restriction with S03/S05. The score-write switch does not disable comments. Receipt-secret or Clerk changes may also prevent an old build from working; test compatibility before promotion.

On 2026-10-29, S11 applied the exact three migrations above in baseline → comments → scores order to isolated branch `br-plain-salad-b8amuvnr` / `neondb`, then reapplied the same bundle successfully. Each run completed 29 statements. Read-only inventory found all nine expected tables, four targeted additive columns and five score functions; comments, votes and plays each contained zero rows. S01 subsequently reported all 10 gated real-Postgres tests passed, including concurrent submissions/claims, ownership, pruning, expiry, moderation epochs, atomic limits and rollback; S11 removed the ignored test credential handoff afterward. Schema inventory and database tests do not establish deployed Clerk/API behavior. No production migration was executed.

S01 preserved pre-auth snapshot `f1390d37dbc1ac78a376135e07fd754835564bb7` on `codex/openarcade-s01-release-batch02`. It is an incomplete frontend base, requiring reviewed mobile embed and applicable frame/focus fixes before any release. S01 alone may assemble and promote a release candidate. Main now includes the new handlers; its production-target Git builds remain held and must not be treated as isolated write staging.

## Staging, promotion and recovery

Prefer existing Vercel Git deployments. Pull requests build previews; S01 must confirm whether pushes to `main` currently auto-assign production domains **before merging** launch prerequisites. If auto-assignment is enabled, a merge is a production release. The GitHub workflow only runs `npm ci`, tests and build, with no deploy credentials.

For a deliberate staged production build, S01 can disable automatic domain assignment in the existing project's Production environment, or use the CLI's `--skip-domain`. Run from the reviewed, clean release checkout linked to the confirmed project, with the existing authenticated CLI. Replace uppercase identifiers using the verified release record, not secrets in command arguments:

```sh
vercel project inspect openarcade --scope w3gpt
vercel env ls production --scope w3gpt
vercel env ls preview --scope w3gpt
vercel inspect PREVIOUS_PRODUCTION_URL --scope TEAM_SLUG
vercel deploy --prod --skip-domain --scope TEAM_SLUG
vercel inspect STAGED_PRODUCTION_URL --scope TEAM_SLUG
node scripts/check-launch.mjs https://STAGED_PRODUCTION_HOST https://openarcade.io
# S01, after the checks and explicit release decision:
vercel promote STAGED_PRODUCTION_URL --scope TEAM_SLUG
node scripts/check-launch.mjs https://openarcade.io
```

A staged **production** build uses production credentials: use read-only probes there. Destructive/repeated write tests belong on isolated Preview. A protected staged URL needs authorized browser/CLI access; do not disable all preview protection or publish a bypass token for tests. The anonymous probe intentionally fails on protected URLs. Promoting a Preview deployment triggers a production rebuild with production configuration, so it does not release the identical tested Preview build. Promoting a staged production build avoids that rebuild. See [Vercel promotion](https://vercel.com/docs/deployments/promoting-a-deployment) and [deploy flags](https://vercel.com/docs/cli/deploy).

On a real regression, S01 records the error and uses the known-good previous production deployment:

```sh
vercel rollback PREVIOUS_PRODUCTION_URL --scope TEAM_SLUG
vercel rollback status PROJECT_NAME --scope TEAM_SLUG
node scripts/check-launch.mjs https://PUBLIC_PRODUCTION_HOST
```

Confirm the plan permits the chosen rollback target (Hobby limits rollback to the previous production deployment). Rollback may stop automatic assignment of later builds; verify the project setting before resuming release flow. Keep production data and additive schema. See [Vercel rollback](https://vercel.com/docs/cli/rollback).

## Health, errors and abuse

`node scripts/check-launch.mjs https://PUBLIC_PRODUCTION_HOST` performs anonymous GET requests only, validates initial game metadata/image delivery, real 404 behavior and feedback availability. It does not establish Clerk, writes, database isolation, gameplay or actual X client support. A public production crawler/image request must succeed without Vercel Authentication. Intentional preview protection is separate. S12 records representative browser evidence for previews, manual play, touch, pause/restart, audio and cleanup.

Use existing Vercel runtime logs for API errors; inspect the release deployment, route, status and request ID around the incident. S02/S03 should log safe error codes/request IDs, not authorization headers, payloads, SQL parameters or full exception objects. Clients must show unavailable states when storage/auth fails and preserve pending scores/drafts. Do not invent successful shared counts or saved results. Review 5xx and 429 trends after promotion; no new monitoring platform is required.

Merged owner controls: S02 bounds score JSON at 8 KiB on parsed/string paths and uses durable Postgres IP/account write limits. S03 bounds feedback JSON at 2,048 UTF-8 bytes on both paths and limits account comments to 5/minute and 50/24-hour window. Deployed enforcement still requires confirmed target migrations and live checks. Anonymous votes and play counts retain the previous browser-ID behavior; do not claim those are account-verified or protected by the score/comment budgets. Browser IDs, origin allowlists and local counters are not durable abuse prevention. Public scores are client-reported; signed receipts and limits do not prove gameplay or make rankings cheat-proof.

S02 distinguishes private pre-login results from explicitly named public guest entries. Check that an unclaimed pending account result stays out of public boards until authenticated claim, while the guest flow makes its chosen public name/score visible by explicit action. A canceled sign-in must preserve the pending result without publishing it. Do not treat every anonymous result as consent to a public guest listing.

For moderation, use the existing authenticated Neon SQL editor and an exact record ID; no public admin endpoint or browser credential. On the merged S03 schema, review one comment's ID/game/timestamp without copying its body into a public ticket, then soft-hide in a transaction:

```sql
BEGIN;
SELECT id, game_id, created_at, removed_at FROM arcade_comments WHERE id = 123;
UPDATE arcade_comments SET removed_at = now() WHERE id = 123 AND removed_at IS NULL
RETURNING id, game_id, removed_at;
-- Inspect RETURNING before issuing COMMIT separately.
-- If the wrong row/no row changed, issue ROLLBACK instead.
```

Replace `123` with the reviewed exact ID. For a score, inspect `run_id,game_id,rule_version,actor,removed_at` in `arcade_score_rows` for the exact reviewed run UUID, then use the merged operator function inside an explicit transaction:

```sql
BEGIN;
SELECT arcade_score_set_removed('REVIEWED-RUN-UUID'::uuid, true);
-- Inspect the boolean result and exact record before issuing COMMIT separately.
-- On an unexpected/missing record, issue ROLLBACK.
```

The placeholder deliberately fails until replaced with a valid reviewed UUID. The function takes the board lock and increments its epoch so caches refresh; retained receipt markers prevent replay insertion. For a mistaken human removal, the same function with `false` restores it after review. AI restoration returns false: let a legitimate new run qualify rather than creating an unchecked eleventh row. Do not directly delete score rows/receipt markers or reset a whole game. Record moderator/time/reason/record ID privately, then verify public reads omit the hidden record and unrelated records remain. Account deletion and database retention are separate from hiding public content.

After a confirmed target/migration, an authorized operator can run `SELECT arcade_score_cleanup();` during a maintenance check to remove expired limiter buckets and clear expired unclaimed private payload/claim hashes. This is an explicit operation, not a scheduled job added by S11. Pending claims expire after seven days. The function retains minimal run UUID/fingerprint/outcome markers for global idempotency, so total marker count grows with unique runs. Track row counts/database capacity without exporting user data; do not promise bounded total storage or deletion of public personal bests at claim expiry.

## Public data notice and repository audit

Use [the data and feedback notice](PRIVACY.md) for the public UI link; S04 owns integration. Keep it aligned with deployed behavior, including Clerk, Neon and existing Analytics. Never promise a retention period or account-deletion automation that has not been implemented.

The S11 audit of checkout `574f811` inspected 618 tracked paths and 891 blobs reachable from local Git refs at audit time. Pattern checks covered credential-bearing Postgres URLs, Clerk/OpenAI/GitHub/Slack tokens, AWS access keys and private-key headers; none matched. No tracked environment files, `.vercel` directories, log/archive/HAR/database/backup files matched the bounded path check. This is not proof that every possible secret or external ref is absent. The only tracked standalone media asset at that baseline was `public/favicon.svg`; most artwork/audio is procedural code. Existing README/catalog/REA notes explicitly preserve miniarcade.dev inspiration, source-analysis evidence and independent-implementation limitations; keep them. No license file or established owner license intent was found, so S01/user must choose a license before a grant can be asserted. Third-party rights are not established by repository visibility. Do not rewrite history or publish secret values if a later audit finds a credential.
