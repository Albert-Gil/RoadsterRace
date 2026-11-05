# Yosemite waterways verification — 2026-11-04

## Completed checks

| Check | Result |
| --- | --- |
| Type checking | Passed |
| Full unit suite | 834 tests / 63 files passed |
| Final focused water/shoreline checks | 11 passed |
| Committed handling comparison | All 24 one-/two-/four-car fixtures match HEAD on identical geometry |
| Pre-change Yosemite v4 snapshot | Two distinct two-lap pace profiles match exactly: finish/lap times, jump list, contacts and recoveries |
| Road and cedar-trail fixture | All 3,544 full-width height/support samples retain the v4 fingerprint |
| Production builds | Root and `/RoadsterRace/` builds passed |
| Local Pages smoke | Real touch drawing reaches preview and starts a production race; no failed requests or page errors |
| Draw calls with forced active effects | 44 Time Trial including ghost; 100 four-car Solo Race (targets 90/150) |
| Frame pacing | Desktop D3D11, 844×390 touch emulation at 2× density: median 13.3 ms, p95 13.5 ms in both Time Trial and Solo Race |
| Generated rules | `pnpm docs:rules` completed; Yosemite is version 5 |

## Browser coverage

Nine distinct Yosemite browser checks completed successfully:

- Real touch drawing in phone landscape/portrait, elevated projection alignment
  and consistent compiled pace.
- Solo race with three CPUs, Hop/Thrust, results, a Time Trial and visible replay.
- Four local humans completing a race; new nine-venue Full Tour and retained saved
  shorter schedule.
- Water/mist animation, pre-pass exclusions and reduced-motion handling.
- Freefall visibility from fixed desktop, landscape-phone and portrait-phone cameras;
  falling droplets, flowing texture and impact rings; reduced-motion freeze.
- All six waterfall drops visible in the desktop gameplay camera and ending in
  actual receiving waters. Projected drops are approximately 40–61 CSS pixels.
- WebGPU rendering or supported WebGL fallback, without page/console errors.
- One-car and four-car rendering budgets with forced thrust, dust, impacts and ghost.

The first combined browser run had two superseded failures: the droplet assertion
sampled before an animated frame advanced on the busy host, and a development
reload interrupted the multiplayer race. The animation assertion now waits for
observed frame movement. Both checks passed when repeated against the unchanged
scene. Original and final logs are retained in the evidence folder.

## Evidence

`artifacts/yosemite-waters/index.html` is the before/after gallery, with desktop,
phone landscape/portrait and five close inspection views. Close views use a
temporary inspection camera; gameplay keeps the same fixed overview as before.
The Yosemite card is an offline native capture, 480×270 WebP, 21,156 bytes.

Logs and fixtures in that folder include `unit-tests.txt`, `legacy.txt`,
`road-regression.json`, `browser-tests.txt`, `browser-final.txt`, `waterfalls.json`,
`views.json`, `performance.json`, both production-build logs and `pages-smoke.txt`.
Effect-stress reports are in `artifacts/effects-budget/` and the production report
is in `artifacts/pages/report.json`.

All earlier uncommitted venue work is preserved. No commit, push or deployment
was performed. Real iPhone/iPad Safari comfort and sustained performance remain
pending hardware testing; phone emulation and desktop GPU measurements do not
replace those checks.
