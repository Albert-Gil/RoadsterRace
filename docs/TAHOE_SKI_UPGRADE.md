# Snowy Tahoe v4 — slippery snow, summit jump and winter detail

> Historical v4 milestone. Current v5 changes and evidence are in TAHOE_GROUNDING_UPGRADE.md and TAHOE_GROUNDING_TEST_REPORT.md.

## Driving

Packed-snow grip is **26.4 m/s²**: 55% of asphalt's 48 and 68.75% of Grand
Canyon dirt's 38.4. This is about 21% less grip than Tahoe v3. Momentum slides
wider when a player overspeeds a corner; there is no timed grip debuff or reduced
top-speed setting. The 42 m/s speed cap, acceleration, braking, Thrust and Hop
remain unchanged. Packed snow has no extra drag. Deep powder retains 7.5 grip
and 1.1 drag.

## A regular ski jump

`summit-ski-crest` sits on the main road at station **364 m**, immediately before
the western descent. The final 12 m of the summit forms a groomed snow cornice
0.8 m above the former 60 m ridge. Its receiving slope remains continuous physical
terrain. There is no constructed ramp, bridge, water gap, alternate lane or new
shortcut. The 16 m road and its full-width drawing remain.

Forward crossing automatically launches a grounded car at 6 m/s or more:

`upward velocity = 8 + forward speed × 0.10`, gravity **36 m/s²**.

The same legal 20° launch/30° per second flight guidance follows the nearby drawn
line. Normal tire forces stop during flight; Thrust remains available. Actual
terrain determines landing, including supported powder outside the lane. Protected
parcels still collide during flight. Manual Hop never stacks a second impulse at
the crest, and this automatic jump has no downward cold-gas exhaust.

Computer plans anticipate the landing bend with a 24 m/s reference pace near the
crest, scaled by difficulty/opponent variation and approached using ordinary
braking. Their physics and abilities remain identical to human cars.

A landing fix makes physical height independent of stale route progression:
Tahoe's continuous heightfield always has one height per x/z. Route association
can lag an airborne car; it must not change the ground beneath that car.

## Winter presentation

- 1,050 falling flakes and 48 soft drifting-powder wisps share one bounded mesh.
  Most snowfall is concentrated near the course; gusts vary wind and density.
- Snow spawns relative to local terrain height, including the summit. Reduced
  motion hides weather and freezes the ski lift. Weather never changes grip.
- Original rental and mountain-rescue chalets occupy authored protected footprints.
- Timber courses, warm lanterns, ski racks/bindings, a rescue sled and chairlift
  skis enrich the existing shared-material resort artwork.
- No shortcut labels or new tutorial panels are added. All recorded audio is kept.

## Compatibility and review

Snowy Tahoe advances to **track 4**, vehicle rules to **16**; compiler remains 16.
Incompatible records/ghosts/tournaments are segregated or rejected using the
existing checks. Names, paints and lap preferences survive. The six other tracks'
geometry and track versions are unchanged; exact handling regression is verified
separately.

Local play: `http://127.0.0.1:5181/?circuit=snowy-tahoe`.
New evidence: `artifacts/tahoe-ski/`. The v3 mountain guide/report remain historical.
No commit, push or deployment is included. Physical iPhone/iPad Safari verification
remains pending hardware testing.
