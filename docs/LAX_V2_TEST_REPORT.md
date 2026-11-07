# Compact LAX refinement — 2026-11-07

Baseline: `8100f1b` (LAX v1). The owner's annotated map requested closer terminals,
real runway racing sectors, public horseshoe streets and automatic street/airfield
jumps. This refinement changes LAX alone to track version 2; global rules/compiler
remain 20 and the original ten venues remain unchanged.

## Geometry and visual changes

- Course length: **770.1 m**, compared with 1,256.2 m (about 39% shorter).
- Driving envelope: approximately **180 × 168 m**, excluding distant runway ends
  and cargo scenery. Roads remain 16 m wide with bounded, rounded inside corners.
- Seven terminal groups sit close to the horseshoe, with gate aircraft and jet
  bridges between the streets and the runway sectors. The full start-touch zone
  remains clear. Terminal parcels, foundations and individual aircraft footprints
  move with their visible geometry.
- The two primary runways are the racing straights themselves, extended to 330 m
  so their ends continue outside the raced sectors. The far-end apron stays
  concrete, with an ordinary yellow taxi guide and batched blue edge studs.
- The public horseshoe is 3 m high. Automatic launch lips at the two transfers
  stand at 6.2 and 4.2 m, with 8 m final inclines and continuous physical receiving
  grades. These are automatic crests, not unsupported water gaps.
- Hidden Center Way equipment remains a real manual-Hop obstacle. No shortcut
  signs, activation paint or preview badge was added.
- Eight static native batches retain the existing sky, lighting, shadow cache and
  renderer. No new rendering pass, runtime dependency or external asset was added.

## GitHub test correction

The previous Pages run `42369857326` passed 14 of 15 verification groups. Its Solo
group failed because CPU-only WebGL repeatedly exceeded the real 500 ms frame-gap
safety guard, pausing before the real Hop key could activate. The logged states
were paused/READY, with no application exception or failed required request.

The Solo production smoke now uses the same 844 × 390 CSS layout at 0.5 render
density **only in CI**. It retains actual drawing/key input, the safety guard,
fixed-step physics, one-human ownership and both ability assertions. Separate
phone drawing/layout coverage retains its normal density; local mobile checks
also cover 2× density. No production quality setting or safety threshold changed.
Every verification group and the all-successful-main deployment gate remain
unchanged. No check or required deployment dependency was removed.

## Verification record

| Check | Result |
|---|---|
| Focused geometry/venue units | 144 passed across five files: road joins, protected runoff, all registered course pace plans, four-car six-lap runs, LAX launches/CPU/Hop, planting and native batches |
| Final start-area check | 17 LAX cases passed after moving ground vehicles 2 m outward; includes a new complete-touchdown-rectangle clearance test |
| Remaining unit suite | 861 passed in the other 76 files; combined coverage is 1,006 distinct tests in all 81 unit files |
| Unchanged-course handling | All 30 legacy fixtures (one/two/four cars across the original ten venues) exactly match `8100f1b` |
| LAX browser suite | 9 passed: real mouse/touch drawing, Solo, Time Trial with cosmetic ghost, hidden Hop and two-/four-human races |
| Input layouts | Desktop 1440×900, phone 844×390 / 390×844 at 2× density, tablet 1024×768 |
| Framing | Complete reference-road edges, hidden branch and full touchdown rectangle remain inside the safe course rectangle; same camera through planning/preview/racing |
| Automatic launch probes | Both crests at 20/30/42 m/s, ±20° body yaw and lateral velocity land without collision/recovery |
| Hidden Hop | Real button activation; completed race with zero contacts/recoveries; repeated laps also pass the simulation fixture |
| Solo results | Four cars finish; the captured main-route race has zero recoveries |
| Medium native geometry | 32,770 triangles in eight static batches, below the 120,000 ceiling |
| Medium four-car Hop/effects | 80 scene draw calls, below 150 |
| Medium Time Trial with ghost and abilities | 36 scene draw calls, below 90; sampled desktop median 13.3 ms / p95 13.5 ms over 180 frames |
| Software-rendered Solo production check | Passed with a real Hop activation, both ability controls, one human / three CPUs, no required request failures and no application errors |
| Type checking / generated rules | Passed; `pnpm docs:rules` regenerated the current LAX dimensions/version and takeoff positions |
| Root and Pages builds | Both final production builds passed |
| Final `/RoadsterRace/` smoke | Passed: actual touch drawing reaches preview, race starts, sound is enabled, and no required requests or application errors fail |

The final 2 m ground-equipment clearance adjustment was followed by another four
real-input drawing/framing passes across the same desktop/phone/tablet layouts.
One earlier cold-start development-fixture navigation timed out before loading
the game. The isolated final production check passed; no timeout/assertion or
gameplay safety guard was bypassed.

The local review gallery is `artifacts/lax-v2/index.html`, with matched phone
comparisons, desktop/portrait previews, an actual automatic-jump capture, manual
Hop capture, multiplayer results and a 30-second cut of the actual Solo recording.
These generated review artifacts are not part of the website/repository commit.
Frame timing is development-machine evidence, not an iPhone performance claim.

Physical iPhone/iPad Safari usability, sustained performance and sound verification
remain **pending real hardware testing**. Automated touch events are supplemental.
