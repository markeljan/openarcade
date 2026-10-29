# OPENARCADE S07 — feature scoring 01–10

Owner: S07. Scope: the twenty games in the ten complete feature modules below. No dependency, environment variable, database migration, main UI or catalog change is required by this batch. Shared score infrastructure is owned by S02; [contract PR #1](https://github.com/markeljan/openarcade/pull/1) merged as `6f27b944f627411f4a87ac91f8a53df938726ea0` and was fetched/rebased before integration.

Version 1 metrics use integer points and descending order, except Turbo Arena (blue-team goals) and Midnight Pursuit (fractional distance in meters). Public results are client-reported. Existing human best keys remain `miniarcade:best:<id>` where present; AI and gallery runs never update them. A takeover starts a new factory and new run identity rather than inheriting AI progress.

S01 approved the unusual real-event boundaries below. The first two sub-batches enable modules 1–6; pending rows remain disabled until their implementation and tests land. Tests exercise actual damage, clocks, collisions and input paths. They do not establish natural AI win/death frequency or public persistence.

| ID | File | Metric / unit / order / version | Human completion evidence | AI completion evidence | Validation |
| --- | --- | --- | --- | --- | --- |
| machine-hunt | src/feature-games.js | meters + machine kills / points / desc / 1 | Real fatal damage after earned points | Fresh watch-player fixture takes a real fatal mortar hit | Focused terminal/lifecycle/audio pass; controlled low-health fixture |
| meat-lad | src/feature-games.js | platform progress + bandages + rescue / points / desc / 1 | Real fifth death ends run | Same fifth-death counter in instrumented AI run | Focused terminal/lifecycle/audio pass; four-prior-deaths fixture |
| turbo-arena | src/feature-games2.js | blue-team goals / goals / desc / 1 | Regulation, seven-goal limit or overtime goal | Two real AI matches emit distinct run IDs | Focused terminal/records/audio pass |
| jelly-dash | src/feature-games2.js | qualification and crown awards / points / desc / 1 | Elimination, crown or final timeout enters spectating | Same tournament termination paths | Focused terminal/records/audio pass |
| side-surfers | src/feature-games3.js | distance ticks + coins + near misses / points / desc / 1 | Real collision; browser best equals reported score | Same collision, ineligible gallery results | Focused tests and actual headless browser pass |
| word-fall | src/feature-games3.js | kills + solved words / points / desc / 1 | Lethal hurt captures result | Same lethal hurt before fresh factory | Focused terminal/lifecycle/audio pass |
| rune-swarm | src/feature-games4.js | match and combat awards, dawn health bonus / points / desc / 1 | Death or 120-second dawn | Same boundary followed by preview reset | Focused human/AI, records, audio and lifecycle pass |
| deep-digger | src/feature-games4.js | mining, crafting, combat and building / points / desc / 1 | Health depletion | Real lava damage fixture reaches depletion | Focused damage/reporting pass; controlled world fixture |
| web-slam | src/feature-games5.js | hits, wall damage and breaches / points / desc / 1 | 120-second clock or three points | Same match boundary with automatic reset | Focused human/AI, records, audio and lifecycle pass |
| deadline-deck | src/feature-games5.js | existing delivery/trick score after combo banking / points / desc / 1 | Time or lives exhausted | Same timeout/life boundary | Focused human/AI, records, audio and lifecycle pass |
| scrap-arena | src/feature-games6.js | combat awards and 300-point win bonus / points / desc / 1 | Elimination, clock or overtime decision | Same decision, automatic next round | Focused human/AI, records, audio and lifecycle pass |
| gridiron-rush | src/feature-games6.js | existing match session score / points / desc / 1 | 900-second match plus six-second verdict; save before notification | Same match duration and verdict | Focused human/AI, exact 80-point idle result and callback-destroy pass |
| ghost-shift | src/feature-games7.js | sigils, relays, cases and deposit / points / desc / 1 | Proposed first complete deposit | Same deposit; current game repeats shifts | Source audited; boundary pending |
| wingrush | src/feature-games7.js | cores + broken blocks + topple award / points / desc / 1 | Proposed first fort toppled | Same fort destruction; current flight is endless | Source audited; boundary pending |
| grave-garden | src/feature-games8.js | existing defense session awards / points / desc / 1 | 900-second session, verdict then result | Same clock/verdict, automatic reset | Source audited; tests pending |
| swarm-keeper | src/feature-games8.js | existing challenge score and completion award / points / desc / 1 | All challenges complete, five-second ending | Same challenge completion then reset | Source audited; tests pending |
| cosmic-haul | src/feature-games9.js | rock breaks + tethers + banked salvage / points / desc / 1 | 900-second quota verdict | Same quota clock; AI currently excluded from manual counter | Source audited; tests pending |
| midnight-pursuit | src/feature-games9.js | distance / meters / desc / 1 | Proposed first bust at 100 damage | Same bust; existing recovery resets damage | Source audited; boundary pending |
| pico-cap | src/feature-games10.js | existing glade awards / points / desc / 1 | Proposed first glade cleared | Same clear; current game repeats glades | Source audited; boundary pending |
| frog-convoy | src/feature-games10.js | crossings + pickups + deliveries / points / desc / 1 | 900-second shift and ending | Same shift/ending; automatic reset | Source audited; tests pending |

Existing tests often assert inherited preview world state. Required fresh takeover semantics supersede those assertions, while sibling mechanics, audio, held-input release, pause, result timing, restart and cleanup remain covered by focused regressions. S01 coordinates any changes to existing shared tests.

The executable shards are `src/scores/rules/s07.js` and `src/scores/coverage/s07.js`. `tests/s07-feature-01-03.test.js` covers the first six hooks and run transitions; `tests/s07-score-registry.test.js` joins the shard to the actual twenty assigned catalog entries. Existing record and audio regressions also pass. Narrow inherited-world assertions in `feature-best-score.test.js` and `feature-games2-records.test.js` were updated with S01 authorization; local-best assertions remain.

The second sub-batch depends on S07 PR #21. `tests/s07-feature-04-06.test.js` adds both actors' terminal paths, single-loop AI restart, paused input, takeover, attract and best-before-callback checks. Three existing result fixtures (Deadline Deck, Web Slam and Gridiron) only gain an absolute reporter import so their data-URL source transforms remain executable.

Rule bounds are broad **public acceptance policy**, approved by S01, rather than proven gameplay maxima. There is no minimum duration gate: a legitimate immediate failure can score zero. Unbounded games have a 24-hour active-simulation limit and generous score caps (one million points, or ten million for Surfers, Word Fall and Deep Digger). The exact per-game caps live in the rule shard. Longer or exceptionally high valid runs can fall outside those limits. Timed games allow their finale; Frog Convoy uses 24 hours because arrivals and wipes pause its 900-second shift counter. These limits do not establish anti-cheat protection.

Browser evidence uses actual headless Chrome/Edge, the real canvas wrappers and keyboard events. It verifies Side Surfers and Ghost Shift preview/manual completion, eligibility, local best where supported, pause, restart and cleanup. No score API/database/login behavior is claimed by S07. The final sub-batch includes the reproducible browser test. S01 owns aggregate tests/build, deployed verification and release.
