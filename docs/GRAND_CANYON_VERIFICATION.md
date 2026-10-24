# Grand Canyon verification

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
