# Yosemite v3: scenery visible while playing — 2026-10-29

The v2 valley placed most exterior detail too far from the fixed gameplay view.
This pass relocates 43 existing rock formations toward the course and adds a
nearer layer of conifers inside the valley. It preserves the road and abilities.

- Exterior rock toes now approach six metres beyond the 16 m road edge and keep
  the same clearance from the hidden timber trail. The full start-touch rectangle
  remains clear. Large forms are scaled down to keep their silhouettes out of the
  road's sight lines; their actual collision footprints move with them.
- The existing central waterfall cliffs and fallen-cedar obstacle stay in place.
  Their protected footprints and jump permissions are unchanged.
- Nearer conifers use a height-aware sightline setback. They are deliberately
  placed around the course, separate from the remaining distant forest. They
  avoid rocks, protected parcels, the hidden branch and the drawing start zone.
- Foundation blending for relocated rocks is narrowed to two metres. This keeps
  their raised foundations from spreading under the lane or forcing a smaller
  phone camera fit. Rendered ground continues to use authoritative terrain.
- The full main/alternate road retains its v1 height/support fingerprint: 3,401
  two-metre-grid samples across the 16 m lanes match exactly. Off-road terrain and
  solid obstacles intentionally change, so Yosemite advances to track v3.

Rules/compiler remain 18, and the other seven track definitions are unchanged.
Existing Yosemite records/tours cannot silently resume against moved obstacles;
ordinary names, paints and lap preferences remain intact.

Review and budget evidence uses the actual fixed gameplay cameras, not a distant
scenery inspection view. Desktop, phone landscape and phone portrait must keep
the road, gate, automatic creek crossing and hidden cedar trail drawable. See
`artifacts/roadside/` for baseline/updated captures and verification logs.

Physical iPhone/iPad Safari verification remains pending hardware testing.

## Verification

All 672 unit tests pass, as do the 16 targeted Yosemite tests after the final
foundation refinement, eight final browser checks, all 24 exact legacy handling
fixtures, type checking, the Pages build and a complete production touch race.
Desktop and both phone orientations retain the original 72-degree camera fit;
sampled road sight lines are clear. The waterfall remains visible in portrait.
Active-effect budgets remain 48 Time Trial / 104 four-car scene draws.

## Creek banks and terrain physics speed — 2026-10-31

The core heightfield carves the creek per 4 m grid node (nodes inside the authoritative water
opening are at -3 m), and the rendered valley copied it, so the water's edge showed square steps.
The rendered ground near the creek now follows the signed distance to the authoritative banks
(`src/presentation/yosemite-creek-bank.ts`): a straight slope from the uncarved meadow 6 m out to
the bed 1 m inside the water, blending back into the core terrain by 9 m. Trees and undergrowth
use the same rendered ground. The water opening, support, physics heights and records are
unchanged (`tests/unit/yosemite-creek-bank.test.ts`).

Terrain height and surface-grip lookups without a route hint used to scan every road segment.
`src/core/nearest.ts` searches a 16 m segment grid outward and scores the candidates in course
order, so the result is exactly the full scan's (`tests/unit/nearest.test.ts`; `pnpm test:legacy`
matches all 24 fixtures). Measured on the development sandbox (four practice-line cars, ms per
60 Hz tick, before → after): Capitan Yosemite 7.5 → 1.8, Snowy Tahoe 6.1 → 1.9, LA nights
1.9 → 0.7, Santa Monica 1.2 → 0.6, Grand Canyon 1.4 → 1.2; the other venues also roughly halve.
Physical-phone timing remains pending.

