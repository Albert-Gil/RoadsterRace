# Yosemite river life — 2026-11-04

Three colored open-hull canoes float on Bridalveil Creek, with two seated paddlers
each, wooden thwarts, painted flotation decks, small wakes and gentle bob/roll.
Independent paddle strokes give the river visible life. Reduced motion freezes
the complete pose. Positions are projected onto the authoritative main river;
the complete hull/paddle/wake footprints remain inside its water and clear of
solids and the three automatic jump corridors.

`src/presentation/yosemite-river-life.ts` owns the original native geometry and
bounded animation. `yosemiteAppearance.riverLife` in themes.ts centralizes size,
paint, anchors and motion. One opaque dynamic mesh reuses the ranger-detail
material, adds one scene draw call and casts no new shadows. It has 2,766 triangles
across all three canoes. It adds no lights, textures, physics, input targets or
simulation events. No rules/compiler/track versions change.

## Verification

- Type checking and root/Pages-compatible production builds pass.
- Full unit suite: 836 tests / 64 files pass; final canoe geometry/lighting checks
  also pass after the overhead visibility refinement.
- All 27 one-/two-/four-car handling fixtures match HEAD exactly.
- Phone landscape/portrait, 2× density: all three boats project on screen;
  animation advances, reduced motion freezes it, and boats remain non-pickable
  and absent from shadow casting. No page errors.
- Forced active-effects rendering budgets: 45 Time Trial including ghost,
  101 four-car Solo Race (targets 90 / 150).
- Final desktop D3D11 measurements at phone dimensions, 844×390 / 2× density /
  Medium: median 13.3 ms and p95 13.5 ms in both Time Trial and Solo Race, matching
  the immediately preceding Yosemite measurement. This is not hardware iPhone
  performance evidence.

Review: `http://127.0.0.1:5181/artifacts/yosemite-canoes/index.html`.
The close capture uses a temporary inspection camera; ordinary play retains the
same fixed whole-course framing. Tests/logs/captures are in
`artifacts/yosemite-canoes/`; forced-effect reports are in `artifacts/effects-budget/`.

This milestone was committed and pushed as `b313bcb` on the owner's follow-up
request; its GitHub checks passed. The subsequent larger venue work is documented
separately in SCENERY_COMPOSITION.md, following SCENERY_IMPACT_PLAN.md. Physical
iPhone/iPad Safari verification remains pending hardware testing.
