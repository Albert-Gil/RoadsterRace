# Improving the appearance

The October 21 upgrade adds a RoadsterLAB-derived car, a miniature coastal venue, physical inner islands, and a graphite/crimson racing interface. Visuals remain replaceable without changing race results. RoadsterLAB is not a runtime dependency.

## Central settings

| Request | Edit | Verify |
|---|---|---|
| Logo, title, tagline | `branding` in `src/presentation/themes.ts`; files under `public/assets/` | Header/welcome layout and missing-logo fallback |
| Fonts | Theme `typography`; `@font-face` in `src/style.css` | Phone wrapping, labels, license |
| Menu palette/panels | Theme `ui`, shared CSS | Contrast, focus, safe areas, 44 px controls |
| Paint, road, sand, plants, water | Theme `scene` and `venue` | Car/route readability |
| Driver paint choices | `paintFinishes` in `themes.ts`; selections in race setup | Paint, numbered markers, pads, standings; selected finishes survive theme changes |
| Pace colors/thickness | Theme `pace` | Red slow, amber intermediate, green fast in both presets |
| Camera/light quality | `sceneTuning` in themes | Fixed drawing/racing projection and render cost |
| Optional model/textures | `src/presentation/assets.ts` | Fallback, scale, attribution, transfer size |
| Sound recordings | `src/presentation/audio-assets.ts` | Unlock, mix, pause, synthesis fallback |

Coastal Day combines graphite/crimson menus, sunny coastal scenery and a crimson solo car. Graphite (`?theme=graphite`, or T in development) changes branding, heading typography, palette, materials and lighting. Both use the same pace colors. Driver-selected paint remains stable across presets. Local Barlow fonts retain system fallbacks.

## Racing lines

`pace-line.ts` renders a 10 CSS px colored core and 14 px contrasting outline during drawing/preview, and 8/11 px during racing, adjusted for camera viewport and render scaling. Live colors use the compiler's shared ten-metre gesture-speed window; final preview includes its additional smoothing. All players use the same 9–30 m/s range.

## Phone drawing layout

Drawing and preview have compact floating controls: sound, redraw, setup/exit, and a race/lock-in button once the line is valid. Numbered player chips identify private drawing turns. Landscape and desktop use a right rail; narrow portrait uses a bottom rail so controls do not steal scarce width. Labels have screen-reader names and targets of at least 44 CSS pixels. The header logo, diagnostics link, drawing explanations, pace legend, preview statistics and practice-line button are absent from these phases. Essential validation errors remain as small, non-blocking alerts. Tutorial copy and practice UI are deferred; `__roadster.usePracticeLine()` is a development-only test fixture, not a production control.

`#course-space` in `src/style.css` defines the safe course rectangle, including cutouts and toolbar clearance. `GameScene.resize()` fits the full permitted apron into this rectangle while rendering the scene over the entire canvas. Every interactive phase uses the same camera projection. Keep this invariant when changing controls; do not restore black viewport bands or zoom only while drawing. CPU camera matrices use high precision, and picking compensates for integer drawing-buffer rounding on fractional pixel scales. These presentation/input calculations do not change simulation rules or the shared pace mapping. `100dvh` follows the actual browser viewport as Safari chrome changes.

Earlier plans stay hidden during sequential drawing. Numbered cars/pads and distinct dashed route patterns identify players during racing. Pace colors retain their meaning for everyone. Rejected barrier sections appear in magenta and cannot be confirmed.

## Vehicle contract

`roadster-geometry.js` contains a self-contained adaptation of the user's MIT-licensed RoadsterLAB scene. `tools/port-roadster.mjs` reproduces the extraction; only that development script needs the reference project. The source project stays untouched. Retain `public/licenses/RoadsterLAB.txt`.

