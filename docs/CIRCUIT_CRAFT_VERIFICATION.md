# Circuit craft verification — 2026-11-04

Baseline: `55dfd3b`. Local changes only. Physical Safari/app verification remains
pending hardware testing; automated browser evidence is supplemental.

## Completed correctness checks

- Full suite: **771 tests / 61 files pass**. New coverage includes bounded native
  furniture, the physical timber-ramp slope/gap, elevated CPU passing predictions,
  separating traffic and independent Solo-controller save compatibility.
- Final focused geometry/material/rules checks: **33 pass**, including the parked
  vehicle material guard added after the full run. The final LA browser recheck
  passes both Time Trial and Solo budgets.
- **24 exact human-input handling fixtures match HEAD**, covering 1/2/4 cars on
  all eight tracks. Human physics, track versions and compiler stay unchanged.
- Type checking, generated-rules consistency, Pages-base and relative-base app
  production builds pass.
- The hardware browser suite passes 28 cases: all venue budgets, active-effect
  stress, graphics tier switching, Ultra skies/materials, WebGPU fallback, zoom
  guard, Solo/rematch, Time Trial replay/storage and a full eight-circuit Hard Solo
  tournament with refresh/resume.
- Strict static-shadow pixel parity passes separately on software WebGL (the CI
  renderer), completing coverage of all 29 selected cases. On this desktop's D3D
  renderer, even adjacent unchanged cached frames have tiny numerical variation;
  the untouched baseline reproduces it. Diagnostic captures show 45 varying pixels
  out of 1,296,000, maximum two channel levels, before changing cache state. Original
  hardware failures and both baseline/current diagnostics are retained; the test
  assertion was not relaxed.
- The exhaustive runoff audit uses the previously proven exact segment index;
  assertions/samples are unchanged. The original full-scan audit exceeded the
  timeout under concurrent CPU load; after eliminating that duplicate scan, the
  complete suite above passes.

## Rendering budgets

Medium tier with shadows and active abilities; Time Trial includes its replay ghost.
These are unchanged from the previous accepted presentation build.

| Circuit | Time Trial | Four-car Solo |
|---|---:|---:|
| Newport Island | 64 | 111 |
| Launchsite | 52 | 99 |
| Golden Gate | 58 | 105 |
| Santa Monica | 57 | 104 |
| Grand Canyon | 38 | 87 |
| LA nights | 72 | 119 |
| Snowy Tahoe | 47 | 96 |
| Capitan Yosemite | 44 | 93 |

No additional dynamic light, shadow map or postprocess is used. Native furniture
and soft-verge detail join the existing opaque roadside batch; the ramp joins the
existing timber batch. Roadside geometry remains below 15,000 triangles per venue;
Santa Monica's new ramp remains below 1,000. Existing car geometry is unchanged.

## CPU race comparison

Eight tracks × three difficulties × three seeds, two laps, four physical cars:
**72 races / 216 CPU finishes per build**. All updated scenarios finish. CPU
recoveries fall from **4 to 0**, and total car contact events from **1,026 to 488**.
LA nights contacts increase locally (51 to 97), while its CPU recoveries fall from
one to zero; this is not a claim that every individual race has fewer contacts or
is faster. Clean six-lap difficulty-ordering and zero-recovery tests also pass.

The batch uses normal physics and legal ability commands, including the five-second
contact ghost start. Timing/metric JSON is under artifacts/venue-rivals/. Wall-time
CPU costs gathered during concurrent test work are not used as performance evidence.

## Performance and production follow-up

Paired frame/startup measurements run after CPU tests and browser journeys finish:
844×390 CSS px, DPR 2, Medium, identical hardware scaling and deterministic seed.
They use fresh browsers, six-lap four-car races and a four-second warm-up. The first
20-second pair on every circuit records a 16.7 ms median and 16.8 ms p95 on both
builds, with every sample racing. Final LA/Yosemite repeats retain those values.
There are 11 complete baseline/update pairs. One additional baseline Yosemite
attempt timed out while clicking Draw, before recording any timing sample; a fresh
complete pair replaces it. That failed attempt remains in performance-repeat.log.
Hardware scaling remains 0.6666667 and postpasses remain empty on Medium; no tier
or resolution reduction is used to reach these results. This is desktop frame
pacing evidence, not a universal phone-FPS guarantee.

Initial setup-wait measurements include animation/action timing and asynchronous
scenery completion. Settled-setup checks instead compare total navigation through
the drawable-course signal, excluding the same fixed 300 ms pause on both builds.
Median local development-server times (three samples per build):

| Venue | Baseline | Updated | Change |
|---|---:|---:|---:|
| Golden Gate | 3,614 ms | 3,477 ms | −3.8% |
| Santa Monica | 3,404 ms | 3,511 ms | +3.1% |
| Grand Canyon | 4,315 ms | 3,857 ms | −10.6% |
| LA nights, final optimized check | 3,274 ms | 3,176 ms | −3.0% |

Early LA measurements exceeded 5%; this prompted construction-only optimizations.
Asphalt noise is evaluated once for both height and tone, and identical furniture
templates are reused within a build. SHA-256 comparisons confirm byte-identical
output for all ten 128-pixel Medium detail tiles and all eight roadside vertex,
normal, colour and index buffers. No artwork was removed. Raw early and final
loading observations remain available; these timings are not cellular/download
benchmarks or evidence of a general speed-up.

The final Pages-base production build passes actual browser-touch Santa Monica
drawing/racing and a completed authored jump, with no page errors or failed asset
requests. A separate production Hard Solo race passes with four physical cars,
one human ability pair and legal Hop/Thrust. The relative-base app bundle also
builds successfully. No deployment was performed.

The gallery includes a 30-second actual Santa Monica Solo race recording using
the jump route. Recorded poses remain racing and include real automatic-ramp
flight; it is a silent browser capture, not a rendered cinematic or audio test.

Review captures cover phone portrait/landscape and desktop for all eight venues,
plus a matched Santa Monica ramp detail. All refreshed circuit cards are 480×270
and below 60 KB each. Original art/material provenance is recorded in ASSET_RIGHTS.md.
