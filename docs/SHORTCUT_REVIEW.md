# Terrain, drawing start area and shortcut review

Local working revision, 2026-10-27. Uncommitted; no push or deployment.

## Terrain and drawing improvements

- Every venue uses a 30 m drawing approach, 8 m forward allowance and 8 m side allowance.
  On a 16 m road the accepted rectangle is 38 by 32 m: 3.17 times the former accepted area.
  Its dashed guide and fixed-camera fit share the same bounds. The counted lap gate remains
  16 m wide, and lead-in geometry/timing are still discarded.
- Grand Canyon v5 adds continuous physical/visual shoulder-width profiles. Its upper approach
  joins the 30 m western shoulder, broadens to 36 m and narrows to 24 m at the lip. The receiving
  ledge starts at 16 m, grows to 18 m after 12 m, 26 m after 45 m, and 30 m at the next turn.
  The edge protection follows that taper. Abrupt width-change collars are removed where
  matching profiles meet.
- The user approved prioritizing natural sloping jump faces. The opening is now 30 m between
  the lips, with authored cliff toes six metres toward the opening on each side. They leave
  18 m clear around the lower 16 m road. Full-capsule contacts query the actual slope height,
  so below-road toes cannot create phantom walls. The outer turns extend slightly to retain
  70 m of approach and 80 m of receiving road; the lap is 595.0 m. Automatic launch assistance
  is 29 + 0.05 times forward speed, with unchanged 36 m/s² gravity. Aligned 20/30/42 m/s
  approaches and ±20° body yaw with modest sideways drift all land safely. Manual Hop is unchanged.
- Launchsite and LA nights now use compact, contextual props in their named Hop lanes:
  a low utility conduit and individual studio equipment cases, with low service/planter ends.
  Lane identities, progression, permission rules and controls remain unchanged. Only each
  lane's named centre is jumpable; end protection remains solid. No signs, activation paint,
  shortcut lights or preview hints.

## Confirmed case-by-case choices

The original numbered maps remain at `artifacts/shortcut-review/index.html`; the implemented
choices and desktop/phone captures are at `artifacts/shortcut-review/approved/index.html`.
The updated maps use green for retained cuts and red for blocked cuts. These are review
overlays only; the game has no corresponding shortcut markings.

| Venue / marked path | Original cut | User decision, implemented |
|---|---|---|
| Newport Island 1 | 72 m of course replaced by a 34 m beach cut | Protected palm garden joined to the existing island |
| Launchsite 1 | 114 m northern loop replaced by 35 m; saves about 79 m | Protected low service plinth with separate tanks and pipework |
| Launchsite 2 | 78 m replaced by 38 m; saves about 40 m | Keep open |
| Golden Gate 1 | 102 m replaced by 36 m; saves about 66 m | Protected market parcel with seven varied storefronts and a pocket plaza |
| Golden Gate 2 | 84 m replaced by 35 m; saves about 49 m | Block with an 8.8 m city arcade |
| Golden Gate 3 | 72 m replaced by 34 m; saves about 38 m | Keep open |
| LA nights 1 | 78 m replaced by 37 m; saves about 41 m | Keep open |
| LA nights, turn 2 to the opposite straight | Cross-city gap between downtown and arts buildings | Close with a 9.5 m studio hall joining the protected blocks |

The automated audit found no equivalent short, supported and barrier-clear cut at Santa Monica
or Grand Canyon. That bounded chord search is not proof that every imaginable exploit is absent.

The final venue-by-venue reply supersedes the earlier ambiguous Launchsite reply. Numbering
restarts at one on each venue's review map. No additional choices remain pending.

Newport is now track v6, Launchsite v9, Golden Gate v7 and LA nights v4. Their centerlines,
widths and authored jump/Hop branches are unchanged. Grand Canyon remains v5 and Santa
Monica v3. Rules v14 and compiler v15 are unchanged. Existing compatibility checks reject
plans/records/tours using changed track versions without erasing names, paints or lap settings.

The latest lighter treatment preserves those effective protected footprints. Newport's
visible perimeter is 1.3 m, with five palms and dense shrubs inside it. Launchsite's 1.25 m
concave service plinth contains four individual vessels and light pipework. Golden Gate 1's
1.25 m parcel contains seven smaller buildings of varied heights, plus a planted plaza.
Protected infields remain non-jumpable through the established game rule; they are no longer
represented as solid nine-metre volumes. Tank and storefront dimensions are shared between
physics and rendering in `src/core/tracks/venue-parcels.ts`. The plinth is triangulated exactly
so it cannot cover the neighbouring road with a bounding box.
Ordinary runoff stays at least 5 m. The approved broader infields have scoped `cut-protection`
exceptions: at least 2 m for Newport and Golden Gate, and 0.45 m only at Launchsite's narrow
separating wing. Golden Gate 2's `urban-median` exception remains unchanged at 3.5 m. All full
16 m asphalt surfaces and normal vehicle corridors remain unobstructed.

