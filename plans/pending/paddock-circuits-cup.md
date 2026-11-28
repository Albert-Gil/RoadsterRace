# Online fixes, CI and load time, server capacity, Private Duels paddock, more online circuits, guided first race and Weekend Cup
Ticket: owner request 2026-11-27 ("plan on applying 3, 4, 5 and 6 (except Android) … more circuits … fixes 1–5 … Private Duels paddock")
Follows: `plans/archive/release-multiplayer-input.md` (its owner step 7.2 — iPhone checklist, frame-time benchmark, Fleet flag — carries into Phase 9 here).

Baseline (verified 2026-11-27): GitHub main = `067982d`, duel protocol 4, physics 22, compiler 21, computer 4. Release run #100 for `067982d` was in progress when this plan was written.

Measured inputs (cloud CPU, this session):
- 4-car simulation step, median / p95 ms: Newport 0.22/0.43, Orbital 0.77/1.13, Golden Gate 0.38/0.99, Santa Monica 0.66/2.00, Grand Canyon 1.03/1.79, LA Nights 0.56/1.04, Snowy Tahoe 1.96/3.87, Yosemite 2.11/3.05, Fleet 1.02/2.21, LAX 2.47/5.85. One 60 Hz tick is 16.7 ms; Render Free provides 0.1 CPU, so on a CPU like this one a single Tahoe, Yosemite or LAX room would already need more than the whole quota. The real Render speed is unknown until Phase 2 measures it.
- Production main script 1.39 MB (402 kB gzip); glTF loader 0.71 MB; Tahoe and Yosemite landscape workers 0.32 MB each.
- GitHub Actions warns that checkout@v4, setup-node@v4, upload-artifact@v4, pnpm/action-setup@v4, configure-pages@v5, deploy-pages@v4 and upload-pages-artifact@v3 target Node 20.

## Phases

### Phase 0: Online fixes (owner items 1–5)
Verified when: each fix has a test that fails without it; duel suite green.

