# Circuit expansion plan

Current milestone: **Coastal Launch, Launchsite and Golden Gate** are playable. Launchsite is the renamed Orbital course, with its legacy ID retained. Golden Gate follows the user-approved stylized Bay Area factory/bridge brief and replaces Alpine as the third delivered venue. Local tournaments span all three or a custom repeated schedule. Multiplayer cars now physically collide. See `GOLDEN_GATE_TOURNAMENT.md` for current behavior; earlier targets below remain planning history. Alpine and Neon Harbour are still future ideas.

Historical status, October 21, 2026: the circuit-selection foundation and first **Orbital Launchyard** playable layout are implemented. Coastal Launch and Orbital are now selectable. Orbital has basic original spaceport scenery; it remains a layout/art prototype for playtesting. The briefs below retain the original targets. Alpine Relay and Neon Harbour remain planned.

## Circuit lineup and gameplay identity

| Priority | Circuit / setting | Complexity | Distinct driving decisions | Scenery and readable landmarks |
|---|---|---|---|---|
| Existing | Coastal Launch / miniature coastal venue | 2/5, approachable | Long opening straight, broad sweeper, tight inner transition; learn pace versus thrust and sand runoff | Pits/gantry, planted inner islands, limestone, palms, open water |
| Playable prototype | Orbital Launchyard / SpaceX-inspired spaceport | 3/5, intermediate | A longer launch straight rewards thrust; a braking hairpin punishes late bursts; a linked S section rewards a smooth drawn line; a second short straight offers an alternate thrust timing | Assembly hangar, original rocket/tower silhouettes, tank farm, mission-control windows, service roads and floodlight structures; sunset palette |
| Third | Alpine Relay / high-altitude test facility | 4/5, technical | Alternating-radius hairpins, an offset chicane and a short recovery straight; precise pace matters more than repeated top speed | Granite retaining walls, conifer clusters, distant snow peaks, communications station and steel bridges outside the driving corridor |
| Fourth | Neon Harbour / nighttime shipping port | 4/5, technical sprint | Right-angle sequences, a wide dockside straight and a late double-apex bend; multiple viable racing-line shapes with ordered progression | Cranes, original container graphics, dock lighting, water reflections and a workshop district; car and pace line remain the brightest gameplay elements |

Keep at least one forgiving venue and avoid making every later circuit simply narrower. Variety should come from corner sequences, straight placement, route choices and thrust opportunities. Every venue supports solo and two to four local players, 1–6 laps and the same shared pace interpretation. Difficulty labels describe course demands rather than hidden grip changes.

## Orbital Launchyard production brief

**Composition:** a small, believable racing venue embedded in a fictional aerospace complex. Use the SpaceX reference for the recognizable atmosphere of reusable-rocketry infrastructure; create original meshes, signs and mission graphics. Avoid implying endorsement. No official logo is needed to communicate the setting.

**Target layout:** approximately 360–420 m per lap, flat asphalt, approximately 11.5 m road width. Begin with one 75–90 m straight, one open 180-degree turn, a controlled approach to a tighter hairpin, a flowing S section and a shorter return straight. These dimensions are design targets, to be validated in the first geometry prototype.

**Three scenery zones:**

1. Launch straight: starting gantry, low pit/control building and a distant rocket/tower silhouette. Place tall shapes behind the road so they cannot hide drawn points or cars.
2. Assembly sector: hangar facade, service vehicles and tank shapes within protected infield footprints. A substantial landscaped/concrete island prevents cutting across the hairpin.
3. Return sector: scrub, utility fencing, pad lighting and a distant coast/horizon. Keep the outer runoff usable and leave 5–7 m before inner barriers where the layout supports it.

**Lighting:** warm low sun with a cooler sky; restrained emissive windows and beacon lights. Avoid post-processing that blurs routes or expensive real-time volumetrics. A static distant vapor plume is optional; no launch animation is needed for the first playable version.

**Driving rules:** retain current drift, thrust, surface drag and collision behavior initially. Concrete-looking areas that are not drivable must be protected by visible solid edges. Do not introduce unseen hazards, active launchpad penalties or secret shortcuts. Hop remains a separate milestone; any future shortcut requires explicit course/checkpoint design.

**Sound roles:** quieter dry wind and distant industrial ambience replace coastal air, while motor, tires, thrust and race cues retain the same replaceable roles. Add no network audio dependency. ElevenLabs exports can fill these local roles later.

## Required architecture before adding track two

The current game intentionally assumes Coastal Launch in several places. Remove that coupling in one bounded refactor before building the new venue.

