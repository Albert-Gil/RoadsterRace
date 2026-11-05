# Capitan Yosemite waterways — 2026-11-04

Yosemite v5 replaces the short tributary stubs with three complete rivers. Each
begins at a headwater inside the valley and continues beyond the authored map
extent. Bridalveil Creek exits south, Sentinel Creek exits southeast and Cathedral
Creek exits west. The existing three road crossings and natural takeoff tuning
are preserved.

Six wider falls feed seven authored receiving/headwater lakes. El Capitan has
twin curtains sharing a plunge lake; Bridalveil now falls toward the gameplay
camera into its headwater pool; Cathedral and Sentinel feed their tributaries;
the central Sentinel buttress has a separate plunge lake. No fall ends on bare
ground. Rock recesses, falling sheets, impact ripples and mist use the same site
definitions and receiving-water heights.

## Authoring and appearance

- `src/core/tracks/yosemite-water.ts` owns river paths, downstream order, widths,
  water levels, receiving footprints and waterfall-to-lake identities. Water
  openings and terrain beds derive from these same polygons.
- `src/presentation/yosemite-waterfall-shape.ts` derives lips, impact points and
  recessed cliff faces. Each impact is inside its named lake at the water level.
- `src/presentation/yosemite-waterfall.ts` batches all six curtains, seven pools
  and shoreline rims. Every waterfall has animated impact rings. The sheet batch
  has 2,376 triangles; the existing 108-particle mist/spray/droplet cap is retained.
- `src/presentation/yosemite-creek-bank.ts` smoothly unions banks rather than
  switching abruptly between water bodies at different elevations. Raised pools
  remain inside existing protected granite parcels. Terrain beds are below their
  actual water levels, not an assumed common level.
- `yosemiteAppearance.waterfall` in `src/presentation/themes.ts` centralizes the
  six widths (6.2–10.8 m), opacity, lip shape, flow and bounded effects. River UVs
  follow downstream distance. Reduced motion freezes water animation and hides
  moving spray, as before.

The fixed camera continues to fit the road, gate and flight envelope. Distant
river outlets do not enlarge its margins. Four small talus formations move away
from channel mouths; the road and cedar Hop trail keep full clearance. Bridalveil's
granite parcel is taller to support a more visible drop. No shortcut signs or new
abilities are added.

## Compatibility and checks

Only Yosemite's track version increases (4 → 5), reflecting new physical off-road
water openings and displaced rocks. Physics 18, compiler 18 and CPU controller 2
are unchanged. Existing compatibility checks segregate old Yosemite records and
reject incompatible championships without erasing names, paints or lap settings.

The prior full-width road/branch height-and-support fingerprint is unchanged.
Two recorded two-lap runs at distinct pace profiles match the pre-change v4
snapshot exactly, including jump list, finish/lap times, contacts and recovery
counts. Detailed completed verification is in YOSEMITE_WATERWAYS_TESTS.md.

Physical iPhone Safari performance, sound and visual comfort remain pending
hardware testing. Desktop browser and phone emulation are supplemental evidence.
This update is local; no commit, push or deployment is included.
