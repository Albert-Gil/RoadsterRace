# Larger venue signatures — 2026-11-05

The owner approved committing/pushing the verified scenery composition first.
That work is **58b3bf1**, and both GitHub workflows passed. This follow-up makes
the six requested venues more distinctive from the fixed gameplay camera.

## Changes

| Venue | Visible result | Gameplay/clearance boundary |
| --- | --- | --- |
| Santa Monica | Ferris-wheel diameter 18.6 → **32 m**, larger colourful upright cabins, stronger frames and a rearranged coaster/stall layout. The receiving jump deck has matching timber planks, fascia, joists and bracing. | Existing supported protected amusement parcel, 16 m driving widths and unchanged jump geometry. Landing artwork is at 0.11 m, below the contact shadow. No special shortcut markings. |
| Newport Island | **305.6 → 351.4 m** main lap: a uniform 15% enlargement of the existing course, protected parcels, island and shore dressing. | Exact original normalized shape and bend order; road remains 16 m, cars/handling/heights unchanged. Full-width gate and 30 m approach remain normal world dimensions. |
| Launchsite | Wider white booster centred on its pad, a stronger coloured gantry, large framed roof glazing and loading vehicles. | Existing assembly/launch-complex footprints; rocket-yard blockers and manual-Hop lanes stay unchanged. |
| Golden Gate | More colourful roofs, larger glazed dormers/chimneys, wider connected pedestrian paving and a stronger vermilion suspension-cable silhouette. | Existing building/land envelopes; no new bridge shoulder, road-width or support change. |
| Snowy Tahoe | Larger snow-laden firs, more visible chalet dormers and exposed slate eaves, stronger blue mountain relief and larger flakes/wisps from the existing weather pools. | Real terrain/road heights and all three takeoffs unchanged; full crowns and height-aware sight lines remain clear. |
| LA nights | Neutral-warm road/ground lighting, warmer varied frontages, thin lit rooflines, an art-deco picture-house marquee and baked amber spill. | Dark readable asphalt, existing protected buildings; no added live lights, reflection cameras or new bloom passes. |

The changes add no mode, ability or new shortcut. `venue-signatures.ts` contains
the native landmark geometry; `pier-ramp.ts` owns matching takeoff/landing
carpentry. Palettes and dimensions remain centrally editable in `themes.ts`.

## Compatibility and physics

Only **Newport's track version changes, 7 → 8**. Physics stays **18**, compiler
**18**, CPU controller **2**, and the other eight track versions remain unchanged.
Old Newport routes, records, ghosts and tours cannot silently migrate to the
longer course; ordinary names, paint and lap preferences remain intact.

`core/tracks/newport-layout.ts` contains the shared 1.15 enlargement constant.
The frozen `tests/fixtures/newport-v7-shape.json` fingerprint, recorded from
58b3bf1, checks every normalized centerline and protected-footprint point. The
road's width is independent of that scale. The original islands and loop are
retained rather than introducing extra turns.

The legacy comparison deliberately runs both engines on the **frozen HEAD track
geometry**. It verifies unchanged forces/timing logic; it does not claim the
new, longer Newport lap has the old finish time.

## Rendering constraints

Reuse existing vertex-colour/static material batches, cached static shadows,
landscape workers and graphics tiers. The wheel remains one dynamic batch with
twelve upright gondolas. Rooflines reuse the existing night emissive batch;
weather changes size, not particle counts. No new scene texture or model
download is required. Circuit cards remain 480×270 WebPs under 60 KB.

The whole-course camera remains fixed through drawing/preview/racing. Newport
necessarily reframes its larger physical course; the other venues retain their
existing road-based framing. Scenery must not force a zoom-out.

## Verification and review

Evidence is in `artifacts/venue-signatures/`: matching desktop, phone landscape
and portrait captures, geometry/handling tests, browser checks, paired frame
measurements and production smoke reports. Final results are recorded after
verification below.

### Automated results

- Type checking passed; all **851 tests in 66 unit files** passed.
- All **27 legacy handling fixtures** matched HEAD exactly on frozen HEAD
  geometry, including one-, two- and four-car runs on every circuit.
- The eight new geometry checks cover Newport's frozen shape/footprint hashes,
  six clean laps at two drawing paces, the wheel envelope, upward-facing timber
  landing geometry and containment of the new industrial/city props.
