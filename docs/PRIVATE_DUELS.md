# Private Duels beta

Multiplayer offers a same-device race and a private room. In a room, two to four human drivers each use one device. The host selects Newport Island, Golden Gate or Santa Monica and one to six laps. Open the invite or enter its code, draw privately, then lock in. The shared countdown begins once every driver has a valid line. The race menu leaves the shared clock running. Results show the same standings to everyone. Remaining drivers vote Race again or New lines; once everyone still connected has voted, any New lines vote starts a fresh drawing round (the same rule as same-device play, `src/core/rematch-vote.ts`). Votes can change until then. Online races do not award local medals, records or challenge stamps.

Each device chooses its own driver name and available paint before creating or joining a room, including through an invite. These choices persist in that device's driver preferences. Reloading an existing seat reconnects directly with its original room identity. Both multiplayer modes show only the current driver's line during drawing and preview and hide every line once planning is complete. The server sends each seat only its own stroke.

## Run locally

Use Node 24 and the pinned pnpm. Install with `pnpm install --frozen-lockfile`. Run `pnpm duel:build`, then `pnpm duel:serve` in one terminal and `pnpm dev --host 0.0.0.0` in another. Development clients use port 2567 on the device hosting the game. For a different address, set `VITE_DUEL_SERVER` to the room service's HTTPS origin before starting Vite or building. Keep the website and room service independently deployable.

## Internet test

1. Deploy the repository's Render Blueprint (`render.yaml`) to a free Oregon web service. The health endpoint is `/health`. Keep the service on free compute for this beta.
2. Set the GitHub Actions repository **variable** `ROADSTER_DUEL_SERVER` to the assigned public HTTPS origin. The existing verified Pages workflow embeds it when building the site. Use the assigned origin even if Render appends a suffix to the service name. No Render credentials belong in the game or its repository.
3. Copy the room service's Deploy Hook URL from Render Settings to the GitHub Actions secret `RENDER_DEPLOY_HOOK_URL` in the `github-pages` environment. Render's independent auto-deploy is off. The server build writes `dist-server/contract.json`: a hash of every source module in the server bundle plus the lockfile (`server/contract.ts`). `/health` reports that contract with the protocol, physics, compiler and track versions. After verification, the Pages workflow builds the same contract and calls Render only when the live contract differs, then waits for `/health` to report it before publishing. Website-only releases therefore keep live rooms. A superseded commit publishes nothing (the newer run does). A missing server variable or hook produces a workflow warning and the website still publishes; without the variable the build hides Private Duels. If a requested server update never becomes healthy, the website waits for a successful retry. Revert and release from `main` to roll back both services together.
4. Check the first join after idle, an active two-device race and a reconnect from cellular. A sleeping free instance may take about a minute to start. A process restart closes its rooms. One free instance stores sessions in memory, without accounts or a database.

## Race authority and Unity interoperability

The Colyseus server runs one existing LocalRace per room at 60 Hz. Clients submit the combined sector stroke once, in metres and elapsed milliseconds. The server uses the ordinary route compiler including off-road hazards. Other drivers receive readiness only. All four cars are rendered from shared 20 Hz reports. The display interpolates between two poses and snaps across recovery. Input feedback is local, and the server decides whether a Hop or Thrust actually fires.

Protocol 2 is defined in `src/duels/protocol.ts`. Each car in a frame is a flat array of integers (`carCodec`): positions and elevation in centimetres, angles in milliradians, times in milliseconds, booleans as 0/1 and enums as indexes. Thrust and Hop readiness are not broadcast; each seat receives its own through a `cooldowns` message when it changes. Protocol 2 frames are about 3x smaller than protocol 1 (330 kB instead of 1.0 MB per player-minute in the benchmark). A Thrust or Hop pressed in the last countdown beat is held by the client and sent with the first racing frame; a press the server has not confirmed within 0.6 s shows a "missed" notice. X/Z are horizontal metres, elevation is metres upward, positive heading rotates clockwise from +Z in radians. One tick is 1/60 second. The host chooses room settings only. Each driver has a seat ID and a separate SDK reconnection credential, stored in the joining tab's session storage. The room code is six characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L; `src/duels/codes.ts`); it is shareable and cannot reclaim a seat. The lobby offers **Share invite** (the system share sheet, where available) and **Copy link**. An invite in the old 10-character format explains that it is outdated. Before joining, the client compares `/health` versions with its own: a lower server version reads "The race server is updating", a lower client version "Your game is out of date". A rejected reconnection clears the stored seat and says the seat expired; a saved seat that could not be reclaimed at startup shows **Rejoin race**.