| Task | Existing coupling | Target |
|---|---|---|
| Circuit registry | `coastalTrack` imported directly in `main.ts` | One registry entry per playable circuit containing physical track, scenery role, metadata and preview |
| Scene assembly | `GameScene` directly calls `buildCoast` and `buildCircuitDetails` | Scenery builder selected by circuit ID; shared road, route, vehicle and input rendering stays common |
| Track references | Practice samples, projection, session creation, progress and debug API use the coastal constant | Pass an active `TrackDefinition` throughout the session |
| Presentation separation | Existing themes include both interface and coast colors | Keep the racing interface/paint palette independent of biome materials/lighting |
| Metadata | Caption and setup heading contain a fixed venue name | Name, difficulty, feature tags and preview come from the selected circuit |
| Session reset | Current mode changes clear all plans | A circuit change must discard plans/readiness/timers, retain driver profiles and lap preference, and prevent old route reuse |
| Record scope | Bests are partitioned by track ID/version and lap count | Preserve that scope; never compare different circuits or lengths |
| Loading | All existing environment code is loaded for one course | Load only the selected biome's heavier assets; keep a usable placeholder/failure recovery |

Suggested contract: `CircuitDefinition = { id, revision, track, sceneryId, name, difficulty, features, previewAsset }`. Physics consumes `track` only. Scenery consumes authored track boundaries and a biome palette, never rewrites physical checkpoints or car properties.

## Prioritized work packages and dependencies

### A — Course-selection foundation

Depends on this preferences milestone. Add the registry with only the existing venue, migrate all coastal constants to the selected entry, and add a course-selection step before race setup. Do not show unfinished circuits as playable choices. Acceptance: the existing game looks/handles the same; changing the selected entry invalidates every confirmed route and bests remain correctly scoped.

### B — Orbital layout prototype

Depends on A. Author the new flat route/checkpoints and protected islands first. Build at least three valid pace fixtures plus wide runoff routes. Test normal, aggressive and deliberately barrier-crossing plans. Play the course with several thrust schedules and adjust geometry before scenery. Acceptance: two laps can complete reliably for each valid fixture; 1–6-lap sessions and all player counts work; no accidental shortcut, trapping pocket or unmarked collider.

### C — Orbital art pass

Depends on B. Build the three scenery zones, original signs, shared-material rocket/hangar silhouettes and a distinct sunset palette. Keep tall landmarks outside line-of-sight to the entire planning surface. Use one art pass with front/side/gameplay views and desktop/phone comparisons. Acceptance: the venue is distinguishable immediately, pace colors remain readable, paint choices stay identifiable, and the fixed planning/racing camera agrees exactly.

### D — Player testing and optimization

Depends on C. Compare best achievable lines, late versus early thrust, and forgiving versus aggressive pace. Tune the course rather than secretly changing physics. Profile solo and four-car scenes, loading, memory, shader warmup and 20-minute sessions on physical Safari. Acceptance: target ≤90 solo/≤150 four-car draw calls including shadows, desktop 60 fps and sustained physical-mobile 30 fps where supported. Record measured device/OS results rather than claiming them from emulation.

### E — Additional venues

Only after Orbital is fun, legible and stable. Reuse the registry, collision/route fixtures and scenery interface for Alpine Relay, then Neon Harbour. Prototype one layout at a time. New weather, changing grip, elevation, movable obstacles or hop require separate rules/versioning and acceptance checks.

## Professional presentation gates

- Every playable circuit needs a distinctive silhouette, three intentional landmarks, coherent material scale and one controlled lighting direction.
- Use the same typography, spacing, input conventions and hierarchy across course selection, garage, planning and results.
- Keep driver identity readable through name, number and paint; pace colors always mean speed.
- Make timing, selected distance, feedback and results consistent. Keep coaching pop-ups out of active racing and post-race presentation.
- Keep all visible solid obstacles consistent with clearance/collision geometry and preserve authored runoff.
- Ship complete assets with attribution and fallbacks. Do not expose internal production details in player-facing menus.
- Before calling a circuit ready: inspect desktop/phone/tablet, complete every player count and lap length, verify interruption/retry/rematch and capture actual gameplay.

A and B are implemented, with a first lightweight C scenery pass. The current Orbital centerline measures approximately 450 m (the compiled practice route is about 448 m), above the original 360–420 m design target. Preserve the current runoff while playtesting whether to shorten the layout. Next: real-device testing, course balancing and a more detailed environment pass. Do not build four unfinished environments at once.

## Santa Monica implementation — 2026-10-22

The approved fourth venue now extends the registry with a sunset beachfront/pier loop, original wheel/coaster scenery, a normal flat bypass and a physical automatic ramp over a water opening. This supersedes the earlier proposed next-venue order above; Alpine Relay and Neon Harbour remain future concepts. Manual hop controls and global leaderboards remain deferred. The supported-surface/flight contracts and version-8 compatibility policy are documented in `SANTA_MONICA.md`. New Full Tours include all four venues; existing schedules remain unchanged.
