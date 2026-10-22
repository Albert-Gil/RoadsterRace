# Verification and device handoff

Implementation date: October 20, 2026. This file distinguishes automated browser evidence from physical-device certification.

## Automated coverage

- Route closure/seam, shared pace mapping, incomplete/wholly reversed/distant/skipped-sector/interrupted drawing rejection.
- Two-lap finish timing, fresh-state retry, straight thrust benefit, cooldown/no queued activation, and physical corner drift.
- Same commands under 30/60/120 fps schedules and theme-independent core results.
- Fifty overlapping pointer cycles per corner plus cancellation cleanup.
- Browser mouse drawing, interrupted/early drawing, complete race, held Space behavior, pause/resume, result/retry, high-density landscape touch emulation, four simultaneous browser touch contacts, appearance changes, and missing optional logo fallback.
- Complete two-, three- and four-player simulations with shared timing, separate thrust/cooldowns, continuing after the first finish, ties, common-course position ranking and fresh rematches.
- Browser drawing-turn handoffs with hidden previous lines, readiness at each corner, a complete two-player race, three-player keyboard ownership, four simultaneous race contacts, dragging across other pads, cancellation, interrupted readiness, pause/resume and clearing all plans.
- Holding four ready contacts through countdown does not fire thrust; holding race contacts through a recharge does not fire again.
- Physical position/velocity/heading separation, steering recovery, sand traction/drag, immediate asphalt recovery, no grip-triggered asphalt slowdown, and no phantom laps far from the route.
- Filtering of geometric/timestamp jitter, preservation of deliberate pace differences, and bounded acceleration/braking jerk.
- A recorded fast gesture in the browser visibly leaves its line, slows on sand, recovers, and completes two laps; rendered position stays within one interpolation tick of physics.
- Backward corrections, radial spurs, local self-crossing loops and small finish overshoots are cleaned while preserving retained pace. Clean laps stay untouched; an extra whole lap is rejected.
- Expanded sand plans on straights, sweepers and near the hairpin, plus full two-lap races on wider routes. Mouse/touch browser previews retain the wide shape and report cleanup when needed.

## Recorded results — October 20, 2026

| Check | Result |
|---|---|
| Pinned installation | `pnpm install --frozen-lockfile` completed; package registry lockfile policy check passed with TLS verification enabled |
| Type check | `pnpm typecheck` passed |
| Core tests | `pnpm test`: 44 tests passed after the drawing-cleanup revision |
| Current focused browser regression | Seven selected scenarios passed: normal mouse/touch drawing, early-lift recovery, solo race/retry, two-player race/rematch, backward-detour/finish cleanup and a wide phone-drawn sand line. Six passed in the combined run; the cleanup comparison passed on focused rerun after its sampling-resolution assertion was corrected |
| Earlier full handling baseline | All 10 scenarios passed together before the cleanup revision, including physical drift/recovery and 50 overlapping browser touch cycles per diagnostic corner |
| Phone regression | The current high-density landscape drawing/overflow check and wider sand-route drawing/race startup passed. Four-player readiness, cancellation and independent pad hits remain covered by the earlier handling baseline |
| Production build | Type check and Vite production compilation passed |
| Built-game smoke check | Five checks passed: default/Graphite solo preview, unknown-preset fallback, and four-player race startup in both themes; no page errors and development API absent |
| Production sizes | Entire distribution: 3,814,115 bytes raw; estimated 967,337 bytes gzip. Entry plus static imports: 1,280,642 bytes raw; estimated 325,150 bytes gzip |
| Additional visual review | Cleaned-line preview, wide phone preview and sand driving inspected; earlier captures also cover drift/recovery, both themes and four-player results |
| Core handling fixtures | All five 2/4/7/14/24-second drawing fixtures completed both laps. The 14-second fixture stayed within 0.83 m of its line with no sand or drift; the two-second fixture slid into sand and recovered, finishing in 40.98 s |

Browser environment: Windows Google Chrome headless, desktop viewport 1440 × 900, and simulated phone viewport 844 × 390 with pixel ratio 3. Earlier baselines used ANGLE/SwiftShader. The current drawing revision was verified with Intel UHD Graphics through ANGLE/Direct3D 11 (`WEBGL_BACKEND=d3d11`). Touch scenarios dispatch browser touch contacts and exercise actual Pointer Events/capture. This remains desktop browser evidence, not physical Safari certification.

Software-rendering attempts became slow enough to hit wall-clock limits and the race interruption pause. A concurrent core test also exceeded its short timeout under that load; the isolated 44-test run passed. The verified Direct3D renderer advanced about 5.25 race seconds in 5.29 wall seconds. Browser recharge checks now wait against the simulation clock, and full-race waits allow slower rendering. No game physics or interruption protection was weakened to make the tests pass.

