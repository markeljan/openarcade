# OPENARCADE S10 scoring coverage

Dependency: S02 contract PR #1, merged as `6f27b944f627411f4a87ac91f8a53df938726ea0`.
S10 owns complete feature modules 31–40 and its rules/coverage shards. No environment variables, migrations, network requests, dependency changes or shared player edits.

Every metric is version 1. Millisecond metrics rank ascending and report only an actual successful finale; checkpoint recovery never reports a fast loss as a win. Other metrics rank descending. The three 120-second rounds are explicit new active-simulation boundaries approved by S01, with identical rules for both actors and a visible clock. Pause and result display time do not count. Gallery previews are ineligible; intentional watch runs are AI. Restart, takeover and return to AI create fresh runs.

| Source | ID | Metric / units / order / version | Human completion evidence | AI completion evidence | Browser / rollout |
| --- | --- | --- | --- | --- | --- |
| feature-games31.js | tower-heist | First escape return / ms / asc / 1 | Real manual return transition fixture | Real return transition and full preview run | Pending browser; enabled |
| feature-games31.js | storm-slot | First two-lap cup / points / desc / 1 | Real manual second-lap fixture | Real second-lap fixture and full preview run | Pending browser; enabled |
| feature-games32.js | glacier-glide | Feeding and rescue in 120 active s / points / desc / 1 | Real 120 s manual wrapper run | Real 120 s preview run | Pending browser; enabled |
| feature-games32.js | cloud-shepherd | First completed pasture / points / desc / 1 | Real final-sheep transition fixture; existing manual flock test | Real finale fixture and full preview | Pending browser; enabled |
| feature-games33.js | essence-workshop | Artifacts and moths in 120 active s / points / desc / 1 | Real 120 s manual wrapper run | Real 120 s preview run | Browser preview, fresh takeover, visible clock, timeout to AI; enabled |
| feature-games33.js | mill-mechanic | Output services in 120 active s / services / desc / 1 | Real 120 s manual wrapper run | Real 120 s preview run | Pending browser; enabled |
| feature-games34.js | wobble-war | Victory points at red defeat / points / desc / 1 | Real defeat transition fixture | Seeded full AI defeat | Not exercised manually in browser; enabled |
| feature-games34.js | void-gambit | Enemies defeated at won/lost / wins / desc / 1 | Real hull-loss fixture and wrapper run; assisted run excluded | Full direct AI run and eligible watch wrapper | Not exercised manually in browser; enabled |
| feature-games35.js | rulebound | Final book completion / ms / asc / 1 | Real final-page transition fixture | Full seeded AI book completion | Not exercised manually in browser; enabled |
| feature-games35.js | hex-hamlet | Expedition outcome / points / desc / 1 | Real manual exhaustion and restart | Full expedition result | Browser exhaustion, result, Escape, Enter, timeout; enabled |
| feature-games36.js | ashen-courier | Fallen or escaped / KOs / desc / 1 | Real fallen transition fixture; existing manual loss test | Full native terminal run | Not exercised manually in browser; enabled |
| feature-games36.js | icebound-ascent | Final summit completion / ms / asc / 1 | Real final summit transition fixture | Full AI ascent | Not exercised manually in browser; enabled |
| feature-games37.js | phase-foundry | Service garden completion / ms / asc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games37.js | hearthbound | Rescue or natural loss / points / desc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games38.js | gloam-trawler | Three-bell homecoming / ms / asc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games38.js | reef-to-rice | Moonfin banquet / meals served / desc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games39.js | neon-duelist | Train departure / parries / desc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games39.js | street-crew | City connected or timeout / deliveries / desc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games40.js | stamp-harbor | Three-shift ferry departure / pay / desc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |
| feature-games40.js | wash-wonder | Third gate reopening / ms / asc / 1 | Audited; next sub-batch | Audited; next sub-batch | Pending |

Modules 31–33 evidence: `tests/s10-games31-33-score.test.js` (both actors). Existing gameplay tests preserve human-only HUD records while the run metric counts the same events for AI and humans. Near-terminal fixtures exercise the original transition logic; they do not establish a full human playthrough. Range-specific source fixtures resolve the real reporter by file URL. `glacier-gloam-lifecycle.test.js` tests setbacks directly, because a leaderboard wrapper now correctly abandons preview progress at takeover.

Modules 34–36 evidence: `tests/s10-games34-36-score.test.js`. Void's native Z or AUTO pointer assistance marks the entire human run assisted, suppressing its submission until a fresh run. Intentional AI watch reports remain eligible. Existing no-callback Void/Ashen result delays remain compatible; scored players with `onResult` retain a result for about 12 active seconds before returning to AI. Source fixtures in the three Ashen/Rulebound tests resolve the real reporter.

Local browser evidence (2026-10-28): Essence preview/takeover and timed return to AI; Hex manual 20-tile exchange exhaustion shows score 0, Escape preserves the result, Enter restores a fresh 20-tile board, and timeout returns to AI. Feedback is unavailable under plain Vite as documented; the only captured console exception came from a browser wallet extension. Other games still require integrated browser coverage by S12.

Public scores remain client-reported. These local tests do not establish Clerk, database, deployed API, production or embed persistence behavior. S01 owns release and integrated verification.
