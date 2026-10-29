# Proposed next milestones — 2026-10-28

Status: the user subsequently authorized circuit refinement and the first playable **Snowy Tahoe**. Its implementation is recorded in `SNOWY_TAHOE.md`. The online stages below remain proposals: no networking, additional service or online release is authorized by that request. The original planning brief below is retained for history.

Current baseline: six playable circuits, rules 15, compiler 16, HEAD `51acfaf`. Solo Race,
local Multiplayer, Time Trial ghosts, tournaments, Thrust/Hop, physical contacts and authored
elevated jumps already exist. The previous implementation passed 549 tests. Physical iPhone
Safari comfort, thermals and sustained performance remain unverified until tested on hardware.

## Recommended order

| Order | Work | Reviewable result / gate |
|---|---|---|
| 1 | Refine existing venues, beginning with Golden Gate as a visual benchmark | Matching desktop/phone views; all approved routes, barriers and handling preserved |
| 2 | Plain-geometry Tahoe with packed-snow handling | A readable, enjoyable whole-course phone layout before building the environment |
| 3 | Complete Tahoe scenery, sound and mode integration | Seventh venue works across Solo/CPU, local Multiplayer, Time Trial and new tours |
| 4 | Small online-readiness package | Versioned race manifest, tick-stamped commands, full simulation checkpoints and restore tests |
| 5 | Private two-device online prototype | One Newport race with authoritative timing, responsive abilities and reconnection |
| 6 | Two-to-four-player online friends release | Normal collisions after three seconds, all approved courses; online tournaments follow |

The visual pass can be delivered venue by venue. Keep handling frozen during art work so its
results can be compared against the current baseline. Online stages should be separate from
snow/terrain changes so a network problem cannot be confused with new surface physics.

## Existing-circuit refinement

The priority is believable placement, material scale, readable silhouettes and natural joins.
More objects and polygons alone do not establish a higher-quality scene. Concentrate detail
at the scale visible from the fixed gameplay camera.

| Venue | Proposed refinement |
|---|---|
| Newport Island | Softer wet/dry sand and shoreline transitions; grounded palm gardens with varied planting; stronger harbour depth and pier/boat contact shadows |
| Launchsite | More coherent launch-pad/service areas, connected-looking pipework and vessel foundations; less repeated clutter; integrate the compact Hop conduit with its utility apron |
| Golden Gate | Better bridge abutments and shoreline/land transitions; varied shopfronts and city blocks; lighter cable silhouettes and believable support foundations |
| Santa Monica | More convincing pier piles, bracing and deck joints; stronger amusement silhouettes; consistent beach/promenade/pier joins and readable approach/landing surfaces |
| Grand Canyon | Continue strata, soil and lighting across the hills, jump heads and landing turn; remove residual seams and abrupt terrain transitions without restoring vertical platform walls |
| LA nights | Group warm/cool lighting more deliberately; vary facade/window patterns and building scale; strengthen road contrast and ground contact rather than making everything brighter |

Preserve approved blocked/kept cuts, matching visible/collision footprints, supported buildings,
16 m roads, generous allowed off-road lines, hidden shortcuts and the current compact controls.
No Hop signs or activation paint. Keep actual driving boundaries distinguishable from scenery.
Retain the whole-course drawing/racing camera and the 90 Time Trial / 150 four-car draw-call
targets. Compare portrait, landscape and tablet; verify on real Safari before claiming readiness.

## Tahoe: a genuinely different seventh venue

### Proposed driving brief

- Working name/id: **Tahoe / `tahoe`**. Fictional Lake Tahoe-inspired mountain setting.
- Nominal 16 m packed-snow lane, roughly **540–600 m**, difficulty around **3/5**.
- Compact loop with a clear start straight, broad forest sweepers, two open switchbacks,
  a lake-facing ledge and an inland return. Avoid a sprawling silhouette that makes phone
  drawing too small. Gentle elevation can reuse the existing authored-section system.
- The main lap remains continuously driveable. A modest optional natural-crest jump can
  reuse the existing flight system after the snow loop is proven.
- One proposed hidden Hop trail over a fallen timber/log pile: a short optional saving,
  complete approved entry/exit, protected ends, and an ordinary safe bypass. This is a new
  authored shortcut requiring its own design/acceptance, not permission to jump all scenery.

### Surface, not an asphalt reskin

Begin packed-snow grip near **70% of asphalt: 33.6 m/s²**, compared with asphalt 48,
packed dirt 38.4 and loose sand 6.5. This is a gameplay starting point to test, not a real
vehicle/tire specification. Keep the current 30 m/s drawn-pace ceiling and 42 m/s overall
cap. Initially retain acceleration/braking and add no speed-reducing drag on the packed lane.
Deep powder outside the lane should give lower grip and progressively stronger drag, without
turning an ordinary excursion into an immediate stop. Tune that transition in the prototype.

Centralize surface profiles so simulation, CPU planning, predicted braking, effects and sound
agree on packed snow versus deeper runoff. The current code only distinguishes packed dirt
from asphalt; adding more scattered surface conditionals would make future tuning fragile.
Keep the profiles in core and their material/audio roles in presentation. Snow tire noise and
a restrained powder trail replace asphalt squeal; optional recordings retain synthesis fallbacks.

### Visual brief