Screenshots include `artifacts/coastal-day.png`, `artifacts/graphite.png`, `artifacts/phone-preview.png`, `artifacts/race-results.png`, `artifacts/touch-diagnostics.png`, `artifacts/multiplayer-race.png`, `artifacts/multiplayer-results.png`, `artifacts/multiplayer-ready-phone.png`, `artifacts/multiplayer-four-phone.png`, `artifacts/multiplayer-four-results-phone.png`, `artifacts/drift-sand.png` and `artifacts/drift-recovered.png`. Additional phone review captures come from `node tools/inspect-multiplayer.mjs`. Production smoke details are in `artifacts/production-smoke.json`; reproduce against a built local preview on port 4175 with `node tools/production-smoke.mjs`. Handling fixtures and the fast physical trace are in `artifacts/physics-report.json` and `artifacts/drift-telemetry.json`; regenerate with `node tools/physics-report.mjs` on Node 24. Gzip sizes are estimates from local compression; actual transfer depends on host headers and runtime chunk loading.

The regression run exposed stale screen projection immediately after a camera-layout change. Layout updates now refresh the camera matrices synchronously. The focused drawing check and subsequent complete nine-scenario run passed. A canceled-touch still initially captured transient button paint; the final still waits for paint to settle and was visually inspected.

Cleanup screenshots are `artifacts/route-cleaned.png`, `artifacts/route-wide-phone.png` and `artifacts/route-wide-racing.png`. The extra drawing allowance is one road width per side, with unchanged physical asphalt/sand rules. See `docs/HANDLING.md` for the cleanup sequence, pace preservation, finish clipping and route version 3.

## Graphics and sound pass — October 20, 2026

- `pnpm typecheck`, all 44 core tests, and `pnpm build` passed after the visual/audio changes. Core track, route and simulation files were not changed in this pass.
- Thirteen distinct targeted browser scenarios passed across focused runs: live sound opt-in/pause/mute/theme behavior; recording decode and missing/invalid-file fallback; offline cue rendering; solo race/retry; landscape touch drawing; four-player corner ownership/interruption; 50 diagnostic cycles per corner; both themes; physical drift/sand/recovery; a complete two-player race/rematch; normal mouse drawing/logo fallback; backward cleanup; and wide sand drawing on a phone viewport.
- The new sound tests measure real audio output, not just button labels. Pause/mute output fell below RMS 0.0001. Valid WAV cue/loop fixtures decoded and produced sound; missing and corrupt recordings retained synthesis. The nine-second cue preview peaked at about 0.227 of full scale with audible cues and silent gaps. These are functional measurements, not a substitute for listening on the target device.
- A sampled solo race rendered 39 draw calls per frame and used five textures on the verified Intel/Direct3D backend. Tire trails have a fixed 128-quad allocation per car; scenery is merged by material. No extra package or downloaded media was added. These are desktop measurements, not mobile frame-rate or memory guarantees.
- Five final built-game smoke checks passed with sound enabled: both solo themes, unknown-theme fallback, and four-player race startup in both themes. No page errors; development helpers absent.
- Final distribution: 3,833,957 raw bytes / estimated 974,509 gzip. Entry plus static imports: 1,300,087 raw / estimated 332,056 gzip. The initial compressed code/CSS increased by approximately 6.9 KB relative to the previous pass; shader/model requests are additional.
- Current stills include `coastal-day.png`, `graphite.png`, `phone-preview.png`, `drift-sand.png` and `drift-recovered.png` under `artifacts/`. Additional race/audio inspection artifacts: `visuals-thrust.png`, `visuals-graphite-race.png`, `presentation-runtime.json`, `sound-preview.wav` and `sound-preview.json`. Some inspection captures precede the final decorative pavilion relocation; the two theme stills reflect the final layout.

The original art and sound remain replaceable. See `docs/SOUND_GUIDE.md` for the ElevenLabs export slots and briefs. Real-device Safari visuals, audio unlock/resume, sound balance, thermals and sustained performance remain pending.

## Perspective 3D art pass — October 21, 2026

| Check | Result |
|---|---|
| Type/core/build | `pnpm typecheck`, all 44 core tests, and the production build passed. Core track/route/physics code was not edited |
| Complete browser suite | All 16 scenarios passed together in 3.8 minutes on the verified Intel/Direct3D backend |
| Perspective acceptance | A fixed world-size segment is visibly larger near the camera than far away; a five-unit-high roof projects above the ground; sun shadow casters are present; drawing/preview/countdown retain the same projection |
| Input/racing regression | Mouse/touch laps, expanded sand plans, cleanup, physical drift/recovery, full solo/two-player races, three-player readiness, four-touch ownership and 50 diagnostic cycles passed |
| Audio regression | Actual output, pause/mute silence, recording decode/fallback and synthesized preview checks passed with the new scene |
| Built-game checks | Five passed: both solo themes, unknown-theme fallback, and four-player startup in both themes, with sound enabled, no page errors and no development API |
| Sampled solo render | 61 draw calls including the shadow pass, 11 textures, 21 shadow casters, one 1024² shadow map. This is a desktop snapshot rather than a mobile performance certification |
| Browser material assets | Two complete 768² WebP textures: 255,340 + 251,534 bytes. Generation prompts and master paths are recorded in `ART_DIRECTION.md` |
| Production footprint | 4,414,045 raw bytes / estimated 1,507,200 gzip for the full distribution. Entry plus static imports: 1,628,844 raw / estimated 440,656 gzip; the material images and runtime shaders are additional requests |

