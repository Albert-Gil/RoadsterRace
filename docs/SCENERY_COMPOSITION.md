# Visible scenery composition — 2026-11-05

The owner asked for changes that read during whole-course phone play, after the
previous small furniture additions were difficult to notice. This pass replaces
larger connected forms and ground colour regions, while retaining the fixed camera,
road layout, input space, rendering tiers and existing handling.

## Delivered artwork

| Venue | Larger visible changes |
| --- | --- |
| LA nights | Denser central blocks plus 17 new protected perimeter frontages; stepped roofs, terraces, deep storefront bands, warm windows and restrained neon. Flat paved verges connect the street composition. |
| Launchsite | A broad pitched assembly roof, three large hangar bays, raised skylights, a deeper mission-control canopy and reinforced gantry silhouette. Rocket/gantry parts move within the existing launch-complex parcel. |
| Golden Gate | Fuller colourful city blocks, varied hip roofs, facade bays and flat promenade verges. Thicker suspension cables and crossbeams preserve the original narrow deck and rails. |
| Newport Island | A low white/timber racing clubhouse with a terracotta roof, veranda and larger palms replaces the utility-like pavilion. Three animated shoreline foam fronts replace the previous static shore-break. |
| Santa Monica | A larger 12-gondola wheel, supported timber boardwalk and six stalls; higher coaster silhouette and additional bracing; moving beach surf. The jump opening remains clear. |
| Snowy Tahoe | Broad blue shaded gullies, exposed rock bands and more irregular snow-capped outcrops reveal the existing mountain relief. All road and terrain heights stay authoritative. |
| Grand Canyon and South Rim | Stronger continuous sediment bands, warmer talus, wider pale dry washes and contrasting cliff-foot colours. No new platform support, crossing changes or extra flight assistance. |
| Capitan Yosemite | Greener forest/meadow separation and broad granite-foot talus colours connect the existing cliffs to the valley floor. Existing waterfalls, rivers and the separately committed animated canoes remain. |

This does not rebuild every terrain shape in the earlier art-direction brief.
The largest geometry changes are the cities, clubhouse, launch complex and pier;
the mountain venues gain broad colour/rock-shape treatments on their existing land.

## Separation and compatibility

- Physics remains **18**, compiler **18**, CPU controller **2**.
- LA nights becomes **track v5** because its new solid buildings have authoritative
  footprints. Each padded foundation and height matches its collider; main-road
  and Hop-lane clearance is at least 5 m. Existing LA records/tours follow ordinary
  version invalidation; names, paint and laps are preserved.
- Other track versions, roads, supports, jump/Hop corridors and camera fitting
  are unchanged. No shortcut signs, preview hints or new abilities were added.
- `composition-shapes.ts` supplies native forms; `urban-architecture.ts` builds
  bounded facades/roofs; `urban-promenade.ts` emits flat supported paving.
- `venue-landmarks.ts`, `pacific-wheel.ts` and `shore-surf.ts` hold the new
  venue-specific geometry/motion. Palettes live in `themes.ts` under
  `venueComposition`, `pierComposition` and `shoreComposition`.
- Mountains use baked vertex colours via `mountain-composition.ts` and the
  existing landscape worker paths. Colour cannot grant support or alter grip.

## Performance design

Reuse existing shared materials, scene batches, sky reflections and cached static
shadows. Windows are predominantly two-triangle panels rather than individual
light sources or expensive hidden box faces. The wheel's cabins stay upright
while its rim rotates, in the same single dynamic mesh. Surf adds one dynamic
batch at Santa Monica and replaces one at Newport; neither casts shadows or
participates in input/contacts. Reduced motion freezes all new movement.

The budgets remain 90 scene draw calls for Time Trial with its cosmetic ghost and
150 for four-car races, with ground, thrust and impact effects active. High/Ultra
retain their existing fixed screen passes. No new scene texture, external
model, light, reflection camera, service or dependency is introduced.

## Verification

See `artifacts/scenery-impact/` for matching before/after desktop, phone landscape
and portrait captures, browser/unit logs and paired desktop-GPU measurements.
The review gallery is local and is not a promotional post.

Physical iPhone/iPad Safari drawing comfort, frame time and sound remain pending
hardware testing; automated phone layouts and desktop-GPU timing cannot establish
those.

### Completed checks

