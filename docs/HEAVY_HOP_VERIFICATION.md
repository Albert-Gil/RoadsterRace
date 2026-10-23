# Heavier flight and Launchsite hop verification — 2026-10-23

Rules 11, compiler 10, Launchsite 3; Coastal 3, Golden Gate 3 and Santa Monica 2 are retained. Ordinary driver preferences are preserved while incompatible records/championships stay isolated.

## Measured flight and shortcut

Measurements use the actual fixed-step simulation; `node tools/measure-heavy-hop.mjs` reproduces the report in `artifacts/heavy-hop/measurements.json`.

| Case | Measured peak | Airborne time | Outcome |
|---|---:|---:|---|
| Level-ground manual Hop | 4.0133 m | 0.94443 s | Grounded normally |
| Santa Monica ramp, 20 m/s | 2.8798 m | 0.70557 s | Supported landing, no recovery |
| Santa Monica ramp, 30 m/s | 3.3701 m | 0.77991 s | Supported landing, no recovery |
| Santa Monica ramp, 42 m/s | 4.0401 m | 0.87097 s | Supported landing, no recovery |

The compiled Launchsite bypass is 458.438 m and the manual-hop route is 423.908 m: 34.529 m saved. Authored centerline length and compiled length differ slightly because of route processing. A recorded one-lap browser run completed the shortcut with one human Hop and no collision or recovery, in approximately 25.48 s. The clip records ordinary rendered gameplay and real keyboard input; it does not advance simulation artificially.

## Simulation verification

All 273 unit tests pass across 20 files. Shortcut-specific checks preserve normal bypass lines at ±4 m and ±6 m through the shared fork, and cover full forward traversal, incomplete/reverse/off-corridor rejection, raw and smoothed clearance, manual-flight-only permission, end-wing protection, swept grounded impacts, tail clearance during descent, correctly timed approaches at 20/25/30 m/s, and missing/early/late impacts. A six-lap human shortcut run and a six-lap mixed race against three CPU bypass plans finish. Recorded shortcut commands match exactly at 30/60/120 Hz rendering.

Existing checks cover grounded handling, all four circuits and AI difficulties, six-lap races, scoring and saved versions, independent recharge/holding, simultaneous abilities, stationary hops, pause/retry, height-aware contacts, simultaneous recovery occupancy, water restrictions and replay elevation. Nine ramp cases combine 20/30/42 m/s, ±20-degree body yaw and modest sideways momentum; all land. The intentionally sideways failure fixture uses a steeper lateral departure because the old modest departure now safely lands with the stronger launch.

## Browser and presentation

Eight hop browser scenarios pass: four responsive control layouts (844×390, 390×844, 320×568 and 1024×768), eight real simultaneous touches with 50 cancellation cycles, keyboard/focus/pause/retry, a complete Santa Monica hop-plus-ramp race, and an actual Launchsite hop-lane race. Three additional preview checks keep the Hop-required badge inside landscape/portrait control rails, including 320-pixel phones. Complete four-round Solo and four-player championships pass, including reload/resume, scoring and rematch; the saved Time Trial replay browser check also passes. A final focused run verifies the road-painted Hop activation marker and captures the updated scene.

- Racing vehicle: 9,898 triangles, below 10,000.
- Launchsite Time Trial with cold-gas cores firing: 63 draw calls.
- Santa Monica Time Trial with hop/thrust effects: 71 draw calls.
- Four cars with simultaneous hop/thrust vapor: 137 draw calls and 340 live bounded particles (384 total pool capacity), below the 150-call target.
- Each pitched nozzle samples its own support height, including mixed supported/water edges; the helper has dedicated ramp/edge tests. Four nozzles share body geometry; all downward cores share one mesh per car. The firing core disappears after the manual pulse, while pooled vapor dissipates. Ramp launches do not create a manual firing pulse.
- Both presentation presets remain separate from simulation. Production smoke verifies Graphite, portrait rotation, manifest/icons, fonts, assets, Home navigation, saved preferences, real touch drawing, Solo CPU ownership, multiplayer Hop controls and tournament resumption under `/RoadsterRace/`, with no page errors or failed required requests.

Matching before/after phone captures exist for all four circuits in portrait and landscape. The fixed higher-flight envelope changes mean projected road width only slightly: Coastal landscape 68.80→67.68 CSS px; Launchsite 52.80→52.80; Golden Gate 57.59→56.92; Santa Monica 43.49→43.49. Projection round trips remain within 5×10⁻¹² world units. Drawing and racing keep the same framing and existing control rails.

## Evidence and release checks

- `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Relevant browser Hop, championship and replay checks.
- Production Pages smoke, including real-touch Launchsite manual-lane and Santa Monica ramp routes.
- `artifacts/heavy-hop/before/` and `after/`: matching eight-view sets and projected-size reports.
- `artifacts/heavy-hop/launchsite-shortcut-preview.png`, `cold-gas-firing.png`, `shortcut-hop-apex.png`: actual game captures.
- `artifacts/heavy-hop/launchsite-gameplay.webm` and `Launchsite-hop-gameplay.mp4`: actual rendered shortcut race; browser video capture is silent.
- `artifacts/heavy-hop/gameplay.json`, `four-car-effects.json`, `measurements.json`, test logs and production reports.

Generated evidence stays outside version control. The release workflow independently reruns checks before deploying only `dist/` to the authorized GitHub Pages testing site.

Physical iPhone/iPad Safari drawing comfort, exhaust readability and sustained frame rate remain pending real-device testing. Automated touch/viewport checks and desktop GPU measurements do not establish physical-phone performance.