Desktop theme stills, the phone preview, drift/recovery and `artifacts/3d-circuit-preview.png` were visually inspected. Framing was tightened after the first perspective review, planted terrain changed to organic edges, repetitive procedural surface patterns were removed, and source images were optimized before the final full regression. The visual pass preserves the full planning allowance and a flat driving surface; raised scenery is decorative.

Next physical checks must include shadow quality, track/car readability, audio resume, heat and sustained frame rate on an actual iPhone/iPad. Current evidence is Windows Chrome and touch emulation; physical Safari remains pending.

## Physical iPhone/iPad check — PENDING

1. Start `pnpm dev` on the computer; connect the device to the same Wi-Fi.
2. Open the Network URL printed by Vite in Safari. This computer's Wi-Fi address at handoff was `http://192.168.1.8:5173/`; addresses can change. No public hosting is needed.
3. Record device model, exact iOS/iPadOS version, browser, build date, orientation, and any browser zoom/display setting.
4. Draw and complete several races. Compare gentle and fast drawing, then try thrust before a tight corner. Add an accidental backward correction and lift just beyond the finish; the preview should tidy both. Plan a wide line through sand and check that it retains its shape and real sand slowdown. Excess speed should carry the car off its line while steering recovers; asphalt should restore grip without a timed slowdown.
5. Hold the thrust pad through a full recharge: there must be no second activation without a new tap.
6. Switch apps, return and resume. Rotate while drawing/racing. No ghost touches or lost race state should occur.
7. In Touch test, use four fingers together. Release in different orders, slide outside a pad, and repeat. Each activation belongs to its original corner.
8. On iPad, choose Race with friends and play real two-, three- and four-player races. Check handoffs, hidden previous lines, readiness, independent thrust, first finish while others keep racing, results, ties and rematch. Evaluate reach and finger occlusion with people around the device.
9. Try both appearance presets. Check controls around the notch/home indicator and with ordinary browser chrome.
10. Run repeated races for 20 minutes and note heat, stalls, unwanted reloads or graphics loss.
11. Enable sound with the speaker button. Check countdown, speed-dependent drive tone, asphalt slip, sandy scrub, thrust, recharge, final lap and finish. Pause, mute, switch apps, resume and retry; no driving loop or queued cue should remain after interruption. Check phone speakers/headphones and multiplayer loudness. Repeat after adding recorded sound assets.

Template: model / OS / Safari version / orientation / preset / start-to-ready time / input issues / repeated-race duration / result / recording reference.

## Known limits

- Physical Safari performance, visible tap latency, thermal behavior, OS gestures and four-person comfort are not certified by desktop touch emulation.
- Cars have no car-to-car contact response. Identical routes can overlap; numbered labels identify players. Identical plans/commands can produce shared places. Hop and the challenge mode are later work.
- Drift uses an arcade momentum/steering model on flat ground. The ordered route proximity gates prevent virtual lap completion; authored solid barriers have contact response; unprotected distant scenery, water boundaries and vehicle-to-vehicle forces remain outside the physical model. See `docs/HANDLING.md` for the model and tuning.
- Best time lasts for the current page session. There is no global or persistent ranking.
- Art is deliberately provisional. Optional imported models display through a generic adapter; model-specific animation requires its own adapter work.
- Shader/model chunks are loaded on demand. A distribution gzip estimate is not a measured network transfer or mobile startup percentile.
- Production builds omit the development test API and T shortcut; URL preset selection works in both builds.

## Recommended next milestone

Run the physical Safari checklist and tune drawing pace with real fingers and new players. Use actual multiplayer races to refine corner sizes, handoffs, readiness and feedback. Review the upgraded coast and sound mix on the real screen/speakers. Replace the first audio batch through the documented sound roles when recordings are available. Add hop only after route/thrust play and the corner-control layout are comfortable. See `docs/MULTIPLAYER.md` for the implemented milestone and follow-up tasks.

## Visual and handling upgrade — October 21, 2026

The current build supersedes the earlier decorative-only notes above. Inner islands, gantry support and grandstand are solid; cars remain ghosts only with respect to other cars. The track is version 2, compiler version 4 and physics version 3.

