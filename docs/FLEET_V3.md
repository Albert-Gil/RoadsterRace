# San Diego Fleet v3 — ramps and working decks

Current local revision, 2026-11-06. Baseline: `2709eff04d8c7bcc36fa05720b797764f3d06d40`.
This supersedes the Fleet v2 layout in FLEET_REBUILD.md. No commit, push or deployment
is included in this revision.

## Driving and layout

The 719.1 m main lap retains 16 m roads, two carriers, two escorts and two auxiliary
vessels. A shared staggered formation moves opposing carriers along their length and
inclines the escort axes; broad deck bends no longer form an orthogonal square.
All support, collision, drawing, gate, progress and vessel coordinates follow the
same transformation. Distances are recomputed, rather than reusing pre-edit lengths.
Carriers remain at 24/22 m; escorts and auxiliary working decks remain at 16 m.

Every automatic launch has a real, fully supported raised steel wedge, a complete
sloping top, reinforced sides, transverse metal seams and muted amber side strips.
The main ramps are 12.53 m long and rise 3 m; their open-water gaps are 10.44 m.
The auxiliary bow ramps are 13.59 m long, rise 3 m and face 6.79 m water openings.
The inclined ramp ends at the lip; there is no physical support across a gap.

Fleet-specific automatic launch is `8 + 0.08 * forward speed` m/s. The stronger
visible ramp slope does not change global Hop, Thrust, gravity or grounded handling.
The explicit launch tuning keeps 20/30/42 m/s approaches inside their receiving decks.
All four automatic launches require no Hop. There are no automatic launches at the
manual entries.

Each auxiliary vessel is now a slender, straight working ship aligned with its exit.
The entire supported deck has ordinary dry-road grip. No separate asphalt lane, road
edge lines, Hop sign, activation area or preview badge is drawn on these decks.
Their usable surface has no superstructure. Neutral perimeter protection and real
hull edges remain. Enter with manual Hop across open water, drive along the deck,
then let the raised bow ramp launch the car back to the named escort.

Alternatives save about 40 m each. The shortest approved combined route exceeds
630 m, retaining enough separation for the seven-second Hop recharge. Stable entry,
return and lane identities preserve Fleet Explorer and all existing modes. CPU
opponents retain the normal route.

## Physical consistency

- Sloping ramp decks are authored physical support surfaces, linked by `rampId`.
- `racingSurface` gives the complete auxiliary deck road grip, independently of its
  distance from a painted centerline. Other venues retain their existing surfaces.
- Skewed transfers use an explicit `gradeNormal` so height is continuous across the
  full width where a gangway meets the carrier.
- The crossing interval extends until the full vehicle footprint is on its named
  receiving deck. Support assessment uses that same ordered interval; an unrelated
  earlier water segment cannot borrow the exemption.
- Hull, rail, deck and prop artwork use authoritative physical polygons. Affine
  equipment placement follows both footprint axes; rotation alone is insufficient.
- Unauthorized water drawings remain accepted hazards, with existing penalized reset
  behavior. Missed off-line jumps return to the safe pre-crossing vessel.

Fleet becomes track 3. Physics remains 19 and compiler 20: global ability constants,
existing nine-course compilation/handling and their track versions are unchanged.
Fleet compatibility is scoped by the track version. Ordinary driver preferences and
historical achievements remain intact; old Fleet routes/tours cannot silently resume.

## Art and performance

Jets use closed sectioned fuselages, radomes, glazed cockpits, thick wings, folding
joints, canted twin tails, separate exhausts/intakes and landing gear. These are original
procedural assets, with no imported models or new licenses. Existing hull chines,
waterline taper, naval markings, island kits, helicopters and radar are retained.

Ramp colors, ribs and steel finishes live in `fleetAppearance` in themes.ts. All detail
remains in existing merged batches. No new materials per aircraft, lights, reflection
cameras, render passes or particle systems are introduced. The offline native bake
checks finite geometry and the 120,000-triangle venue limit; regenerate rails with
`pnpm bake:production --write-rails` after an authorized deck/layout change.

Physical iPhone/iPad Safari comfort and sustained performance remain pending hardware
verification. Automated touch emulation is supplemental evidence.

## Exact support-query optimization

Fleet wheel/landing probes first reject distant immutable deck bounding boxes, then
use the original polygon membership test for every candidate. A 1e-7 m broad-phase
slack preserves edge rounding; it is not additional physical support. Bounds are
cached by footprint identity. Do not mutate live track polygons after queries begin.
The full receiving-level selection order and ceiling tolerance remain unchanged.

The regression checks compare 60,000 harbor queries across five ceilings plus edge
probes against the original uncached polygon/height selection, with exact equality.
All 31 focused Fleet/challenge checks pass after this optimization, including physical
jump landings, six laps, missed manual Hop, CPU batches and full-deck grip.


## Publication authorization

After local verification, the owner requested commit and push on 2026-11-06.
Public testing updates remain gated by the existing verified-main Pages workflow;
physical iPhone/iPad Safari acceptance remains pending hardware testing.
