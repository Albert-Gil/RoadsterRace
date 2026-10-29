# Snowy Tahoe v4 — ski jump and winter verification

> Historical v4 evidence. Current v5 verification is in TAHOE_GROUNDING_TEST_REPORT.md.

## Completed checks

- Type checking and generated rules passed.
- **18 focused tests passed**, including lower snow grip, surface-aligned drawing,
  terrain foundations, six-lap completion and forestry Hop behavior.
- The new ski tests cover **20/30/42 m/s × −20°/0°/+20° body yaw**: every case
  launches automatically, lands on actual terrain and avoids recovery without a
  live ability. Reverse/outside-gate crossings are excluded, slow cars remain
  grounded, and a manual Hop cannot stack a ski impulse.
- Every CPU difficulty completes six laps, with exactly six ski takeoffs and no
  recoveries. A stale route-progress regression confirms physical height depends
  only on x/z on Tahoe's continuous terrain.
- **5 browser journeys passed**: real touch drawing in phone landscape/portrait
  with consistent pace; Solo Race and CPU/Hop/Thrust; Time Trial best/ghost; four
  local humans and saved/new tours; High weather/lift animation and reduced motion;
  and a complete Time Trial with automatic ski takeoff and no Hop/Thrust input.
- **2 rendering-budget checks passed** at Medium with active effects and a replay
  ghost/four cars. Snow remains a single bounded mesh and stays out of the High
  geometry pre-pass.
- The final recorded Solo Race finishes all four cars with zero script errors.
  The human has **zero Hop and zero Thrust activations**, with actual recorded
  `ski` flight and a maximum sampled altitude of approximately **62.17 m**.
- Desktop, phone landscape/portrait, before/after, the automatic-jump capture and
  silent actual-gameplay video are in `artifacts/tahoe-ski/`.

## Final checks

- **599/599 tests across 43 files passed** in the final full run (551.83 s).
- **18/18 handling fixtures match HEAD exactly**, covering the six unchanged
  venues with one, two and four cars and recorded Thrust/Hop inputs.
- Type checking, generated-rule checks and the `/RoadsterRace/` production build passed.
- Final Medium scene draw-call maxima remain **56 Time Trial / 99 four-car Solo**,
  including ghost/effects, below the 90 / 150 targets.
- Final production Pages smoke used real touch/UI events beneath `/RoadsterRace/`,
  reached preview, started and completed a race with sound enabled, with **zero
  script errors and zero failed required asset requests**. No development
  inspector or practice-route injection is present in production.

Evidence logs are in `artifacts/tahoe-ski/`, the Pages report in `artifacts/pages/`,
and the verified production output in `dist/`. The earlier v3 report is historical.

## Boundaries

Vehicle rules are 16, Snowy Tahoe track 4, compiler 16. Other track geometry and
versions remain unchanged. Incompatible records/tours are rejected or segregated;
ordinary driver/lap preferences survive. All existing recorded audio remains.

No commit, push or public deployment was requested. Physical iPhone/iPad Safari
comfort, sound, thermals and sustained performance remain pending hardware testing.
