# Multiplayer rematches, clearer cars, Private Duel fixes and San Diego Fleet

Status: **approved by the owner 2026-11-27; in progress**. Base: GitHub `main` at `52c0301` (rules 22, compiler 21, computer 2, Fleet track 6, duel protocol 1).
Sources: the owner's plan "Multiplayer rematches, clearer cars, and San Diego Fleet" + Claude's review of 2026-11-26/27 (project doc `claude/online-private-duel.md`, status doc `claude/graphics-max-status.md`).
Destination in the repo: `plans/pending/multiplayer-rematch-fleet.md` (committed in step 0.2; `plans/` is new).

## Gate answers (2026-11-27)
| Question | Owner's choice |
| --- | --- |
| Fleet jumps | **Keep physics, compiler and track versions.** Fix with preview warning, ramp markings and a CPU retune (computer version only). |
| Server sync | **Matching contract.** `/health` reports a hash of server-relevant code and versions; Render redeploys only when it changes; missing configuration skips with a warning. |
| Netcode | **Buffer + trims now.** Playback buffer, missed-press feedback, GO-press queue, smaller frames (protocol 2), latency tests. Server rewind deferred. |
| Delivery | **Push each verified slice to main.** Each slice goes live on Pages; Fleet in duels stays behind a flag until the real-device test. |

## How slices are delivered
Claude cannot push. Each slice = one or more commits in the cloud clone on top of the latest `origin/main`, checked in the cloud, delivered as a Git bundle in `artifacts/claude-updates/` (byte-verified), merged with `git fetch .\artifacts\claude-updates\<file> main` → `git merge --ff-only FETCH_HEAD` → `git push origin main`. Claude re-fetches `main` before every bundle; parallel ChatGPT/Codex pushes to the files below cause rebases, so pause them or keep them to other files.

## Phases

### Phase 0: Release safety (first, because every slice goes live)
Verified when: a release whose server contract did not change publishes Pages without restarting Render; a contract change waits for Render; a missing hook/variable warns and still publishes.
Files to touch: `server/index.ts`, `server/vite.config.ts`, `tools/duel-contract.mjs` (new), `tools/deploy-duel-server.mjs`, `.github/workflows/pages.yml`, `docs/PRIVATE_DUELS.md`, `tests/unit/duel-contract.test.ts` (new), `plans/`.

#### Step 0.1: Contract-matched server releases (Size: M)
- Acceptance criteria: `/health` returns `{ok, revision, contract, protocol, physics, compiler, tracks}`, where `contract` = SHA-256 of `server/**`, `src/core/**`, `src/duels/**`, `src/content/circuits.ts` and `pnpm-lock.yaml` + the version tuple, computed at build time. The deploy script skips Render when the live contract equals the release contract, otherwise deploys `ref=<sha>` and waits for the contract (≤ 8 min). A missing `ROADSTER_DUEL_SERVER`/`RENDER_DEPLOY_HOOK_URL` or a superseded commit logs a warning and exits 0 (Pages still publishes; Private Duel stays hidden when no server is configured).
- Verification command: `npx vitest run tests/unit/duel-contract.test.ts` (contract stable across runs, changes when a core file changes; deploy script decisions with mocked fetch) + `pnpm duel:build && node dist-server/index.js` + `curl /health`.
- Files likely touched: as Phase 0.
- Test seams: `tools/duel-contract.mjs` pure function; deploy script decision function exported for tests.
- Blocked by: none

#### Step 0.2: Plan and progress tracking (Size: XS)
- Acceptance criteria: this plan at `plans/pending/multiplayer-rematch-fleet.md`, `plans/PROGRESS.md` with the Progress table.
- Verification command: `git show --stat HEAD`
- Blocked by: none

### Phase 1: San Diego Fleet without rule changes
Verified when: a line drawn too slowly for a ramp is flagged in the preview; the ramps, touchdown zones and ship types read clearly at Low 844×390 and in portrait; Fleet CPU times recover; physics/compiler/track versions and `test:legacy` results are unchanged.
Files to touch: `tools/fleet-ramp-speeds.mjs` (new), `src/content/ramp-clearing.json` (new), `src/core/ramp-warnings.ts` (new), `src/ui/panels/planning.ts`, `src/presentation/pace-line.ts`, `src/presentation/fleet-carrier-lane.ts`, `src/presentation/fleet-model.ts`, `fleet-superstructure.ts`, `fleet-outfit.ts`, `fleet-harbour.ts`, `src/presentation/themes.ts`, `src/core/computer.ts`, camera framing in `src/presentation/scene.ts`, tests under `tests/unit/` and `tests/browser/`.

