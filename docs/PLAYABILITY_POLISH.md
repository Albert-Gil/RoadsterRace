# Playability and venue polish — 2026-10-23

## Player-facing changes

- Live thrust controls are 56 by 56 CSS pixels (previously 48), including local multiplayer corners. Existing safe-area course framing and independent pointer ownership remain.
- Racing car artwork is 12% larger. Showcase sizing is unchanged. Replay ghost, contact shadow and smoke outlet positions follow the racing scale.
- Floating car tags are hidden during racing. Driver names, CPU identities, numbers and paint remain in setup, controls and results. The pre-start grid retains compact numbered markers.
- Pause offers Resume, an explicit Home action and Restart race. Tournament Home keeps the existing save/exit safeguard.

## Grid joining

The grid allocator uses each compiled route's accepted start/finish anchor. It picks the nearest supported, barrier-clear lateral placement in its assigned row, checking clearance against previously allocated cars. Tournament grid rotation assigns the same rows consistently in preview and simulation.

Cars aim at the forward look-ahead point through the stripe instead of chasing the exact distance-zero point. This prevents sharp lateral turns or orbits around an offset start point. No course distance is awarded behind the gate. The existing three-second car-contact ghost period remains unchanged.

Regression cases include all venues, all grid rotations, four different lateral anchors and repeated edge anchors. Ordinary steering/grip, acceleration, braking, speed limits, thrust and contact forces retain their previous tuning.

## All four environments

- Shared: brighter miniature-scene lighting, central exposure/contrast, cleaner terrain grain, lit textured water, detailed retaining concrete, rooftop parapets, HVAC grilles and protected planting beds/benches. Static details reuse existing materials and batching.
- Coastal Launch: richer coastal greens and sand, pavilion solar detailing and populated grandstand seating.
- Launchsite: warm desert palette, roof solar cells, launch-pad hazard markers and tank service bands.
- Golden Gate: stronger suspension-bridge red, blue-green inlet, detailed city rooflines and protected garden planting.
- Santa Monica: warm beachfront colors, timber deck texture, hotel roof detail, planting and an accurately placed full-width ramp, takeoff stripe and landing markings. Ramp and landing decoration now derives from the authored jump, replacing obsolete coordinates and 12-metre markings.

Decorative solids remain on existing supported rooftops or inside protected footprints. No road geometry, usable runoff, physical barrier or jump-force change is introduced by this art pass. Full-course projection remains identical between drawing and racing.

## Appearance settings

`src/presentation/themes.ts` owns vehicle scale, lighting, grading and venue palettes. `src/style.css` contains the final shared live thrust dimensions. `src/presentation/venue-polish.ts` owns the bounded original architectural/landscape pass, merged by material before racing.

## Compatibility and testing

Vehicle rules are version 9 because launch guidance and starting positions change deterministic races. Track versions and compiler version remain unchanged. Older championships cannot resume under new rules; ordinary driver preferences remain. Time Trial records/replays from older physics versions stay separate rather than being silently reused.

Automated evidence is recorded in `docs/PLAYABILITY_POLISH_VERIFICATION.md` and ignored `artifacts/polish/`. Physical iPhone/iPad Safari performance and finger comfort remain pending real-device verification.
