# Fleet visible-detail pass — verification

2026-11-06. Local and uncommitted. Baseline is the prior local Fleet v3, including
its approved ramps and full-deck auxiliary surfaces.

## Results

- Full suite: **76 files / 939 tests passed**.
- Final flush-paint cleanup: **3 files / 12 geometry tests passed**, including
  stricter checks that deck paint stays below 0.12 m and on supported non-racing deck.
  The broad simulation suite preceded that final cosmetic cleanup; core code remained
  byte-identical throughout.
- **27 unchanged-venue handling fixtures match HEAD** (one/two/four cars).
- Byte-for-byte SHA-256 comparison of every src/core source against the pre-art
  snapshot passes. No track, physics, compiler, ability or controller version change.
- Seven browser scenarios pass across the initial run and targeted recheck: six passed
  initially; the four-driver case was rechecked after correcting an incidental-crash
  assumption. It now explicitly observes ghost expiry during racing. Fixed-step
  collision/impulse tests remain unchanged and pass.
- Browser checks cover live helicopter/radar motion and reduced-motion freezing,
  containment on their owning ships, actual phone touch drawing on main/alternate
  routes in both orientations, complete human and four-player races, simultaneous
  abilities, pause/resume/Home, Collection and rewards/save reload.
- Type checking, native geometry bake, ordinary build, Pages-path build and final
  production smoke pass. Final production smoke completes real touch drawing and a
  race with sound enabled, **zero page errors and zero failed required requests**.

## Visible features and budgets

Three stepped white command decks, approximately 8.6 m carrier radomes, signal masts,
original pennants, framed hangar bays, rescue lifeboats, anti-fouling belts, folded
naval-blue jets, yellow rescue helicopters, crew, aprons, helipads, flush elevator
panels and large deck IDs. The auxiliary ships remain clear and unmarked.

Final native venue geometry: **57,138 triangles**, below 120,000. Existing scenery
batches and camera framing are preserved. No lights, reflection cameras or additional
rendering passes. Final flush paint uses fewer triangles than the profiled version.

Animated Medium desktop profiling at 1440x900, with legal abilities active:

| Session | Peak calls | Median frame | Median render submission |
|---|---:|---:|---:|
| Four cars + effects | 84 / 150 limit | 9.1 ms | 1.9 ms |
| Time Trial + ghost + effects | 35 / 90 limit | 8.7 ms | 1.0 ms |

Planning remains 16 calls on desktop, phone landscape/portrait and tablet. These are
local desktop measurements; they do not establish physical iPhone performance or a
strict timing A/B against earlier reduced-motion captures.

## Test correction

The original live-input four-player browser fixture required contactCount > 0. A
clean finish exposed that timing-dependent assumption: a valid race need not contain
a collision. The corrected test requires the five-second ghost period to expire while
cars are still racing, then verifies finishing order/control flow. No collision
simulation, incident counting or gameplay code was changed to satisfy it.

## Evidence

artifacts/fleet-signature contains the interactive comparison gallery, matching before/
after desktop and phone captures, detail views, live animation and actual gameplay.
Logs: unit-tests.log, final-geometry-tests.log, browser-tests.log,
four-player-recheck.log, legacy-tests.log, build.log, pages-build.log, pages-smoke.log,
performance.json and core-before.json. The gameplay film precedes the last flush-paint
cleanup; final screenshots and production smoke include it.

Physical iPhone/iPad Safari comfort, sound and sustained performance remain pending.
No commit, push, hosting update or external promotion was performed.


## Publication authorization

After local verification, the owner requested commit and push on 2026-11-06.
Public testing updates remain gated by the existing verified-main Pages workflow;
physical iPhone/iPad Safari acceptance remains pending hardware testing.
