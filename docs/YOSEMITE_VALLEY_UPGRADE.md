# Yosemite valley upgrade — 2026-10-29

Capitan Yosemite v2 adds a composed granite valley around the existing 711.2 m
packed-earth circuit. The road, its 28 m climb, creek jump, fallen-cedar Hop trail,
grip, timing and ability rules retain their previous definitions.

## Geology and landscape

- 44 additional authored rock formations, for 50 in total: western cathedral
  buttresses, southern walls, eastern arches/columns, a stepped northern ridge,
  rounded domes, smaller glacial erratics and talus groups. The forms are original
  and compressed for a miniature venue, rather than an exact geographic model.
- `core/tracks/yosemite-rocks.ts` owns their actual footprints, heights and terrain
  foundations. Every visible rock block stays within its parent collider. The
  new masses leave more than 34 m to the main/alternate centerlines.
- `yosemite-geology.ts` batches cliff skins, vertical joints, mineral variation,
  exfoliation shading, lichen and individual rockfall blocks into one mesh.
  The shared granite skin supports wall, dome, spire and low-outcrop profiles;
  the Half Dome-inspired landmark includes an asymmetric cut face.
- Eight original ponderosa/cedar templates replace stacked cone foliage. Tapered
  trunks, lateral branches and irregular crown clusters remain a single forest
  mesh. Loose trees leave the road and Hop trail clear; protected-grove planting
  is contained within its parcel.
- Ferns, sedges, wildflowers, gravel picnic pads, benches, noticeboards, drinking
  water/storage stations and ranger-building trim enrich the valley floor. Park
  props share the existing ranger mesh. These introduce no extra material groups.
- A meandering creek and its rendered water use the same derived bank geometry.
  Its original straight eight-metre race crossing is unchanged. Wet-bank colours
  and meadow patches are shared with the dirt fringe to avoid a bright road halo.
- The existing two falling-water curtains, pools, spray and reduced-motion
  behavior are retained. A broader cliff crown and shallower face recess reduce
  the oversized waterfall overhang while keeping the water visibly in free air.

The art direction follows the [National Park Service's geology description](https://www.nps.gov/yose/learn/nature/geology.htm/index.htm):
glacially carved valleys, sheer granite faces, domes, hanging waterfalls and
rockfall. No photographs, park maps, models or logos are copied into the game.

## Behavior and compatibility

The heightfield builder uses polygon bounding boxes to skip distant formations
before calculating exact foundation blends. The blend order and arithmetic
remain unchanged. A frozen v1 fingerprint covers 9,379 height/support samples
on a two-metre grid within 24 m of the main road and timber trail; v2 must match
it exactly. New solids and the creek's distant meanders still change the off-road
world, so the track advances to v2. Vehicle rules/compiler remain 18; all seven
other track versions remain unchanged. Old Yosemite records/tournaments are
incompatible; names, paints, laps and unchanged saved tour schedules are retained.

Scenery remains outside the fixed camera fit. Drawing, ready and racing retain
the same course framing; no zooming out to include distant cliffs. All eight
courses keep their existing controls, safe rectangles and racing-line widths.

## Verification

See `YOSEMITE_VALLEY_TEST_REPORT.md` for completed checks and captures. Physical
iPhone/iPad Safari comfort, performance and sound remain pending hardware testing.
