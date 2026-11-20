# Visual pass 4: Launchsite spaceport campus, Santa Monica vessels, Golden Gate lawns

Owner request, 2026-11-20 ("continue improving the circuits... add more details... you can add
more buildings"). Presentation only: no support, barrier, grip, progression, camera,
track-version, rules or physics change. It builds on visual pass 3 (docs/VISUAL_PASS_3.md).

## Launchsite spaceport campus
- New cosmetic sites in the free desert the fixed camera shows (`launchsite-campus.ts`,
  values `launchsiteCampusAppearance`):
  - a 34 m vehicle assembly building with tall doors, panel bands, an annex and roof plant;
  - a propellant farm with two spherical tanks on legs, horizontal tanks, berms and pipes;
  - a tracking station with a dish, an equipment building, a mast and a fence;
  - a solar field;
  - a sound-suppression water tower.
- Like the desert scatter, the sites have no collider. Each footprint stays at least 30 m
  (and at least 1.1 × its height) from the course and its Hop lanes, and more than 3 m from
  every barrier (`tests/unit/launchsite-campus.test.ts`, which also keeps the pass 3 launch
  mounts inside their plinths).
- The landscape levels the ground under each site (12 m blend), keeps loose scatter off it,
  and paints two graded service roads and a two-track to the sites.
- Cryogenic venting from the remote rockets is smaller, fainter and vents near the upper
  stage, so it no longer reads as a white smudge in the overview.
- Everything is baked into the existing launch-fleet batch: no extra draw call (33).

## Santa Monica
- Two 16 m motor yachts with wakes and a two-masted schooner sail in the open water of the
  overview, in the existing beach-life batch, through the same open-water placement rules as
  the other boats. The schooner (up to about 15.5 m above the water) is the only floating
  object taller than 7 m. The test requires it to stay more than 40 m from the course.

## Golden Gate
- The park lawns' mowing stripes are stronger (alpha 0.065 → 0.11) so the lawns no longer
  read as flat green.

## Verification (cloud sandbox, 2 CPU cores)
- `pnpm typecheck` passes. 18 unit files (158 tests), including the new campus test and the
  updated Santa Monica beach test, pass.
- Medium draw calls (844×390, drawing view): Launchsite 33, Santa Monica 39, Golden Gate 37
  (unchanged from pass 3).
- Not run: the full unit and Playwright suites, High/Ultra captures, and physical
  iPhone/iPad appearance and frame rate.