- All **16 touch/layout checks** passed, including unchanged projection through
  drawing, preview and racing on phone, tablet and desktop-sized touch layouts.
  The test previously applied a redundant CDP touch-emulation override: detaching
  that session disabled touch on desktop-sized contexts, changing the layout
  mid-test. It now uses the touch-enabled browser context throughout; projection
  tolerances and real touch drawing are unchanged. No game-camera fix was needed.
- The other **29 relevant browser checks** passed: all 18 active-effects budgets,
  graphics tiers/renderer/zoom, Santa Monica touch and jump races, four-car
  rematches, reduced motion, upright wheel cabins and exact cached shadows.

Active-effects maxima (scene calls, including shadows; Time Trial includes its
cosmetic replay ghost):

| Venue | Time Trial | Four cars |
| --- | ---: | ---: |
| Newport Island | 62 | 120 |
| Launchsite | 52 | 108 |
| Golden Gate | 56 | 112 |
| Santa Monica | 58 | 114 |
| Grand Canyon | 38 | 94 |
| LA nights | 63 | 119 |
| Snowy Tahoe | 47 | 103 |
| Capitan Yosemite | 45 | 101 |
| Grand Canyon: South Rim | 37 | 93 |

Every case remains below the **90 / 150** targets. These automated desktop
measurements do not establish physical iPhone performance.

The paired desktop frame-time run compared all six changed venues, Time Trial
with a visible ghost and four-car Solo Race, against pushed **58b3bf1**: **24
samples**, Medium, 844×390 CSS pixels, touch enabled at 2× device density, D3D11
WebGL 2, a two-second warm-up and 6.5-second measurement per sample. Every sample
remained in the racing phase and reported no page error. Both before and after
measured **16.7 ms median / 16.8 ms p95** (approximately the display's 60 Hz
limit). This shows no measurable regression in that workload, not spare GPU
capacity or a guaranteed mobile frame rate. Scene-call maxima in this ordinary
racing run were unchanged except Newport's four-car case, **112 → 113**, still
within budget; the separate table above forces all effects active.

Paired scene mesh and light counts were unchanged in every venue. The additions
reuse batches rather than adding objects to draw individually. Newport's larger
island also generates more terrain/scatter geometry (roughly 133k → 164k total
scene triangles in this sample); the other additions are about 0.5k–2.3k each.
The frame-time result should therefore not be described as zero extra GPU work.

### Review captures

The local gallery is
`http://127.0.0.1:5181/artifacts/venue-signatures/index.html`. It contains **18
before/after pairs**: six venues in desktop, phone landscape and phone portrait.
All **36 images** and the three layout buttons passed the gallery smoke check.
All **15 camera/projection comparisons** on the five unchanged courses are
exactly equal to the pushed build. Newport alone fits its larger physical loop;
the touch/layout suite separately verifies its fixed interactive framing.

The six regenerated 480×270 selection-card WebPs are **17.9–24.0 KB** each,
below the 60 KB limit. The images are native game captures, with no additional
runtime render pass or new external artwork.

### Production build

Both `pnpm build` configurations passed (ordinary root and
`VITE_BASE_PATH=/RoadsterRace/`). The final local `pnpm test:pages` passed all
nine circuits' real-touch preview/race-start checks, the three authored branch
checks, saved preferences, base-aware Home/assets, portrait/Graphite layout,
rotation proportions, manifest/icons, four-player readiness and abilities,
Hard Solo Race and tournament save/resume. It reported **zero page errors and
zero failed requests**, with no development inspector in production. This is a
production smoke, not a completed nine-round championship or hardware Safari
test. Its report is copied to `artifacts/venue-signatures/pages-report.json`.

The built distribution is 12.69 MB total (7.94 MB gzip estimate), including all
optional chunks; the entry/static imports are 692 KB gzip estimate. Size-report
figures exclude runtime-loaded shaders from the entry figure and do not measure
the browser's complete first-play transfer. See `size-report.txt` for details.

Final delivery includes the playable update, both successful build checks,
refreshed selection artwork, comparisons and this verification report. The owner
subsequently approved committing and pushing this verified follow-up, with
deployment through the existing main-branch GitHub Pages verification workflow.

Physical iPhone/iPad Safari comfort, sustained performance and audio remain
pending hardware testing.