| Message | Meaning |
|---|---|
| Join/create options | Protocol, physics/compiler versions, supported track versions, name and paint. A mismatch requires refreshing the game. |
| room | Round number, lobby/drawing/countdown/racing/results phase, circuit/version, laps, host and seats with connection, readiness, withdrawal and vote. |
| start / line | The host locks the lobby. Each seat submits its own round number and ordered [x, z, timeMs] samples. |
| ability | Round, increasing per-seat sequence, most recent observed simulation tick and ability. Duplicate, stale and future-round inputs are discarded. Valid input takes effect on the next legal simulation step. |
| frame | Round, authoritative tick, countdown ticks remaining, car rows in `carCodec` order, standings as [player, rank, progress cm, finished, finish ms] and events since the previous broadcast. |
| cooldowns | To one seat only: its round, hopReadyAt and thrustReadyAt (s), sent when they change and on sync. |
| sync / ownLine | After joining or reconnecting, request the current view, latest frame and only that seat's accepted line and last accepted input sequence. |
| rematch | Vote for same or redraw in the current results round. The next round gets a new identity, grid and cooldowns. |

A dropped connection has 30 seconds to reclaim its seat. Its car follows the locked line without new inputs. A withdrawn, unfinished racer receives DNF and leaves contact. A finished driver keeps their finishing time. Local play runs without a room service.

When a driver reloads an invite, the saved credential reclaims the seat before the browser starts the 3D circuit. Once the scene is ready it requests the current round, the driver's own line and the latest standings, including a result reached during loading. Choosing Home explicitly releases the seat and clears its credential.

The transport pings every ten seconds and tolerates six unanswered pings. This lets a connected browser finish a slow graphics upload. A silent network loss can therefore take about a minute to detect. Once the socket closes, the room gives the driver its usual 30 seconds to reconnect.

A future Unity client can use the Colyseus C# SDK to consume the same messages. `tests/fixtures/duel-reference.json` contains actual timestamped lines, command ticks, car checkpoints, contacts, flight/recovery events and finishing order. The three reference races are renderer independent. Run `pnpm exec vitest run tests/unit/duel-reference.test.ts` to check them, and regenerate deliberately with `node --experimental-transform-types tools/duel-references.mjs` when the contract or physics changes.

## Verification and capacity

Run `pnpm typecheck`, `pnpm test`, `pnpm test:legacy`, `pnpm build` and `pnpm duel:build`. Run `pnpm exec playwright test --config playwright.duels.config.ts` for independent browser sessions, mouse/touch drawing and reconnect/rematch. For Pages smoke, build with `VITE_BASE_PATH=/RoadsterRace/` and run `pnpm test:pages`.

`node --experimental-transform-types tools/benchmark-private-duels.mjs` measures simulation/serialization time and uncompressed snapshot payload per player-minute. It excludes TLS, WebSocket overhead, joins and drawings. On the development PC, four simultaneous four-car races used a median 3.25 ms per simulation step (95th percentile 4.97 ms); protocol 2 sends about 0.33 MB of snapshots per player per minute (protocol 1: 1.00 MB). At sixteen rooms the 95th percentile reached 18.44 ms, beyond the 16.67 ms step budget. This beta admits four rooms at once. Measure on the free service before changing that limit. The public menu shows Private Duel once its server origin is configured. Physical iPhone Safari, cellular handoff and iPad play require separate hardware verification.
