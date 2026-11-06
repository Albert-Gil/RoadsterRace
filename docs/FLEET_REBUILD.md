# San Diego Fleet — ship-focused rebuild

This revision responds to the request for recognizable ships, higher freeboard,
visible water gaps and a less rectangular route. It preserves the separate challenge
work. The owner subsequently authorized commit and push after verification; public
publication remains gated by the verified-main Pages workflow.

## Venue and course

San Diego Fleet is now **track version 2**, with a **714.8 m** main lap and unchanged
**16 m** racing width. Broad deck sweepers and offset bends replace the original
rectangular lap. The whole authored fleet is composed on a diagonal, including
support, gates, crossing vectors, physical protection and vessel artwork.

Six stationary ships remain: two carriers, two escorts and two support vessels.
Carriers stand at **24 / 22 m**; escorts and support ships stand at **16 m**, measured
from the game's elevation datum. Visible water is at −1.6 m. These are fictional game
dimensions, not specifications of real vessels. Narrow graded gangways connect the
escorts to the next carrier, with open water and lightweight structure beneath.

The two ordinary automatic crossings retain 8 m approaches, 1.2 m lips, 10 m actual
water openings and straight receiving space. Hidden support-vessel alternatives
still require a manual Hop across 6 m of water followed by an automatic 6 m return.
They save approximately **34.3 / 32.4 m**. No shortcut signs,
activation paint or planning badges are added. Fleet Explorer still requires both
support-vessel sequences in one completed lap. CPU drivers use the ordinary route.

## Ship construction

`src/presentation/fleet-model.ts` contains original native naval geometry:

- Pointed bows, sculpted sterns, continuous hull chines, flight-deck overhangs,
  narrower waterlines, boot-topping and submerged keels.
- Outward-facing hull normals, restrained baked sky fill, large fictional hull
  numbers, anchor forms, scuppers, steel strakes, under-deck braces and life rafts.
- Larger carrier command islands with wraparound bridge glazing, exhaust stacks,
  mast/antenna structure and bounded rotating radar heads.
- Ten larger parked-aircraft envelopes, including folded-wing fighters and two
  rescue helicopters; four yellow deck tractors and distinct escort turrets.
- Neutral aviation deck striping, plate joints, arrestor courses and tie-down rows.

The shapes are stylized originals inspired by the [USS Midway Museum flight-deck
reference](https://www.midway.org/visit/our-exhibits/flight-deck-exhibits) and the
[Naval History and Heritage Command's Indianapolis photographs](https://www.history.navy.mil/content/history/museums/nmusn/explore/photography/ships-us/ships-usn-i/uss-indianapolis-ca-35.html).
No source photographs, third-party ship models, official markings or logos are copied.

Every substantial deck prop has an authored finite collider and supported footprint.
Visible deck rims and collision/support polygons share the same geometry. Landing
sponsons preserve full vehicle clearance at diagonal returns. Water openings remain
physically unsupported; invisible planning guides never become a bridge.

## Presentation and cost

Colors, naval surface finishes and camera elevation are centralized in `themes.ts`.
The harbor now receives a water finish instead of the shared terrain/sand finish.
Steel and deck finishes reuse the existing texture system, including GLSL/WGSL paths.
There are no additional lights, reflection cameras or postprocessing passes.

The same five opaque static ship batches, one water mesh and one dynamic radar batch
remain. Static shadows retain their cache. The offline production bake checks geometry
and derived edge rails. The full venue remains below 120,000 static triangles.

The fixed camera includes ship silhouettes, waterline freeboard and command-island
tops so the ships remain visible while playing. Phone elevation is **50°** rather than
the shared 65° near-overhead angle; desktop remains 42°. The drawing, preview, countdown
and racing camera are identical and stationary. Both support branches remain fitted.

## Compatibility and verification

Physics stays **19**, compiler **20**, and the other nine track versions/geometry remain
unchanged. Existing Fleet v1 routes/records/tournaments cannot silently resume on v2.
Driver preferences, historical medals/cosmetics and earned challenge stamps remain.

Use `pnpm bake:production --write-rails` after authorized physical edits, then inspect
the generated rail data and rerun route/flight tests. Other-venue regression can select
the nine unchanged IDs with `LEGACY_CIRCUITS`; without that variable, the legacy command
still checks every course.

Physical iPhone/iPad Safari drawing comfort, sound and sustained performance remain
pending actual hardware testing. Automated phone emulation is supplemental evidence.
