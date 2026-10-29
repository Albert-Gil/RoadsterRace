# Second car enlargement

The car and physical capsule grow another **15%** from the steel-wing release. This is multiplicative: **32.25% above the original dimensions**.

| Property | Previous | Current |
|---|---:|---:|
| Width | 2.53 m | 2.9095 m |
| Length | 5.98 m | 6.877 m |
| Vertical contact envelope | 1.2075 m | 1.388625 m |
| Racing artwork scale | 1.288 | 1.4812 |

`src/core/vehicle-size.ts` remains the shared source for every course, grid, barrier/support clearance and car contact. The artwork, replay ghost, shadow, surface fitting and mounted effects retain their common scale. Road width, circuit layouts, steel rear wing and handling forces are unchanged. Multi-car starting ghosting remains exactly **five fixed-clock seconds**; barriers and terrain remain active.

Rules and compiler advance to **18** to segregate records/replays and incompatible championships. Driver names, paints and lap preferences are preserved.

Larger footprints require more landing clearance. The explicit 20/30/42 m/s automatic-jump checks remain required. The Grand Canyon hidden-trail success fixture uses a slightly faster gesture to retain at least the authored 20 m/s crest approach; sufficiently slow approaches may still fail physically.

Verification logs and captures are in `artifacts/car-growth/`. Physical iPhone/iPad Safari verification remains pending hardware testing.

## Verification

- Production build and type checking pass; generated rules match the new versions.
- Six browser checks pass: steel model/paint/brakes, five-second ghost start with pause/restart, WebGPU fallback, slope-grounded tyres/shadows and simultaneous ground effects in Time Trial/four-car modes.
- Fifty-three focused clearance tests pass, covering all venue grids, height-aware contacts, six-lap Canyon/Santa Monica races and automatic launches at 20/30/42 m/s. The longer car now derives grid row spacing from its physical length rather than the old fixed six metres.
- The first focused run exposed the fixed grid spacing and two success fixtures whose shorter branch gestures approached below the authored safe jump speed. The grid is corrected; the success fixtures use faster gestures while the explicit slow-failure tests remain intact.
- The final local GitHub Pages-path smoke passes with no required failed requests or browser errors. A complete Solo Race/rematch also passes.
- The complete eight-round Solo Full Tour passes, including saved-round resume, scoring and stable CPU ownership.
- The full 663-case unit run initially passed 650 cases. The 13 failures exposed fixed grid assumptions and underspeed success fixtures. All affected files pass their reruns: 53 clearance cases, 45 grid/branch cases (37 first, then the remaining eight after anchor-preserving row allocation), and a final 31 grid/contact cases. Four identical edge anchors now use safe staggered rows and join within the five-second ghost period. Slow-jump failures remain covered.