Blue-grey compressed snow with worn wheel paths, irregular powder edges, snow-laden pines,
granite outcrops, a deep-blue lake, distant snowy peaks and a small warm-lit lodge/service area.
Use broad natural slopes below elevated roads, not extruded white platforms. Build mountain
mass and shoulders together. Tall pines must not hide the line; foreground flakes and glare
must not obscure cars, route colors or the start rectangle. Decorative snowfall is optional,
bounded and presentation-only. Keep the first version in clear, stable weather.

### Completion gate

Both novice and aggressive lines remain drawable on phones. CPU pace uses actual snow grip;
all difficulties complete six laps and multiplayer contacts/recovery remain stable. Tire marks,
powder, support height, Hop effects and replay elevation agree. New Full Tours append Tahoe;
existing schedules are never rewritten. Give the new track its own version and isolate any
changed global rules; do not invalidate unchanged records unnecessarily. Run legacy comparisons
for an additive surface refactor and repeat normal production/device acceptance checks.

## Online play: proposed experience

Keep the three main modes. Under Multiplayer offer **Same device** and, later, **Online friends**.
One person creates a private room and shares a link/QR or room code. Each remote player uses
their own phone, retains their name/paint and draws privately at the same time. The room shows
ready status; after every route is locked, all devices share the countdown and race. Each
device displays just its own Thrust/Hop controls. Local sequential drawing remains unchanged.

The eventual friends mode keeps physical contacts after the existing three-second start
ghosting. Start the internal experiment with two devices on Newport; establish synchronized
motion before enabling contact, then verify contact before releasing friends testing. Add
four players and the other venues after that. Accounts, public matchmaking, rankings, chat,
spectators, mixed local/remote seats and online championships are later increments.

### Architecture recommendation

Keep the frontend on GitHub Pages. Pages is static hosting, so a separate running service
must handle live rooms and race state. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Prototype a **TypeScript/Node authoritative game server using Colyseus**. Its rooms and
state synchronization fit this structure; they do not automatically solve the custom racing
physics, reconnection or latency behavior. This is a recommendation to test, not a dependency
installation or hosting commitment. [Colyseus overview](https://docs.colyseus.io/),
[server-owned state synchronization](https://docs.colyseus.io/state)

Proposed data flow:

1. Devices send timestamped drawing samples; the server compiles the lap using the exact
   current rules. Preserve forgiving acceptance: barriers/water are hazards, not new reasons
   to reject an otherwise valid lap.
2. The server owns the 60 Hz shared simulation, contacts, timers, recovery and final results.
   Clients send player-owned Hop/Thrust commands with sequence/tick information, not claimed
   positions or finish times.
3. Begin testing state updates around 15–20 Hz. Clients render smoothly between updates;
   predict immediate local feedback and reconcile to the authoritative result. Validate the
   actual ability/flight correction behavior rather than assuming the framework supplies it.
4. Server timestamps determine cooldowns and command validity. Test a small shared input
   buffer and clock-offset estimation; reject duplicate commands and define a bounded policy
   for late ones. Precise Hop timing makes this a play-feel decision, not just transport work.

Planned routes and two live buttons reduce input traffic, but physical collisions still make
latency important. Current same-runtime render-rate determinism does not establish bit-identical
simulation between Safari, Chrome and a server. One authoritative race avoids requiring that
unproven property. Do not make a player's phone the only trusted race host.

The pause button in an online race opens a menu while the shared race continues. It must not
stop everyone because one phone is backgrounded. Recommended initial disconnect policy: brief
reconnect window, with the car continuing under a defined safe/CPU policy; no reset cooldowns,
new line or awarded progress on return. Final grace/takeover timing needs an explicit test.

### What to prepare before building a network service

- A versioned race manifest: protocol/build, circuit id/version, physics/compiler versions,
  seed, laps, stable driver IDs/controllers, grid rotation and locked plans.
- Tick-stamped player commands and record/replay fixtures, distinct from the current cosmetic
  30 Hz ghost recording. The ghost cannot serve as authoritative race state.
- Complete serializable simulation checkpoints and restore equivalence tests. `RaceState`
  alone is insufficient: last-safe/repeated-recovery state, collision bookkeeping, grid status,
  pending commands and controller state also affect subsequent behavior.
- A small transport/session boundary so local play does not depend on a network connection.
- A two-browser test harness with deliberate latency, jitter, disconnection and reconnection;
  then real iPhone Safari over Wi-Fi and cellular. Measure server capacity before selecting
  hosting or making cost/concurrency promises.

Test zero/50/100/150/250 ms round-trip delay as scenarios, including loss-induced stalls,
simultaneous abilities, contacts, landing/recovery, refresh, stale builds and a backgrounded
phone. These are test inputs, not a promised latency ceiling. Hosting beyond the current Pages
site requires a later implementation/release decision.

An optional smaller competitive step is **shareable ghost challenges**, using the existing
cosmetic replay. A versioned export/import file can be prototyped without a backend; a short
share link needs storage. This is asynchronous competition and must not be labelled live racing.

## Other bounded follow-ups

Independent Music/Effects sliders remain a useful small follow-up already retained in the
backlog. Keep them separate from this circuit/network work. Do not re-add instructional
panels or circuit feature captions to explain new scenery or reveal hidden shortcuts.
