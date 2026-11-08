# LAX — longer rectangular course for portrait play

Owner-requested reshape, 2026-11-07. Baseline is the local v4 refinement saved in
ignored `artifacts/lax-v5/baseline-core.ts` and matching captures; Git baseline is
`cd6e2d7`. The owner subsequently authorized commit and push of the complete
verified v3–v5 work. Publication stays gated by successful main-branch verification.

## Course

- **1,312.5 m**, with 16 m racing roads and approximately 242 m continuous runway
  straights, compared with about 112 m before. Two 44 m-wide runways continue for
  450 m, beyond the raced sectors.
- Two deeper S-lobes replace the small apron wiggles. Their 20 m radii leave open
  inside edges and clearance for the unchanged 5.2 m-setback barrier ribbons.
- The terminal horseshoe is longer, with seven terminal groups and longer halls,
  matched parcels, relocated airliners, parking, Theme Building, tower and garden.
- Both automatic crests translate with the lower returns; their 8 m final incline,
  height changes, launch coefficients and flat receiving runouts are preserved.
  The hidden manual-Hop connection moves to the upper part of the horseshoe with
  the same local obstacle/branch geometry and unchanged Hop tuning.
- LAX becomes track version 5. Global physics/compiler remain 20; all other course
  geometry and versions, preferences and historical Collection progress remain.

## Portrait measurements

The same 390×844 touch viewport and safe rectangle were measured before/after:

| Measurement | v4 | v5 |
|---|---:|---:|
| Driving-surface vertical coverage of usable area | 44.0% | **73.5%** |
| Median road width | 29.2 CSS px | **28.0 CSS px** |
| Minimum road width | 24.1 CSS px | **23.1 CSS px** |

The visible course uses about **67% more vertical space** while projected road
width changes by approximately 4%. Portrait uses a fixed 68° elevated view along
the longer axis; landscape retains 60°. There is no automatic pan/zoom during
input or racing. Fitting retains the road, full gate, Hop/flight envelope and actual
apron walls, excluding distant runway ends.

Measurements and matching screenshots are in `artifacts/lax-v5/`. Hardware Safari
comfort/performance remains pending; browser touch events are supplemental.

## Verification

The initial focused run passed 25 LAX cases after updating old-layout fixtures to
the relocated Hop/closure geometry and new length. It covers both automatic
launches at 20/30/42 m/s and ±20° yaw, every CPU difficulty, repeated Hop laps,
protected runoff, complete start area, continuous walls and swept 42 m/s impacts.
The first full run passed 1,013 cases but exceeded the old 180-second wall-clock
allowance on LAX's nine six-lap CPU runs. Its course is now 1.31 km, so LAX uses
the existing 360-second allowance for expensive courses. The 54,000-tick limit,
six-lap completion, zero recovery, shared speed cap, deterministic-plan and
difficulty-ordering assertions remain unchanged. The complete suite is rerun
after that test-only correction.

| Check | Result |
|---|---|
| Type checking and generated rules | Passed; rules document records LAX 5, 1,312.5 m and 344 solid footprints |
| Existing ten courses | All 30 one-/two-/four-car handling fixtures match `cd6e2d7` exactly |
| LAX browser suite | All nine scenarios passed in 8.6 minutes |
| Drawing and framing | Real mouse/touch input at desktop 1440×900, phone 844×390 / 390×844 at 2× density, tablet 1024×768; same projection through drawing, preview and racing; complete apron walls inside the safe rectangle |
| Complete races | Solo, Time Trial with actual lap replay, hidden Hop, two and four local humans all passed |
| Hidden Hop | Real button activation completed a lap with zero collisions and zero recoveries |
| Medium native venue | 55,586 triangles in eight static batches, zero hidden reference-road points in desktop ray checks |
| Medium four-car effects | 80 scene draw calls, within 150 |
| Medium Time Trial with ghost | 36 scene draw calls, within 90; one physical car |
| Desktop frame sample | Median 13.3 ms, p95 13.5 ms across 180 frames; median unchanged from v4 |
| Builds | Root and `/RoadsterRace/` production builds pass |
| Local production smoke | Real touch preview and race start pass; sound enabled; no required asset failures or application errors; no development inspector |
| Review media | Nine gallery images load; actual Solo clip is 30 seconds; selection card refreshed from final gameplay scene (19,438 bytes) |

Review media is in ignored `artifacts/lax-v5/index.html`. Source packs and personal
output remain outside the commit. Desktop frame timing is development-machine
evidence, not a claim about phone hardware. Physical iPhone/iPad Safari drawing
comfort, sound and performance remain pending hardware testing.

The final complete rerun passed **all 1,014 tests in 81 files** in 611.49 seconds,
including the nine six-lap LAX CPU runs. No driving assertion was weakened and
no application change was needed after the browser/production checks.

The verified v3–v5 source, tests, generated rules, refreshed card and reports are
included in the requested commit/push. The existing main-branch workflow verifies
all deployment groups before publishing `dist/`; review media stays local.
