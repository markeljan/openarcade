# OPENARCADE S08 scoring handoff

S08 owns complete feature modules 11–20 and the `src/scores/{rules,coverage}/s08.js` shards. These are 20 client-reported score rules, version 1. The machine-readable coverage snapshot is `s08-coverage.json`; the executable shards are authoritative.

Dependency: S02 contract PR #1, merged as `6f27b944f627411f4a87ac91f8a53df938726ea0`. Sub-batches are PR #18 (11–13), PR #20 (14–16) and the final 17–20 PR. S01 owns merge and release. No environment variables, migrations, dependencies or lockfile changes.

S01 approved 120 active-second trials for the ten previously endless games in modules 11–16. Burrow uses its existing 900-second hunt plus six-second ending; Gravity finishes at actual health depletion. Ashen, Star Roller, Dragon Lock and Cursed Fist retain their existing finite endings and finale rewards. Coral finishes its first complete reef restoration; Beacon its eighth safe docking; Railway its eighth successful train delivery; Pottery its third displayed fired pot. Setbacks remain nonfatal. These scored boundaries freeze the result; a subsequent run receives fresh state and a new ID.

Both actors use the same event awards. Manual takeover and return to AI abandon the old callback before releasing inputs and destroying its factory. Restart, Enter and AI recovery use fresh callbacks. Pause stops active duration and input; disposal invalidates completion before cleanup. Preview results do not write human bests. Existing human best writes precede the public callback. No game performs network IO or starts timers or a separate loop.

Bounds in the rule shard are acceptance ceilings, not demonstrated optimal scores. Timed games have bounded run durations. Gravity and the four successful-milestone games have no natural time limit; their public rule accepts at most one active day. Milestone scores are event sums: Beacon's first eight docks total 800; three stage-zero pots total 300–1200. Other large ceilings allow varied successful play and are not security proofs.

Validation includes natural timed factory boundaries for human and AI, exact event awards, native finales, fresh identities, stale callback rejection, pause/input handling, result freeze, Enter/restart, context and local-record isolation. Module 17–20 terminal tests use shortened clocks or seeded near-terminal successful-state fixtures; they do not prove full manual playthroughs. Existing native Star/Dragon result and record tests also pass.

The headless Chrome browser harness uses real canvas and unchanged game modules. It completes Tower's real 120-second AI/watch and manual runs, result and Enter restart. Gravity, Star Roller and Railway receive lifecycle smoke checks only. Other 16 games have no individual browser check in this batch. The shell UI, authenticated score API, Clerk, database and production/embed flows require integrated S01/S12 verification.

S01 authorized 36 existing data-URL fixture imports to point to the real reporter by absolute file URL, preserving their assertions. Robot's trial wrapper test checks five registers, earlier course progress and fresh 120-second run IDs; a separate raw-factory test retains all-three-course coverage. Railway's setback regression permits a preview reset only after eight deliveries and a result state. Shared Idol setback assertions are coordinated with S01/S09 separately.