All protected parcels must have clear visible boundaries and matching footprints, clear of
normal driving lines. Preserve smaller open
inside lines and all existing authored branches. Keep drawings permissive: blocked cuts become
race hazards and impacts, not rejected plans. Version affected tracks and retain ordinary
driver preferences. Physical iPhone/iPad verification remains pending.

`tests/unit/approved-cuts.test.ts` records the exact review-map station intervals. It checks
protected-area swept impacts, permissive hazard compilation, retained cuts completing without
recovery, and unchanged normal/approved branch plans. The review annotations are not game
markings and must never become shortcut hints.

## Lighter venue dressing — 2026-10-27

The owner approved the effectiveness of the wider blocking but rejected its visual weight.
The latest direction replaces the rock ridge with a palm garden, the extruded utility hall
with individual vessels, and the single long market building with a small neighbourhood.
Golden Gate 2 and LA's physical blockers are retained. The owner also confirmed the narrow
Launchsite section is already the intended turn-3 block; no additional closure is needed.
The earlier straight/around-the-end paths remain blocked, while the kept cuts remain open.
Protected-infield Hop behavior is unchanged. An explicit old-height/new-height simulation
comparison exercises a full race with legal Hop/thrust commands on each affected venue.

The current full unit suite passes **532 / 532 cases across 37 files**, and all **18**
HEAD handling comparisons pass (`balanced-unit.log`, `balanced-legacy.log`). Type checking,
generated rules and the production build pass. Matching desktop and both phone orientations
are captured in the approved gallery, with the previous heavy treatment retained under
`artifacts/shortcut-review/approved-heavy/`. All 12 new captures load without page errors;
High planning views retain the same 57–78 sampled draw calls. Physical Safari testing remains
pending.

All **10 browser cases pass** (`balanced-browser.log`): seven reviewed cuts plus three
four-car/live-effect and Time Trial ghost sessions. Recorded scene draw-call peaks with
Hop/Thrust effects active are:

| Venue | Four physical cars | Time Trial with ghost |
|---|---:|---:|
| Newport Island | 126 | 83 |
| Launchsite | 110 | 68 |
| Golden Gate | 119 | 77 |

All are within the 150 / 90 budgets, with no page errors. Detailed samples are in
`artifacts/parcel-presentation/`. The before/after height-envelope comparisons also pass:
lowering the protected parcel boundaries did not change the exercised race results, legal
abilities, contact or recovery counts.

The local production build at `/RoadsterRace/` also passes real touch drawing, a complete
Launchsite race with sound, and planning/activation of the existing manual-Hop lane
(`balanced-pages.log`, `balanced-pages-report.json`). The lane activation check does not
claim completion of that alternate race. No page errors or failed requests were observed.
`balanced-typecheck-final.log` and `balanced-build-final.log` record the final successful
type/build checks. No commit, push or deployment was performed.

## Compact allowed-Hop obstacles — 2026-10-27

The owner rejected the remaining rock rows in the Launchsite and LA nights shortcuts.
Launchsite v9 replaces its 16 × 2.8 m rubble centre with a 16 × 0.85 m service conduit,
retaining its 1 m clearance height. Its ends are 1 m service beds with small valve cabinets.
LA nights v4 replaces the 16 × 3.8 m, 2.5 m-high rubble centre with four 3.7 m-wide equipment
cases: 1.25 m deep and 1.4 m high, separated by 0.4 m gaps on a low pallet. Planter ends are
1.05 m high and 2 m deep. Full car-capsule checks verify those small gaps cannot fit a car
and agree with the compound route/collision footprint.

The main courses, 16 m lane widths, branch entry/exit progression, obstacle IDs, Hop tuning,
Thrust and controls are unchanged. CPU drivers still take the manual-lane bypass. End
parcels remain non-jumpable. Grand Canyon's natural rock trail and the recently approved
Newport/Launchsite/Golden Gate/LA cut protections are unchanged. Track versions invalidate
incompatible records/tours while preserving ordinary driver preferences. Rules 14 and compiler
15 remain current. The new geometry and props are original; no third-party asset was added.

Comparison captures are at `artifacts/hop-obstacles/index.html`. Close-ups use an inspection
camera, labelled explicitly; actual drawing/racing cameras remain fixed and identical.
Physical iPhone/iPad Safari testing remains pending.

Current verification (`artifacts/canyon-integration/hop-props-*.log`):

