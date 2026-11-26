# Private Duels beta

Multiplayer offers a same-device race and a private room. In a room, two to four human drivers each use one device. The host selects Newport Island, Golden Gate or Santa Monica and one to six laps. Open the invite or enter its code, draw privately, then lock in. The shared countdown begins once every driver has a valid line. The race menu leaves the shared clock running. Results show the same standings to everyone. Remaining drivers vote for the same lines or a fresh drawing round. Online races do not award local medals, records or challenge stamps.

## Run locally

Use Node 24 and the pinned pnpm. Install with `pnpm install --frozen-lockfile`. Run `pnpm duel:build`, then `pnpm duel:serve` in one terminal and `pnpm dev --host 0.0.0.0` in another. Development clients use port 2567 on the device hosting the game. For a different address, set `VITE_DUEL_SERVER` to the room service's HTTPS origin before starting Vite or building. Keep the website and room service independently deployable.

## Internet test

1. Deploy the repository's Render Blueprint (`render.yaml`) to a free Oregon web service. The health endpoint is `/health`. Keep the service on free compute for this beta.
2. Set the GitHub Actions repository **variable** `ROADSTER_DUEL_SERVER` to the assigned public HTTPS origin. The existing verified Pages workflow embeds it when building the site. Use the assigned origin even if Render appends a suffix to the service name. No Render credentials belong in the game or its repository.
3. Run the Pages workflow from the verified main revision. Open Multiplayer → Private Duel and join the invite from a separate network. The browser remains under the Pages project path while the SDK connects directly to the room service.
4. Check the first join after idle, an active two-device race and a reconnect from cellular. A sleeping free instance may take about a minute to start. A process restart closes its rooms. One free instance stores sessions in memory, without accounts or a database.

## Race authority and Unity interoperability

The Colyseus server runs one existing LocalRace per room at 60 Hz. Clients submit the combined sector stroke once, in metres and elapsed milliseconds. The server uses the ordinary route compiler including off-road hazards. Other drivers receive readiness only. All four cars are rendered from shared 20 Hz reports. The display interpolates between two poses and snaps across recovery. Input feedback is local, and the server decides whether a Hop or Thrust actually fires.

Protocol 1 is defined in `src/duels/protocol.ts`. X/Z are horizontal metres, elevation is metres upward, positive heading rotates clockwise from +Z in radians. One tick is 1/60 second. The host chooses room settings only. Each driver has a seat ID and a separate SDK reconnection credential, stored in the joining tab's session storage. The room code is shareable and cannot reclaim a seat.

| Message | Meaning |
|---|---|
| Join/create options | Protocol, physics/compiler versions, supported track versions, name and paint. A mismatch requires refreshing the game. |
| room | Round number, lobby/drawing/countdown/racing/results phase, circuit/version, laps, host and seats with connection, readiness, withdrawal and vote. |
| start / line | The host locks the lobby. Each seat submits its own round number and ordered [x, z, timeMs] samples. |
| ability | Round, increasing per-seat sequence, most recent observed simulation tick and ability. Duplicate, stale and future-round inputs are discarded. Valid input takes effect on the next legal simulation step. |
| frame | Round, authoritative tick, countdown ticks remaining, car rows in the documented carFields order, standings and events since the previous broadcast. Encoded through Colyseus room messages. |
| sync / ownLine | After joining or reconnecting, request the current view, latest frame and only that seat's accepted line and last accepted input sequence. |
| rematch | Vote for same or redraw in the current results round. The next round gets a new identity, grid and cooldowns. |

A dropped connection has 30 seconds to reclaim its seat. Its car follows the locked line without new inputs. A withdrawn, unfinished racer receives DNF and leaves contact. A finished driver keeps their finishing time. Local play runs without a room service.

When a driver reloads an invite, the saved credential reclaims the seat before the browser starts the 3D circuit. Once the scene is ready it requests the current round, the driver's own line and the latest standings, including a result reached during loading. Choosing Home explicitly releases the seat and clears its credential.

The transport pings every ten seconds and tolerates six unanswered pings. This lets a connected browser finish a slow graphics upload. A silent network loss can therefore take about a minute to detect. Once the socket closes, the room gives the driver its usual 30 seconds to reconnect.

A future Unity client can use the Colyseus C# SDK to consume the same messages. `tests/fixtures/duel-reference.json` contains actual timestamped lines, command ticks, car checkpoints, contacts, flight/recovery events and finishing order. The three reference races are renderer independent. Run `pnpm exec vitest run tests/unit/duel-reference.test.ts` to check them, and regenerate deliberately with `node --experimental-transform-types tools/duel-references.mjs` when the contract or physics changes.

## Verification and capacity

Run `pnpm typecheck`, `pnpm test`, `pnpm test:legacy`, `pnpm build` and `pnpm duel:build`. Run `pnpm exec playwright test --config playwright.duels.config.ts` for independent browser sessions, mouse/touch drawing and reconnect/rematch. For Pages smoke, build with `VITE_BASE_PATH=/RoadsterRace/` and run `pnpm test:pages`.

`node --experimental-transform-types tools/benchmark-private-duels.mjs` measures simulation/serialization time and uncompressed snapshot payload per player-minute. It excludes TLS, WebSocket overhead, joins and drawings. On the development PC, four simultaneous four-car races used a median 3.25 ms per simulation step (95th percentile 4.97 ms) and about 1.00 MB of outbound snapshots per player per minute. At sixteen rooms the 95th percentile reached 18.44 ms, beyond the 16.67 ms step budget. This beta admits four rooms at once. Measure on the free service before changing that limit. The public menu shows Private Duel once its server origin is configured. Physical iPhone Safari, cellular handoff and iPad play require separate hardware verification.
