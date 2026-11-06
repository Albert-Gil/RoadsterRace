# Production, Collection and San Diego Fleet — verification

Implementation verified locally; commit and push authorized by the owner on
2026-11-06. Deployment remains gated by the Pages workflow. Baseline is
`1bd5e8cfa750c8e48511ff92e1d73c3655d96647`.

## Delivered

- Golden Gate architectural roof/bay kit and baked static surface/contact colour
  treatment across the nine existing venues. No existing physical layout, track
  version, force, pace mapping or ability tuning changed.
- Collection with independent Finish/Clean/Rival medals, four extra finishes,
  Explorer/Precision/Master and cup badges, shared human ownership, independent
  storage and safe in-memory fallback. Original six paints remain immediately
  available, with stainless steel first/default. Awards never auto-equip cosmetics.
- Pacific, Frontier and Fleet Cup presets. Actual schedules and optional driver
  badges survive compatible save/resume; completed rounds retain exactly-once scoring.
- San Diego Fleet: 719.4 m, 16 m roads, named 12/10/8 m stationary decks, two main
  automatic crossings and two hidden manual-entry/automatic-return support-vessel
  alternatives saving about 31 m each. Shortest cyclic activation spacing is about
  328.7 m. CPU drivers keep the main route.
- Original batched naval artwork, versioned crossing/landing ownership, refreshed
  ten-card artwork, appearance/progression guides, asset rights and permanent guidance.

## Automated evidence

| Check | Result |
|---|---|
| `pnpm typecheck` | Passed on final source |
| `pnpm test` | 72 files / 915 tests passed in the full run |
| Final focused fleet/progression/kit/rules run | 20 tests passed, including later added cup and baked-rail checks |
| `pnpm test:legacy` | All 27 one/two/four-car handling fixtures match HEAD to the existing exact tolerances; all nine original track definitions/versions also compare equal |
| `pnpm docs:rules` + generated document test | Passed |
| `pnpm bake:production` | Twelve original geometry pieces checked/exported; physical rail data matches the authored derivation |
| Fleet frozen geometry comparison | Baked rail data is exactly equivalent to the pre-bake track object |
| Root and `/RoadsterRace/` production builds | Passed; final Pages bundle remains in `dist/` |
| Graphics/modes/all-venue browser suite | 28 passed, including a complete ten-round Solo Full Tour, record replay/storage failure and Ultra/WebGPU fallback |
| Fleet/Hop/Multiplayer browser journeys | 15 passed initially; the stale three-second ghost-start expectation was corrected to the existing five-second rule, and its remaining check passed on rerun |
| Production Pages-path smoke | All 17 all-venue/session checks passed; no page errors or failed required requests. Optimized Fleet checked again separately |
| Gallery media check | All local media references resolve; gallery has no browser errors |

Fleet flight checks cover all six crossings at 20/30/42 m/s, ±20-degree body yaw
and 2 m/s lateral momentum. Both support routes complete six laps using legal timed
Hops. Fifteen seeded four-car CPU batches (five seeds per difficulty) finish two
laps inside 240 simulated seconds. Missed-Hop recovery retains the pre-crossing
carrier/elevation and awards no forward distance. Concave deck triangulation stays
inside actual support; planning guides never become support.

Real browser mouse drawing and touch events reached preview/racing. Both hidden
alternatives were drawn on 844×390 and 390×844 touch layouts. Ability ownership,
50 overlapping cycles, eight simultaneous touches, cancellation, pause, retry,
rotation-related layouts and tablet controls passed the existing browser checks.
Live human race awards persisted after reload; CPU/tutorial/practice/ghost evidence
is excluded, and ineligible events do not write a progression record. Cup round
order and selected badges were independently checked through save parsing.

## Rendering and loading

The all-venue Medium active-effects suite includes a cosmetic Time Trial ghost:

- Maximum Time Trial scene draw calls: **63**, below 90.
- Maximum four-car scene draw calls: **107**, below 150.
- Fleet samples: **35 Time Trial / 79 four-car** scene draw calls.
- Fleet's five opaque authored geometry batches contain **33,462 triangles**;
  water, radar and shared course overlays remain bounded. This is below the
  120,000 static-triangle / eight opaque static-batch venue targets.
- Racing car remains 9,904 triangles; unchanged shared watertight shadow proxy
  keeps the model plus proxy below 10,000.
- Ten selection WebPs remain 480×270 and below 60 KB each (roughly 217 KB total).

Three interleaved baseline/current Golden Gate samples at 1440×900 Medium retained
**36 planning draw calls**. Median-of-run render measurements were approximately
**2.4 ms before / 2.2 ms after**, with median frame intervals approximately
**12.5 / 12.3 ms**. No sustained >5% median-frame regression was observed. These
are local browser observations under concurrent development load, not a physical
phone benchmark. Warm/cold loading timings vary and are retained in
`artifacts/fleet-production/performance.json`. Fleet edge rails were subsequently
baked offline to remove their route-wide segment scans from every app startup;
geometry equality and all focused Fleet checks were rerun after that optimization.

During capture, two development servers initially shared a dependency cache and
produced a stale lazy-shader URL. Baseline/review previews now use isolated caches;
the production smoke has no such failure. No production cache/service worker or
additional hosting service was introduced.

## Review artifacts

- Local game: `http://127.0.0.1:5184/?circuit=san-diego-fleet`
- Review gallery: `http://127.0.0.1:5184/artifacts/fleet-production/index.html`
- Golden Gate desktop and phone before/after comparisons; all ten venues on desktop,
  phone landscape and portrait; supplemental tablet views and layout evidence.
- Live-drawn main-route recording and a complete support-vessel shortcut recording.
  A cropped 30-second MP4 is an excerpt of actual automated simulation with legal
  ability input, with no invented gameplay frames. Captures are silent.
- Logs, graphics samples, geometry equality, screenshots and recordings are beneath
  `artifacts/fleet-production/`; they are intentionally git-ignored review outputs.

## Pending hardware gate

Physical iPhone/iPad Safari comfort, frame rate, rotation behavior and sound remain
**pending**. Browser touch emulation is supplemental evidence. No accounts, cloud
saves, remote multiplayer, leaderboards, promotion or Unity migration were added.
The public Pages site updates only after the pushed main build passes its deployment checks.

Supplemental tablet pass: all ten venues captured at 1024×768, touch enabled and
2× device density. Every projected main-course point stayed inside the viewport
and no page errors were observed (`artifacts/fleet-production/tablet.json`).
The review gallery links desktop, phone landscape, portrait and tablet views.
