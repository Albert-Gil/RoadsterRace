# LA nights

Sixth circuit (`la-nights`, track version 1): a fictional LA street course with 734 metres of dry asphalt and 16-metre roads. The main route remains flat and uses existing handling. Physics v13 and compiler v11 remain unchanged; older tracks and saved championship schedules are preserved. New Full Tours include all six venues.

## Racing choices

- Main route: downtown boulevard, channel detour, arts-district sweeper and studio return. Large protected blocks prevent excessive cuts while preserving normal runoff.
- Automatic channel jump: complete forward branch through an 8 m ramp, 1.2 m lip, 10 m water opening and at least 60 m of receiving straight. Existing launch tuning and guidance apply. Slow or disrupted attempts can splash and recover; no automatic rescue.
- Hidden backlot alley: a 16 m service lane with a 2.5 m solid divider and protected end wings. Only a compiled complete traversal permits manual Hop to clear that named obstacle. Human players activate Hop; computer drivers use the main route here. No shortcut signs, activation paint or preview badges.
- CPU ramp choices follow the existing difficulty strategy: Easy bypasses, Normal sends one opponent over the ramp and Hard sends two. All cars retain normal physics, legal ability commands and three-second starting ghosting.

## Original night artwork

Downtown blocks, original theater/hotel/garage signage, lit window grids, rooftop services and water tanks, palms, paved courtyards, parked service vehicles, an industrial channel and a distant skyline are authored locally. All building foundations are supported and inside protected areas. There is no third-party city model, commercial logo or new external asset dependency.

Night palette, exposure, light-pool opacity, car fill lighting and glow limits live in `nightAppearance` and the scene palettes in `src/presentation/themes.ts`. The small glow target includes only batched emissive buildings/signs/windows; it adds no per-window lights. Static box details are built directly into material groups instead of allocating thousands of scene nodes. Amber/cyan/magenta light pools and neutral lane boundaries preserve the red/amber/green racing-line meaning. Scene resources, including the glow layer, belong to the disposable venue scene.

Selection remains minimal: name, map, difficulty, length. Desktop selection uses three columns; narrower layouts use two. Both shortcuts are included in the existing fixed whole-course framing. No mid-race zooming or panning is added. Existing city ambience is reused through the replaceable audio roles.

## Testing and delivery

Run locally: `http://localhost:5173/?circuit=la-nights`.

Tests cover safe routes, unsupported cuts, complete branch validation, missed Hop impacts, 20/30/42 m/s ramp launches, 20/25/30 m/s manual-hop clearance, six laps on each route, all CPU difficulties and preserved tournament schedules. Browser checks cover real touch drawing in phone orientations and tablet, active-effect rendering budgets, actual jump/Hop races and production base-path loading.

Recorded outcomes and capture paths: [LA nights test report](LA_NIGHTS_TEST_REPORT.md).

Physical iPhone Safari readability, sustained performance and touch comfort remain pending hardware testing. This circuit is a local update; commit/push/deployment require a release request.
