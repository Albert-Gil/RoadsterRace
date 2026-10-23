# Heavier flight and Launchsite service lane

## Current tuning

Physics 11, compiler 10, Launchsite track 3. Other course versions are unchanged. Level-ground Hop uses 17 m/s upward velocity and shared 36 m/s² gravity: analytical peak 4.014 m, total flight 0.944 s. Seven-second recharge, thrust power/recharge, grounded handling and 0.95 sand drag are preserved.

Santa Monica retains its ramp geometry; automatic launch velocity is `8 + max(0, forwardVelocity) * lipHeight / rampLength`. Flight guidance still corrects launch momentum by at most 20 degrees and turns at most 30 degrees/second without adding speed. The same stronger gravity governs unsupported falls. Hopping on a ramp uses local height plus the normal impulse, without a second lip launch.

## Authored shortcut

The safe Launchsite bypass remains the normal centerline and every CPU plan. Its eastern bend opens locally. The optional service lane uses two approximately 12-metre-radius bends around a 16-metre-wide straight beside the relocated mission-control building. The complete branch saves approximately 34.5 m against the compiled normal route (the exact fixture measurement is recorded in verification).

The barrier occupies x 44–60 m, z −16.5 to −15.5 m and height 0–1 m. Its visible striped face follows the same footprint. Protected end wings extend inward to the assembly island and outward to the divider. The narrow divider sits between the parallel lanes; limited fork space gives less than ordinary 5–7 m runoff there, an explicit authored exception. The normal lane and manual lane retain full usable vehicle clearance.

Painted brackets approximately ten metres before the barrier mark the intended activation area at 20–30 m/s. Draw the whole service lane, then tap Hop yourself. The preview displays only a compact “Hop required” badge. Slow pace is geometrically permitted; the driver must manage approach speed and timing. Missing or mistiming Hop causes physical contact and the existing recovery. No automatic activation or special recharge is provided.

`HopShortcut` metadata supplies branch geometry, width, obstacle identity and shared entry/exit course progression. Compilation validates both retained and smoothed geometry, full vehicle clearance and forward gate traversal before storing `HopTraversal` distances. Exempting an obstacle during drawing does not exempt a racing car: a compiled traversal, manual flight, actual forward corridor and swept bottom clearance of at least 0.15 m above the barrier are all required. All other above-road protected objects remain solid during flight. Recovery retains a pre-branch safe position and awards no progress.

## Appearance and performance

Four underbody mounts are part of the shared model definition. The racing body remains below 10,000 triangles. Cold gas uses one batched crossed-sheet core mesh per car and the existing bounded vapor pool. Narrow pale cores feed widening white clouds during a 0.22 s pulse; residual vapor dissipates. Gas is clipped to actual supported ground/ramp height, with expanding ground clouds. Ordinary ramp launch has no downward exhaust. Reduced motion lowers core intensity and ground-cloud density. Landing compression and the shortened impact cue remain cosmetic.

Appearance is centralized in `hopEffects` in `src/presentation/themes.ts`; physics stays independent. Fixed overview fitting reserves a manual hop from any road boundary and the higher Santa Monica ramp, identically for drawing and racing. No dynamic camera tracking was introduced.

## Compatibility and testing

Changed physics/compiler/Launchsite versions segregate old records and reject incompatible championships. Driver names, paints and lap preferences survive. Time Trial ghost recordings retain actual height and remain isolated from contacts, effects and sound.

See `HEAVY_HOP_VERIFICATION.md` for measured tests and local captures. Physical iPhone/iPad Safari readability, comfort and sustained performance remain pending hardware testing.
