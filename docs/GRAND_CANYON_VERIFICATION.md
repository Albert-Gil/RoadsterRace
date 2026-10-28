# Grand Canyon verification

## Sloping overpass and start-area revision — 2026-10-27

Current local build: Newport v6, Launchsite v9, Golden Gate v7, Santa Monica v3,
Grand Canyon v5 (595.0 m, 30 m opening), and LA nights v4. Physics remains v14 and
compiler v15. The user approved natural sloping overpass terrain and the venue-by-venue
infield-cut choices in `SHORTCUT_REVIEW.md`; all selected blockers are authored.
No commit, push or deployment.

The final cut-review verification is recorded in `SHORTCUT_REVIEW.md`. The table below
records the preceding overpass stage; its evidence remains valid for those specific checks.
The preceding cut-review revision passed all **517 unit tests / 36 files**, all **18** handling
regressions, the six expanded-touch-start cases, seven approved-cut browser cases, actual
canyon/bridge races, Ultra loading on all six venues, and a complete production Pages-path
touch race with sound and no page/asset failures. See `policy-*.log` in the same artifact folder.

| Check | Result |
|---|---|
| Type checking / production build | Pass; `overpass-pages-build.log` |
| Full unit suite | **507 tests / 35 files pass**, `final-unit.log`; the additional 30/42 m/s manual-Hop non-stacking pair also passes after adding the slower failure case |
| Existing handling | All **18** HEAD fixtures match after the sloped-face contact-query extension (`final-legacy.log`) |
| Automatic crest | All **9** combinations of 20/30/42 m/s and −20/0/+20° body yaw with modest sideways velocity land safely (`new-crest-fixtures.log`) |
| Natural geometry | 10 integration cases pass: open lower road, sloped physical faces, below-road toe clearance, continuously widening support, irregular dirt edges, bounded inside toes and matching rock-pile envelopes |
| Main browser suite | **10/10 pass**: canyon mouse drawing in both phone orientations, actual race, four-car effects/ghost persistence, and real Chrome touch input from the expanded start rectangle on all six venues in landscape and portrait (`final-browser.log`) |
| Broader bridge checks | Initial broad run had 11 passes and four test-assertion failures: three compared 11.000000000000002 px with exactly 11 px; one assumed equal-pace cars must always collide. Pixel checks now use subpixel tolerance and the two-car case uses a legal recharged rear-car thrust to exercise contact. All **4** corrected cases pass (`bridge-recheck.log`). The 3-/4-car and six-lap cases passed in the broad run. |
| Production Pages-path race | Full touch-drawn canyon race passes, sound enabled, no page errors or failed required requests (`overpass-pages-report.json`) |
| Rendering budget | Four-car effect samples peak at **87** scene draw calls; ready Time Trial ghost **43**. The car remains **9,898 triangles**. |
| Actual gameplay | The recorded one-lap race finishes in **32.30 s**, with no recoveries; `overpass-after/gameplay.mp4` is a silent browser capture |

Evidence is under `artifacts/canyon-integration/`, including the updated `index.html` and
matching `overpass-before/` / `overpass-after/` views. Screenshots with close inspection cameras
are labelled; interactive gameplay retains fixed whole-course framing. Physical iPhone/iPad
Safari input, sustained performance, rotation and audio verification remain pending.

## Natural hillsides revision — 2026-10-27

Grand Canyon v4 opens the main bends slightly (573.0 m total), replaces the shortcut wall with
irregular overlapping rock piles, and dresses the trail with broad-footed hillsides, weathered
rims and feathered dirt. Vehicle physics remain v14 and the compiler v15. This revision is
local and uncommitted; it has not been pushed or deployed.

| Check | Current result |
|---|---|
| Type checking / production build | Pass; final Pages-base build in `artifacts/canyon-integration/mountain-pages-build.log` |
| Unit coverage | Full 499-case run initially passed 496 and flagged two outdated geometry fixtures plus one load-related timeout. Corrected runoff/inside-cut fixtures pass; all 49 circuit cases pass on rerun, all 7 shortcut-line cases pass, and the unchanged Launchsite six-lap CPU regression passes separately in 13.25 s. The other 496 original assertions passed in the full run. |
| Final focused checks | 16 tests pass across canyon integration, inside cuts and generated rules (`mountain-focused.log`) |
| Geometry | Wide hill feet, bounded non-inverted inner toes, irregular rims, receiving support limits, open crossing/lower road, and rock-pile footprint/base/height checks pass |
| Existing handling | All 18 HEAD fixtures match (`artifacts/legacy-handling/report.json`); the intentionally changed canyon track is separately versioned |
| Final browser suite | 4/4 pass in 2.5 min: phone landscape/portrait drawing, full automatic-crossing race, four-car effects and persisted elevated Time Trial ghost |
| Production touch race | Complete Grand Canyon race passes under `/RoadsterRace/`, sound enabled, no page errors or failed required requests (`artifacts/pages/report.json`) |
| Draw calls | Maximum 87 across four-car ability-effect samples; 43 with a ready Time Trial ghost. High-tier preview is 36. Racing model remains 9,898 triangles. |
| Physical Safari | Pending; Chrome phone emulation supplements desktop testing only |

Final browser reruns used stable source files. An earlier browser attempt was interrupted by
a development-page reload during a visual edit; an earlier production attempt timed out
loading its cold development fixture server. Both final reruns pass. These were test-run
interruptions, not silently counted as successful races.

Matching captures and the local comparison page live in `artifacts/canyon-integration/`:
`mountain-before/`, `mountain-after/`, and `index.html`. The new set includes fixed overview
and phone views plus close inspection views of the hillsides and shortcut boulders. The
inspection camera is used only for screenshots; gameplay framing remains fixed.

