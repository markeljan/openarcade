# Continuous integration

[Vercel CI](https://vercel.com/docs/ci) is configured with tasks tagged `ci` in the root `turbo.json` for this single-package repository. On October 29, 2026, the Vercel dashboard rejected setup with **“Vercel CI is not available for public repositories.”** This repository is public. CLI enablement succeeded and `ciEnabledAt` was verified, but that alone did not start the tagged tasks.

Until that provider restriction is lifted, `.github/workflows/ci.yml` keeps the **Test and build** / `check` check and runs `npm run ci` on Ubuntu 24.04. The old runner-specific Chrome symlink and separate test/build steps have been replaced by the shared task graph below. Do not remove this fallback based on an enabled setting or skipped invocation: require a real passing Vercel build and test run first.

| Task | Command | Requirements and outputs |
| --- | --- | --- |
| `build` | `npm run build` | Vite production build; caches `dist/**`. Public `VITE_*` values and local `.env*` files invalidate the cache. |
| `test:ci` | `npm run test:ci` | Depends on `build`, runs on Ubuntu 24.04, installs pinned Playwright Chromium and its system dependencies, checks browser startup, then runs every Node test with concurrency 1 and a 15-minute suite timeout. |

The build dependency restores `dist` before tests start, including on a build cache hit. This ensures the built-embed fixture runs instead of skipping for missing HTML. Test caching is disabled so a local Windows/macOS result cannot stand in for the Ubuntu browser run. All 16 browser fixtures use the same Chromium headless shell executable supplied by the CI runner. The ordinary `npm test` command still supports locally installed Chrome/Edge.

Vercel bootstrapping runs `npm ci` from the committed lockfile. Browser installation runs inside the Ubuntu test task: system packages installed in bootstrapping's separate Amazon Linux instance would not carry over. Node 24 is declared in `package.json`; Turborepo and Playwright versions are pinned. No production credentials, database, deployed URL, or Vercel token are needed by these tasks. The isolated Postgres integration fixture remains opt-in and skips in CI, just as it did in GitHub Actions. Run it separately against a disposable database as described in the operations runbook.

## Run locally

```sh
npm ci
npm run ci
```

On Linux, the first browser installation may require root/sudo to install OS libraries. On Windows and macOS it downloads Chromium without apt. To bypass task caches when diagnosing failures:

```sh
npm run ci -- --force
```

To run a focused test against an installed local browser, use `node --test tests/<file>.test.js`. `OPENARCADE_TEST_BROWSER` can select a specific executable for direct test runs; a nonexistent explicit path fails immediately. `npm run test:ci` always selects the pinned browser and requires an existing build; use `npm run ci` for the complete sequence.

## Enable and inspect Vercel CI

The target is GitHub `markeljan/openarcade`, Vercel team `w3gpt`, project `openarcade` (`prj_OMjMAkAONyAnZ6NIjWNzq0pWcZFD`). Repository enablement is a Vercel setting, not a flag in `vercel.json`. With an authenticated Vercel CLI 64.3.1 or newer, run from this checkout:

```sh
npx vercel@65.7.0 ci enable --remote origin --scope w3gpt
npx vercel@65.7.0 ci list --scope w3gpt
npx vercel@65.7.0 ci inspect <run-id> --scope w3gpt
npx vercel@65.7.0 ci logs <run-id> --scope w3gpt
```

Enable CI before pushing the configuration branch. A GitHub push is the trigger; inspect the resulting run in [the team CI dashboard](https://vercel.com/w3gpt/~/ci) and its check on the PR. The initial invocations were deployment-native `lint`/`typecheck` probes with `script_not_found` / `no_jobs_resolved`, not execution of this Turborepo graph. Confirm both actual tasks pass before removing `.github/workflows/ci.yml`. If branch protection or rulesets then require `check`, replace that requirement with the actual Vercel CI check after its first run appears. No branch protection or rulesets were configured at migration inspection time.

Vercel's existing Git deployment integration remains responsible for deployments. CI success is a merge check, not a production promotion or a change to the release hold documented in [operations](OPERATIONS.md).
