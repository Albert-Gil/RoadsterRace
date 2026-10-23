# Playability polish verification — 2026-10-23

## Automated checks

| Check | Result |
|---|---|
| Type checking | Pass |
| Unit tests | 224 pass in 17 files |
| Focused browser suite | 16 distinct scenarios pass |
| Final layout/render reruns | All 8 pass after portrait/water refinements |
| Cached grid readiness/touch rerun | Pass |
| Production build under /RoadsterRace/ | Pass |
| Complete local production smoke | Pass; zero page errors or failed required requests |

The 16-scenario suite completed Solo Race/rematch; Time Trial records, ghost reload and unavailable-storage fallback; a four-circuit solo Full Tour with resume/scoring; two-player racing; four simultaneous corner touches; both phone layouts; all four venue render budgets; paused tournament Home safeguard; audio/mute/theme handling; a complete Santa Monica jump race with airborne pause/retry; and a mixed-branch four-player race/rematch. Repeated subsets verify the final CSS/water refinement and cached preview; they are not counted as extra distinct scenarios.

The existing render-delay pause safeguard remains enabled. A high-density screenshot exercised it in the touch test; the test checks that specific interruption, resumes explicitly and verifies fresh independent input. No simulation clock is advanced by screenshot/test helpers.

Production smoke uses real browser touch events on all venues and Santa Monica's jump, checks private local drawing/readiness, Solo Race controls, saved tournament resume, fonts/icons/manifest, base-path/Home navigation, Graphite/portrait rotation and inspector removal. It verifies race startup; complete races are covered by the focused suite.

## Starting-grid regression

Eight parameterized tests cover every venue, four rotations, independent anchors at -6/-2/2/6 metres and repeated anchors at -7.5/-6/6/7.5 metres. They verify supported/barrier-clear non-overlap, nearby lateral placement, positive forward heading, successful gate passage, no launch recovery and no progress credited behind the stripe. Current unit suite also passes the fixed-step determinism, CPU completion/difficulty, contacts, recovery, route and frozen single-car handling checks.

## Visual and control evidence

- Live thrust pad: 56 x 56 CSS px. Phone checks verify no overlap with sound or the road centerline.
- Racing artwork and ghost scale: 1.12. Physical envelope: unchanged 2.2 x 5.2 m; race model remains 9,802 triangles.
- No visible floating tags during racing; pre-start numbers remain. Names/CPU labels remain in setup/results.
- Portrait HUD stays within the reserved 56 px top rail. Pause actions fit within the viewport; Home is at least 48 px high.
- Four-car venue snapshots with live human thrust: Coastal 116, Launchsite 106, Golden Gate 112, Santa Monica 112 draw calls. Mixed Santa Monica four-human race with all thrust controls exercised: maximum 133, below 150.
- One-car themed audio scene sample: 70 draw calls. Time Trial ghost scenario also passes the 90-call limit.
- Static rooftop, garden and spectator details share existing material batches; physical road/barrier/support geometry is unchanged.

Evidence lives in ignored `artifacts/polish/`, with matching phone captures, pause/racing views, logs and per-venue rendering reports. Physical iPhone/iPad Safari performance, finger comfort, heat and hosted cellular/Home Screen checks remain pending real-device testing. Desktop Chrome touch/viewport emulation is supplemental evidence.

## Versions and delivery

Rules are v9 for the changed grid placement/joining behavior. Compiler remains v9, and track versions remain Coastal 3, Launchsite 2, Golden Gate 3 and Santa Monica 2. Old-rule championships and replay records are not silently reused. Driver names, paint and lap preferences remain.

The public Pages workflow must pass every production verification group before deploying this main build. Live build ID, deployment and public-game checks are recorded with the delivery evidence.