- Type checking, all **53 unit tests**, and the production build pass. Tests include capsule clearance, thin-wall high-speed sweeps, endpoint/glancing/repeated contacts, recovery without forward credit/refill, route/track version matching and the racing model's 10,000-triangle budget.
- The complete **19-scenario browser suite passed together in 7.3 minutes**. It includes full solo/two/three/four-player races, actual mouse/touch strokes, 50 overlapping diagnostic cycles per corner, simultaneous race presses/cancellation/interruption, rematch, cleanup/wide sand plans, physical drift, audio and both themes. The new barrier-crossing stroke is rejected visibly; a mixed-pace stroke retains both slow red and fast green sections.
- Racing model: 9,802 triangles. Showcase: 43,360 triangles. Meshes and common materials are shared; the detailed showcase is not rendered during races. Static scenery is merged; car shadow casters use body/aero silhouettes. Four-player sample peaked at **133 draw calls**, below the 150 target.
- Full distribution: 4,854,093 raw bytes, approximately 1,701,602 gzip. Entry/static imports: 1,730,324 raw, approximately 469,232 gzip. Fonts, images and runtime shader requests are additional to the entry figure; compression estimates are not measured network transfers.

The first verification attempt was interrupted by a development reload during one race, and caught identical heading fonts in the two presets. Both were corrected and the complete suite passed on stable code. No interruption protection or physics behavior was weakened.

Evidence: `artifacts/overhaul/` (pace preview, blocked line, tablet/desktop multiplayer races and results); matching earlier views in `artifacts/before-overhaul/`. The browser suite remains Windows Chrome/ANGLE Direct3D 11 evidence. Real iPhone/iPad Safari, sustained 30 fps mobile, thermal behavior and four-person reach remain **PENDING**. A subsequent 31-second solo capture averaged approximately 75 fps on NVIDIA GeForce RTX 3060 Laptop GPU / ANGLE D3D11 at 1280 × 720. This meets the desktop target for that measured scenario; initial warmup and earlier host-load samples were slower. Sustained four-player and other-device fps still need broader measurement. Draw-call budgets alone are not an fps guarantee.

The next milestone is physical-device playtesting and performance tuning from those measurements, followed by the first replaceable ElevenLabs recording batch. Hop, public hosting, promotion and car-to-car collision remain separate work.



Final polish checks: four additional focused browser scenarios passed (four-player completion with lap splits, phone touch drawing, two presentation presets, and the extended audio cue preview including collision/recovery). Missing bundled fonts and optional WebP textures were deliberately returned as 404s; the game still opened and reached a valid preview, with zero page exceptions. The packaged build passed five smoke checks: both solo themes, unknown-theme fallback, and four-player starts in both themes, with sound enabled and no development helper exposed.

`tools/capture-overhaul.mjs` records the final screen/model views and fallback check. `tools/record-overhaul.mjs` creates `artifacts/overhaul/gameplay-30s.mp4`: 30 seconds of real local browser gameplay, encoded from timestamped browser frames, **silent** (no recorded audio). The game rendered around 75 fps in the recording run; capture samples roughly 15 unique frames/s into a 30 fps video. It is a review clip, not a published promotional trailer. `recording-report.json` retains renderer, sampling and error evidence.

## Race settings and circuit planning — October 21, 2026

- `pnpm typecheck`, all **68 unit tests** and `pnpm build` passed on the completed source. New core coverage exercises every lap count from one to six, invalid values, six-lap command determinism at 30/60/120 rendering rates, split totals, common course progress and ties.
- The complete **22-scenario browser suite passed together in 7.6 minutes**. This includes a real one-lap solo finish, a complete six-lap local race with custom names/paints and rematch, separate session bests for different lengths, preference persistence, text-safe punctuation and keyboard editing, plus all existing drift, route/barrier, touch, audio and theme regressions.
- Setup was inspected on desktop 1440×900, phone landscape 844×390, phone portrait 390×844 and tablet 1024×768. Paint targets meet the 44 px minimum, the footer/start action remains reachable while driver cards scroll, and the page does not overflow those tested viewports. These are automated desktop layouts, not physical-device certification.
- Explanatory drift pop-ups and post-race coaching are absent. Physical drift/sand recovery and their sound/effects remain. The line is now 5 CSS px with a 7 px outline in both presets.
- Names/lap/paint choices persist locally. Core physics has no name/color dependency; bests are partitioned by circuit/version and lap count. Physics rules are version 4; the physical course and route-compiler versions are unchanged.
- Current distribution: 4,865,123 raw bytes / approximately 1,704,345 gzip. Entry/static imports: 1,741,354 raw / approximately 471,969 gzip. Estimates exclude additional font/image/shader requests from the entry figure.

