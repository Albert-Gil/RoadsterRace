# Recovery ability refill

Implemented locally on 2026-11-07. No commit, push or deployment was performed for this update.

## Behavior

Every recovery restores Hop and Thrust for the returning car. This covers failed manual/automatic jumps, water or unsupported falls, stuck impacts and existing penalized drawn hazards. It applies equally to humans and CPU drivers in Solo Race, Multiplayer, Time Trial and tournaments.

The active burst stops, queued ability commands are cleared, and both ready times are set to the end of the existing recovery hold including any hazard penalty. During the hold, activation remains blocked and pressed commands are discarded. An occupied respawn remains blocked until safe release; both abilities are still full on release. A fresh press is required to activate them, and the normal five/seven-second cooldown then starts again.

Race time, recovery penalties, safe section/deck ownership, checkpoint/progress rules, lap incidents and cumulative Thrust/Hop counts are preserved. There is no new invulnerability period or free forward progress. Pause still freezes the fixed simulation clock.

The change is in the shared `settleAfterRecovery` path in `src/core/simulation.ts`, rather than a special case for a venue, ability button or controller. It adds no per-frame rendering work or new assets.

## Compatibility

Rules/physics version increases from 19 to 20 because successful ability retries can change race results. Compiler 20 and all track versions remain unchanged. Existing compatibility handling separates old timed records/replays and rejects incompatible saved championship resumes. Names, paints, lap preferences and historical medals remain.

The circuit replacement/rename is a separate plan in `CIRCUIT_REPLACEMENT_PLAN.md`; the active ten venues and their names have not been changed by this update.

## Verification

- Full unit run exercised 953 cases: 952 passed and one older barrier test explicitly demanded the previous no-refill behavior. Its assertion was updated to the requested policy; the affected test file and recovery/Hop/Santa Monica/rules checks were rerun, with all 64 cases passing. No simulation changes followed the full run.
- New deterministic cases cover real water failure, protected-wall recovery, complete drawn-hazard penalties, discarded input during the hold, preserved usage counts and fresh simultaneous activation with normal cooldowns.
- Shared-recovery occupancy checks confirm that waiting cars retain full charges until release.
- Two browser cases pass on desktop and emulated phone landscape: consume abilities before the Fleet Hop entry, fail the crossing, observe both controls become READY, then activate both through their actual buttons/touch controls.
- Type checking, root and Pages-path production builds pass. Local Pages smoke completes a production touch race with sound enabled and no page errors or failed required requests.
- Generated rules were updated and source consistency passes. Whitespace check passes. Logs/screenshots are retained under ignored `artifacts/recovery-refill/`.

Physical iPhone/iPad Safari verification remains pending hardware testing. The code is ready for local review; it has not been published.
