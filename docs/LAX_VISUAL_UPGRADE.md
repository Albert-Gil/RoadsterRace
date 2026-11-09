# LAX visual upgrade and turn layering fix

Owner request, 2026-11-08: the turns from the runways into the horseshoe showed asphalt and
the floor "in the same layer"; also improve LAX's graphics and visualization significantly.
Presentation only: no support, grip, barrier, camera, track-version or physics change.

## Layering fix (turns from runways to the horseshoe)

**Cause.** On the elevated, climbing U-turns the concrete deck shoulder was only 3 cm
below the asphalt. Those curved, sloping quads are not planar, and the 16 m asphalt and
28 m shoulder triangulate differently, so the shoulder crossed the asphalt in radial
slivers and jagged wedges. Both layers showed at once.

**Fix.**
- Deck shoulders and fascia tops now sit 12 cm below the asphalt
  (`laxMarkingAppearance.deckShoulderDrop`), like a curb.
- Apron slabs, slab joints/repairs and cargo slabs no longer extend under either runway
  (|x| < 74 m) or the low street ramps. This removed a flickering line across the runway
  at grazing angles.
- A material depth bias (zOffset) was tried and rejected: at grazing angles it hid
  runway markings and pulled buried slab joints through the runway.

## Scene upgrade (`airportScene()` in `src/presentation/lax.ts`, values `laxSceneAppearance`)

- **Mown grass** on 8 m cells with 16 m mower bands and gentle dry patches across the
  airfield. A lower, darker base continues to the horizon.
- **Runways:** touchdown-zone bar pairs at 90/120/150 m from each threshold, rubber
  deposits in the touchdown zones, and yellow blast-pad chevrons.
- **Landside:** white dashed lane dividers (±4 m) on the public streets and the elevated
  horseshoe.
- **Stands:** yellow lead-in lines and stand numbers from each gate to the taxi lane.
- **Rooftops:** solar arrays and rooftop plant on the cargo hangars; plant on the head
  terminal.
- **Car park:** two more rows of parked cars inside the protected central parcel, clear of
  the Theme Building and the tower.

All of it is flat or inside protected parcels and joins existing batches.

## Verification (cloud sandbox)

- Native LAX geometry: 77,492 triangles (ceiling 120,000; 60,082 before this upgrade).
- Medium draw calls with the drawing view: 17 (unchanged; limits 90/150).
- `tests/unit/lax.test.ts` and the related roadside/venue tests (52) pass.
- The browser framing scenarios in `tests/browser/lax.spec.ts` timed out in this sandbox:
  software WebGL is too slow for their real-input drawing. GitHub Actions runs the LAX
  smoke group on push.
- Before/after captures of both lower turns, the runway ends, the gates and the portrait
  overview were compared.
- Physical iPhone/iPad appearance and frame rate are pending.