- Game axes: Y up, +Z forward, +X right. The root is centered at ground level; scene placement adds road elevation.
- Gameplay capsule: 2.2 m wide, 5.2 m long. These are game dimensions, not manufacturer specifications.
- Source axes: +X forward, +Z right. The adapter swaps X/Z, transforms normals/winding, and scales by `2.2 / 2.0201642066907674`.
- Racing detail: **9,802 triangles**; showcase: **43,360 triangles**. One definition supplies both. Racing geometry and common materials are shared; paint/brake lights remain independent.
- Geometry `mounts` supplies wheel pivots. Front pivots steer; wheel meshes rotate around local X. A sprung-body transform adds visual lean/pitch without changing physics.
- `vehicleAttachments` in `vehicle.ts` documents rear outlets at X ±0.51/±0.185, Y 0.60, Z −2.36. Plumes extend backward.
- Brake lights follow deceleration, dust follows physical sand, and skid marks follow asphalt slip. Effect pools are bounded. Reduced motion suppresses extra animation.
- `VehicleView` receives poses/state and cannot own input, lap progress, speed or collision geometry.

Optional GLB descriptor: `{ kind: 'glb', url: '/assets/car.glb', scale: 1, rotationY: 0 }`. Failed imports preserve the procedural model. The generic adapter cannot infer arbitrary wheel nodes or repaint arbitrary materials; a production replacement needs its own animation/identity adapter. Match the envelope and attachment points.

## Scene and physical boundaries

`coast.ts` supplies shore, palms, terrain, pavilion and stand. `circuit-details.ts` adds bays, gantry, grid, edge paint, patched asphalt, retaining walls, tire stacks and planting. Static scenery is merged by material. One 1024² sun shadow map and contact shadows give depth; vehicle body/aero provide the gameplay shadow silhouette. A detailed showcase scene shares the WebGL context and is omitted during races.

`TrackDefinition.barriers` owns solid footprints. Inner retaining walls are built from those polygons; gantry support and stand have authored footprints. Preserve approximately 5–7 m of inner runoff where possible. Raised decorative planting belongs inside protected islands or beyond the driving apron. Visible obstacles and physical footprints must agree.

The road remains flat with unchanged layout/width. Core clearance and collision code has no mesh/material dependency. Cosmetic edits cannot silently move walls or change physical size. Such changes require a track version bump and validation.

Original generated asphalt/limestone WebP materials retain fallback paths. Prompts/provenance remain in `ART_DIRECTION.md`; no DrawRace 2 or Asphalt artwork ships in the game.

## Review workflow

1. Describe the visual change or supply an asset; update its central setting or role.
2. Preserve physics/course versions for purely cosmetic edits.
3. Compare the same view and recorded race under both themes.
4. Inspect desktop, phone portrait/landscape and tablet; check input, focus, text and missing artwork.
5. Run relevant checks and inspect render/transfer cost before increasing fidelity.

Comparisons live in `artifacts/before-overhaul/` and `artifacts/overhaul/`. Physical Safari readability, heat and performance remain pending until tested on a real device. See `SOUND_GUIDE.md` for future ElevenLabs exports.



## Driver setup and wider pace lines

The current garage allows 1–6 laps, editable names and six centrally defined paint choices. Name/paint/lap preferences are saved locally with a safe fallback when storage is unavailable. Selected paint overrides theme defaults, including the welcome/result showcase. Names appear in handoffs, pads and classification, while car numbers keep identity distinct if names/paint match. Coaching drift messages and post-race advice have been removed. The line now uses 10/14 px planning and 8/11 px racing widths. See `docs/RACE_SETTINGS_UPDATE.md` and `docs/CIRCUIT_EXPANSION_PLAN.md`.

## Circuit and biome settings

`src/content/circuits.ts` registers the three playable courses, their physical track, scenery ID, name, difficulty and feature tags. Selection-card SVG paths are derived from each real centerline. `scenery.ts` selects the coastal, spaceport or Bay builder; shared road markings, barriers, vehicles and pace lines remain common. `sceneryPalettes` and `sceneryLighting` in `themes.ts` control the biome separately from interface branding and driver paint.