Screenshots and the production capture report are in `artifacts/race-settings/`. The implementation summary is `docs/RACE_SETTINGS_UPDATE.md`. The next-circuit briefs, technical dependencies and acceptance gates are in `docs/CIRCUIT_EXPANSION_PLAN.md`; only Coastal Launch is playable now. Physical Safari, sustained mobile performance and real four-person comfort remain pending.

Production handoff: all five packaged-game smoke checks passed (both solo presets, unknown-preset fallback and four-player starts in both presets). A separate production capture selected six laps, saved custom names/paints, reached racing with HUD `1 / 6`, reported no page errors and confirmed the development API was absent. See `artifacts/race-settings/presentation-report.json` and `artifacts/production-smoke.json`. Clean review views include `garage-desktop.png`, `garage-local-desktop.png`, `setup-844x390.png`, `setup-390x844.png`, `wider-line.png` and `six-lap-race.png` under `artifacts/race-settings/`.

## Circuit selection and Orbital Launchyard — October 21, 2026

- Type checking, all **86 unit tests** and the production build passed. Added coverage validates both registered courses, unknown-ID and old-preference fallback, five distinct pace profiles per layout, wide outer-sand routes, obstacle runoff, foreign-route rejection and four cars completing six laps per course.
- The complete **27-scenario browser suite passed together in 10.4 minutes** before final setup-label polish. New scenarios cover repeated course switching with two live scenes, discarded old plans, retained profiles/distance, correctly scoped bests, real phone touch strokes rejecting protected cuts, a completed wide-sand Orbital lap and full Orbital races/rematches with two, three and four players. Existing Coastal drawing, drift, sound, 50-cycle touch diagnostics, themes and six-lap regressions also passed.
- The Orbital centerline is approximately **449.77 m**, with a normal compiled practice line of about **447.69 m**. This is a first playable layout and basic scenery pass; the original planning target was 360–420 m, to be revisited through balancing without sacrificing runoff.
- Final sampled solo preview: **60 draw calls**, 17 shadow casters, 11 textures and the same 9,802-triangle racing car / 43,360-triangle showcase. Sampled two-/three-/four-car racing peaked at **79 / 95 / 111 draw calls**. These measurements include the sampled shadow pass and stay within the 90/150 budgets; they are not a sustained mobile benchmark.
- The same physical road/sand/drift/thrust rules apply to both courses. Course switching reuses one WebGL engine and disposes prior world/showcase scenes. Biome colors/lighting are separate from the interface theme and selected paint.
- Current distribution: **4,875,545 raw bytes / approximately 1,707,467 gzip**. Entry and static imports: **1,751,776 raw / approximately 475,082 gzip**. The new layout and procedural scenery require no downloaded model or additional raster art. Runtime shader/image/font requests remain separate from the entry estimate.

Review images and browser reports are in `artifacts/orbital/`; implementation details are in `docs/ORBITAL_MILESTONE.md`. Physical iPhone/iPad Safari, sustained mobile performance, real four-person comfort and final course balance remain pending. No public hosting or promotional posts were created.

Final handoff: the two focused course-switching and responsive-garage browser checks passed after the setup-header correction. Fresh desktop and portrait captures confirm the selected player count and reachable setup controls. All **10 packaged-game smoke checks** passed across both courses, both themes, unknown-setting fallbacks, solo and four-player starts, with sound enabled, no page exceptions and no development helper exposed. See `artifacts/production-smoke.json` and `artifacts/orbital/visual-report.json`.

## Golden Gate, tournaments and physical multiplayer — October 21, 2026

- Type checking, all **113 unit tests** and the production build passed. Added coverage includes championship points/ties/duplicate scoring/save validation, both legacy and friendly Launchsite names, Golden Gate clearance/routes, physical grids, head-on/rear/glancing/swept car contact, swapped driver order, wall shunts, occupied recovery, previous-cap-exceeding thrust speed and reduced off-road drag. Existing render-rate determinism and six-lap fixtures run with the new physical contacts.
- The complete **30-scenario browser run** finished in 13.0 minutes with **29 passing** and one newly added scrape-audibility assertion failing. The scrape gain was corrected; **all five focused final scenarios passed in 2.4 minutes**: live sound/pause/mute/theme behavior, audible/unclipped cue preview, a four-player three-circuit tournament with mid-tour and completed-tour reload/resume, custom 2–12-round scheduling/save/exit/discard, and Golden Gate solo/responsive layouts. Thus every scenario has passing evidence; the entire suite was not unnecessarily repeated after the localized audio/showcase/scenery polish.
- The full browser run also passed the real touch/mouse route fixtures, drift/sand recovery, barrier rejection, one- and six-lap races, two-/three-/four-player readiness/thrust/rematches, simultaneous phone touches and 50-cycle ownership/cancellation diagnostics. Physical Safari is still pending.
- Golden Gate's centerline is approximately **415.48 m** and the normal compiled practice line about **414 m**. Its flat bridge deck preserves the full planning/runoff corridor above a lowered visual inlet. Course geometry, barriers and scene presentation remain separate.
- `artifacts/golden-gate/tournament-report.json` records actual complete races and nonzero pair-impact counts for all three rounds. The final sampled Golden Gate four-car thrust view used **137 draw calls**, 22 shadow casters and 18 textures, with bounded vapor pools and two engine scenes.
- `tools/record-golden-gate.mjs` captured **30 seconds of actual local four-car browser gameplay** in `artifacts/golden-gate/gameplay-30s.mp4`. The recording run sampled 108 graphics states, peaked at **139 draw calls**, averaged about **74.95 renderer fps**, and reported zero page errors. It captured 461 unique browser frames over roughly 31 seconds and encoded a 30 fps/30 s review clip. **The clip is silent**; `artifacts/sound-preview.wav` separately contains the actual synthesized cue palette, including car impact and scrape. This is a local review recording, not a published promotional trailer.
- Current distribution: **4,907,701 raw bytes / approximately 1,716,477 gzip**. Entry/static imports: **1,783,932 raw / approximately 484,091 gzip**. Runtime-loaded shaders, image and font requests remain separate from the entry estimate.

