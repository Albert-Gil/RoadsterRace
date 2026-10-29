# Snowy Tahoe — steep mountain upgrade, 2026-10-28

Historical v3 milestone. See `TAHOE_SKI_UPGRADE.md` for current v4 grip, summit
takeoff, snow cornice, scenery and weather.

Snowy Tahoe v3 replaces the subtle 12 m ridge with a **60 m summit**. The road
climbs for 100 m, briefly follows the ridge, and descends approximately 135 m back
to the valley. Peak grades are **90% uphill (42°)** and **67% downhill (34°)**.
These are deliberately exaggerated arcade slopes, with rounded grade transitions.

## Physical surface and drawing

This is real road elevation. Vehicles, off-road runoff, route geometry, landing
checks and shadows use the same authoritative core surface. Grounded body pitch
follows the surface in the car's actual direction. Snow grip, horizontal speed,
Thrust, Hop, braking and steering remain unchanged; slopes add no separate tire
forces. The 554.8 m horizontal course-distance convention remains unchanged.

Grounded car contacts compare height at their shared contact position on the hill,
so a high rear bumper and a low front bumper can meet on a steep grade. Airborne
cars retain height separation. CPU traffic recognition treats two grounded cars
on Tahoe's continuous hillside as the same driving level, even when their centres
have different elevations. Neither adjustment changes the six older courses.

The 16 m road, original horizontal layout, clear start gate and level forestry Hop
lane are retained. The surrounding mountain has a broad base, with a valley for
the lodge district and terrain-anchored lift foundations. Road skins are sampled
across their width as well as along them to avoid crossing the snow on steep bends.
The invisible substrate is recessed slightly beneath the overlying road skin to
prevent competing terrain triangles; it adds no support or collision change.

Drawing uses a bracketed terrain intersection instead of fixed-point iteration,
which can oscillate on steep slopes. Camera candidates are checked for terrain
occlusion before choosing the tightest whole-course fit. The same stationary fit
is retained throughout drawing, preview, countdown and racing. No live zoom/pan
or layer control is required. Snowfall spawns relative to local terrain altitude,
so it remains visible around the summit as well as the valley.

## Configuration and compatibility

- `TAHOE_SUMMIT_HEIGHT` and `tahoeProfile` in `src/core/tracks/tahoe-terrain.ts`
  define the physical road rise and its ascent/descent.
- Core terrain data remains independent of Babylon.js, weather and theme settings.
- Colours, weather and camera settings remain centrally editable in `themes.ts`.
- Snowy Tahoe advances from track version 2 to **3**. Existing Tahoe records/tours
  are incompatible; names, paints and ordinary preferences survive.
- Rules **15**, compiler **16**, and the other six venues' geometry/versions are
  retained. Exact old-venue regression is checked separately.

## Local review

Play `http://127.0.0.1:5181/?circuit=snowy-tahoe`.
The comparison gallery and actual gameplay recording are at
`http://127.0.0.1:5181/artifacts/tahoe-mountain/index.html`.
The earlier alpine v2 guide/report remain as historical evidence.

Physical iPhone/iPad Safari comfort and sustained performance remain pending
hardware testing. This update remains local; no commit, push or deployment was requested.
