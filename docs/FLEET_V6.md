# San Diego Fleet v6 — carrier lanes and naval equipment

This update retains the v5 ship artwork, full-grip working decks, aircraft, command islands, hulls and jump layout. It restores a clearly legible runway-style racing lane on the two main carriers and improves the smaller ships as naval vessels.

## Carrier lanes

- A darker 16 m reference lane, white edge stripes, restrained dashed centre marks and red/white inside-bend kerbs.
- All lane geometry is clipped to the actual carrier deck polygons, with explicit splits at automatic ramp bases and water crossings. Tops have upward-facing normals; microscopic degenerate clipping fragments are omitted.
- Floor, stripe and kerb geometry shares the existing deck, paint and equipment batches. No extra draw call, material pass, light or reflection camera is introduced.
- The complete supported deck still has asphalt grip. The lane is visual guidance, rather than a new off-road surface boundary.
- Smaller ship decks and manual Hop entries remain unmarked. Existing automatic ramps retain their clear physical steel wedges.

The source is `src/presentation/fleet-carrier-lane.ts`; ear-clipping helpers live in `fleet-deck-shapes.ts`. Palette and dimensions are centrally editable through `fleetLaneAppearance` in `themes.ts`.

## Detailed physical equipment

Fourteen additional vessel-owned obstacles use the same physical rectangles and heights as their artwork:

| Vessels | New equipment per ship |
|---|---|
| Two carriers | Aviation workshop, fuel bowser with hoses, mooring winch drums, ribbed jet-blast deflector |
| Two escorts | Fuel bowser and mooring winch |
| Two support vessels | Mooring winch |

Existing cranes, rescue vehicles, aircraft, launch cells and engine racks remain. New models include panel ribs, rolling doors, roof ventilation, tyres, tank bands, hose reels, cable turns, hydraulic braces and controls. All use existing native batches and semantic equipment roles. No external model pack is required.

Substantial props remain supported, do not overlap unrelated equipment and retain at least 2 m runoff outside the normal 16 m reference corridor. The full start touchdown rectangle, ramp mouths, landings and manual ship-route sequences stay clear.

## Smaller ships and flags

- Escort bridges are enlarged to 36 m above deck, with wider and longer foundations.
- Auxiliary bridge envelopes grow to 34 × 5.2 × 28 m. Their supported central deck beam increases from 28 to 31 m, retaining a slender hull, tapered ends, the full 16 m clear driving corridor and existing water gaps.
- Fine below-deck bows have a more pronounced narrowing; command cabins retain wraparound glazing, galleries, exhausts and radar.
- All six command structures carry original static U.S.-style naval ensigns, with stripes and a star canton. Flags use bounded prebuilt geometry, not cloth simulation. Existing radar/SAR animation still respects reduced motion.

Flag colours live in `fleetFlagAppearance`; original native flag geometry is in `fleet-flags.ts`. Naval reference sources and original artwork attribution remain documented in `FLEET_V5.md` and `ASSET_RIGHTS.md`.

## Compatibility and review

Fleet track version is 6 because equipment footprints and auxiliary support surfaces changed. Physics 19, compiler 20, all ability tuning, normal/alternate progression, jump impulses and the other nine track versions/geometry remain unchanged. The rail bake was explicitly regenerated for the authorized support-deck widening and checked against its authoring function.

Incompatible Fleet plans, records, replay ghosts and tournaments require fresh runs. Ordinary names, paints, lap settings and historical Collection achievements are preserved.

Local review: http://127.0.0.1:5184/artifacts/fleet-v6/index.html

Verification is recorded in `FLEET_V6_TEST_REPORT.md`. Physical iPhone/iPad Safari usability, performance and sound remain pending hardware testing. The owner authorized commit and push on 2026-11-07 after local verification. Publication remains gated by the existing verified-main GitHub Pages workflow.
