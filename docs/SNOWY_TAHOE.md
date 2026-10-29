# Snowy Tahoe and venue refinement — 2026-10-28

**Historical first playable (v1).** The current elevated/weather v2 is documented in [TAHOE_ALPINE_UPGRADE.md](TAHOE_ALPINE_UPGRADE.md).

Snowy Tahoe is the seventh playable course (`snowy-tahoe`, track version 1).
`?circuit=tahoe` and `?circuit=lake-tahoe` are link aliases. It is a fictional
Lake Tahoe-inspired winter venue rather than a reproduction of a real road.

## First playable scope

The 554.8 m loop (difficulty 3/5) combines a long start straight, forest sweepers, an open eastern
return and an alpine lodge. The nominal road is 16 metres wide, with rounded,
bounded inside corners. The physical road is flat in this first version; the
surrounding snow hills rise outside the planning corridor. The lake lies outside
the race route, beyond the supported land. This milestone adds no automatic jump
or changing weather.

The unmarked forestry trail provides an optional manual-Hop alternative over
fallen timber, saving approximately 44.5 m against the main road. Only its named centre obstacle receives the compiled forward
Hop exemption. Granite ends, the forest reserve and the lodge stay protected.
CPU drivers use the normal road. There are no shortcut signs, activation paint,
preview badges or card descriptions.

| Surface | Lateral grip | Off-lane drag |
|---|---:|---:|
| Packed snow | 33.6 m/s² (70% of asphalt) | None |
| Deep powder | Blends to 7.5 m/s² | Blends to 1.1/s |

Acceleration, braking, steering response, shared drawing-pace mapping, speed caps,
Thrust, Hop and contacts are unchanged. `core/surfaces.ts` supplies both simulation
and CPU planning. Snow has a white powder effect and a quieter granular mix rather
than asphalt squeal; audio files remain optional with existing fallbacks.

Solo Race, local two-to-four-player Multiplayer, Time Trial/ghosts, one-to-six
laps, Full Tours and Custom Tours use the existing shared systems. Newly created
Full Tours append Snowy Tahoe; existing saved schedules are not rewritten.
Old venue versions remain unchanged, as do rules 15/compiler 16: this is an
additive surface/course, with exact regression checks for the six old venues.

## Presentation

`themes.ts` centralizes snow, packed-trail, powder, timber, fir, lake and lodge
colors. Original native scenery uses a shared snow terrain, packed trail and
compressed wheel paths; merged snow-laden fir crowns; a timber lodge with a
snow roof and warm windows; grounded logs and actual-footprint granite ends.
The forest generator loads lazily after the first frame, with pending-data readiness and a flat loading fallback. The existing CC0 sky and audio roles are reused. See `ASSET_RIGHTS.md`.

The six existing circuits receive a presentation-only pass:

- Newport Island: garden walks, furniture and layered pit entrances.
- Launchsite: connecting tank-farm pipes, saddles and service foundations.
- Golden Gate: bridge bearings, recessed storefronts, canopies and facade bands.
- Santa Monica: diagonal pier bracing and layered beachfront entrances.
- Grand Canyon: mineral variation and more grounded hillside shading.
- LA nights: layered backlot entrances, warmer/cooler facades and restrained road reflections.

Geometry, approved cut protections, support surfaces and race handling on these
six courses are preserved. Static additions reuse material batches. The same
whole-course framing applies during drawing and racing.

## Local review

Open the running preview at `http://127.0.0.1:5181/?circuit=snowy-tahoe`.
Comparison captures and verification evidence are under `artifacts/snowy-tahoe/`
(generated and ignored by Git). The final local report is `SNOWY_TAHOE_TEST_REPORT.md`.

Physical iPhone/iPad Safari comfort, thermals and sustained performance remain
pending hardware testing. Online multiplayer is still a separate future proposal.
No commit, push or deployment is part of this implementation request.
