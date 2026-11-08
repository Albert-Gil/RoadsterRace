# LAX — portrait airport circuit

Owner-approved setting and sketch, 2026-11-07. Verified locally first. The owner
subsequently authorized commit and push on the same date; Pages publication remains
conditional on successful main-branch verification.

## Course

`lax`, track version **5**, **1,312.5 m**, 16 m reference road, dry-asphalt handling.
The owner's latest rectangular-layout request supersedes the earlier 770.1 m
square plan. The course is approximately 190 × 320 m including the gate and apron
boundaries, with longer public-street/runway legs and two deeper S-lobes on the
connecting apron. Continuous geometric runway straights are approximately 242 m,
over twice their former length. Apron bends use 20 m radii; the street returns
retain 16 m radii rather than stretching sampled corners into narrow shapes.

Portrait uses a fixed 68° elevated view aligned to the long axis. Measured on a
390×844 touch layout, the driving surface occupies **73.5% of usable height**, up
from **44.0%**. Median projected road width remains close: **28.0 CSS px** versus
29.2 before. Landscape retains a fixed 60° view with automatic initial orientation
selection. Drawing, preview and racing always share the same stationary projection.

The western runway travels north, linked taxiway bends cross the northern apron,
the eastern runway travels south, and two tight southern connectors enter and
leave the terminal horseshoe. There are exactly **two 44 m-wide runways**, one on
each side, replacing the four narrow strips. Each is 450 m long, extending beyond
the raced sector. The reference line uses the inboard part of that continuous
runway surface; there is no separate asphalt ribbon on top. Threshold bars, runway
numbers, centre dashes and edge stripes belong to the full-width runway.

The connecting apron retains its grey concrete. Continuous red/white concrete
barriers define both sides of the route, with 0.7 m flat white edge stripes and
full-length 0.95 m red/white kerbs. The barriers stand 1.35 m high and 0.8 m wide,
retaining at least 5.2 m between asphalt edge and their near face. Their authoritative
footprints form continuous ribbons, divided into small collision parcels that
share exact cross-sections. All artwork remains in the existing native batches.
The ordinary yellow taxi guide remains. Two parked airliners and two service-equipment
bays sit on alternate sides of the bends, with matching physical footprints and
at least five metres beyond the racing surface. Outer aircraft, maintenance
hangars and service vehicles move clear of the broad runways.

Both public streets visibly continue south beyond the racing turns. Curved concrete
closures follow the outside of the turn,
blocking the unused road while retaining runoff. They make physical contact
before a straight-ahead car loses road support. The closed street tails are
background scenery, not extra race progression or new shortcuts, and are excluded
from camera fitting. Their joins are cut around the existing bends rather than
stacking intersecting decks or walls through the racing surface.

Seven original terminal groups surround the longer horseshoe, with gate airliners, jet
bridges, covered entrances, skylights, baggage dollies and tow tractors. The infield
contains a Theme Building-inspired four-arch restaurant and a tall control tower.
The terminal halls are longer, with matching protected footprints. Parking,
planting, the northern garden and apron equipment follow the new dimensions.
Public streets stand at 3 m, with covered terminal entrances and matching raised
foundations. The two street/airfield transfers include physical launch crests.
Grounded slopes change height and pitch, not horizontal forces. Aircraft, service
equipment and taller structures remain clear of the road and complete start area.

This is a fictional racing interpretation with **seven** terminal groups requested
by the owner. It is not an exact operating-airport map. Fictional liveries and
markings are original; airport buildings are visual references, not affiliations.

## Jumps and shortcuts

- Two automatic crests move to the public-street/airfield transfers. The arrivals
  approach rises to a 6.2 m lip and receives onto the 3 m horseshoe; the opposite
  connector rises from 3 to 4.2 m before receiving onto the runway. Each final
  incline is 8 m long, with ordinary structural edge plates and ribs. Initial
  launch remains `6.5 + 0.09 × forward speed` m/s with 36 m/s² gravity. Normal
  approaches jump without Hop or Thrust. Receiving pavement is physically
  continuous: these are crests, not disguised water gaps, and very slow cars can
  descend their real grades.
- One hidden `center-way` elevated cross-connection cuts the horseshoe. Its 16 m
  lane at z=108 crosses ordinary service equipment 1.8 m above the 3 m deck. Only a compiled
  forward traversal exempts that named obstacle from the usual protected-area
  collision rule; a real manual Hop with full vehicle clearance is required.
- The open northern apron allows ordinary inside cuts through the linked taxiway
  bends. Terminal buildings, parking structures, planted parcels and departure
  guardrails remain protected. There are no shortcut signs, activation markings,
  preview badges or automatic Hop commands.

The normal reference line is hazard-free. Computer drivers use the main route,
shared handling and legal abilities; they receive no special landing assistance.
The full drawing touchdown area remains clear on the western straight. All
interactive phases use one fixed, height-aware whole-course camera.

## Integration and compatibility

Solo/CPU, local Multiplayer, Time Trial, 1–6 laps, Custom Tours and newly created
Full Tours discover LAX through the normal registry. Existing saved schedules are
not rewritten. Current rules are 20 (including the independently requested
post-recovery ability refill); compiler remains 20. Existing course geometry and
track versions are unchanged. The v5 track version invalidates only incompatible
LAX plans/records/tours through the existing compatibility checks. Compiler and
global physics remain at 20; no shared handling or ability tuning was changed.

LAX is initially an additional local venue. The original Grand Canyon and the
four-round Frontier Cup/Frontier Champion remain playable. The planned ten-venue
retirement/rename is recorded separately in CIRCUIT_REPLACEMENT_PLAN.md and is not
silently applied while the new venue is being reviewed. Historical medals, challenge
stamps, paints and preferences are preserved.

## Artwork and performance

All airport geometry is original procedural source in `src/presentation/lax.ts`.
Terminal/aircraft placements and physical obstacles are authored together in
`src/core/tracks/lax.ts`. Appearance, materials and fixed-camera elevation live in
`src/presentation/themes.ts` (`laxAppearance` and the airport venue roles).

Eight static, vertex-coloured batches share the existing renderer and shadow
cache. There are no individual runway lights, reflection cameras, extra render
passes, moving physical aircraft or external model downloads. Native geometry is
bounded by the existing 120,000-triangle ceiling. Preserve the 90 Time Trial/150
four-car scene draw-call limits; test effects while active.

## Visual references

- [Official LAX terminal map](https://www.flylax.com/lax-terminal-maps)
- [Official LAX airfield reference](https://www.flylax.com/sites/lax/files/documents/FS%20-%20Airfield%20Feb_2021.pdf)
- [Official Theme Building reference](https://www.flylax.com/sites/lax/files/documents/FS%20-%20Theme%20Building.pdf)
- [Terminal 2 roadway information: Center Way shortcut](https://www.flylax.com/terminals/terminal2)
- [Terminal 6 roadway information: terminal cross-connection](https://www.flylax.com/terminals/terminal6)

Physical iPhone/iPad Safari drawing comfort, sound and sustained performance remain
pending real hardware verification. Automated phone tests supplement that gate.

The first-version results remain in `LAX_TEST_REPORT.md`; compact-layout/GitHub
verification is in `LAX_V2_TEST_REPORT.md`. The two-runway, apron and street changes
are recorded in `LAX_V3_TEST_REPORT.md`. The stronger apron boundaries and visibility
checks are recorded in `LAX_V4_TEST_REPORT.md`. Rectangular-layout measurements and
verification are in `LAX_V5_TEST_REPORT.md`.