Orbital's assembly hangar, mission-control room, utility tanks and launch landmark are original procedural models in `spaceport.ts`. All substantial structures are inside authored protected footprints. The current scene is a basic art pass; the physical road remains flat with the same surface/grip/thrust rules. Course switching releases both previous scenes while retaining one WebGL engine. Do not add a new scene without implementing its physical track, clearance fixtures, metadata and resource lifecycle checks.


## Golden Gate and multiplayer effects

Golden Gate uses `bay.ts` for grounded city blocks, shopfronts, red suspension towers, a narrow deck, retaining quays and a land-backed skyline. Its `bay` palette/lighting entries in themes.ts are independent of GUI themes and selected paint. Protected city foundations and bridge footprints are authored in the physical course; moving them requires validation/versioning.

`thrustEffects` centrally controls vapor capacity, emission, lifetime, color, size and jet-core appearance. `thrust-vapor.ts` uses one reusable billboard mesh per car, with shared material/texture and a 96-puff cap. Do not replace it with per-puff draw calls or let its random seed enter simulation. Impact feedback reuses the small pooled particle/body response; sound roles are documented in SOUND_GUIDE.md.

Tournament screens use the existing panel/type/identity system. Points tables scroll independently; custom scheduling uses 44 px controls. Names and paints lock for the tour, remain presentation preferences and never alter physical contact.

## Golden Gate city v2

`content/golden-city.ts` authors land rectangles and supported building footprints independently of simulation. Buildings and street furniture remain within protected footprints; foundation geometry rises from the visible ground. `cityAppearance` in themes.ts supplies a shared facade palette, bridge paint, roof, glazing and shopfront materials. `bay.ts` builds original procedural architecture, quays, the 88 × 12 m deck and slim suspension structure. Bridge rail/support meshes are extruded directly from physical polygons in `circuit-details.ts`; decorative shoulders and curbs are omitted over the span.

Gate display and input share `startFinish`. The full-width planning strip and dashed 12 m approach remain unobstructed by the planning car. Ignored lead-in/overshoot sections use a muted dashed route layer, retained through preview and theme changes and hidden during racing. Both themes use common pace colors and widths in `pace`; rendering converts these CSS pixel values for actual viewport/render scaling. See GOLDEN_CITY_DRAWING.md for compiler behavior and compatibility.

City facade colors are stored as vertex colors on one shared facade material. Static batching therefore retains the complete palette while avoiding a separate main/shadow draw for every paint color. Keep that shared-material path when extending the city. The capture helpers enforce 90 solo and 150 four-car draw-call budgets on the development renderer.

### Drawing layout maintenance

Use `tools/capture-drawing-layout.mjs before|after` for matching 844×390 Launchsite captures. `tests/browser/drawing-layout.spec.ts` verifies real touch strokes, visible asphalt, safe controls and unchanged projection across phases. `tools/check-production-drawing.mjs` records a touch path from the local DEV preview and replays it through actual browser events against the computer-only production preview (port 4176); it does not inject a production practice route. Development capture/race tools use the DEV-only fixture method where a manual-input test is not their purpose. Tutorial implementation remains future work.
# Santa Monica sunset venue

`sunsetAppearance`, `sceneryPalettes.sunset` and `sceneryLighting.sunset` in `themes.ts` centralize the beach, pier, amusement and lighting palette. `content/santa-monica-art.ts` owns building placements; `presentation/santa-monica.ts` builds original geometry. Wheel/train meshes explicitly opt out of static batching. Decorative motion freezes under reduced motion. The visible pier slabs use the core's support polygons, while ramp/landing poses follow simulation height. `planning-height.ts` is a drawing guide only; it cannot support a car. See `SANTA_MONICA.md` for the complete boundaries and replacement guide.
