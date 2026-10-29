# Snowy Tahoe v5 verification — three takeoffs and grounded tyres

## Gameplay

- Three automatic takeoffs are authored on the normal road at stations 36, 146
  and 364 m. The hidden Hop trail retains a flat supported height.
- Targeted simulation checks pass for each takeoff at **20/30/42 m/s**, each with
  **−20°/0°/+20° body yaw**: 27 approaches launch and land without recovery,
  Thrust or Hop. Slow, reversed and outside-gate cases retain normal behavior.
- Easy, Normal and Hard computer plans complete six laps, with **18 automatic
  takeoffs** per race and no recovery. Manual Hop never stacks a crest impulse.

## Rendered slope contact

The browser grounding journey completes a real Time Trial using a prepared test
line, observing interpolated car poses after rendering. It samples steep climbing
and descending road, not a static showcase pose.

- **35 slope samples**, with all four tyre contact positions compared against
  native rendered road/shoulder heights.
- **24 independent downward ray probes** against actual visible road meshes.
- Native surface tyre gaps: **0.0078–0.0131 m**; direct mesh gaps:
  **0.0083–0.0110 m**. The intended cosmetic clearance is 0.01 m.
- Both uphill and downhill pitch are observed; wheel suspension and side-slope
  roll are visual only. Airborne height remains separate from the ground fit.
- Shadow projection remains bounded at 512 triangles per car (observed maximum
  450), with refreshed partial-submesh bounds for transparent sorting.
- **Zero browser script errors** in the measured journey.
- The detail capture pauses the race at 17.1 seconds and changes only its camera;
  the simulation clock remains 17.1 seconds. Actual gameplay keeps its fixed view.

## Review assets

`artifacts/tahoe-grounded/index.html` contains the prior v4 desktop/landscape
captures, updated desktop/landscape/portrait views, a paused uphill detail and a
silent actual Solo Race recording. The recording uses a prepared route and no
human ability presses. Its report preserves the actual state and sampled trace.

## Final verification

- Unit coverage: **613/613 checks across 45 files** pass across the full run and
  one focused rerun. The full run passed 612 checks; its nine-race Tahoe CPU case
  hit the former 180-second timeout. The terrain-specific allowance is now 360
  seconds and the focused rerun passed (268.49 s total). No driving assertion was
  removed or relaxed. Logs: `unit-tests.log` and `cpu-rerun.log`.
- Final type checking, generated-rules output and the `/RoadsterRace/` production
  build pass. Local puffs use
  the same fast visible-surface sampler; this changes no physics or visual layout.

- **18/18 exact handling fixtures match HEAD**, comparing the six unchanged
  venues with one, two and four cars, recorded Thrust/Hop commands, lap/finish
  times, drift/contact/recovery counts and Hop counts.
- The first concurrent browser attempt reached an intentional frame-gap pause
  during its four-player race. The final browser run is isolated from the heavy
  simulation suite, with a temporary scoped display/system-awake request. The
  application's real interruption safeguards are unchanged.

- **6/6 final browser journeys pass**: real touch drawing in phone landscape and
  portrait; Solo Race with CPUs, both live abilities and a replayed Time Trial;
  four local drivers and tournament save/resume; animated/reduced-motion weather;
  a normal summit jump without live abilities; and direct tyre/shadow measurements.
  No script errors were found. `browser-tests.log` records the final 5.7-minute run.

- **4/4 rendering-budget checks pass**, with shadows, live Hop/Thrust/effects and
  the cosmetic replay ghost included. Maximum scene draw calls:

  | Venue | Time Trial + ghost | Four-car Solo |
  |---|---:|---:|
  | Snowy Tahoe | 56 | 99 |
  | Newport Island | 84 | 125 |
  | Target | 90 | 150 |

  The racing car remains 9,898 triangles. Surface shadows add no extra draw call
  compared with the former flat shadow. Logs: `tahoe-budgets.log` and
  `coastal-budgets.log`; raw samples remain in `artifacts/venue-detail/after/`.

- **Production Pages smoke passes** under the actual `/RoadsterRace/` base using
  real browser touch events: drawing reaches preview, starts and completes a full
  race with sound enabled. There are **zero script errors and zero failed asset
  requests**. Production has no development inspector. The preview is local only;
  nothing was published. Evidence: `production-report.json` and `pages-smoke.log`.
- Final whitespace checks pass. The normal local preview stays available at 5181.

Physical iPhone/iPad Safari comfort and performance remain pending hardware testing.
No commit, push or deployment is included.
