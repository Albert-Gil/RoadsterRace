# Snowy Tahoe v3 — steep mountain verification, 2026-10-28

Historical results for v3. See `TAHOE_SKI_UPGRADE.md` and its report for the
subsequent slipperier snow, automatic summit jump and v4 scenery/weather.

## Result

The physical road rises from 0 to **60 m**, with a peak **89.97% ascent (41.98°)**
and **66.90% descent (33.78°)**. Horizontal route length remains 554.757 m and road
width remains 16 m. The start/finish and forestry Hop corridor remain level.

Cars, runoff, drawing, route elevation and shadows share the authoritative surface.
Grounded contact and CPU traffic recognition account for steep slopes; airborne
height separation remains. Snow grip, speed caps and abilities are retained.

## Completed verification

- Dedicated terrain/contact/vehicle tests: **22/22 passed**, including steep-slope
  grounded contact, airborne separation, CPU following, timed forestry Hop and
  six-lap CPU completion.
- Four browser journeys passed: touch drawing and consistent pace in both phone
  orientations; Solo Race/CPU/Hop/Thrust; Time Trial best/ghost; four humans;
  seven-round tour creation and unchanged older six-round schedules; moving snow,
  lift and reduced motion. Snowfall remains excluded from the High pre-pass.
- Final lens/framing checks passed on desktop and both phone orientations. All
  sampled centreline points project back onto the physical surface; final capture
  errors are below 0.00001 m. The view stays fixed across interactive phases.
- Final desktop capture uses a 42° view; both phone captures use 65°. A narrower
  miniature-style lens preserves depth without concealing the lower road.
- The recorded final Solo Race finishes all four cars with **zero script errors**.
  The human's recorded elevation reaches **60 m**, with visible ascent/descent and
  actual body pitch. The video is a silent recording of the running game.
- Desktop, phone landscape and portrait images, the v2 comparison, a full video,
  sampled movement and camera metrics are in `artifacts/tahoe-mountain/`.

## Final release checks

- **590/590 unit tests, 42/42 files passed** in the final full run (449.63 s).
- Type checking, generated-rule checks and the `/RoadsterRace/` production build passed.
- **18/18 handling fixtures match HEAD exactly** across the previous six venues,
  with one, two and four cars and recorded Thrust/Hop commands.
- Final rendering-budget checks passed for Time Trial with a replay ghost/effects
  and four-car Solo Race: **56 / 99 scene draw calls**, below the 90 / 150 targets.
- Final local Pages smoke used real touch/UI events under `/RoadsterRace/`,
  reached preview, started and completed a race with sound enabled. There were
  **zero script errors and zero failed required asset requests**. Production
  receives no development inspector or injected practice plan.

Logs are under `artifacts/tahoe-mountain/`; the Pages JSON report is also saved
under `artifacts/pages/`. The final build is in `dist/`. These results supersede
the initial 589-check v3 run and the historical v2 report.

## Boundaries

The previous six venues retain their geometry/versions. Snowy Tahoe advances to
track version 3; incompatible Tahoe records/tours are rejected without erasing
ordinary names, paints or lap preferences. Rules 15/compiler 16 remain.

No commit, push or public deployment was requested. Physical iPhone/iPad Safari
drawing comfort, sound, thermals and sustained performance remain pending hardware
testing; emulated phone views are supplemental evidence only.
