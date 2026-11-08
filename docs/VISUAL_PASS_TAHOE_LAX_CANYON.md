# Visual pass: Snowy Tahoe, LAX and Grand Canyon

Owner request, 2026-11-08 ("implement graphic ideas 1, 2 and 3"). Presentation only:
no support, barrier, grip, progression, camera, track-version or physics change.

## 1. Snowy Tahoe: course readability

- **Road contrast.** The alpine palette's packed road is darker and bluer
  (`asphalt` `#8ca6b9` → `#7b97ad`) and its groomed berm is shaded (`shoulder`
  `#d2e0e9` → `#c2d4e1`), so the course separates from fresh powder in the overview.
- **Dye dashes.** Flat 3.2 m orange dashes run 0.55 m inside both edges of the main road
  and the forestry trail, with every fourth dash blue, as on groomed ski courses. They
  follow the rendered road surface 35 mm above it.
- **Snow fence.** An orange snow fence with posts and a flat top rail stands on the
  forest reserve's existing protected rim, 0.45 m inside its collision footprint. It
  marks a boundary that already exists; it is not a new obstacle on drivable snow.
- **Lake shallows.** A turquoise band along the shoreline (`tahoeShore`) fades over
  about 95 m into the existing deep lake (alpha vertex colours).
- Source: `src/presentation/tahoe-course.ts`; values: `tahoeCourseAppearance` in
  `src/presentation/themes.ts`. Two batched meshes, one material each.

## 2. LAX: airfield detail

- Concrete slab joints on a 7.5 m grid across both apron slabs. They sit below the
  runway and road surfaces and terminal plinths, so they only show on open concrete.
- Seventy repaired or worn slabs aligned to that grid.
- A gate-side taxi lane on each side (x = ±69 m): a dashed yellow centreline and blue
  edge lights.
- Runway edge lights every 30 m, green threshold and red end rows at both ends, and five
  approach-light bars beyond each runway end.
- Drive columns and wheel bogies under each jet bridge.
- Everything is flush (≤ 0.15 m) or on non-driving ground and is appended to the
  existing paint/equipment/structure batches: **no new draw calls**. Source:
  `airfieldDetail()` in `src/presentation/lax.ts`; values: `laxAirfieldAppearance`.

## 3. Grand Canyon: junction seams and hollows

- **Seams.** Where a Hop trail's surface overlaps the main trail, its overlay no longer
  applies its own shoulder rim or road-edge feather. Inside the main road it takes the
  plain road colour, so no light-edged rectangular slab shows at the junctions
  (`CanyonMainSurface` in `src/presentation/canyon-earthwork.ts`).
- **Hollows.** Junipers, sage, grass, deadwood and boulders now dress the lower bank
  slopes and floor of the hollows between elevated trails. These areas sit inside the
  planning corridor, where the general scatter does not reach. Only unsupported ground
  is dressed, and each item stays at least 1.2 m below the nearest trail top, so nothing
  appears to stand on a drivable surface or blocks the overview. They join the existing
  plant and rock batches (`pitDressing()` in `src/presentation/canyon-landscape.ts`).
  The hollows remain visibly non-drivable: this is planting, not new ground.

## Verification (cloud sandbox)

- Medium-tier draw calls with the drawing view open (844×390): Snowy Tahoe 30, LAX 17,
  Grand Canyon 17. All are far below the 90 Time Trial / 150 four-car limits.
- Captures before and after were compared for each venue. Physical iPhone/iPad
  appearance and frame rate remain pending.
