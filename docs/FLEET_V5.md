# San Diego Fleet v5: Navy flight decks

This pass keeps the six stationary ships, four normal automatic jumps and two unmarked support-vessel Hop sequences. It replaces the painted circuit ribbon with a continuous dark non-skid driving surface over every supported vessel and ramp. The complete deck has asphalt grip; only equipment, rails and unsupported water interrupt it. The historical centreline remains the course/CPU reference.

The turns are framed by substantial physical fitments rather than painted road edges. Carrier command islands are now 48 m above deck, escort bridges 30 m and auxiliary command structures 18 m. Carrier islands have larger bridge/control decks, wraparound glazing, radar arrays, radomes, access galleries, exhaust trunks and original large island numbers. These are fictional racing dimensions and original stylized artwork.

New large fitments include radar-disc early-warning aircraft, tandem-rotor transports, additional parked fighters, salvage cranes, crash trucks, launcher arrays, tugs and engine/spares racks. Thirty-four vessel-owned protected equipment/structure parcels define the deck layout. Each visual reads its actual footprint and height from the core track. Command annexes join their islands; unrelated equipment stays separate. All normal 16 m route corridors retain at least 2 m equipment clearance, with narrow rail edges remaining their existing explicit exception. The gate, both Hop entries, automatic ramp mouths and receiving corridors stay clear.

Every supported deck has `racingSurface` enabled. The surface query may return uniform deck grip before centreline-distance work, preserving identical values while reducing CPU work. Global rules 19, compiler 20 and the nine other courses are unchanged. Fleet track version 5 rejects incompatible Fleet plans, records, ghosts and tours while preserving preferences and historical Collection progress.

Appearance remains centralized in `src/presentation/themes.ts`: `fleetAppearance`, `fleetCamera`, and the naval surface-finish entries. The naval camera uses 64° elevation on desktop, 68° on phone landscape and 56° in portrait, with authored fixed azimuths to keep larger towers readable without covering the route. Every interactive phase shares the same fixed projection. No new lights, reflection cameras, screen passes or per-prop meshes are added. The painted road batch is removed; ship floors and ramps share the existing deck batch. Parked transport rotor blades are stationary; existing radar/SAR motion retains reduced-motion handling.

## Research and original artwork

The reference study used public U.S. Navy material for non-skid deck coverage, offset command islands, bridge/control levels, radar equipment, parking arrangements, deck crews and handling vehicles:

- [U.S. Navy flight-deck awareness diagrams](https://www.airpac.navy.mil/Portals/53/Flight%20Deck%20Awareness%20V2.pdf): deck working areas, island, landing area, elevators and parked-aircraft zones. The search-indexed diagram was available; the direct PDF endpoint refused automated fetching.
- [USS Gerald R. Ford carrier photograph, U.S. Navy / DVIDS](https://www.dvidshub.net/image/9492786/carrier-air-wing-8-change-command): inspected photograph of the island silhouette, aircraft rows, deck/hull overhang and large radar forms.
- [USS Arleigh Burke flight operations, U.S. Navy / DVIDS](https://www.dvidshub.net/image/9727323/uss-arleigh-burke-conducts-flight-operations-mediterranean): inspected non-skid deck, perimeter protection, helicopter and crew references.
- [Navy CVN79 island description](https://www.navy.mil/DesktopModules/ArticleCS/Print.aspx?Article=2238035&ModuleId=4021&PortalId=1): navigation bridge, primary flight control and radar functions inform the layered command structures.
- [Navy destroyer class overview](https://www.surfpac.navy.mil/Warships/By-Class/US-Navy-Destroyer-Ship-Class-DDG/): general superstructure, aviation and launcher equipment vocabulary.

All runtime geometry is original procedural Roadster Race artwork. No photograph, insignia, extracted model or new external asset pack is bundled. Reference images remain in ignored local review artifacts.

## Review

Local comparison material is under `artifacts/fleet-v5/`. Verification is documented in `FLEET_V5_TEST_REPORT.md`. Physical iPhone/iPad Safari comfort, sound and performance remain pending hardware testing. This update stays local and uncommitted; no push or deployment is included.

## Editing the fleet artwork

| Change | Source | Validation |
|---|---|---|
| Deck colour, roughness, equipment palette | `src/presentation/themes.ts`: `fleetAppearance`, naval `surfaceFinishes` | Recheck pace-line contrast and phone views |
| Fixed overview angles | `fleetCamera` in the same file | `tests/browser/fleet-v5.spec.ts`; preserve drawing/preview/racing projection |
| Bridge/island silhouette, windows, galleries, radar fittings | `src/presentation/fleet-superstructure.ts` | Keep local geometry inside each authoritative footprint/height |
| Radar aircraft, transport helicopters, crane, crash truck, launch cells, spares | `src/presentation/fleet-equipment.ts` | Native geometry and moving-envelope tests; no per-prop meshes |
| Physical equipment placement/size or deck shape | `src/core/tracks/san-diego-fleet.ts` | Track-version review, support/runoff/clearance, all crossings and CPU regressions |
| Hulls, deck caps and ship batches | `fleet-model.ts`, `fleet.ts` | Bake, thumbnail, fixed-view and draw-call checks |

Run `pnpm bake:production` after native-geometry edits. It validates and exports source-built geometry to ignored review artifacts. The shipped scene still builds from the original generators; downloaded source photographs are not runtime assets. Glazing follows the actual sloped wall planes so it cannot disappear inside the command blocks. Four opaque static vessel batches replace the previous five; water and radar/SAR animation keep their existing bounded batches.
