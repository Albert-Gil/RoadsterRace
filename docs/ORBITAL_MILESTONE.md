# Orbital Launchyard — playable course handoff

The game now has two playable venues: Coastal Launch and the first Orbital Launchyard prototype. Open **http://localhost:5173/?circuit=orbital-launchyard**, choose solo or local play, then configure distance and drivers. You can also choose either course directly in race setup.

## Implemented

- Course registry, selection cards with actual layout silhouettes, names, approximate lengths and driving features.
- An approximately **450 m** physical Orbital layout: a long opening thrust straight, broad right turn, linked S/hairpin return and separate protected assembly, utility and launch areas. The compiled normal practice line is approximately 448 m after smoothing.
- Basic original spaceport scenery: assembly hangar, mission-control building, utility tanks, cantilever start lights, rocket and service tower. All substantial structures occupy protected physical footprints. The track is flat and uses the existing asphalt/sand/grip/thrust model.
- Shared road markings, grid, barrier walls, pace lines and cars; independent biome material/lighting settings in themes.ts.
- Course changes clear previous drawings, confirmed plans, readiness, commands and race state. Driver names, paints and selected distance remain. Best times remain scoped by course ID/version/lap count.
- Course selection persists with existing preferences; old saved profiles default to Coastal. Unknown IDs fall back safely. Explicit course URLs override stored selection.
- Scene switching retains one WebGL engine, disposes the previous world/showcase scenes and creates the selected venue. A repeated-switch browser check verifies that two live scenes remain.

## Architecture

| File | Responsibility |
|---|---|
| src/content/circuits.ts | Playable registry, scenery IDs, player-facing metadata and map silhouettes |
| src/core/tracks/orbital.ts | Physics-only course geometry, start, checkpoints and barriers |
| src/presentation/scenery.ts | Scene-builder dispatch and scenery update contract |
| src/presentation/spaceport.ts | Original Orbital models/material assignments |
| src/presentation/circuit-details.ts | Shared physical-wall rendering, edge paint and grid; coastal-only details stay gated |
| src/presentation/themes.ts | Biome palette/light colors, independent interface theme and driver finishes |
| src/main.ts | Selected-course lifecycle, session reset, saved choice, captions and best-time scope |

Coastal's physical track and simulation rules remain unchanged. Shared start/grid markings now align with each course's authored start tangent. The same camera framing is used throughout drawing, preview, countdown and racing.

## Validation scope

The layout fixtures cover deliberate wide-sand driving, aggressive and careful pace plans, protected runoff and four cars completing six laps on each course. Type checking, the unit suite and the production build pass. Browser and packaged-game results are recorded in docs/VERIFICATION.md after the final run; images/reports live in artifacts/orbital/.

This is the completed course-selection foundation and first playable layout with basic scenery. It is not the final production art or balance pass. The initial design target was 360–420 m; the current 450 m shape retains deliberate runoff and will be tuned through playtesting. The user can now evaluate its actual line/thrust decisions before investing in further environment detail.

## Next refinement

Test with real players on iPhone/iPad, evaluate the long straight and S-section difficulty, then refine ground transitions, architecture, scenery density, lighting and sound ambience. Physical Safari, real multi-person reach, sustained mobile frame rate and thermals remain pending. Hop, car-to-car collisions, hosting and promotion remain later work. No public deployment or external posts were created.

Current validation: **86 unit tests**, type checking and the production build pass. The complete **27 browser scenarios passed together in 10.4 minutes**, covering both the new course flows and existing regressions. See `docs/VERIFICATION.md` for sampled render budgets, scene lifecycle checks and the pending physical-device tests.

After the final setup-header polish, both focused browser checks passed again. All **10 packaged-game smoke checks** passed with no page exceptions or development API exposed. Updated desktop and phone captures are in `artifacts/orbital/`.
