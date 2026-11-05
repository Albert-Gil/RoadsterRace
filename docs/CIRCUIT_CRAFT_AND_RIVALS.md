# Circuit craft and CPU rivals — 2026-11-04

Implements priorities 4 and 5 of NEXT_IMPROVEMENTS_PLAN.md, plus the requested
Santa Monica ramp restyling. Baseline: `55dfd3b`. Local implementation; no commit,
push or deployment is included in this request.

## Circuit artwork

The fixed phone gameplay view is the art target. Existing physical layouts,
elevations, 16 m roads, supported ground, approved shortcuts and protected
footprints remain authoritative. More physical elevation is optional in the brief;
this pass improves the existing elevated venues without adding new simulation
surfaces or changing the camera fit.

One opaque roadside batch now contains venue-specific native detail clusters:

| Venue | Added/refined close detail |
|---|---|
| Newport Island | Tropical planters, slatted garden furniture and larger grounded soft crowns |
| Launchsite | Low valve manifolds, vented cabinets, utility drums and service plinth equipment |
| Golden Gate | Street-cafe furniture, planted benches and a weathered masonry finish on existing facades |
| Santa Monica | Surfboard storage racks, beach loungers, lifted weathered timber takeoff and timber landing bulkhead |
| Grand Canyon | More legible mineral shelves on the existing sloped foundations, sediment detail and desert crowns |
| LA nights | Street-cafe/planter groups and selectively varied masonry, retaining the existing light/bloom groups |
| Snowy Tahoe | Cut-timber stacks, snow caps, rest-area furniture, larger soft verge detail and wind/grooming texture |
| Capitan Yosemite | Timber rest areas, cut wood, fern-shaped crowns, grounded litter/soil transitions and refined earth texture |

Furniture is generated in venue-furniture.ts, bounded by a 1.5 m local radius and
the available protected-parcel height. It replaces repeated generic objects;
substantial furniture never appears on drivable runoff. Roof hardware retains its
existing placement contract. Small verge plants and their soil/litter rosettes stay
supported and at least 2 m beyond every driving corridor, clear of the touchdown
rectangle, solids and hidden ability lanes.

Roadside nearest-point queries now use the existing exact segment index and cache
Hop branch distances. No physical geometry changes. Larger crowns retain seven
leaf forms, with different fern/desert proportions. Grounded colour rosettes use
the real surface height. Repeated geometry is uploaded once, not rebuilt per frame.

Original procedural material recipes improve asphalt patch/crack grain, packed
dirt, grass clumps and wind-shaped snow. A periodic brick/mortar tile is generated
on the existing worker for Golden Gate and selected LA facades. Existing shader
paths provide the detail in both GLSL and WGSL; no new postprocess or renderer is
introduced. Tile sizes and quality-tier behavior are unchanged.
Asphalt height/tone generation shares one noise evaluation; repeated furniture
templates are reused within each build. Both optimizations preserve identical
uploaded data. Parked LA cars use non-masonry facade colours, retaining existing
batches without inheriting brick texture from the building roles.

## Santa Monica takeoff

pier-ramp.ts replaces the plain dark ribbon with individual weathered timber
boards, staggered neutral wear, layered fascia, underside joists, a lip beam and
small end-grain hardware. It reuses the pier-timber material/static batch. The
landing's existing authoritative face also uses timber, integrating the two ends.

The top follows exactly the original 8 m / 1.2 m linear launch surface. Width stays
16 m; the unsupported 10 m opening remains empty. It adds no support, raised rail,
collision or launch impulse. Neutral carpentry is not a Hop sign, activation zone,
chevron or highlighted landing band. The existing trajectory and jump clearance
requirements remain unchanged.

The mesh carries the same position/normal/colour/UV attributes as the other pier
meshes, so material batching remains valid. Source geometry is below 1,000 triangles.

## CPU controller v2

- Independent plans have left/right offsets of 1.8 m with 0.22 m seeded variation,
  providing more room than the former 0.65 m offsets. All variations still pass
  the normal compiler's hazard, support and progression checks, with safe fallback.
- Following remains conservative near real contacts, but a safely separated car
  continuing to pull clear laterally no longer unnecessarily blocks the other lane.
- A passing Hop can be considered on elevated supported straights. Prediction
  follows the actual ballistic height to the ground and refuses unsupported paths,
  steep rising faces, protected barriers and occupied predicted landings. Starting
  ghosting, closing-speed, curvature and normal recharge restrictions remain.
- The immutable route's terrain grip is sampled once into a weakly held profile
  with at most 4 m spacing. Burst prediction uses the lower neighbouring grip and
  continues to read live curvature and traffic. Actual vehicle forces always use
  the simulation's real footprint/surface queries. The cache grants no extra grip.
- Decisions remain staggered on the existing 12-tick schedule. There is no rubber
  banding, extra speed, altered braking, guaranteed landing or hidden recovery.

### Compatibility

Human physics stays at 18, compiler at 18, and all eight track versions are
unchanged. Exact recorded human inputs must match baseline results.

`COMPUTER_VERSION = 2` versions CPU planning/controller behavior independently.
New Solo tournament saves include computerVersion; an old or missing version
cannot resume under different opponents. Multiplayer saves, Time Trial records,
ghosts and ordinary names/paints/lap preferences retain their current compatibility.
An incompatible-tour notice refers to the game version rather than falsely claiming
that the circuit geometry changed. Generated CURRENT_RULES.md records this split.

## Verification

`tools/benchmark-computers.mjs` loads either a Git ref or the working tree in an
isolated, renderer-free runtime. The initial comparison covers eight courses,
three difficulties and seeds 1/71/502, two laps with four physical cars and legal
human/CPU Thrust commands: 72 races / 216 CPU results per build. Every updated
scenario finishes, with zero CPU recoveries versus four in the baseline batch.
This is a bounded regression batch, not a claim that CPU failures are impossible.
Wall times collected under concurrent test load are not performance comparisons.

Evidence lives in artifacts/venue-rivals/: baseline/current CPU reports, geometry
counts, phone/desktop comparisons, ramp detail views, browser and unit logs,
legacy comparison, production reports and paired frame/loading measurements.
The final verification report records completed checks and any limitations.

Physical iPhone/iPad Safari performance, heat, sound and drawing comfort remain
pending hardware testing. Browser emulation is supplemental evidence.