Implementation and controls are documented in `GOLDEN_GATE_TOURNAMENT.md`; captures are in `artifacts/golden-gate/`. Physical iPhone/iPad Safari, sustained mobile thermals/frame rate, real four-person reach and final art/handling balance remain pending. No hosting, external posts, online accounts, hop or network multiplayer were added.


Final packaged handoff: all **15 production circuit/theme/alias/fallback checks** passed, with sound enabled and no development helper or page exceptions. The new completed-championship fixture exposed an action below the visible portrait panel; tournament results now use a bounded flex panel with independently scrolling tables and persistent actions. After that localized CSS correction, type checking, all 113 unit tests and the production build passed again. All **four production tournament checks** passed: completed-save resume and reachable 44+ px actions at 390×844, 844×390 and 1024×768, plus playable drawing when browser storage throws. These completed-save cases are explicit fixtures, not claims of additional raced championships. The desktop championship capture was refreshed by resuming the actual recorded Full Tour results.

Reports: `artifacts/production-smoke.json`, `artifacts/golden-gate/production-tournament.json`, `artifacts/golden-gate/tournament-report.json`, `artifacts/golden-gate/recording-report.json` and `artifacts/sound-preview.json`. The last cue preview has audible car-impact/scrape cues and no clipping; the gameplay clip remains silent. Real mobile/Safari verification remains pending.

## Golden Gate city v2 and full-width drawing — October 21, 2026

- Final source passes `pnpm typecheck`, **144 unit tests**, and `pnpm build`. Logs are in `artifacts/golden-city/`. The additional 31 gate/city checks cover full-width starts on all courses, 12 m lead-in pauses/backtracking, sparse crossing interpolation, independent finish positions, counted-duration/pace invariance, smooth forward six-lap seams, short/remote overshoots, wrong-way/extra laps, unsafe connection rejection, supported city footprints, exact bridge clearance and swept rail contacts. The existing cross-render-rate determinism, sand/drift, recovery and car contact tests remain passing. A separate final 25-case circuit run also passes with the outer-runoff fixture respecting each course's winding.
- The rebuilt Golden Gate centerline is **442.011 m**, clockwise, version **2**; the common route compiler is **6**. Coastal/Launchsite geometry and physics version5 are unchanged. The bridge is **88 × 12 m**, with 0.35 m edge rails leaving **11.3 m** between inner faces. Visible bridge solids extrude the physical footprints. Buildings and foundations are validated against authored land and protected blocks.
- The standalone city browser checks have passing evidence for mouse lead-in/connection previews on all three circuits; theme persistence; phase-specific 10/14 versus 8/11 CSS-pixel widths; two- and three-car bridge races; a four-car six-lap race with 23 car contacts, 8–15 wall-contact events per car and no recoveries; and old compiler/track saves rejected without losing name/paint/lap preferences. Sampled four-car rendering peaked at 132 draw calls in that pre-signage run. Rotation needs a settled camera layout before replaying precomputed browser-test coordinates: the corrected high-density browser-touch check passes at 844×390, 390×844 and 1024×768, including cancellation.
- The final packaged build passes **15 circuit/theme/alias/fallback/startup smoke checks** and **four tournament-save/layout checks**, with sound enabled, no page exceptions and no development helper in production. Reports are `artifacts/golden-city/production-smoke.json` and `production-tournament.json`. Completed-save layout cases are declared fixtures, not extra simulated championships.
- Final distribution: **4,917,662 raw bytes / estimated 1,720,036 gzip**. Entry plus static imports: **1,793,893 raw / estimated 487,678 gzip**. Runtime shader/model/font/image requests are additional to the entry estimate.

