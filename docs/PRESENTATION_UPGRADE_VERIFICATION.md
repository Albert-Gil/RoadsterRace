# Presentation upgrade verification — 2026-11-04

Baseline revision: 5f2af38. Local verification completed before the owner's
subsequent commit-and-push request.

## Completed checks

- Full unit suite: 760 tests / 60 files pass. Final focused UI, tile and fringe
  checks: 35 tests pass after the last refinements.
- All 24 exact legacy handling fixtures match HEAD.
- Type checking, GitHub Pages-base production build and relative-base app build pass.
- Generated CURRENT_RULES.md has no content changes; physics/compiler/track
  versions, scoring and saved formats are unchanged.
- All 36 graphics, presentation, resource, race-settings and venue browser checks
  pass. A final settled-results capture passes separately.
- Thumbnails: all eight are 480×270, 13.6–26.9 KB each; total 166,474 bytes.
  Required scenery model/texture files are unchanged. Distribution JS grows by
  4,850 bytes and CSS by 4,025 bytes, before transport compression.
- Missing-image fallback keeps the full map. Phone portrait/landscape, tablet and
  desktop setup fields/primary actions remain reachable and selection keeps scroll.
- Switching through all eight venues twice retains one scene and stable mesh /
  texture counts. Static shadow caching stays pixel-equivalent to full redraws.
- Low/Medium/High/Ultra, renderer fallback, six-lap multiplayer, same-line rematch,
  pause-safe settings and completed Solo/Time Trial results checks pass.
- A Time Trial equal retry keeps the same time without another new-record label.

## Measured rendering budgets

Medium tier, active abilities and shadows; Time Trial includes its cosmetic ghost.

| Venue | Time Trial | Four-car Solo |
|---|---:|---:|
| Newport Island | 64 | 111 |
| Launchsite | 52 | 99 |
| Golden Gate | 58 | 105 |
| Santa Monica | 57 | 104 |
| Grand Canyon | 38 | 87 |
| LA nights | 72 | 119 |
| Snowy Tahoe | 47 | 96 |
| Capitan Yosemite | 44 | 93 |

Simultaneous ground-Thrust/skid/impact-dust stress reaches 72/128 calls on LA
nights and 44/100 on Yosemite, below the 90/150 targets. No new lights, passes,
shadow resolutions or graphics-tier reductions are used to meet those budgets.

## Production journeys and captures

The Pages-base production build passes real browser-touch drawing, racing and a
complete eight-circuit tournament, including saved/resumed championship state.
There are no page errors or failed required asset requests. The final Yosemite
production race is also checked separately after the construction optimization.
Both the Pages and relative-base iOS bundles build successfully.

Before/after captures cover every venue at phone landscape, phone portrait,
tablet and desktop sizes. The review gallery, setup/results captures and an
authentic 30-second Yosemite gameplay recording are in artifacts/pro-polish/.
The recording is silent: the browser recorder does not capture game audio.

## Frame-time comparison and diagnostics

Three 60-second four-car samples per venue compare the frozen baseline with the
working copy: Medium tier, 844×390 CSS px, DPR 2, ten-second race warm-up. All
sampled sessions remain racing. Median-of-run frame intervals, in milliseconds:

| Venue | Baseline median / p95 | Updated median / p95 |
|---|---:|---:|
| Newport Island | 8.4 / 12.6 | 8.4 / 12.6 |
| Launchsite | 8.3 / 12.5 | 8.3 / 12.5 |
| Golden Gate | 8.3 / 12.5 | 8.3 / 9.3 |
| Santa Monica | 8.4 / 12.6 | 8.3 / 12.6 |
| Grand Canyon | 12.5 / 16.7 | 12.3 / 12.6 |
| LA nights | 8.4 / 12.6 | 8.3 / 12.5 |
| Snowy Tahoe | 8.4 / 12.6 | 8.4 / 12.6 |
| Capitan Yosemite, original long run | 12.4 / 12.6 | 16.7 / 29.6 |

The original long-run Yosemite sample exceeded the 5% investigation threshold;
it is retained in before/performance.json and after/performance.json. Three
additional paired runs, launching a fresh browser for each sample, produced
baseline medians 8.3/8.4/8.3 and updated medians 8.3/8.3/8.3, with p95s of
12.5/12.6/12.5 versus 12.5/12.5/12.5. The slowdown did not repeat in those pairs.
These figures do not establish a speed-up or sustained mobile performance.

Loading investigation found avoidable full-course searches in fringe generation.
The final implementation uses the existing exact segment index and caches shared
edge-point support/height queries for one construction. All eight geometry hashes
(positions, colours, indices and patch counts) match the original implementation
byte for byte; no per-frame work or physical geometry changes. Local construction
cost drops to roughly 5–54 ms across venues, versus up to several hundred ms in
the original unoptimized version. No visual detail or quality tier is removed.

Loading evidence is retained in loading.json, loading-final.json and
loading-acceptance.json. Initial noisy measurements exceeded 5% on some venues;
this prompted the construction optimization rather than a quality reduction.
The final focused check alternates baseline/update order and launches a fresh
browser per measurement, five measurements of each build per venue:

| Venue | Baseline startup median | Updated startup median | Change |
|---|---:|---:|---:|
| Launchsite | 3,485 ms | 3,500 ms | +0.4% |
| Grand Canyon | 3,846 ms | 3,817 ms | −0.8% |
| LA nights | 3,435 ms | 3,488 ms | +1.5% |
| Capitan Yosemite | 5,039 ms | 5,183 ms | +2.9% |

Startup is measured from navigation to the inspector's drawable-scene signal.
The preceding all-venue fresh-context comparison had already kept Newport (+2.3%),
Golden Gate (−1.3%), Santa Monica (+2.7%) and Tahoe (+0.4%) within the threshold.
Those four did not require another loading run after the exact cache improvement.
No browser errors occur in the final focused comparison. This is local desktop
development-server loading evidence, not a cellular-download benchmark. The
uncompressed distribution grows by 170,827 bytes (about 1.36%), mostly the eight
lazy card images; required scenery downloads are unchanged.

Physical iPhone/iPad Safari comfort, sustained FPS, heat and sound verification
remain pending. Desktop emulation does not establish physical-phone performance.