#### Step 0.1: Update screen keeps its 15-second window (Size: S)
- Acceptance criteria: the whole recheck loop has one 15 s deadline (each probe's timeout is the time left); leaving cancels the loop and any in-flight probe (AbortController) so no late reply reopens anything; Back/Home stays enabled throughout.
- Verification command: `npx vitest run tests/unit/duel-compatibility.test.ts` + `npx playwright test --config playwright.duels.config.ts --grep "updating"`
- Files likely touched: `src/duels/compatibility.ts`, `src/duels/client.ts`, tests.
- Test seams: pure loop with injected clock and abortable probe; browser spec with a `/health` route that never answers.
- Blocked by: none

#### Step 0.2: Own car stays on its deck before a jump (Size: M)
- Acceptance criteria: the route-distance search is limited to a window around the car's last known route distance (its current section), never a neighbouring segment; extrapolation stops at the next crossing's lip; once the server reports flight, the display hands over to the authoritative flight (existing hand-back, no backward step). Fleet test: a car approaching each support-ship and carrier lip is never drawn past the lip while grounded, and never on the neighbouring deck.
- Verification command: `npx vitest run tests/unit/own-car.test.ts` + `DUEL_LATENCY=all npx playwright test --config playwright.duels.config.ts --grep latency`
- Files likely touched: `src/duels/own-car.ts`, `src/main.ts`.
- Test seams: own-car unit tests on Fleet routes (both shortcuts and main line); latency spec (no backward steps).
- Blocked by: none

#### Step 0.3: Touch ownership per finger through the click (Size: S)
- Acceptance criteria: releases are remembered per pointer ID and the click is matched to its own pointer (PointerEvent click), falling back to the latest release only when the browser gives no pointer ID; one finger releasing an ability pad while another taps a Results button: the Results tap works, the pad release activates nothing.
- Verification command: `npx vitest run tests/unit/press-context.test.ts` + `npx playwright test tests/browser/input-ownership.spec.ts`
- Files likely touched: `src/input/press-context.ts`, `src/input/press-guard.ts`, tests.
- Test seams: tracker unit test with interleaved pointers; browser spec with two CDP touch points.
- Blocked by: none

#### Step 0.4: Drawing rules independent of the theme (Size: XS)
- Acceptance criteria: `DrawingSession` receives `{ zoomPerSector, retakeMetres }` at construction and imports nothing from `src/presentation`; main passes the current values; behaviour identical (session tests unchanged).
- Verification command: `npx vitest run tests/unit/drawing-session.test.ts` + `grep -L presentation src/drawing/session.ts`
- Files likely touched: `src/drawing/session.ts`, `src/main.ts`, `tests/unit/drawing-session.test.ts`.
- Blocked by: none

#### Step 0.5: Reliable LAX sector Retry/Previous tests (Size: S)
- Acceptance criteria: the tests wait for the sector camera and drawing projection to settle (camera idle and two stable projected frames) before acting, then assert the retained samples; the camera-moving assertion becomes "the camera moves toward the sector, then settles". Ten consecutive local runs pass.
- Verification command: `npx playwright test tests/browser/sector-drawing.spec.ts --grep LAX --repeat-each 10`
- Files likely touched: `tests/browser/sector-drawing.spec.ts`, possibly a dev-API "drawing view settled" flag in `src/app/dev-api.ts`.
- Blocked by: none

### Phase 1: CI health and browser coverage (item 3)
Verified when: no Node 20 deprecation warnings; drawing and multiplayer browser specs run in GitHub Actions and pass.

#### Step 1.1: Actions on Node 24 (Size: XS)
- Acceptance criteria: every action in `pages.yml` and `ios.yml` uses a major whose `action.yml` declares `runs.using: node24` (checked at pickup: currently checkout v6, setup-node v6, upload-artifact v7, upload-pages-artifact v5, configure-pages v6, deploy-pages v5, pnpm/action-setup v5 or newer); no behaviour change.
- Verification command: `actionlint` (if available) + the next run shows no Node 20 annotations.
- Files likely touched: `.github/workflows/pages.yml`, `.github/workflows/ios.yml`.
- Blocked by: none

#### Step 1.2: Test-setup-only failures (Size: S)
- Acceptance criteria: the Fleet medal spec records video only when ffmpeg is available (`test.info().project` / env check) and otherwise runs the same assertions; course switching and four-player ghost start use the test clock instead of a longer limit; the remaining serial CDP touch loops use `sendTouchStroke` where timestamps are explicit.
- Verification command: `npx playwright test tests/browser/fleet-production.spec.ts tests/browser/circuits.spec.ts tests/browser/multiplayer.spec.ts`
- Files likely touched: those specs, `tests/browser/ui.ts`.
- Blocked by: 0.5

#### Step 1.3: Drawing and multiplayer specs in CI (Size: S)
- Acceptance criteria: a new matrix job runs `drawing-consistency`, `sector-drawing`, `route-cleanup`, `input-ownership`, `multiplayer`, `race-settings` on software WebGL with the test clock; deployment requires it; total CI wall time grows by at most 10 min (parallel job).
- Verification command: workflow run green.
- Files likely touched: `.github/workflows/pages.yml`, `playwright.config.ts` (a `ci` project if needed).
- Blocked by: 1.1, 1.2

### Phase 2: Server capacity from real numbers (item 5)
Verified when: the live server reports its own step timings; room limits follow measured cost.

#### Step 2.1: `/stats` and smoke reporting (Size: S)
- Acceptance criteria: the room server exposes `/stats` (no secrets): uptime, seconds since boot at the first request (cold start), rooms by circuit, simulation step median/p95/max per circuit over the last minute and last hour, and ticks behind real time. The public smoke check prints `/stats` after its room; `duel-steps` log lines gain the circuit.
- Verification command: `npx vitest run tests/unit/duel-stats.test.ts` + local `node tools/public-smoke.mjs`.
- Files likely touched: `server/index.ts`, `server/duel-room.ts`, `server/stats.ts` (new), `tools/public-smoke.mjs`.
- Blocked by: none

#### Step 2.2: Weighted room cap and earlier wake-up (Size: S)
- Acceptance criteria: each circuit has a cost weight (its measured step cost relative to Newport, from Phase 2.1 data or this plan's table until then); a new room is refused with `server-full` when the running weights would exceed the budget (env `DUEL_CAPACITY`, default = today's two Newport-class rooms); opening the Multiplayer menu fires a background `/health` so a sleeping server starts waking before Private Duel is chosen.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts`
- Files likely touched: `server/duel-room.ts`, `server/capacity.ts` (new), `src/main.ts`.
- Blocked by: 2.1

### Phase 3: Faster first load (item 4)
Verified when: the main script is at most 700 kB (from 1.39 MB) and the first screen appears sooner on a throttled phone profile.

#### Step 3.1: Measure what the main script contains (Size: XS)
- Acceptance criteria: a source-map report (`tools/bundle-report.mjs`, no new dependency) lists the 30 largest modules in each chunk; committed as a baseline.
- Verification command: `node tools/bundle-report.mjs`
- Blocked by: none

#### Step 3.2: Split per venue and per mode (Size: M)
- Acceptance criteria: venue scenery, venue track geometry not needed on Home, the online client and the tutorial load on demand; Home shows without any venue scenery; stale-build recovery covers the new chunks; main script ≤ 700 kB; first screen on Playwright "Slow 4G + 4× CPU" at least 30 % sooner than baseline (measured, both numbers recorded).
- Verification command: `pnpm build && node tools/bundle-report.mjs && node tools/benchmark-startup.mjs` (new) + Pages smoke checks.
- Files likely touched: `src/main.ts`, `src/content/circuits.ts`, `src/presentation/*` imports, `vite.config.ts`.
- Blocked by: 3.1

### Phase 4: Private Duels paddock (owner design)
Verified when: the paddock flows in the design table work on desktop, phone portrait and landscape; protocol unchanged.

#### Step 4.1: Private Duels view model (Size: M)
- Acceptance criteria: a DOM-free `duelScreen(room view, own seat, connection state, scene ready)` returns which screen to show (create/join, room, waiting, loading circuit, race, reconnecting, results) and the per-seat cards; the network client no longer builds DOM.
- Verification command: `npx vitest run tests/unit/duel-screen.test.ts`
- Files likely touched: `src/duels/screen.ts` (new), `src/duels/client.ts`.
- Blocked by: Phase 0

#### Step 4.2: One mounted paddock shell (Size: M)
- Acceptance criteria: full-screen, circuit-led paddock (circuit artwork, red accents, player cards with number, name, paint silhouette and status, open seats); updates cards in place by seat ID, preserving focus, scroll and an open circuit selector; the press guard advances only when the interactive screen changes; Share Invite and Copy Link visible; only the host sees settings and Start; Connecting / Waking the race server / Online play is updating; Back always reachable.
- Verification command: `npx playwright test --config playwright.duels.config.ts` + screenshot capture at 1440×900, 390×844, 844×390.
- Files likely touched: `src/duels/paddock.ts` (new), `src/style.css`, `src/main.ts`.
- Blocked by: 4.1

#### Step 4.3: Drawing, waiting, race start and results flow (Size: M)
- Acceptance criteria: full drawing surface while drawing; after lock-in the paddock returns with Drawing/Ready/Reconnecting per seat and "Sending line" while pending; a rejected line returns to the draft with the existing error; the course and numbered grid appear as soon as the scene can draw; a device still loading shows "Loading circuit" and joins whatever phase the server reached without replaying GO, losing its seat or pausing the room; compact reconnect overlay; Results reuse the cards with ranks, times and votes, show who is deciding, keep the host's next-race settings; Babylon skips rendering behind a fully covered paddock and resumes before the reveal; short opacity fades, none with reduced motion; safe areas and on-screen keyboard respected; status announced once per meaningful change.
- Verification command: duel suite + new `tests/duels/paddock.spec.ts` (delayed scene readiness through countdown, leaving mid-connection, both rematch paths, 2 and 4 players).
- Files likely touched: `src/duels/paddock.ts`, `src/main.ts`, `src/presentation/scene.ts` (covered rendering), tests.
- Blocked by: 4.2

#### Step 4.4: Guided first online race (Size: S)
- Acceptance criteria: on a device's first Private Duel, short dismissible coach cards in the paddock: inviting, drawing privately, Hop/Thrust pads, the rematch vote; never during racing; remembered per device; reachable again from Settings.
- Verification command: `npx playwright test --config playwright.duels.config.ts --grep "first online race"`
- Files likely touched: `src/duels/coach.ts` (new), `src/duels/paddock.ts`.
- Blocked by: 4.3

### Phase 5: More circuits online
Verified when: every circuit has an online/local equivalence test and a reference race; each is offered only when the server flag lists it and capacity allows.

#### Step 5.1: All circuits available to rooms behind flags (Size: S)
- Acceptance criteria: Orbital, Grand Canyon, LA Nights, Snowy Tahoe, Yosemite and LAX join `duelVenues`; each needs `DUEL_EXTRA_VENUES` to be offered (as Fleet); capacity weights from Phase 2 apply; the circuit picker shows the circuit artwork.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts`
- Files likely touched: `src/duels/protocol.ts`, `server/duel-room.ts`, `src/duels/paddock.ts`.
- Blocked by: 2.2, 4.2

#### Step 5.2: Equivalence and reference races per circuit (Size: M)
- Acceptance criteria: for each new circuit a 4-seat room matches a local race (routes, every snapshot's elevation/movement/recovery, finish times), and `duel-reference.json` gains one reference race; manual shortcuts and jumps on each circuit exercised where they exist.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts tests/unit/duel-reference.test.ts`
- Blocked by: 5.1

#### Step 5.3: Browser coverage for the heavy venues (Size: S)
- Acceptance criteria: 2-device rooms on Snowy Tahoe, Yosemite and LAX (landscape workers, long load) reach Results; others covered by unit equivalence.
- Verification command: `npx playwright test --config playwright.duels.config.ts --grep "venue"`
- Blocked by: 5.2, 4.3

### Phase 6: Weekend Cup
Verified when: a group can create a cup, race three circuits before a deadline, see others' runs only after their own, and the results survive a server restart.

#### Step 6.1: Storage and cup API (Size: M)
- Acceptance criteria: Neon Free Postgres via `DATABASE_URL` on Render (in-memory store for tests and local play); HTTP API on the room server: create cup (3 circuits, laps 1–3, deadline 1/3/7 days, name), get cup, join (name, paint; device token), start a counted run, finish a counted run, get standings, get a run (only if the requester has completed their own counted run on that circuit); rate limits; cups deleted 30 days after their deadline; versions (physics, compiler, track) pinned per cup.
- Verification command: `npx vitest run tests/unit/cup-api.test.ts`
- Files likely touched: `server/cup/*.ts` (new), `server/index.ts`, `render.yaml`, `package.json` (Postgres client — gate).
- Blocked by: 2.1

#### Step 6.2: Authoritative run checking (Size: M)
- Acceptance criteria: one counted run per player per circuit, no practice. The drawn line is sent and locked when the countdown starts (that is the attempt); Hop/Thrust press ticks follow at the finish. The server compiles and re-simulates the line with those presses and records the time it computes (a client-claimed time is ignored). If the finish never arrives (app closed, phone locked, connection lost), the server races the locked line with the presses it received once the run's time is up, so quitting cannot buy a retry. Malformed or oversized runs are refused with typed errors.
- Verification command: `npx vitest run tests/unit/cup-runs.test.ts`
- Blocked by: 6.1

#### Step 6.3: Cup screens and watching runs (Size: L → split at pickup into create/join, race, results/watch)
- Acceptance criteria: create and share a cup; join from a link; per circuit: one counted draw-and-race (the screen says plainly that it counts); points per circuit by place, 10/6/4/3/2/1 then 0 (equal times share the place); cup standings by total points, ties broken by the lower total time; after your own counted run on a circuit, watch any other player's run there (re-simulated locally as a ghost race); final results after the deadline.
- Verification command: `npx playwright test tests/browser/weekend-cup.spec.ts` + public smoke extended with a cup create/read.
- Blocked by: 6.2, Phase 4 (reuses paddock cards)

### Phase 9: Verification and rollout
#### Step 9.1: Full verification (Size: S)
- Acceptance criteria: typecheck, unit, `LEGACY_BASELINE=067982d pnpm test:legacy`, builds, duel suite, browser suites incl. the new CI job, Pages smoke, public smoke.
- Blocked by: all

#### Step 9.2: Owner rollout (Size: S)
- Acceptance criteria (owner): push per stage; public smoke green; iPhone walkthrough of the paddock and a Fleet duel; frame-time benchmark on the PC; enable circuits one by one via `DUEL_EXTRA_VENUES` as `/stats` allows; create the storage project and set `DATABASE_URL` before the Weekend Cup stage.
- Blocked by: 9.1

## Delivery stages
1. Phase 0 (fixes; client-only, no server contract change except none) → bundle.
2. Phases 1–3 (CI, `/stats` + capacity, load time) → bundle (server contract changes: Render redeploys).
3. Phase 4 (paddock + guided race) → bundle.
4. Phase 5 (circuits, flags off) → bundle.
5. Phase 6 (Weekend Cup) → bundle, after the owner sets `DATABASE_URL`.

## Decision log
| Decision | Chosen option | Why |
| --- | --- | --- |
| Protocol | Stays 4 for Phases 0–5 | Paddock and circuits use existing messages; the cup is a separate HTTP API with its own version |
| New online circuits | Behind `DUEL_EXTRA_VENUES`, enabled one by one | Same rollout as Fleet; capacity is unknown until `/stats` |
| Cup times | Re-simulated on the server | The simulation is deterministic; claimed times would be trivial to fake |
| Cup storage | Neon Free Postgres (`DATABASE_URL`) | Gate 2026-11-27: free with no time limit, scales to zero; adds one Postgres client package |
| Cup format | One counted run per circuit, no practice; points 10/6/4/3/2/1 per circuit; total points, then total time | Gate 2026-11-27 |
| Cut-off counted run | Line locks at the countdown; server races it with the presses received | Gate 2026-11-27: quitting cannot buy a retry |
| New online circuits | All six behind flags, enabled by `/stats` measurement, weighted room cap | Gate 2026-11-27 |
| Order | Fixes → CI/capacity/load → paddock → circuits → Cup | Gate 2026-11-27 |

## Not yet specified
- Phase 2.2: the budget value comes from `/stats` on the live server (precise question then: which circuits fit, and how many rooms).
- Phase 3.2: fog — which modules move out is decided by the 3.1 report; the 700 kB and 30 % targets are fixed.
- Phase 6.3: exact screen layout follows the paddock's components (fog until Phase 4 lands).

## Always / Never
- Always: physics, compiler and track versions unchanged; `test:legacy` identical; line privacy; server authority; flags off for new circuits by default; free hosting unless the owner decides otherwise.
- Never in this plan: Android/iOS packaging, accounts, public matchmaking, server rewind, rule or track changes, paid services without the owner's decision.

## Future plans (owner, 2026-11-27: out of scope now, keep for later)
- Android and iOS store packaging.
- Accounts.
- Public matchmaking (open online play).
- Server rewind / lag compensation.
- Rule or track changes (e.g. softening Fleet's support-ship landing).
- Paid hosting or services, only when the owner chooses them (e.g. Render Starter for the heavy circuits).

## Progress
| Phase | Status |
| --- | --- |
| 0 Online fixes | done (stage 1: unit tests, LAX sector 10/10 repeats, duel suite 10/10, input-ownership 2/2) |
| 1 CI | not started |
| 2 Server capacity | not started |
| 3 Load time | not started |
| 4 Paddock + guided race | not started |
| 5 More circuits | not started |
| 6 Weekend Cup | not started |
| 9 Rollout | not started |
