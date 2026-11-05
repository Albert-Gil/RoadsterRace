# Larger venue attractions

This follow-up implements the owner's five venue requests on top of `f7f193e`.
All assets are original native geometry with centrally editable appearance in
`src/presentation/themes.ts`. No model downloads, live scene lights or extra
post-processing passes are added.

| Venue | Changes |
| --- | --- |
| Launchsite | Two additional 28/32 m launch vehicles, plus the existing rocket/stages. One bounded batch of 48 soft billboards shows continuous white cryogenic boil-off from three vents; no flames. |
| Santa Monica | 48 m Ferris wheel (50% larger diameter), larger upright cabins; 58 m roller coaster with 26 m hills and a five-car train. Expanded supported amusement pier, perimeter fencing, entrance bollards, a visible timber walkway and entry portal. |
| Golden Gate | Red collision-matched bridge rails and thicker red vertical hangers every four metres, with deck brackets. Existing 16 m deck/road and main cable geometry remain intact. |
| Snowy Tahoe | Four full-size winter cars, three snowmobiles, a large tracked plow, substantial shaped powder piles and a pergola/bar/seating terrace in front of the lodge. Matching forest clearings prevent trees growing through props. |
| LA nights | Slender 40/42 m downtown towers inside the course and a 42–92 m outer skyline, stepped crowns and mixed lit/unlit windows. The inner towers leave the backlot road visible from the fixed cameras. Native static batches and the existing small bloom pass are reused. |

## Gameplay boundaries

Physics, compiler and CPU versions stay **18 / 18 / 2**. Santa Monica alone
changes track version **4 → 5**, because the amusement support/protected parcel
is larger and the existing walkway has a real opening through the return rail.
The centerline, gate, road width, driving heights and automatic jump are unchanged.
The pier remains protected; its pedestrian entrance is not a new driving shortcut.
Incompatible old Santa Monica records/tours are segregated/rejected through the
existing version checks; names, paint and lap preferences are retained.

Other eight course versions and geometry stay unchanged. New parked equipment
and launch vehicles remain within existing protected parcels. New architecture
stays on its original supported footprints. Grounded handling, abilities, timing
and fixed course framing are independent of this artwork. No scenery is added
to camera fitting.

## Rendering and verification

Rockets, equipment, fences, cables and architecture use existing material batches
and cached static shadows. The wheel/train retain their existing dynamic batches.
Vapor adds one capped, non-shadow-casting transparent mesh; reduced motion freezes
all decorative animation. Window rows are capped for the tall towers. The art
generators expose pure geometry for footprint/support/winding checks.

Evidence, comparisons, budgets and final results are recorded in
`artifacts/landmark-scale/`. Physical iPhone/iPad Safari testing remains pending.
This follow-up is local until a separate commit/push request.

### Checks completed

- `pnpm typecheck` passed. The full suite passed **855 tests in 67 files**;
  after the final skyline placement, the relevant geometry/generated-rules
  subset passed another 20 checks.
- All **27 legacy handling fixtures** matched HEAD exactly on identical frozen
  HEAD course geometry (all nine venues, one/two/four cars). This does not claim
  identical behavior for off-course strokes that enter the expanded pier.
- The original **32 relevant browser cases** passed, including 18 forced
  effects budgets, tiers/renderer, the three Santa Monica touch/jump/multiplayer
  cases, reduced motion, upright gondolas and exact cached shadows.
- The final **seven landmark browser cases** passed: bounded/frozen boil-off,
  fixed Santa Monica/LA phone projection and tower sight lines on desktop,
  tablet and both phone orientations. They supersede the earlier three
  landmark cases, for **36 distinct relevant cases** overall. Sight lines
  include the road edges, optional ramps and the backlot Hop road. Initial
  wide interior towers hid part of the backlot; narrower 40/42 m towers leave
  it clear without changing the camera.

Active-effects scene-call maxima remain below the 90 Time Trial / 150 four-car
targets, including shadows and a Time Trial ghost: Launchsite **53/109**, Santa
Monica **58/114**, Golden Gate **56/112**, Snowy Tahoe **48/104**, LA nights
**63/119**. The latter is the conservative pre-final-placement measurement;
the taller/wider initial towers were used for that stress run. No other course
exceeded **62/120** (Time Trial / four cars). Final paired frame measurements
and production-smoke results follow after completion.

The paired frame-time comparison covers all five venues, Time Trial with its
ghost and four-car Solo Race, against `f7f193e`: **20 samples**, Medium, 844×390
CSS pixels, touch enabled at 2× density, D3D11 WebGL 2. Each sample uses a
two-second warm-up and 6.5-second measurement. Every sample remained racing
and had no page errors; both builds measured **16.7 ms median / 16.8 ms p95**
(the display's approximately 60 Hz limit). This establishes no measurable
regression in that desktop workload, not a mobile-performance guarantee or
zero added GPU work. The geometry uses existing static/dynamic batches; vapor
adds one capped transparent batch. Real iPhone performance remains pending.

### Review images and build

The local gallery is `http://127.0.0.1:5181/artifacts/landmark-scale/index.html`:
**15 before/after pairs** across desktop, phone landscape and phone portrait.
All **30 images** and three layout buttons load without errors. Every paired
camera position, target and sampled road projection matches the pushed build
exactly; the larger attractions do not zoom the circuit out.

The five refreshed 480×270 selection cards are **18.9–26.5 KB**, below 60 KB.
Both the root build and `/RoadsterRace/` build passed, including type checking.
The gallery and all review artifacts remain local and are excluded from the
production bundle.

The final local Pages smoke passed **16 checks**: real-touch preview and race
start on all nine circuits, authored jump/Hop branches, saved preferences,
base-aware assets/Home, portrait/Graphite layout, rotation proportions,
manifest/icons, four-player readiness and independent abilities, Hard Solo Race
and tournament save/resume. It reported **zero page errors and zero failed
requests**, with no production inspector. Its report is saved as
`artifacts/landmark-scale/pages-report.json`. This smoke starts races rather
than completing every championship; the dedicated Santa Monica browser suite
separately completed actual solo and four-car jump races and rematches.

The owner subsequently approved committing and pushing this verified update.
Deployment uses the existing verified main-branch GitHub Pages workflow.
No promotional post is included.