The final actual-gameplay recording is `artifacts/grand-canyon/gameplay.webm`; its MP4 copy
is included with the comparison captures. Browser video contains no recorded audio track.

## Original elevated-circuit milestone

Original local milestone checks, 2026-10-24. That milestone did not commit, push or deploy. The subsequently authorized circuit-detail release is documented in `VENUE_VISUALS.md`. Browser evidence uses Windows Chrome with ANGLE D3D11; emulated touch is not physical Safari verification.

## Results

| Check | Result / evidence |
|---|---|
| Type checking | `pnpm typecheck` passes |
| Full unit suite | **335 tests / 23 files pass**; `artifacts/grand-canyon/unit-complete.log` |
| Generated rules | `pnpm docs:rules`; generated-rules unit check passes; physics 13, compiler 11, Grand Canyon 1 |
| Existing-course regression | All **12** one-/two-/four-car handling fixtures match HEAD `1241189`; `legacy-final.log` and `artifacts/legacy-handling/report.json` |
| Additional before/after flight fixtures | All **30** comparisons match: original-course races, Santa Monica 20/30/42 m/s and ±20° yaw, manual hops with/without thrust, and unsupported falling; `baseline-final.log`, `flight-comparison.json` |
| Grand Canyon focused browser cases | **4 pass**: landscape/portrait mouse drawing, recorded main-route race, four-car effects and persisted elevated lap ghost; `effects-browser.log` |
| Touch / fixed projection | Actual Chrome touch events at 844×390, 390×844, 1024×768 and 1440×900 pass. Drawing, preview and race projection agree. Original-course responsive cases also pass; `integration-browser.log` |
| Audio | All 20 supplied short recordings decode, music streams, and canyon ambient selection passes; `audio-final.log`. Audio files are unchanged |
| Five-round multiplayer tour | Completed with four humans, refresh/resume, scoring, final championship and rematch; `integration-browser.log` |
| Five-round Solo tour | Completed on Hard with recorded seed 92 and controller/difficulty resume; `solo-tour-retest.log` |
| Additional Grand Canyon CPU seeds | Hard races finish for seeds **1, 2, 3, 7, 42, 71, 92, 2026**, with rotated grids. One case recovers normally and then finishes; `ai-seeds.json` |
| Production build | `VITE_BASE_PATH=/RoadsterRace/ pnpm build` passes; output is local `dist/` |
| Production canyon race | Touch drawing and a complete race pass at the local `/RoadsterRace/` URL, sound enabled, no page errors/missing requests; `pages-canyon.log` |
| All production smoke groups | All five circuits, shortcut planning, phone layouts, Home/asset base paths, preferences, four-player controls, Solo controls and tournament save/resume pass; `pages-all.log`, `artifacts/pages/report.json` |

The full 30-case integration browser run initially had **29 passes and one unseeded Solo Full Tour timeout**. That original test did not retain its seed or enough unfinished-car state to identify the cause. The recorded-seed retest passes all five rounds, and additional canyon seeds pass, but those results do not prove the original intermittent stall is resolved. The harness now records the seed and attaches unfinished race details on failure. This remains a known test/race reliability concern for broader random-seed coverage; it is not silently classified as a pass.

## Gameplay coverage

- Original and compiled upper/lower section association, wrong-level samples, skipped/reverse laps, unsupported cuts and safe road edges.
- Mandatory automatic crossing at **20 / 30 / 42 m/s**, each with **−20° / 0° / +20° body yaw** and modest sideways momentum; safe landing on the 6 m receiving level.
- Six-lap main-route and correctly timed hidden-trail races; four-car six-lap races; Easy/Normal/Hard plans and shared legal commands.
- Deliberately slow approaches compile but fail physically and recover on the upper approach, with no water splash or forward reward.
- A manual hop just before the crest does not stack an automatic launch impulse. Its corridor is acquired before the nose leaves support.
- Missing the hidden trail's Hop produces barrier contact/recovery rather than passing through the rock. Protected cuts remain rejected.
- Height-separated bodies, overlapping-height contact and occupied recovery checks; deterministic motion and elevated recorded replays at 30 versus 144 rendering updates per second.
- Retry/rematch, pause/Home/fresh drawings, version incompatibility, private multiplayer handoffs, save/resume, unavailable replay storage and unchanged supplied audio behavior.

## Rendering and captures

The racing model remains **9,898 triangles**. Recorded canyon samples show **38 draw calls** during the one-car automatic flight, **45 with Time Trial ghost and live abilities**, and a **maximum of 89** across the four-car active-effect samples. These remain below the 90 / 150 targets. See `effects-budget.json` and `gameplay.json`. These sampled development-desktop results are not a sustained mobile performance certification.

Local captures:

- [Landscape drawing/preview](../artifacts/grand-canyon/preview-844.png)
- [Portrait drawing/preview](../artifacts/grand-canyon/preview-390.png)
- [Upper airborne crossing](../artifacts/grand-canyon/airborne-crossing.png)
- [Lower return](../artifacts/grand-canyon/lower-crossing.png)
- [Four-car effects](../artifacts/grand-canyon/four-car-effects.png)
- [Actual gameplay recording](../artifacts/grand-canyon/gameplay.mp4) — browser video, without an audio track; full source `gameplay.webm`

The screenshots are actual rendered game frames. The recorded Time Trial finishes in approximately 31.02 seconds without Hop or recovery. Evidence lives in ignored `artifacts/` and is intentionally not bundled into `dist/` or added to version control.

## Pending hardware verification

Physical iPhone/iPad Safari drawing comfort, rotation, sustained frame rate, thermal behavior, cold-gas/jump readability and sound verification remain pending. Test all five courses, especially both canyon crossing visits and a hop on the elevated trail. Publishing is handled by the subsequent authorized release, not these original local checks.
