# Roadster visual refinement — 2026-10-29

The fictional game roadster retains its low wedge and wraparound canopy, with fuller door skins, smoother longitudinal body sampling, sculpted quarter intakes, compact mirror pods, front cooling vanes and an integrated rear aero lip replacing the large raised wing. The rear outlets and four underbody cold-gas mounts remain in their established locations.

Racing tyres have 20 angular segments instead of eight. Machined twin-spoke wheels have stationary brake discs and red calipers; only tyres, rims and spokes rotate. Front brake assemblies turn with the steering pivots. Showcase wheels use 64 segments and drilled discs. Geometry is shared between cars, with independent paint and brake-light materials.

Stainless steel gray is the default for a new driver profile and both themes. It uses a neutral gray base, metallic 0.86, roughness 0.28, restrained clear coat and a shared 128-square deterministic brushing normal map. Other colors retain a glossy painted finish. `vehicleMaterials`, `paintFinishes` and `defaultPaintId` in `src/presentation/themes.ts` control the appearance. The existing `glacier` ID now labels Stainless steel gray, preserving saved silver selections; explicitly chosen other paints remain intact. Six choices remain available.

No Tesla logo, downloaded manufacturer model or new third-party asset is shipped. The finish and sports-car proportions are visual inspiration, not a claim of official vehicle dimensions or licensed manufacturer artwork. Existing RoadsterLAB MIT attribution remains.

The race model is 9,856 triangles and the showcase is 42,988. All four fixed-brake assemblies are batched in one small mesh per car, with independent position/normal buffers following each wheel's steering and suspension. Body/wheel geometry and common materials remain shared. Brakes do not cast a separate shadow pass. The body stays inside the existing width/length adapter, uses the same wheel mounts and visual scale, and retains surface-fitted tyres/contact shadows. The replay ghost uses the matching complete geometry in one isolated cosmetic mesh. Physics, abilities, core rules, course geometry, records and driver input are unchanged by this refinement.

Local review captures and results are in `artifacts/vehicle-upgrade/`. Physical iPhone/iPad Safari appearance and performance verification remain pending hardware testing. Implementation and verification were completed locally; the owner subsequently requested committing and pushing this update.
