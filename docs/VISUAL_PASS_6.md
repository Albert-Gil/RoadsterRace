# Visual pass 6: Capitan Yosemite granite and Snowy Tahoe lake and snow

Owner request, 2026-11-20 ("continue improving"). Presentation only: no support, barrier,
grip, progression, camera, track-version, rules or physics change.

## Capitan Yosemite granite
- From the overview the granite domes read as plain pale blobs. The rock skins
  (`yosemite-geology.ts`) are now slightly darker overall (`granite` palette) and carry:
  - dark vertical water streaks down the steep faces (desert varnish);
  - lichen and pine-needle pockets in the hollows of the broad summits;
  - dark sheet-joint cracks across the summits.
- Values: `yosemiteAppearance.granite` and `.streaks`. Vertex colours only: silhouettes,
  normals and colliders are unchanged and the worker-generated data keeps the same shape.

## Snowy Tahoe
- **Lake depth:** the lake now deepens from the turquoise shallows to Lake Tahoe's dark blue
  offshore, using the shared overlay from pass 3 (`waterDepth(scene, 'alpine', …)` with
  distance `x - tahoeShore(z)`). It adds one draw call (Medium: 30 → 31).
- **Snow tracks:** eight snowmobile/ski tracks meander across the open snow as pairs of thin
  bluish-shadow ribbons, 3 cm above the snow (`tahoeSnowTracks()` in `tahoe-course.ts`,
  values `tahoeCourseAppearance.tracks`). They skip anything within 16 m of the course or Hop
  lanes, within 1.5 m of or inside a barrier, and the lake (`tests/unit/tahoe-snow-tracks.test.ts`).
  They join the course-markings batch.

## Verification (cloud sandbox)
- `pnpm typecheck`. 16 unit files covering Yosemite (landscape, valley, dressing, hydrology,
  creek bank, canoes), Snowy Tahoe (course, landscape, ski, elevation), scale and snow,
  landscape rules, scenery workers, scenery composition and graphics, plus the new snow-track
  test, all pass.
- Medium draw calls: Snowy Tahoe 31, Capitan Yosemite 25.
- Not run: the full unit and Playwright suites, High/Ultra captures, physical devices.
