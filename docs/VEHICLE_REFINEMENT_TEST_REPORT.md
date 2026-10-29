# Vehicle refinement verification — 2026-10-29

## Result

The refined 3D model and stainless-steel-gray default were implemented and verified locally. Handling, physical vehicle dimensions, wheel mounting positions and input rules are unchanged. No commit, push or deployment was performed during verification; the owner subsequently requested committing and pushing the verified update.

## Automated checks

| Check | Result |
|---|---|
| `pnpm typecheck` | Pass |
| `pnpm test` | 661 tests / 48 files pass |
| Final model/graphics unit subset | 18 pass |
| `pnpm test:legacy` | All 18 existing handling fixtures match HEAD exactly |
| Vehicle, slope contact and eight-venue rendering suite | 18 browser checks pass |
| Phone/tablet setup, six paint options and accessible controls | Pass |
| Yosemite touch, solo/CPU, replay, multiplayer/tour and atmosphere integration | Four browser checks pass |
| Optional renderer material test | Pass on actual WebGPU; WebGL 2 remains the default |
| Production build with `/RoadsterRace/` base | Pass |
| Production touch race, sound and required assets | Pass, no browser errors or failed requests |
| Generated rules and whitespace checks | Pass |

The final RGBA texture correction was followed by model/graphics unit checks, both vehicle-renderer browser tests, a new production build and a production smoke check. It does not change geometry, color values or physics. Physical iPhone/iPad Safari verification remains pending hardware testing; automated touch layouts are supplemental evidence.

## Rendering measurements

The actual racing car contains **9,856 triangles**, below its 10,000 limit. The larger inspection model contains 42,988. Both derive from the same source definition. The ghost matches the complete racing body/wheels in one cosmetic mesh.

Across all eight venues, measured Medium-tier scene draw calls with shadows, active abilities/effects and the Time Trial ghost remain within budget:

| Venue | Time Trial + ghost | Four cars |
|---|---:|---:|
| Newport Island | 85 | 129 |
| Launchsite | 69 | 113 |
| Golden Gate | 78 | 122 |
| Santa Monica | 73 | 117 |
| Grand Canyon | 44 | 90 |
| LA nights | 88 | 132 |
| Snowy Tahoe | 57 | 103 |
| Capitan Yosemite | 51 | 97 |

Limits are 90 / 150. Raw per-venue samples are in `artifacts/venue-detail/after/` and the summary in `artifacts/vehicle-upgrade/performance.json`. Fixed brakes use one batched draw per car while retaining independent steering/suspension positions and normals. The model test verifies front brakes steer, rear brakes remain fixed, and all calipers remain independent of wheel spin.

## Review material

`artifacts/vehicle-upgrade/index.html` contains matching before/after views, front/rear/side views, the actual lightweight racing version, an interactive local inspection viewer and an actual gameplay screenshot. The viewer is a development artifact and does not restore a 3D menu scene or change the game's fixed camera.

Saved paint choices, names, laps, tours and records are preserved. New profiles start with Stainless steel gray; the existing silver ID (`glacier`) remains stable. Other selected finishes keep their gloss-paint material and independent colors.
