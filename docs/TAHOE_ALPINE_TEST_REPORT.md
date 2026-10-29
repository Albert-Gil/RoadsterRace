# Snowy Tahoe v2 — local verification, 2026-10-28

Historical results for the 12 m ridge. See the v3 mountain guide/report for the
subsequent 60 m course; these results do not claim verification of that revision.

## Result

Snowy Tahoe now has a real 0–12 m climb/descent on continuous, shared physical terrain.
The lodge district, start/finish and forestry Hop corridor stay level. Snow traction,
horizontal speed caps, abilities, CPU fairness and existing six-course behavior are preserved.
Road elevation and grounded pitch are physical; weather and lift motion are cosmetic.

## Checks

- **589/589 unit tests, 42/42 files passed**, including road geometry, drawing pace,
  broad off-road lines, six-lap CPU races, contact, replay, tournament and support checks.
- Dedicated tests verify the road profile, flat gate/Hop lane, terrain-aligned drawing rays,
  grounded car heights and level terrain-anchored foundations.
- **All 18 existing-circuit handling fixtures match HEAD** exactly, for one/two/four cars
  with recorded Thrust and Hop. Rules 15/compiler 16 and the other six track versions remain.
- Type checking, generated-rule checks and the `/RoadsterRace/` production build passed.
- **4/4 browser journeys passed**: phone touch drawing in both orientations and consistent
  pace; Solo Race/CPU/Hop/Thrust; Time Trial recording and ghost; four local humans;
  new/saved tournament schedules; actual snowfall/lift animation and reduced motion.
- High graphics confirms snowfall is excluded from the geometry buffer.
- **2/2 rendering-budget checks passed** at Medium: 56 Time Trial scene draw calls with
  ghost/effects, 99 in four-car Solo Race, below 90/150. Racing car remains 9,898 triangles.
- Final production smoke completed a race through actual touch/UI events under
  `/RoadsterRace/`, with sound enabled, no script errors and no failed required assets.

The final focused terrain/clearance rerun passed **12/12 selected checks**. Evidence logs are under
`artifacts/tahoe-alpine/`. The last small crown-blend change makes the ground between
nearby bends continuous; it does not alter the six older circuits.

## Visual review

Desktop, 844×390 landscape and 390×844 portrait captures are saved with the v1 baseline.
`artifacts/tahoe-alpine/index.html` compares them and includes a silent actual-gameplay
recording of a completed four-car Solo Race with Hop/Thrust and the new scenery/weather.
The scenery is original procedural art; provenance is recorded in ASSET_RIGHTS.md.

The update remains local/uncommitted. No push or deployment was requested. Physical
iPhone/iPad Safari drawing comfort, sound, thermals and sustained performance remain pending.
