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