| Check | Result |
|---|---|
| Unit suite | **537 tests / 38 files pass**, including compact geometry and individual-case/compound-collider equivalence |
| Type checking / patch hygiene | Pass, `hop-props-typecheck-final.log` and `git diff --check` |
| Existing handling | All **18** HEAD fixtures match |
| Actual manual-Hop races | Launchsite and LA nights both finish with one Hop, zero contacts and zero recoveries; actual keyboard input, no injected movement |
| Relevant browser checks | **4 / 4 pass**: two shortcut races and two four-car/replay rendering checks |
| Active-effect budgets | Launchsite: **110** four-car / **68** Time Trial + replay draw calls; LA nights: **129 / 87**, within 150 / 90 targets |
| Build and generated rules | Production build at `/RoadsterRace/` passes; rules regenerated for Launchsite v9 and LA nights v4 |
| Production Pages-base check | LA nights: real touch preview and complete normal/channel-jump races with sound; no page errors or failed requests (`hop-props-pages.log`, `hop-props-pages-report.json`). The separate manual-Hop race is covered by the browser check above. |
| Visuals | Both venues inspected on desktop and emulated phone portrait/landscape, plus close-ups; no page errors |

The live shortcut captures and race reports are in `artifacts/hop-obstacles/`. No commit,
push or deployment was performed.

## Broad-infield revision — earlier iteration

The first placements could be avoided with small detours. The owner's follow-up explicitly
requested larger blockers and protection of Launchsite turn 3. The subsequent clarification
confirmed that the already-protected narrow section is the intended area.

The Newport ridge now stretches from x=-4 to 42.5 and joins the protected gardens, closing
the left-hand bypass. Launchsite's utility building extends from the assembly island to the
northern loop, with a narrow heat-exchanger wing in the gap between the two roads. Golden
Gate's annex grows from 15 × 5.5 m to 65 × 7 m and joins the existing market block. The already
effective Golden Gate 2 and LA blockers retain their footprints and heights.

Seven regression paths in `tests/unit/wide-blockers.test.ts` exercise around-the-end detours
that avoid the initial point blockers. They must hit the expanded bodies both grounded and
at full Hop height. Road-clearance samples cover the full lap at centre and both sides;
concave roof/body tests verify neither winding fills the utility building's road-facing notch.
An additional 0.7 m free-space grid audit (ignored `wide-blockers-proposals.json`) increases
shortest car-width-clear detours from roughly 36 to 50 m at Newport, 38 to 81 m at Launchsite,
and 39 to 82 m at Golden Gate 1. The remaining paths follow the inside of the normal road;
small legitimate inside lines remain possible.

## First cut-review verification — 2026-10-27

Evidence is local under `artifacts/canyon-integration/` unless noted otherwise.

| Check | Result / evidence |
|---|---|
| Type checking | Pass, `policy-typecheck-final.log` |
| Complete unit suite | **517 / 517 tests, 36 / 36 files pass**, `policy-unit-final.log` |
| Production build at `/RoadsterRace/` | Pass, `policy-pages-build.log` |
| Production Pages-path race | Pass: real touch drawing, full Golden Gate race and sound enabled, no page errors or failed requests; `policy-pages.log` / `policy-pages-report.json` |
| Generated rules | Regenerated; rules 14, compiler 15; track versions listed above |
| Approved cut geometry / race behavior | All 9 cases pass, `approved-cuts.log`; retained cuts finish without recovery; blocked chords hit full-height swept geometry even with protected-flight columns disabled |
| Browser drawing of all reviewed cuts | All 7 pass, `policy-recheck.log`; blocked lines still reach preview with a barrier hazard, retained paths have no hazards |
| Enlarged start rectangle | All 6 venues pass real Chrome touch input in both phone orientations, `policy-browser.log` |
| Shared handling regression | All 18 one-/two-/four-car fixtures match HEAD, `policy-legacy.log` |
| Actual canyon race | Pass: upper takeoff/landing and lower return, `policy-integration.log` |
| Golden Gate two-car race | Pass, `policy-bridge.log`; 7 contacts, 86 sampled draw calls, no render interruptions on the successful run (`artifacts/golden-city/race-2-report.json`) |
| Ultra graphics | All 6 venues load their sky/materials without errors, `policy-integration.log` |
| Visual inspection | 12 desktop/phone captures; no page errors, `../shortcut-review/approved/report.json`. High planning views sample 57–78 scene draw calls, distinct from active-effect race budgets |

The initial cut browser assertions read the inspector's compact route summary rather than
`getRoute()`; correcting that test exposed the already-rendered hazard information. The
initial full unit run passed 516 cases and failed one Golden Gate repeat-recovery fixture
because the new buildings changed its collision sequence. That fixture is now explicitly
pinned to its original geometry and passes its focused recheck; the new venue geometry has
separate tests. The subsequent complete run passes all 517 cases. No recovery or handling
rule was changed to satisfy either test.

The initial two-car bridge browser race paused at 0.10 s after a slow test-GPU frame. Its
test now resumes only `render-delay` pauses through the actual Resume button, with bounded
attempts and recorded interruption times. It never disables the safeguard or advances the
simulation artificially. Physical Safari performance, input and audio remain pending.
