# Snowy Tahoe v5 — three snow jumps and grounded slope visuals

## Course changes

The existing summit cornice remains. Two smaller natural snow rolls are now on the
main course, with no constructed ramps, shortcut signs or manual activation:

| Takeoff | Course station | Snow rise | Vertical launch velocity | CPU reference pace |
|---|---:|---:|---|---:|
| Valley snow roll | 36 m | 1.1 m | 5.5 + 0.08 × forward speed | 21 m/s |
| Lakeside snow roll | 146 m | 0.9 m | 5.5 + 0.08 × forward speed | 21 m/s |
| Summit ski crest | 364 m | 0.8 m | 8 + 0.10 × forward speed | 24 m/s |

All three require a grounded forward crossing at 6 m/s or more. They use automatic
flight gravity of 36 m/s² and existing bounded route guidance. Manual Hop cannot
stack another impulse at a crest. Automatic snow jumps emit no downward cold gas.
The forestry Hop branch keeps its authored flat height independently of the nearby
main-road snow roll. Existing grip, speed caps, controls and abilities are unchanged.

Track version increases from 4 to **5**. Rules **16** and compiler **16** remain.
Existing Tahoe records/tours are incompatible through track-version checks; ordinary
names, paints and lap preferences survive. Other venues and their versions remain.

## Why the car looked like it floated

Pitch alone could align the car with the uphill direction but left the tyres above
or inside a sideways slope. Road skins also sit slightly above physical ground, and
a flat shadow could intersect the triangles of a curved road.

The grounded visual pose now fits a plane through the four actual tyre footprints
using the visible road triangles. It applies both pitch and roll, then absorbs small
remaining curvature differences with bounded per-wheel visual suspension (0.22 m).
The renderer uses interpolated position/heading, keeping body and road aligned
between fixed simulation steps. It does not move the physical car or change results.

A spatial index of the native road, shoulders and terrain supplies exact rendered
heights. One bounded contact-shadow mesh copies nearby surface triangles, so the
shadow conforms to the curved snow rather than cutting through it. Tire marks,
local dust, cold-gas attachments and cosmetic replay ghosts follow the same slope.
Airborne cars keep real simulated elevation; they are never snapped to the snow.

Subtle transverse groomer traces on the steep sections make gradients easier to
read. They use existing batched materials and add no markers for hidden shortcuts.
Tuning remains in `sceneTuning.vehicle` and `snowyTahoeAppearance` in themes.ts.

## Review

- Local game: http://127.0.0.1:5181/?circuit=snowy-tahoe
- Before/after, phone captures, detail view and actual gameplay: `artifacts/tahoe-grounded/`.
- The detailed uphill image uses a temporary inspection camera while the race is
  paused. The gameplay video uses the unchanged fixed whole-course camera.
- Test evidence is recorded in `TAHOE_GROUNDING_TEST_REPORT.md`.

Physical iPhone/iPad Safari comfort and performance remain pending hardware testing.
This update stays local and uncommitted; no push or deployment is included.
