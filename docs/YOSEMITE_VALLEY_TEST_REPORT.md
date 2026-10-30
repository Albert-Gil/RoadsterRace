# Yosemite valley v2 — verification, 2026-10-29

## Change boundaries

Yosemite advances from track v1 to v2 for 44 new solid rock formations and creek
meanders outside the existing driving corridor. The other seven track versions,
vehicle rules 18 and compiler 18 remain unchanged. Existing road/branch geometry,
grip, launches, abilities, controllers, scoring and UI ownership are retained.

## Automated evidence

- Type checking and the `/RoadsterRace/` production build pass.
- Focused geometry/regression checks pass: seven tests cover finite batched
  geometry, footprint and height containment, welded summits, tree bounds/winding,
  protected park props, road clearance, shared creek banks and the distant skirt.
- The frozen v1 corridor fingerprint matches all 9,379 sampled heights/support
  values within 24 m of the main road and hidden branch. The eight-metre creek
  opening remains unchanged at the racing crossing.
- All 24 recorded handling fixtures (one/two/four cars across all eight circuits)
  match HEAD. These compare the same recorded commands and track definitions;
  the additional corridor fingerprint tests the new Yosemite track itself.
- Eleven integration browser checks pass: actual touch drawing in both phone
  orientations, consistent projection/pace, Solo Race with three CPUs, four-player
  races, Hop/Thrust, personal-best replay, tournament append/resume, theme
  replacement, moving water/mist, reduced motion and renderer compatibility.
- Final art rechecks retain full waterfall visibility from desktop and both
  phone cameras. A talus block that obscured its base was removed from the
  falling-water/impact sight line before release.
- Production smoke completes touch drawing, preview, race start and a full race
  under the Pages base path with sound enabled, no failed required requests and
  no browser errors.

The full unit suite passes: **672 tests across 51 files**. The seven focused
geometry/regression cases also pass after the final cosmetic adjustments.

## Geometry and rendering cost

| Item | Measured count |
|---|---:|
| Authored granite formations | 50 (44 new) |
| Native forest placements | 703 |
| Cliff/talus triangles, one mesh | 206,192 |
| Forest triangles, one mesh | 329,004 |
| Meadow-detail triangles, one mesh | 38,426 |
| Ranger/campground triangles, one mesh | 4,628 |
| Active-effects Time Trial + ghost | 48 scene draw calls / 90 target |
| Active-effects four-car Solo Race | 104 scene draw calls / 150 target |

The stress check forces simultaneous ground thrust, skid marks and impact dust.
Desktop (1440 × 900), phone landscape (844 × 390) and portrait (390 × 844)
captures show zero sampled road points occluded by granite or forest. Their
fixed camera elevation remains 72 degrees, matching the baseline; distant
formations never enter course fitting. Phone input tests additionally use 2×
pixel density and real browser touch events. No automated emulation result is
treated as a hardware performance measurement.

## Review artifacts

Local gallery: `artifacts/yosemite-valley/index.html`. It contains matching
before/after gameplay-camera views, phone captures, clearly labelled scenery
inspection views and a short recording of actual simulation with three CPUs.
The video uses a generated reference line for repeatability; no cinematic
camera movement is used during racing. Artifacts remain local/ignored.

Logs: `artifacts/yosemite-valley/` (`unit-tests.log`, `focused-final.log`,
`legacy.log`, `browser.log`, `browser-final.log`, `pages-final.log`, `build.log`).

## Remaining hardware check

Physical iPhone/iPad Safari drawing comfort, sustained performance, memory,
thermal behavior and sound verification remain pending. Public deployment is
performed only after the recorded checks pass.
