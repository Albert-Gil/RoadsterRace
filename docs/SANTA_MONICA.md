# Santa Monica — sunset pier circuit

> The phone/modes upgrade supersedes the original 12 m dimensions below: Santa Monica v2 uses 16 m roads, an opened bypass and repositioned 16 m ramp/landing corridor. See [current contracts](PHONE_AND_MODES.md).

Santa Monica is the fourth original venue (`santa-monica`, track version 1). The clockwise main route is approximately 555 m long, 12 m wide, and rated Sport / 3. The full-width start gate retains the 12 m lead-in, timing trim and unrestricted post-finish release. The normal route follows the flat bypass; the jump route saves approximately 27 m. Solo, 2–4 local drivers, 1–6 laps and tournaments use the same course definition.

## Geometry and tuning

The authored venue is reflected once into a clockwise world coordinate system; its scenery group uses the same reflection, and world building footprints are exported separately for validation. Authoritative geometry lives in `src/core/tracks/santa-monica.ts`. Land and individual pier slabs are explicit support footprints; the presentation builds the same footprints. `waterOpenings` take precedence over support. The shoreline is land-backed, the amusement deck has piles/braces, and beach shops sit within a protected island. Pier rails are deliberate exceptions to the ordinary 5–7 m infield runoff requirement.

The `pacific-hop` ramp starts at (42, -12), points east, measures 8 × 12 m and rises 1.2 m. Its lip is at x=50, the 10 m water opening ends at x=60, and the receiving deck continues to x=122. A shorter optional centerline branch maps monotonically between the bypass's entry and exit distances. The course registry, maps and Full Tour derive their contents from registered tracks.

Gravity is 9.81 m/s². Takeoff is detected inside the 120 Hz physics substep; upward speed is horizontal forward speed × 0.15. Aligned 20/30/42 m/s departures clear the gap with the existing 42 m/s horizontal cap. Tire steering, braking, acceleration and sand drag are absent in flight. Thrust remains the existing 0.7-second burst with five-second recharge. Low-speed or sideways departures can miss. Cars do not snap onto a deck after falling below it; its front face has an explicit submerged collision volume.

Failure restores the last safe grounded route point before the branch, resets velocity, rolls back checkpoints, clears commands and waits one second. Time and recharge keep running. Multiplayer waits for an unoccupied recovery position. The three-second car ghost start is unchanged. Horizontal impulses apply only while vertical vehicle envelopes overlap; there is no stacking.

## Drawing and rendering

Both retained raw samples and final smoothed geometry must pass support, water, barrier and vehicle-clearance checks. Water is accepted only after entering a complete forward ramp-to-landing corridor. Slow pace alone does not invalidate the plan. Other water crossings remain blocked. The extra branch participates in ordered validation and multiplayer standings.

Planning uses an explicitly non-physical height guide across the opening and exact ray-plane intersections on that guide/ramp. Vehicle simulation uses real support/ballistics instead. The course camera fits both branches, centers the complete venue and reserves the same interactive rectangle from drawing to racing. Car poses interpolate elevation; pitch, labels, thrust vapor, shadow size and landing suspension follow the race state. Airborne cars emit no tire marks or sand dust. Landing/splash ripples use a bounded eight-pulse mesh.

## Appearance and sound replacement

`sunsetAppearance`, `sceneryPalettes.sunset` and `sceneryLighting.sunset` in `src/presentation/themes.ts` contain the editable sunset colors. `src/presentation/santa-monica.ts` builds original procedural shops, hotels, palms, lifeguard cabins, umbrellas, deck structure, wheel and coaster. Ride motion and water animation freeze under reduced motion. Static scenery batches by material; the moving wheel/train remain separate.

Audio roles `takeoff`, `landing` and `splash` use original synthesized fallbacks in `audio.ts`. Replace them through `audio-assets.ts` with local recordings or future ElevenLabs exports; no simulation edits are needed. No third-party amusement-park logos, rides, names or artwork are used.

## Compatibility and verification

Compiler and physics versions are 8. Fresh routes are required. A narrow migration accepts valid v7 tournaments only if every scheduled track is an unchanged original course/version. Scores are reconstructed from finishes, existing schedules remain intact, and unfinished rounds require fresh drawings. Names, paints and lap preferences are unaffected. `tests/unit/legacy-handling.test.ts` records original results before the extension, with finish/lap tolerances of 10⁻⁸ seconds and exact drift/contact/recovery counts.

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser tests and `pnpm test:pages`. `tools/capture-santa-monica.mjs` captures desktop/phone/tablet views. For a genuine browser video, install Playwright FFmpeg, set `CAPTURE_RACE=1`, and run the capture tool against the local preview. Evidence is ignored under `artifacts/santa-monica/`.

Physical iPhone/iPad Safari performance, touch comfort and jump readability remain pending until tested on actual hardware. Desktop/mobile browser emulation is supplemental evidence.