#### Step 1.1: Ramp clearing speeds (Size: S)
- Acceptance criteria: a tool sweeps takeoff speed per automatic crossing (4 main + 2 support returns) with the real simulation and writes the minimum landing speed + 1 m/s margin to `ramp-clearing.json` (presentation data, not track data, so no track version change). Current probe: 17.7 m/s lands, ≤ 15.9 m/s splashes on carrier-a; destroyer-b-return lands at 13.5 m/s.
- Verification command: `npx vitest run tests/unit/ramp-clearing.test.ts` (re-derives one crossing quickly; fails if the table is stale for rules 22/track 6).
- Test seams: tool function exported; unit test.
- Blocked by: none

#### Step 1.2: Preview warning for slow ramps (Size: M)
- Acceptance criteria: when the compiled line's pace on an automatic ramp approach is below its clearing speed, the preview note says "N ramps need more speed" and the pace line shows a marker at each such ramp mouth; fast lines show nothing. Generic mechanism (any track with a table), populated for Fleet only.
- Verification command: `npx vitest run tests/unit/ramp-warnings.test.ts` (8 s practice line → 0 warnings; 12 s → 4) + `npx playwright test tests/browser/fleet-ramp-warning.spec.ts`.
- Test seams: `rampWarnings(route, track)` pure function; one browser spec.
- Blocked by: 1.1

#### Step 1.3: Ramp edge strips and touchdown bars (Size: M)
- Acceptance criteria: bright edge strips on the six automatic ramps, matching touchdown bars on each receiving deck, clipped to supported deck polygons; manual Hop entries and support routes stay unmarked; geometry joins existing batches.
- Verification command: `npx vitest run tests/unit/fleet-ramp-markings.test.ts` (clipping, normals, no marking on Hop entries) + `npx playwright test tests/browser/fleet-outfit.spec.ts tests/browser/car-effects-budget.spec.ts` (≤ 90 one-car / ≤ 150 four-car draw calls).
- Blocked by: none

#### Step 1.4: Ship silhouettes at gameplay scale (Size: M)
- Acceptance criteria: escorts get sharper bows and hull-side contrast; support ships get an aft-set bridge silhouette and visible workboat gear, inside existing physical envelopes; carrier lanes unchanged; existing batches only.
- Verification command: `npx vitest run tests/unit/fleet*.test.ts` + a new assertion that `sanDiegoFleetTrack` barriers/decks/jumps are deep-equal to the 52c0301 snapshot + draw-call specs.
- Blocked by: none

#### Step 1.5: Calmer harbour wakes (Size: XS)
- Acceptance criteria: wake chevrons ~40% smaller/fainter; ≥ 30 m clearance rule kept.
- Verification command: `npx vitest run tests/unit/fleet-harbour.test.ts`
- Blocked by: none

#### Step 1.6: Portrait framing for Fleet (Size: M)
- Acceptance criteria: a capture tool compares fixed camera angles at 390×844 and 430×932 portrait and reports the narrowest ramp's projected width; the chosen view keeps all crossings, both shortcuts, the start area and the flight envelope in frame and is used for preview, countdown and racing; sector drawing flow unchanged; landscape framing unchanged.
- Verification command: `node tools/capture-fleet-portrait.mjs` (numbers + images in `artifacts/fleet-portrait/`) + `npx playwright test tests/browser/sector-drawing.spec.ts`.
- Blocked by: none

