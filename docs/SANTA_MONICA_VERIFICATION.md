# Santa Monica verification — 2026-10-22

## Verified locally

| Check | Result |
|---|---|
| Type checking | Pass |
| Unit suite | 195 tests pass |
| Browser regression | 17 distinct scenarios pass; simultaneous four-car thrust additionally repeated |
| Production Pages build | Pass under `/RoadsterRace/` |
| Production browser smoke | Pass, no page errors or failed requests |
| Legacy solo handling | All three recorded v7 fixtures match within 10⁻⁸ seconds, with exact drift/contact/recovery counts |
| Legacy local multiplayer | Six v7 comparisons (2/4 drivers on each original circuit) match the previous commit's results |

The complete browser suite covers the existing phone rotation regression and compact drawing layouts, Santa Monica bypass/jump touch drawing at high density in landscape/portrait/tablet, reduced-motion rides, a complete jump race with an airborne pause/resume and retry, a four-player mixed-branch race/rematch, a complete four-circuit Full Tour with save/resume and championship scoring, custom schedules, responsive setup, and migration/resumption of an older three-circuit v7 tournament.

The unit checks cover both routes over six laps; the registered course's slow/fast pace plans and four-car six-lap race; aligned 20/30/42 m/s launches; slow and sideways failures; water/protected crossing rejection; physical landing-edge impacts; height-aware swept car contacts; midair thrust without tire forces; simultaneous recovery without occupied reappearance; fixed-step equivalence at 30/60/120 rendering rates; supported building foundations; and strict compatibility migration. Ordinary sand handling, thrust tuning, start gates and finishing behavior retain their regression checks.

A final signed-area check also corrected the authored venue to the approved clockwise direction; the direction now has an explicit unit assertion. One portrait test initially exposed a bypass join too close to the water opening after smoothing. The return from that bend now rejoins farther beyond the gap, while retaining the intended shortcut saving. Final real touch traces compile in all tested orientations. A simultaneous-failure test also exposed contact resolution on a car entering recovery within the same substep; recovering cars now leave that contact pass immediately and remain hidden while waiting for a free recovery point.

## Production scope

`pnpm test:pages` replays real browser touch input through the built website on all four circuits and through Santa Monica's jump route. It verifies preview/race start, sound activation, saved names/paint, root-safe Home navigation, Graphite/portrait, fonts/icons/manifest, delayed-layout rotation, four private drawing turns/readiness and tournament reload/resume. The production inspector and practice helper are absent. Full race completion is verified by the unit/development browser runs above; the production smoke is intentionally a startup/input smoke.

The deployment verification timeout increases from 20 to 30 minutes to accommodate the additional venue's software-rendered shader checks on CI. Verification remains read-only; only a successful main build can deploy `dist/`.

## Evidence and performance

Evidence is local and ignored under `artifacts/santa-monica/`: `production-report.json`, `multiplayer-report.json`, `legacy-multiplayer.json`, `capture-report.json`, matching desktop/phone/tablet images, airborne/results views, raw gameplay video and the review clip. Existing regression screenshots and the completed Full Tour report remain in their original artifact folders.

The four-car test with all four thrusters active peaks at **133 draw calls**, below 150 including shadows and effects. The final solo recording peaks at **67 draw calls** and averages approximately **60.0 renderer fps**, with a successful jump and no recovery or page error; its target is 90 draw calls. Exact metrics are recorded in `capture-report.json`. These measurements are from desktop Chrome/ANGLE Direct3D11, not physical phone measurements. Generated art uses batched materials; rides and bounded effects remain separate.

The gameplay recording is authentic local browser output with a drawn jump-route fixture. It is silent because Playwright records video without system audio. Sound behavior is exercised separately through the enabled Web Audio path in the browser race test. See `SANTA_MONICA.md` for tuning and asset replacement.

## Pending hardware checks

Physical iPhone/iPad Safari sustained frame rate, thermal behavior, jump readability, simultaneous touch comfort and hosted Home Screen/cellular operation remain pending until tested on the device. Automated phone emulation supplements those checks and does not certify them.
