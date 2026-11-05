# Venue expansion verification — 2026-11-04

Local working-tree verification. No commit, push or deployment is included.
Implementation and replacement-candidate plan: [VENUE_EXPANSION.md](VENUE_EXPANSION.md).

## Core, geometry and compatibility

- Full `pnpm test`: **831 tests / 62 files passed**. Evidence:
  `artifacts/venue-expansion/verified-unit-tests.txt`.
- `pnpm test:legacy`: **24 exact handling fixtures match HEAD** (one/two/four
  physical cars on the original eight course definitions). This compares unchanged
  physics on old geometry; Newport/Yosemite intentionally version their new layouts.
- Type checking, generated-rules checks, root build and `/RoadsterRace/` build pass.
- A final neutral-concrete tint removed the causeway's checker appearance without
  changing geometry or shader work. The 36 focused course/presentation checks,
  type check and both builds were repeated successfully after that adjustment.
- New South Rim: both crossing levels retain ordered identities, both hidden
  branches compile with clearance, correct manual Hops clear the named piles,
  missing Hops impact them, and all CPU difficulties complete four-car races.
- All nine courses pass the shared 16 m road-edge, runoff, wide-drawing,
  six-lap/four-car and forgiving-stroke tests. Races may crash/recover at a bad
  drawn hazard, consistently with the existing rules.
- Yosemite's nine clean six-lap CPU references have zero collisions/recoveries.
  Medians: Easy **186.14 s**, Normal **175.21 s**, Hard **171.04 s**.
- The western creek was placed after the bend so inside-cut strokes retain a
  driveable recovery. Both recorded cutter seeds finish (with normal penalties).
- Newport's off-road excursion fixture shifts its start by 5 m to follow the
  extended bend; its 40 m excursion and under-2 m retention assertion are unchanged.
  The exhaustive 27-plan starting-row check receives 90 s on shared hosts; none
  of its alignment or contact assertions were relaxed.

## Browser journeys

Validated scenarios across `venue-expansion.spec.ts`, `yosemite.spec.ts`,
`yosemite-waterfall.spec.ts` and `car-effects-budget.spec.ts`:

- Real Chromium touch events produce clean previews on Newport, Yosemite and
  South Rim in phone landscape and portrait (2× pixel density).
- South Rim touch drawing visits the upper flight guide and lower road without
  layer controls; an actual complete race crosses, lands, returns beneath the
  crossing and finishes without recovery.
- Yosemite solo/CPU, four local humans, personal-best replay, tournament setup,
  saved schedule retention, animated/reduced-motion water and WebGPU/fallback
  rendering pass. Full Tour now contains nine venues.
- LA's causeway renders within the unchanged 8 m / 1.2 m physical approach.
- Eight rendering stress cases cover all four revised venues in Time Trial and
  Solo Race, including shadows, thrust, ground dust, repeated impacts and a
  cosmetic replay ghost in Time Trial. No page errors.

Two early development runs were interrupted by source hot reloads and returned
to Home. Both phone orientations and the four-player journey were repeated on the
stable final scene and pass. The final source was then left fixed for verification.

### Peak scene draw calls, forced active effects

Medium, 844×390 Chromium viewport, WebGL 2 / D3D11. Time Trial includes the
cosmetic ghost; Solo Race has four physical cars.

| Venue | Time Trial | Four cars | Limits |
|---|---:|---:|---|
| Newport Island | 64 | 120 | 90 / 150 |
| LA nights | 73 | 129 | 90 / 150 |
| Capitan Yosemite | 44 | 100 | 90 / 150 |
| Grand Canyon: South Rim | 37 | 93 | 90 / 150 |

Evidence: `artifacts/effects-budget/` and
`artifacts/venue-expansion/effects-budget.txt`. These are scene counts, not
post-processing passes; existing graphics tiers, resolution caps and static-shadow
caching remain enabled.

### Isolated frame pacing

Eight final 10-second samples (all four revised venues, Time Trial with ghost and
four-car Solo Race), after warming the scene and triggering Thrust: median
**16.70 ms**, 95th percentile **16.80 ms** in every sample. This is approximately
60 fps on the development computer, at 844×390 CSS pixels / 2× density / Medium
with WebGL 2 / D3D11. Measurements ran after the CPU regression suites finished.
Evidence: `artifacts/venue-expansion/performance.json` and `performance.txt`.
These are desktop measurements, not a claim about physical iPhone performance or
a statistically paired percentage comparison against a previous build.

## Production-path checks

Local Pages smoke checks pass for South Rim, Yosemite and LA nights, including
real touch preview/race startup, sound activation, correct base-relative assets,
Home navigation and stored preferences. LA's alternate jump is also exercised.
Reports contain no failed asset requests or page errors. This verifies the built
website locally; it does not publish it.
The final neutral causeway build is additionally checked in
`artifacts/venue-expansion/production-final.json`: nine selection cards, drawing,
correct Home base, no production inspector and no failed requests/page errors.

## Review captures

- Gallery: `http://127.0.0.1:5181/artifacts/venue-expansion/index.html`.
- Full-course desktop / phone landscape / portrait: `artifacts/venue-expansion/captures/`.
- Touch previews: `artifacts/venue-expansion/touch-*.png` and matching JSON reports.
- Waterfall and causeway details: `yosemite-falls-2.png`, `yosemite-falls-3.png`,
  `la-causeway-detail.png` in that artifact directory. These use authoring cameras;
  ordinary play retains the fixed overview.
- Actual South Rim gameplay: `south-rim-30s.webm` (30 seconds, silent) and the
  full `south-rim-gameplay.webm`, plus flight/lower-road captures and race JSON.
- Offline selection artwork regenerated for the four revised venues, all below
  the 60 KB/card limit. Existing asset licences are preserved.

Physical iPhone Safari comfort, sustained performance and sound remain pending
hardware testing. Desktop browser emulation is supplemental evidence.