The final full browser regression, fresh matching circuit views and gameplay recording are recorded in the handoff addendum below. One mobile capture case encountered the normal pause screen in the broad run and an initial focused retry. Its last instrumented rerun completed normally; no simulation or interruption-guard change was made. The fixture records frame/focus evidence and uses the normal Resume control only if that evidence supports a protective pause. Physical iPhone/iPad Safari, thermal behavior, sustained mobile frame rate and four-person comfort remain pending. Public hosting, promotion, hop and network multiplayer remain outside this milestone.

### Final city handoff

The **38-scenario broad browser run** completed in 20.2 minutes: **37 passed**, with the Launchsite high-density screenshot/race case ending at the normal pause screen. Three focused final gate/camera/Golden Gate layout scenarios passed; the instrumented Launchsite rerun also passed in 49 seconds. Thus all 38 distinct functional scenarios have passing evidence across the broad/focused runs, rather than a claim that every case passed together in one uninterrupted run. The full four-player three-circuit tournament passed scoring, refresh/resume and championship restart; four-player Golden Gate completed six laps with physical contacts. Four real touch pointers also passed 50 overlapping cycles per corner.

High-density capture timing is recorded in `artifacts/golden-city/touch-capture-timing.json`: the last run observed loading/capture frame gaps up to about 774 ms, no focus/visibility interruptions, and was still racing after the screenshot. It completed without using Resume. The test now records timing/focus evidence and can resume through the normal control only when an observed interruption supports the pause. The game's existing 500 ms long-frame safeguard was not weakened.

Final optimization keeps the full six-color facade palette on one shared vertex-color material. Each car still displays six sand/impact puffs, now in one bounded updatable mesh. Physics, particle placement/count, player controls and pace remain unchanged. An earlier four-car capture exceeded the budget during overlapping thrust and sand effects; these batches resolve that measured cost. After optimization, type checking, all **144 unit tests**, the production build, the existing physical drift/sand/recovery browser scenario, fresh solo/four-car captures and **all 15 + 4 packaged-build checks** pass.

Final measured desktop captures use **Chrome 155.0.8059.85**, ANGLE/Direct3D11 on **NVIDIA GeForce RTX 3060 Laptop GPU**. Solo racing peaked at **70 draw calls** and averaged about **74.97 renderer fps**. The four-car recording peaked at **136 draw calls**, averaged **74.92 renderer fps**, and contained zero page errors. These fit the 90/150 targets on this desktop; they do not certify physical mobile performance.

`artifacts/golden-city/gameplay-30s.mp4` is a **silent, authentic local browser recording**: 459 unique frames over 30.90 seconds, encoded into a 30-second/30 fps review file. The run advanced 27.78 seconds of race time and recorded cars on the bridge. It is not a published launch trailer. `before.png` preserves the retired course view; `after.png` shows the final scene from the same 1440×900 preview format. Phone/tablet lead-in and connection images, solo bridge/results views, real multiplayer bridge views and detailed reports are in the same folder.

Final size: **4,917,662 raw bytes / estimated 1,720,036 gzip** for the distribution; entry/static imports **1,793,893 raw / estimated 487,678 gzip**. Full details and artifact names are in `artifacts/golden-city/review-summary.json`. Development preview remains at http://localhost:5173/?circuit=golden-gate. Physical iPhone/iPad Safari remains explicitly pending.

### Finish freedom and pace tuning — 2026-10-21

The first forward finish crossing after a complete lap now ends the counted stroke. Release anywhere afterward: long tails, pauses, reversals, remote endpoints and subsequent laps are excluded from geometry, pace and duration. The ignored tail appears muted during capture and preview. Incomplete/wrong-way laps and unsafe retained geometry still fail validation.

Shared normal pace maximum increased from 28 to 30 m/s (about 101 to 108 km/h intended pace). Minimum remains 9 m/s; thrust acceleration/duration/recharge, the 42 m/s absolute speed cap, grip, sand drag and handling forces remain unchanged. Shared gesture averaging radius increased 4 to 5 m; final triangular pace filter radius increased 6 to 8 m. Compiler is now 7 and rules version 6, so prior routes/tournaments cannot mix incompatible results; ordinary driver and lap preferences are retained.

Verification: `pnpm typecheck`, all **149 unit tests**, and `pnpm build` pass. Five focused Chrome/ANGLE D3D11 browser tests pass: unrestricted finish release on all three circuits (Golden Gate via touch on an 844×390 phone layout), high-density touch/rotation/cancellation at phone/tablet sizes, and an actual fast drawn race showing drift, sand slowdown, recovery and both laps. Unit cases compare entire compiled routes with different ignored tails, verify sparse interpolated crossing times, measure lower brief pace oscillation and prove speed above 29 m/s without thrust. Initial browser comparisons exposed sub-millisecond input timestamp quantization; the browser assertion allows 0.5 ms while keeping geometry/metadata equality, and deterministic core comparisons remain exact. Logs: `artifacts/drawing-tuning-{unit,browser,typecheck,build}.log`. Physical iPhone/iPad Safari verification remains pending; phone browser emulation is supplemental evidence.

