# Capitan Yosemite visual refinement

This art pass preserves Capitan Yosemite v1's 711.2 m road, 28 m climb, creek crest, hidden timber trail and all physical footprints. It builds on rules/compiler 18 and the second 15% car enlargement. It introduces no force, timing, input or route-validation changes.

- Granite uses rounded, weathered crowns, vertical mineral seams, varied warm/cool stone and lichen. The cliff mesh and attached seasonal cascades share one surface function. Every solid vertex remains inside its authored footprint and height.
- Layered cedar/ponderosa foliage replaces the simpler cones. There are 440 distant trees plus protected-grove plantings. Loose trees retain at least the established 24 m planning clearance plus their height allowance; grove crowns remain inside their parcels.
- The meadow has restrained dry-grass and forest-floor variation. Dirt has two worn paths and feathered shoulders, using the same meadow palette at the outer fringe. Road height and width remain authoritative. Absolute vertex-colour materials avoid double tinting on theme changes.
- The creek uses its real opening, depth-dependent colour, shoreline foam and flowing water. Waterfall spray and valley mist remain bounded and respect reduced motion.
- Ranger buildings have stone courses, timber siding, corner posts, window mullions, gables and standing-seam roofs. Picnic furniture and a bark-textured cedar with growth rings and broken limbs share one vertex-coloured detail mesh. Buildings and the obstacle stay inside their existing footprints/heights. The shortcut remains unmarked.

Repeated geometry stays batched, generated after the first frame where appropriate. All colours remain in `themes.ts`. No external artwork, sound or licensing dependency was added.

Matching desktop/phone comparisons, local gallery, recordings and verification logs are in `artifacts/yosemite-refinement/`. Physical iPhone/iPad Safari usability and performance remain pending hardware testing.

## Verification

- `pnpm typecheck`, `pnpm test` and the production build pass: **49 files / 665 unit tests**. The final timber/granite lighting checks also pass their focused rerun.
- `pnpm test:legacy` compares **24 exact handling fixtures** (all eight courses, one/two/four cars) against `1ac378f`; finish/lap times, contacts, drift, recovery and Hop counts match.
- Eight browser checks pass: two venue/effect stress cases each for LA nights and Yosemite, real phone drawing in both orientations, a complete Solo/CPU race plus Time Trial replay, four local players/tournament resume, and animated/reduced-motion water/mist. A ninth check verifies that switching presentation themes preserves native surface colours and route projection.
- Yosemite peak scene calls with simultaneous ground thrust/skids/dust are **44 Time Trial + replay / 100 four cars**, below 90/150. These are automated desktop measurements; they do not substitute for physical mobile testing.
- Matching desktop, phone landscape and portrait captures retain the same fixed framing and report no sampled road occlusion or browser errors.
- A complete production touch-driven race passes beneath `/RoadsterRace/`, with sound, no failed required asset requests and no browser errors. The final visual-only build receives a further production smoke check.
- The local review gallery includes matching comparisons, detailed inspection views and a silent 30-second recording of actual four-car gameplay. Inspection cameras are used only for review images; live gameplay framing is unchanged.

Physical iPhone/iPad Safari performance and comfort remain pending hardware testing. All eight circuit geometries, compatibility versions, audio roles and the five-second ghost-start behavior are preserved by this scenery pass.

The final lighting/veil revision passes four additional browser checks (Yosemite Time Trial/four-car effects budgets, palette preservation, animation/reduced motion), the three focused geometry checks, type checking and a fresh production build. Its production-path touch smoke passes with sound enabled, no required request failures and no browser errors. The gallery/30-second clip were refreshed from that revision.
