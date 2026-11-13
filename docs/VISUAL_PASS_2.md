# Visual pass 2 and shortcut feedback

Owner request, 2026-11-11 ("improve the game, the graphics and visualization of the
circuits"). No support, grip, barrier, camera, track-version or physics change.

## LA nights
- Warm light pools every 22 m along the whole course, alternating sides, in one mesh
  (`la-course-light-pools`). The channel jump stays dark.
- A dashed centre line on the straight sections, inside the batched architecture mesh.
  Corners are unmarked because that batch has no rotation.
- Values: `laRoadLightAppearance` in `src/presentation/themes.ts`.

## Capitan Yosemite
- The packed-earth trail is darker (`#8f8065` → `#7d6a51`) and its shoulder paler
  (`#a3936d` → `#b7a67c`), so the course separates from the meadow.

## San Diego Fleet
- Foam at each hull's waterline and a pale shallow halo fading out over 20 m, in one
  alpha-vertex mesh (`fleetWaterline()` in `src/presentation/fleet.ts`, values
  `fleetWaterlineAppearance`). The dark ships now separate from the open water.

## Shortcut feedback
- When a human driver lands a manual Hop beyond a Hop trail's obstacle, on a trail their
  drawn line uses, the race notice shows "Shortcut cleared · N m saved"
  (`clearedShortcut()` in `src/core/hop-shortcuts.ts`). N is the main-road distance
  between the trail's ends minus the trail's length.
- It appears only after success, so hidden trails stay unmarked. It never changes
  physics or timing. Tested in `tests/unit/venue-expansion.test.ts`.

## Verification (cloud sandbox)
- Typecheck passes; 244 unit tests in 31 venue/scenery/Hop files pass.
- Draw calls with the drawing view (limits 90/150): LA nights 43, Capitan Yosemite 25,
  San Diego Fleet 11.
- Before/after overview captures were compared at the Low graphics tier only.
- Not run: the full unit suite, browser specs, and physical iPhone/iPad checks.

## Global colour grade on every graphics tier (2026-11-12)

Owner request: "improve the graphics of the game". The film-style grade (warm highlights,
cool shadows, more saturation) used to apply only on High/Ultra, while phones start on
Medium. It now applies on every tier, with saturation raised from 8 to 14 and a soft
dark-blue vignette. Both run inside the material shaders
(`scene.imageProcessingConfiguration`), so Low and Medium need no extra render pass.
Values: `colorGrade` in `src/presentation/themes.ts`; code: `src/presentation/scene.ts`.
Checked on Snowy Tahoe and LAX at Medium in the cloud sandbox; frame rate on phones is
not measured.