- Full unit suite: **843 tests / 65 files** pass.
- All **27** one-/two-/four-car handling fixtures match HEAD (`b313bcb`) exactly.
- **28 distinct browser checks** pass across the hardware run and focused
  rechecks: all 18 active-effects budgets, tier changes, all nine venues on Ultra,
  renderer switching/fallback, zoom guard, actual LA jump/Hop races, surf animation
  and reduced motion, and twelve upright wheel gondolas in one batch.
- The strict cached-shadow image equality check passes in its dedicated
  `tests/browser/shadow-cache.spec.ts` software fixture, including when the other
  suites select D3D11. D3D11 gives small pixel differences even on the old build;
  the original strict assertion is retained, without a relaxed image tolerance.
- LA's old browser jump fixture used the generic 7 s stroke and reaches only
  19 m/s, causing the same two recoveries before/after. Its updated touch test uses
  the existing unit fixture's 6.5 s pace (about 20.35 m/s), and lands/finishes with
  no recovery. No launch/handling tuning was changed. The baseline/current
  simulation probe gives exactly 36.7167 s for that route in both versions.
- Forced ground/thrust/impact effects and a Time Trial ghost peak at **63 / 120**
  scene draw calls across all venues, below the **90 / 150** targets.

### Paired frame timing

Same desktop GPU, 844×390 CSS pixels, 2× density, Medium, WebGL 2 / D3D11. Each
before/after case warms for 2 s and samples 6.5 s of a six-lap session; Time Trial
includes a cosmetic ghost. All 18 paired cases remain racing with no page errors.

| Venue | TT calls before → after | Four-car calls before → after | After median ms | After p95 ms |
| --- | ---: | ---: | ---: | ---: |
| LA nights | 72 → 62 | 120 → 110 | 13.3 | 13.4 |
| Launchsite | 51 → 51 | 101 → 101 | 13.3 | 13.5 |
| Golden Gate | 57 → 55 | 107 → 105 | 13.3 | 13.4 |
| Newport Island | 63 → 63 | 113 → 113 | 13.3 | 13.4 |
| Santa Monica | 56 → 57 | 103 → 104 | 13.3 | 13.5 |
| Snowy Tahoe | 47 → 47 | 100 → 100 | 13.3 | 13.4 |
| Grand Canyon | 38 → 38 | 90 → 90 | 13.3 | 13.5 |
| South Rim | 37 → 37 | 90 → 90 | 13.3 | 13.5 |
| Capitan Yosemite | 45 → 45 | 98 → 98 | 13.3 | 13.5 |

The display is capped at 75 Hz. Holding that cap does not measure spare GPU
capacity or prove unchanged performance on phones. JS heap samples are retained
for diagnostics; they are not a complete GPU/process-memory or leak measurement.

### Production and review delivery

- `pnpm typecheck`, `pnpm test`, `pnpm test:legacy`, `pnpm build` at the root and
  with `VITE_BASE_PATH=/RoadsterRace/`, and `pnpm test:pages` pass. Generated rules
  were refreshed with `pnpm docs:rules` and checked by the full unit suite.
- The production Pages smoke passes real touch drawing and race start on all
  nine circuits, authored branches, portrait/Graphite layout, manifest/icons,
  Home navigation, four-player input, Solo Race and tournament save/resume.
  It reports no page errors or failed required requests. This smoke starts races;
  it is not a claim of hardware Safari or every-mode full-championship testing.
- All **27** paired camera/projection comparisons match exactly. Phone captures
  use actual touch emulation at **2×** density, in both orientations.
- Nine refreshed gameplay card WebPs are **14.2–26.7 KB** each, below 60 KB.
- The local gallery at `http://127.0.0.1:5181/artifacts/scenery-impact/index.html`
  has desktop/phone-landscape/portrait before/after views and a 30-second actual
  LA Time Trial excerpt (no captured audio). Gallery images and clip metadata
  load without errors.
- The canoe milestone is pushed as `b313bcb`. The owner subsequently approved
  committing and pushing this verified scenery composition as **`58b3bf1`**;
  both GitHub workflows passed. The further venue-specific revisions are a
  separate milestone documented in `VENUE_SIGNATURES.md`. No promotional post
  is included.

Physical iPhone/iPad Safari comfort, sustained performance and sound verification
remain pending hardware testing.
