# Visual pass 3: Newport Island, Launchsite, Golden Gate and Santa Monica

Owner request, 2026-11-20 ("Improve the graphics of the game... Tackle different circuits").
This pass covers the four venues that the earlier passes had not touched. Presentation only:
no support, barrier, grip, progression, camera, track-version, rules or physics change.

## Open-water depth (Newport Island, Golden Gate, Santa Monica)
- One translucent, unlit overlay just above each existing sea (`water-depth.ts`). Its alpha
  rises with horizontal distance from the shore: a light shelf tint near land, then a long fade to
  deep blue offshore. The water level, coastline and every water hazard are unchanged.
- Shore distance: Newport uses the island's shoreline ellipse (outside the existing lagoon
  shelf); Golden Gate the three city land rectangles (`rectangleDistance(cityLand)`); Santa
  Monica `x - shoreX(z)` from its landscape layout.
- Values: `waterDepthAppearance` in `src/presentation/themes.ts`. One draw call per venue,
  rendered first among transparent meshes and excluded from the pre-pass (`roadsterOverlay`).

## Golden Gate span
- Fluted tower legs, two stepped setback bands, stepped caps, and one slim portal strut 7.9 m
  above the deck, all on the existing towers.
- A red fascia and stiffening truss (chords, posts, alternating diagonals) under both deck
  edges between the abutments, below the driving surface.
- Lamp standards on the existing hanger brackets, outside the bridge rails.
- Source: `golden-gate-bridge.ts`; values: `goldenBridgeAppearance`. Baked into the existing
  bridge-red and bay-metal batches.

## Launchsite remote launch mounts
- Each of the three remote rockets' 1.25 m plinths becomes a launch table: pale concrete top,
  yellow safety edge, soot ring, flame-deflector slots, six hold-down clamps, and a red lattice
  umbilical mast with two service arms in the plinth corner farthest from the course.
- Everything stays inside each rocket's existing protected footprint (±1.3 × radius).
- The ground map adds a compacted apron and fanned soot around each plinth. Soot streaks stop
  more than 14 m from the course centreline (`launchsite-detail.ts`).
- Source: `launchsite-pads.ts`; values: `launchPadAppearance`. Baked into the existing
  launch-fleet material: no extra draw call.

## Newport Island
- The 46 dark low-poly sphere mounds under the windswept beach trees become low dune hummocks.
  The rim is sand coloured and blends to dry grass, then dune grass with a few ice-plant
  blooms toward the crown (`newport-dunes.ts`, `newportDuneAppearance`). They have the same
  positions and setbacks as the old mounds and no collision.
- The protected clubhouse/grandstand gardens show a mown lawn with 4 m stripes instead of the
  rocky embankment texture (`newportLawnAppearance`). The palm garden keeps its foliage ground.

## Verification (cloud sandbox, 2 CPU cores)
- `pnpm typecheck` passes. 14 unit files (129 tests) covering scenery composition, landscape
  rules, Newport, Launchsite, Santa Monica, landmarks, signatures, fringe, roadside, graphics
  and current rules all passed.
- Medium-tier draw calls with the drawing view open (844×390), before → after: Newport
  43 → 46, Launchsite 33 → 33, Golden Gate 36 → 37, Santa Monica 38 → 39. All stay far below
  the 90 Time Trial / 150 four-car limits.
- Not run: the full unit and Playwright suites, High/Ultra captures (too slow in the software
  renderer here), and physical iPhone/iPad appearance and frame rate.
