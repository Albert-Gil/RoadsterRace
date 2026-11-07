# Visual production, Collection and San Diego Fleet

Current local follow-up: [FLEET_V3.md](FLEET_V3.md) documents the 719.1 m staggered
formation, physical steel ramps and full-deck auxiliary driving surfaces.

The subsequent owner-requested **Fleet v2 ship rebuild** supersedes the original
Fleet geometry/heights below. See [FLEET_REBUILD.md](FLEET_REBUILD.md) for the current
714.8 m course, 24/22/16 m decks, naval artwork and compatibility requirements.

Approved implementation, based on 1bd5e8c. The owner authorized commit and push
on 2026-11-06. Pages publication remains gated by the verified-main workflow.
Unity migration, online accounts and paid assets/services are outside this milestone.

Delivery sequence: baseline → Golden Gate production kit → local medals/rewards
and curated cups → multi-deck fleet whitebox → fleet art/existing-venue polish →
integration, regression, browser, performance and production verification.

San Diego Fleet is course ten: two carriers, two destroyers, two moored support
vessels, 16 m lanes, 700–780 m main lap, stepped 12/10/8 m decks. Two normal
automatic crossings have 8 m approaches, 1.2 m lips, 10 m gaps and ≥60 m runout.
Two hidden alternate sectors require manual Hop onto a support ship, then an
automatic exit. Preserve all ability/handling constants. Global versions become
physics 19/compiler 20; existing nine track versions and geometry remain unchanged.

Collection is local per browser/app installation and shared by human seats:
Finish, Clean and Rival medals per venue; cosmetic-only finish/badge rewards;
Pacific, Frontier and Fleet cup presets. All original circuits and six paints stay
available. Historical earned rewards survive later rule changes. Clean incidents
come from fixed-step physics, never throttled sound events or render timing.

Appearance remains centralized; original source generators and offline catalog
checks preserve scale, forward axes, material roles and envelope containment.
Use existing static batches, shadows and quality-tier resolution limits. Preserve
90 TT-with-ghost / 150 four-car scene draw calls and <10k racing-car triangles.

Verification must include legacy handling, multi-crossing/support ownership,
20/30/42 m/s flights, hidden branch sequencing, safe recovery, all modes/cups,
idempotent human-only progression, storage failure, phone/tablet layouts, all
ten production smoke targets, captures and a gameplay recording. Physical iPhone
Safari comfort, sound and performance remain pending real-device testing.

## Work log

- Baseline: archived 1bd5e8c and isolated preview at port 5188; Golden Gate
  desktop/phone captures are in artifacts/fleet-production/before/.

## Fleet tuning and authoring

The main lap is **719.4 m**, inside the approved 700–780 m range. Each symmetric
support-vessel route saves **31.0 m**. The shortest route using both is approximately
657.4 m, leaving about **328.7 m** between manual-entry opportunities in either direction
around the lap, above the 315 m minimum. All racing corridors remain 16 m wide.

Named physical surfaces are carrier-a (12 m), carrier-b (10 m), destroyer-a/b and
support-a/b (8 m), plus continuous graded east/west transfers. Main crossing lip
height is 1.2 m after an 8 m approach; the water gap is 10 m, with at least 60 m
receiving straight. Support entries have 6 m gaps; returns use 8 m / 1.2 m metal
transfer approaches and 6 m gaps. Water-Hops and normal automatic crossings share
existing 34/72 manual impulse/gravity, 7 s recharge, 8 + 0.15×speed ramp launch and
36 m/s² automatic gravity. None of those global handling constants changed.

`core/decks.ts` resolves physical support, planning heights, footprint checks and
ordered crossing recognition. Guides interpolate elevation but never support cars.
Retained and smoothed crossing lists are intersected before approval; incomplete
entry/return pairs lose their water exemption. Compiled routes retain ordered
crossings and landing surface identity. Unexpected water remains a raced hazard.
Walkable hull tops are excluded from grounded wall queries, while airborne hull
sides retain real vertical bounds. Landing requires the full car on its intended deck.

Deck caps use ear clipping so concave destroyer ends never create a triangle across
unsupported water. Artwork follows named support polygons, with sloped hull sides,
regular deck plates, original parked aircraft, carrier islands, deck equipment,
fenders, finite edge rails and six batched radar heads. All driveable vessels remain
stationary. Reduced motion freezes the cosmetic scan/water motion. There are no
individual lights or reflection cameras, nor shortcut signs or activation paint.

## Production guide

`production-kit.ts` defines bounded architectural crowns and recessed facade bays.
Golden Gate receives coordinated mansard/dormer, paired-gable and terrace variants.
`production-finish.ts` applies a single baked contact, crown and mineral-strata colour
pass to existing static structures/trees/stone on all previous venues. It changes
vertex colours only; physical road, support, collider and terrain data stay untouched.
Existing offline CC0 prop packs, texture limits, quality tiers, static shadow caching
and lazily generated landscapes remain. `pnpm bake:production` exports twelve original
native pieces plus a material/triangle catalog for inspection, without a runtime
renderer dependency or downloaded asset pack.

The four reward paints reuse the current vehicle material system; no extra model,
shader pass or physics parameter is associated with an unlock. Collection artwork
uses native inline SVG. See `docs/PROGRESSION.md` for exact award rules.

Fleet deck-edge rails are authored by `core/tracks/fleet-rail-geometry.ts` and baked
into `fleet-rails.ts`, so loading the game does not scan every route segment.
`pnpm bake:production` verifies this correspondence. After an authorized deck/road
edit, `pnpm bake:production --write-rails` regenerates the data; review track-version
compatibility and rerun Fleet geometry/physics tests before release. The first
baked version was checked exactly equal to its computed predecessor.

Verification and local review links are in `docs/FLEET_PRODUCTION_TEST_REPORT.md`.
