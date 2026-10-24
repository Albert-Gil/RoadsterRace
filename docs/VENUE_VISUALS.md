# Circuit visual detail pass

The five venues retain their road geometry, physical obstacles, hidden shortcuts and fixed phone framing. This is presentation work layered onto the completed Grand Canyon circuit.

## Changes

- Shared curved curb strips follow the bounded road edges, eliminating overlapping rectangular curb pieces at inside bends.
- Coastal Launch receives garage glazing, service lights and canopy seams; existing garden, pit and spectator architecture remains in its protected footprint.
- Launchsite receives ribbed hangar cladding, a service catwalk, detailed tank ladders and rocket panel joints.
- Golden Gate receives facade bands, window mullions, roof terraces, drainage and tower stiffeners.
- Santa Monica receives facade/roof details, pier pile collars, structural brackets and twin coaster rails with ties; timber has visible fasteners.
- Grand Canyon has its own packed-earth material instead of the shared asphalt image, world-aligned dirt grain, paired worn tire paths, irregular sediment shelves, mineral fragments and sparse cactus planting on protected mesa tops.
- Seeded procedural textures add mineral flecks and surface pores without downloaded artwork or large texture files.

## Editing and budgets

Palette and density controls remain in `src/presentation/themes.ts` (`venueDetail`, `canyonAppearance` and the existing biome palettes). Structural details use the venue's existing material roles and enter the existing static batching pass. The canyon mesa cap adds one material. Road/car collision data is untouched by this pass.

`src/presentation/venue-detail.ts` dresses already-supported buildings, towers and pier piles. `src/presentation/canyon.ts` contains the canyon-only presentation. Neither changes simulation state. Shortcuts retain neutral materials, with no signs, activation paint or preview badges.

`tests/browser/venue-detail.spec.ts` captures all five venues at desktop, landscape-phone and portrait-phone sizes. It checks page errors and the 90/150 draw-call limits during Hop and Thrust in Time Trial and four-car Solo Race. Local before/after images and samples are stored in ignored `artifacts/venue-detail/`; they are not shipped to players.

## Testing boundaries

### Desktop Chrome samples (2026-10-24)

All ten final venue checks pass (five circuits in Time Trial and four-car Solo Race), including page-error checks and overlapping Hop/Thrust effects. The four additional canyon browser checks pass: portrait/landscape drawing through both levels, complete crossing/landing race, and elevated replay/effects.

| Venue | One-car maximum draw calls | Four-car maximum draw calls |
|---|---:|---:|
| Coastal Launch | 75 | 117 |
| Launchsite | 65 | 107 |
| Golden Gate | 71 | 113 |
| Santa Monica | 70 | 112 |
| Grand Canyon | 45 | 89 |

These are bounded effect samples, not sustained frame-rate measurements. Legacy comparison passes all 12 original-course handling fixtures against pre-canyon HEAD. Type checking, generated-rules checks and the production build pass. See `artifacts/venue-final-browser.log`, `venue-browser.log`, `venue-legacy.log` and the before/after image folders for local evidence.

Automated mobile layouts supplement real hardware testing. Physical iPhone/iPad Safari performance and drawing comfort remain pending. The earlier intermittent unseeded Solo Full Tour timeout is documented in `GRAND_CANYON_VERIFICATION.md`; visual changes do not claim to resolve it.

Final release checks: all 335 unit tests across 23 files pass, as does the all-groups local production Pages smoke test (all five circuits, touch drawing, asset paths, phone layouts, shared abilities, Solo controls and tournament save/resume). Evidence: `artifacts/venue-unit-verified.log` and `artifacts/venue-pages.log`. The first restricted unit run was interrupted after delayed worker output; the completed unrestricted run is the reported result.
