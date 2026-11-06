# Curated challenges — verification

Date: 2026-11-06. Baseline: `e40352e3df84c113a831fec130fbc8dc181f8f7a`.
This report records the original local validation. Subsequent integrated Fleet v2
pre-push verification passed all 933 tests; release follows the owner's later commit
and push authorization. See FLEET_REBUILD_TEST_REPORT.md.

## Automated results

- `pnpm typecheck`: passed.
- `pnpm test`: **73 files / 927 tests passed**. The final partial-Fleet feedback
  refinement also passed the focused ten-test challenge suite afterward.
- `pnpm test:legacy`: **all 30 fixtures passed** (one, two and four cars on every
  venue), matching HEAD geometry, finish/lap times, drift/contact/recovery/Hop counts.
- `pnpm build`: passed; final production build used `/RoadsterRace/`.
- Challenge browser coverage: **all ten cases passed**, across targeted runs. Initial
  failures were ambiguous test selectors matching both hidden and visible Home buttons;
  selectors were corrected to visible named actions and all five navigation cases rerun.
- `PAGES_ONLY=challenges PAGES_FULL_RACES=1 pnpm test:pages`: passed against the local
  built site under `/RoadsterRace/`; no JavaScript errors or failed required requests.
- `git diff --check`: passed.

## Gameplay and persistence evidence

- A real mouse-drawn Fleet route used both support vessels. Legal keyboard Hop presses
  initiated two manual entries, actual physics landed both automatic returns, the lap
  completed without recovery, and completion survived reload.
- A real mouse-drawn clean Tahoe lap earned Alpine Precision and survived reload.
  Separate practice races earned no challenge stamp. Same-line retry and fresh drawing
  retained the curated session and reset attempt tracking.
- A full four-round Hard Frontier Cup completed with four physical cars each round.
  The human finished outside first place and correctly received no challenge completion.
  Pure tests and a validated completed-cup resume independently verified outright/shared
  human championship titles, exactly-once persistence and practice disqualification.
- Saved challenge cups retained Hard difficulty, actual four-round schedule, driver
  ownership and eligibility. Ordinary saved championships retained the replacement guard.
- Desktop 1440×900, phone landscape 844×390, phone portrait 390×844 and tablet 1024×768
  passed menu/control checks. Leaving restored the previously chosen Golden Gate circuit
  and six-lap preference. Controls remained at least 44 CSS pixels and reachable by scrolling.
- Production testing used actual touch-event drawing, a complete Tahoe challenge race,
  and the Hard Frontier preset. No development inspector was present in the built site.
- Pure tests cover wrong origins/order, missing route authorization, failed/incomplete
  support sequences, recovery and lap resets, actual one-lap Fleet physics, clean-lap
  incidents, human/source ownership, invalid configurations, corrupt/quota-blocked storage,
  shared-store union, duplicate evidence and preference/medal isolation.

## Performance and compatibility

No road, track version, physical force, ability tuning or collision behavior changed.
Physics stays 19; compiler stays 20. Only read-only landing event metadata was added.
Challenge UI uses DOM/CSS, with no added meshes, materials, lights, textures or render
passes. Event tracking runs only for an active attempt; storage writes occur on completion,
not on simulation ticks. Existing 90/150 scene draw-call budgets remain unchanged; this
update does not claim a fresh hardware frame-time measurement.

## Review media

Local review: `http://127.0.0.1:5184/artifacts/challenges/index.html`.

Ignored local artifacts in `artifacts/challenges/` include desktop/phone/tablet menu
captures, Fleet and Tahoe results, final Frontier standings, and
`fleet-challenge.webm`, a recording of actual browser gameplay. The production smoke
report is `artifacts/pages/report.json`; unchanged-handling evidence is in
`artifacts/legacy-handling/report.json`.

Physical iPhone/iPad Safari touch comfort, frame timing and sound remain pending actual
hardware testing. Automated phone emulation is supplemental evidence.
