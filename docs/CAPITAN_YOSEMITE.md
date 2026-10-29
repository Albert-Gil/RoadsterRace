# Capitan Yosemite — first playable circuit

An original, fictional Yosemite-inspired venue. Its layout is not a reproduction
of park roads or an actual racing circuit.

## Driving and geometry

- ID `capitan-yosemite`, track **1**, aliases `yosemite` and `el-capitan`.
- **711.2 m**, **16 m** road, difficulty **SPORT / 3**.
- Compacted earth uses the existing packed-dirt profile: **38.4 m/s²** grip,
  no on-lane sand drag and the unchanged **42 m/s** absolute speed cap.
- The start/finish and its complete drawing approach remain flat. The main road
  climbs to **28 m**, then descends into the valley. Slope changes elevation and
  visual attitude without changing horizontal force rules.
- A continuous authoritative core heightfield supplies input projection, road
  elevation, support, recovery, body grounding and the visible landscape.

## Main-road creek jump

`valley-creek-crest` is required on the normal route. The packed-earth approach
rises naturally by about **1.2 m** over 12 m; there is no constructed ramp.
At x=10, z=-70, a forward crossing launches automatically over an **8 m** opening,
with a **16 m** corridor and a long straight receiving area.

- Vertical launch velocity: `10 + forward speed × 0.10` m/s.
- Automatic-flight gravity: existing **36 m/s²**.
- Takeoff elevation is sampled from the actual authored lip; landing uses the
  actual local terrain. Grand Canyon retains its explicit receiving level, so
  its upper jump still cannot land on the lower road.
- Existing flight assistance, airborne Thrust, manual Hop and height-aware contacts
  apply. A manual Hop never stacks another automatic takeoff impulse.
- Normal approaches at 20/30/42 m/s clear the creek. Slow or disrupted approaches
  can fall, splash and recover without free progress.
- Every CPU difficulty takes this main-road crossing using ordinary shared physics.

The rendered road is split at the authoritative water boundaries; no hidden road
skin or bridge covers the creek. Planning retains a continuous drawing guide.

## Discoverable timber trail

An unmarked forestry trail bypasses part of the western return. Its 16 m corridor
contains one fallen cedar (1.8 m high) with modest protected granite ends. Only a
compiled forward traversal grants clearance over that named obstacle. Other
protected groves, buildings and cliffs remain solid during flight. CPUs retain
the ordinary western route. No signs, preview badges or special activation paint
reveal this branch.

## Presentation

Weathered granite, rounded monolith tops, mixed-height pines, protected valley
groves, ranger lodges, picnic areas, a flowing creek, waterfall and bounded mist
are original procedural assets. Rock stays inside authored footprints/heights;
loose trees remain outside the planning corridor, and planted groves stay within
their protected parcels. Heavy terrain/forest generation lives in a lazy chunk.

Colors, density and the per-venue camera preference live in `yosemiteAppearance`
and the normal biome settings in `src/presentation/themes.ts`. Actual terrain and
collision data live in `src/core/tracks/yosemite*.ts`. Fixed framing is shared by
drawing, preview, countdown and racing. Reduced motion freezes flow and hides mist.

The circuit supports Solo Race, local Multiplayer and Time Trial, 1–6 laps,
Custom Tours and new eight-circuit Full Tours. Previously saved schedules retain
their exact rounds. Existing seven track versions, rules **16** and compiler **16**
remain unchanged. Existing sound assets and driver preferences are preserved.

Review: `http://127.0.0.1:5181/?circuit=capitan-yosemite`.
Screenshots, actual gameplay and verification: `artifacts/yosemite/`.
Physical iPhone/iPad Safari verification remains pending hardware testing.
No commit, push or deployment is included in this update.