#### Step 1.7: CPU retune for rules 22 (Size: M)
- **Executed 2026-11-27:** cause found: at rules 22 (45 m/s² grip, 43 m/s cap) the thrust look-ahead rejected every pre-ramp burst on Fleet, so lone computer laps lost up to ~3.5 s. Fix: Fleet-only thrust grip share 0.92 (default 0.82 elsewhere, so every other circuit's results are identical), `COMPUTER_VERSION` 3. Fleet means (2 laps, seeds 1/71/502) 52c0301 → now: Easy 66.71 → 64.97 s (target ≤ 63.2, **missed by 1.8 s**), Normal 63.72 → 62.62 s (target ≤ 62.5, **missed by 0.1 s**), Hard 62.96 → 59.80 s (target met); order Easy > Normal > Hard holds. The remaining Easy gap is traffic: cars bunched after the 5 s ghost start brake hard behind each other; a following-speed floor fixed Easy only by breaking the difficulty order and adding collisions, so it was not kept.
- Acceptance criteria: `COMPUTER_VERSION` 3. Fleet CPU mean (2 laps, seeds 1/71/502) within 2% of the pre-rules-21 values: Easy ≤ 63.2 s, Normal ≤ 62.5 s, Hard ≤ 61.4 s; difficulty order Easy > Normal > Hard by mean; no other circuit's Hard mean slower than at 52c0301. Solo championships from computer 2 do not resume (existing scoping).
- Verification command: `CPU_CIRCUIT=san-diego-fleet node --experimental-vm-modules tools/benchmark-computers.mjs current out.json` + full-circuit run with seed 1 + `npx vitest run tests/unit/computer*.test.ts`.
- Blocked by: none

### Phase 2: Local multiplayer
Verified when: 2/3/4-seat ballots resolve as specified with touch, keyboard and buttons; a completed championship saves once and replays at zero points; cars are identifiable with identical paints.
Files to touch: `src/core/rematch-vote.ts` (new), `src/ui/panels/results.ts`, `src/ui/panels/tournament.ts`, `src/main.ts`, `src/presentation/tournament-storage.ts`, `src/ui/grid-labels.ts`, `src/style.css`, `tests/unit/rematch-vote.test.ts`, `tests/browser/multiplayer.spec.ts`, `tests/browser/tournament*.spec.ts`.

#### Step 2.1: Shared ballot rule (Size: S)
- Acceptance criteria: `resolveBallot(votes, seats)` → `pending | same | redraw | home`: pending until every eligible seat voted; any Home → home; else any redraw → redraw; else same. Used by local play and the duel server.
- Verification command: `npx vitest run tests/unit/rematch-vote.test.ts`
- Blocked by: none

#### Step 2.2: Local single-race ballots (Size: M)
- Acceptance criteria: Results shows one editable choice per seat (Race Again / Draw New Lines / Home) with seat number and colour, who still has to vote, and resolves per 2.1; Race Again opens a fresh ready check with the same lines; redraw goes through private drawing; repeated inputs are idempotent; each seat's buttons are reachable by keyboard and labelled for assistive tech.
- Verification command: `npx playwright test tests/browser/multiplayer.spec.ts` (2-, 3-, 4-seat unanimous, split, Home, repeated input).
- Blocked by: 2.1

#### Step 2.3: Championship replay ballots (Size: M)
- Acceptance criteria: Next Round unchanged; after the final standings the championship is finalized and saved once, then each seat votes Replay Championship / Home; unanimous replay = same schedule, drivers, paints, laps, zero points, fresh drawings each round; any Home → main menu; a reload restores final standings with fresh ballots.
- Verification command: `npx playwright test tests/browser/tournament.spec.ts` (+ new reload case) + `npx vitest run tests/unit/tournament*.test.ts`.
- Blocked by: 2.1

#### Step 2.4: Numbered car chips (Size: S)
- Acceptance criteria: high-contrast numbered chips on the grid and through the first 2.0 s of race time, numbers and colours matching the pads, separated when cars overlap, clear of the controls; only the current driver's line in drawing/preview; no line after planning.
- Verification command: `npx playwright test tests/browser/multiplayer.spec.ts` (identical paints, overlapping cars, chip visibility at t = 1.9 s and hidden at 2.1 s) + `npx vitest run tests/unit/grid-labels.test.ts`.
- Blocked by: none

### Phase 3: Private Duels
Verified when: duel votes, invites, rejoin and errors behave as specified; frames are ≥ 3× smaller; cars move smoothly under 150 ms ± 40 ms jitter in the test proxy.
Files to touch: `server/duel-room.ts`, `src/duels/client.ts`, `src/duels/protocol.ts`, `src/duels/seat.ts`, `src/main.ts`, `src/ui/hud.ts`, `src/style.css`, `tests/unit/private-duels.test.ts`, `tests/fixtures/duel-reference.json`, `tests/duels/private.spec.ts`, `tests/duels/latency-proxy.mjs` (new), `tools/benchmark-private-duels.mjs`, `docs/PRIVATE_DUELS.md`.

#### Step 3.1: Duel ballots (Size: S)
- Acceptance criteria: server uses `resolveBallot`; votes editable until resolution; waits for reconnect reservations, then drops expired seats from the ballot; another race needs ≥ 2 players; Home leaves.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts`
- Blocked by: 2.1

#### Step 3.2: Invites, codes and rejoin (Size: M)
- Acceptance criteria: 6-character room codes from an unambiguous alphabet (no 0/O/1/I/L; ≈ 2^29.7), collision retry; **Share Invite** (`navigator.share`) where available and **Copy Link** everywhere; **Rejoin Race** for a saved seat; distinct messages for a sleeping server, an expired seat, an outdated build (compare `/health` versions before joining) and an old 10-character link.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts` + `npx playwright test --config playwright.duels.config.ts`.
- Blocked by: 0.1

#### Step 3.3: Own car and position (Size: S)
- Acceptance criteria: subtle screen-space brackets on your own car for the whole race, chips per 2.4, HUD shows your position (e.g. 2/4); indicators clear of controls.
- Verification command: duel Playwright suite (bracket follows own seat; HUD rank text).
- Blocked by: 2.4

#### Step 3.4: Protocol 2 frames and press feedback (Size: M)
- Acceptance criteria: frames carry only render fields, quantized; cooldown fields only to their own seat; ≥ 3× fewer bytes per player-minute than protocol 1 in the benchmark; a press made in the last countdown beat fires at GO; a press the server never applies shows a "missed" cue within 0.6 s; fixtures regenerated; `DUEL_PROTOCOL` 2.
- Verification command: `node --experimental-transform-types tools/benchmark-private-duels.mjs` + `npx vitest run tests/unit/private-duels.test.ts tests/unit/duel-reference.test.ts`.
- Blocked by: 3.1

#### Step 3.5: Playback buffer (Size: M)
- Acceptance criteria: client keeps a frame buffer and renders at server tick − 100 ms, interpolating by tick, extrapolating ≤ 100 ms, then holding; recovery still snaps.
- Verification command: `npx vitest run tests/unit/duel-playback.test.ts` (late, bunched and dropped frames) + 3.7.
- Blocked by: 3.4

#### Step 3.6: Host controls and capacity (Size: S)
- Acceptance criteria: host can change circuit/laps in the lobby and on results (a circuit change forces fresh lines); host can remove a driver still drawing after 90 s; server room cap 2 with a per-minute step-time log line (median/p95 ms).
- Verification command: `npx vitest run tests/unit/private-duels.test.ts`
- Blocked by: 3.1

#### Step 3.7: Latency and jitter tests (Size: M)
- Acceptance criteria: a Node TCP proxy (no new dependency) between browsers and the room server; scenarios 0, 50, 150, 250 ms RTT and 150 ± 40 ms jitter; checks: race completes, presses fire or show "missed", no backwards car motion beyond recovery snaps.
- Verification command: `npx playwright test --config playwright.duels.config.ts --grep latency`
- Blocked by: 3.5

### Phase 4: San Diego Fleet in Private Duels (behind a flag)
Verified when: Fleet duels for 2–4 players and 1–6 laps pass locally and in CI with the flag on; with the flag off Fleet is not offered.
Files to touch: `src/duels/protocol.ts`, `server/duel-room.ts`, `src/duels/client.ts`, `render.yaml` (env), `tests/unit/private-duels.test.ts`, `tests/fixtures/duel-reference.json`, `tests/duels/private.spec.ts`.

#### Step 4.1: Flagged venue (Size: S)
- Acceptance criteria: server env `DUEL_EXTRA_VENUES=san-diego-fleet` enables Fleet; `/health` lists enabled venues and the client offers only those; physics/compiler/track unchanged.
- Verification command: `npx vitest run tests/unit/private-duels.test.ts`
- Blocked by: 0.1, 3.4

#### Step 4.2: Online/local equivalence (Size: M)
- Acceptance criteria: fixture strokes (main route, both support shortcuts, a missed landing) compile to the same deck crossings on server and client; a Fleet reference race is added to `duel-reference.json`; snapshots carry elevation and recovery correctly through flight and recovery.
- Verification command: `npx vitest run tests/unit/duel-reference.test.ts tests/unit/private-duels.test.ts`
- Blocked by: 4.1

#### Step 4.3: Fleet duel browser coverage (Size: M)
- Acceptance criteria: 4-device Fleet duel with all automatic crossings, both manual shortcuts, a missed landing, reconnects during drawing, flight and recovery, portrait and landscape drawing, and line privacy across reconnects and rematches.
- Verification command: `npx playwright test --config playwright.duels.config.ts --grep fleet`
- Blocked by: 4.2, 1.6, 3.7

### Phase 5: Release
Verified when: CI is green, performance budgets hold, the owner's real-device test passes and the public build completes a Fleet duel and rematch.

#### Step 5.1: Full verification (Size: S)
- Acceptance criteria: `pnpm typecheck`, `pnpm test`, `pnpm test:legacy` (unchanged race results), `pnpm exec playwright test` (multiplayer/tournament/graphics), duel suite, Pages production checks; draw calls ≤ 90 / ≤ 150 with effects active; median frame time not > 5% worse than 52c0301 in `tools/benchmark-presentation.mjs` for Fleet and two other venues.
- Verification command: the commands listed.
- Blocked by: all of Phases 1–4

#### Step 5.2: Owner actions and flag switch (Size: S)
- Acceptance criteria (owner): Render deploy hook secret + `ROADSTER_DUEL_SERVER` variable set; a 4-player Fleet duel on real devices incl. an iPhone on cellular passes the checklist Claude provides; then `DUEL_EXTRA_VENUES` is set on Render; a complete Fleet duel and rematch on the public build.
- Verification command: owner's checklist results + `/health` showing the release contract.
- Blocked by: 5.1

## Decision log
| Decision | Chosen option | Why |
| --- | --- | --- |
| Fleet jump fix | Warning + markings + CPU retune; no rules change | Owner: keep physics/compiler/track versions, records stay valid |
| Ramp clearing data | Presentation table generated from the sim, checked by a test | Keeps the track version; stays honest if rules change |
| Server releases | Contract hash, skip when unchanged, warn on missing config | Owner choice; art releases don't end live duels or spend build minutes |
| Netcode | Buffer, trims, feedback, protocol 2; no rewind | Owner choice; rewind needs full race-state checkpoints |
| Delivery | Every verified slice to main; Fleet duels behind a server flag | Owner choice; repo keeps only main |
| Ballot rule | Any Home → home; else any redraw → redraw; else same | Owner's plan; one shared function for local and online |
| Identical paints | Allowed; chips + own-car brackets distinguish | Owner's plan; no forced recolouring |
| Room codes | 6 unambiguous characters | Typable on phones; ≈ 9×10^8 codes with 2 rooms per server |
| Room cap | 2 rooms per process | Render Free 0.1 CPU; raise after live step-time logs |

## Not yet specified
- Phase 1.6: which exact camera angle — decided by the capture tool's numbers, not a preference.
- Phase 1.7: how the retune is done (approach speeds near ramps vs plan pace limits) — researched at pickup; acceptance numbers are fixed.
- Phase 5.2: real-device checklist results depend on the owner's devices and network.
- Fog: Render's behaviour while redeploying a free instance with active rooms (only matters when the contract changes).

## Always / Never
- Always: physics 22, compiler 21, all track versions unchanged; `test:legacy` identical; draw-call limits; existing batches for new art; line privacy; local progression isolated from online races.
- Never in this release: server rewind/lag compensation, accounts, public matchmaking, Weekend Cup, more online venues than Fleet, Unity work, rule changes to jumps or recovery.

## Progress
| Phase | Status |
| --- | --- |
| 0 Release safety | done (0.1, 0.2) |
| 1 Fleet (no rule change) | done (1.1–1.7); 1.7 Easy/Normal short of target, see note |
| 2 Local multiplayer | done (2.1–2.4); championship replay covered by the existing tournament spec, run at release |
| 3 Private Duels | done (3.1–3.7) |
| 4 Fleet in duels (flag) | done (4.1–4.3); flag off in production |
| 5 Release | 5.1 done in the cloud except the frame-time benchmark (needs a quiet GPU machine): typecheck, unit, test:legacy, duel suite 8/8; 6 local browser specs time out identically on baseline 52c0301 (software WebGL). 5.2 owner checklist in `docs/PRIVATE_DUELS.md` (Enabling San Diego Fleet) |