### Multiplayer ghost start — 2026-10-21

Rules version **7** adds an initial **3 seconds of race time** without car-to-car collision impulses, overlap correction, scrape or car-impact events. Barriers, sand/grip, thrust and normal route progress remain active. At 3.0 seconds the existing deterministic contact solver activates, including stable separation of cars already overlapping. Solo preserves its prior movement behavior. Every new LocalRace (including rematch and tournament round) resets the ghost period; pause/resume retains remaining simulation time. The ready screen explains the start and the multiplayer HUD displays a brief GHOST START countdown. Duration is centralized in CONTACT_RULES.ghostStartSeconds.

Verification: type checking, production build and **154 unit tests** pass. New tests cover independent overlapping motion for 2/3/4 cars throughout the first 180 ticks, no impact/scrape events, exact activation time, overlap separation without progress awards, wall collisions while ghosting, reset and solo behavior. Existing contact fixtures explicitly start after ghosting so their collision coverage remains meaningful. Four-car six-lap course checks retain all assertions with a 10-second test-runner timeout to accommodate CPU contention. The real four-player Chrome browser check passes a complete race, in-race thrust, ghost countdown, pause/resume and rematch reset in 54 seconds. The initial browser run was invalidated by a development-source reload returning to the welcome screen; the final rerun occurred after source edits/builds finished. Logs: artifacts/ghost-start-{typecheck,unit,build,browser}.log. Physical iPhone/iPad Safari remains pending.

### Enlarged phone drawing surface — 2026-10-21

Drawing/preview now use compact floating controls and no large top/bottom panels. The normal UI has no practice-line button, pace legend, instructional paragraph or preview statistics. Landscape/desktop place sound, redraw, setup/exit and race/lock-in in a right rail. Narrow portrait uses a bottom rail to retain width. Player-number chips remain during private multiplayer turns. Errors remain concise, non-blocking alerts; explanatory copy and practice UI are reserved for a future tutorial. Practice fixtures are retained only under the existing DEV inspector for automated tests and capture tools; the production build has no inspector or automatic-plan control.

The entire 3D scene renders across the canvas. A CSS safe rectangle determines camera fitting, with identical projection in drawing, preview, countdown and racing. At **844×390**, the Launchsite centerline bounds increased from **338.54×138.24 CSS px** to **523.67×215.17 CSS px**: about **55% wider** and **2.4× the screen area**, without changing physical track geometry, pace mapping, grip, collisions or race rules. `100dvh` follows browser-toolbar resizing. High-precision camera matrices and explicit drawing-buffer rounding compensation preserve accurate picking at fractional render scales. Dynamic near/far planes keep the venue visible in narrow portrait views; visual review caught the former 1000 m far-plane limit before handoff. Final layout tests explicitly require the asphalt mesh to be rendered, as well as input/projection correctness.

Verification: type checking, **154 unit tests**, and the production build pass. A **20-scenario browser regression** passes real mouse/touch drawing, barrier validation, wide-sand plans, start/finish lead-ins on all circuits, theme persistence, held touch/cancellation, full solo races, and a four-player ghost-start/pause/rematch race. After the final portrait toolbar/clipping adjustment, **10 focused final checks** pass eight course/viewport touch-drawing cases (including 320×568 portrait and 667×320 landscape), identical drawing/preview/racing projection, road visibility, 44+ px targets, four private multiplayer drawing turns and rotation/cancellation across phone/tablet layouts. Logs: `artifacts/drawing-layout/{browser,final-layout-browser,typecheck,unit,build}.log`.

The packaged build passes an additional real recorded-touch drawing→preview→race check with no page errors or DEV helper. Production startup smoke passes **15 circuit/theme/alias cases**; these now verify entry into solo/four-player drawing, rather than depending on the removed practice shortcut. Four production tournament-resume/storage/layout checks also pass. Real race completion is covered by the recorded-input browser regression, not claimed for those production startup checks. Production logs and phone screenshots are in `artifacts/drawing-layout/`; `before.png` and `after.png` provide matched Launchsite views, and `production-phone-preview.png` demonstrates the final compact controls with an authentic drawn line.

The user confirmed that the site opens on a physical iPhone after changing the home Wi-Fi profile to Private. Sustained Safari gameplay, drawing comfort, performance/thermal behavior and simultaneous physical-device touch verification are still pending user/device testing. Local preview remains on port 5173; no public hosting or promotion was performed.
