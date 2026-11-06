# Larger abilities, solid shadows and closer scenery

This local update retains physics 18, compiler 19, every racing centerline, jump
and Hop corridor. Launchsite is track 12 and Snowy Tahoe track 6 because their
off-road scenery footprints changed. Incompatible records/tours are separated
through the existing version checks; ordinary driver preferences are preserved.

## Controls and car shadows

Thrust is 73.6 CSS pixels (64 × 1.15); Hop is 66 (44 × 1.5). Tablet controls
retain the existing short-side scaling, capped at 1.6. Separate ability ownership,
keyboard input and recharge behavior are unchanged. Short landscape and narrow
portrait HUDs leave space for the larger corner pairs and reachable Pause.

The old shadow omitted the cabin glass and wheels. A closed, 92-triangle proxy
now fills the body, roof and tyres; the original metal mesh retains the exact
rear-wing detail. The proxy shares geometry and material between cars, stays out
of the colour pass and joins the dynamic shadow list. This uses two car shadow
draws instead of the former three. The 9,904-triangle racing artwork plus proxy
totals **9,996 triangles**.

## Launchsite

Five original, unbranded steel launch vehicles have tapered noses, dark thermal
panels, welded rings, ship flaps, booster grid fins and engine clusters. They are
36–52 m tall and 7–8 m in diameter: fictional game dimensions, not specifications
of real vehicles. Three remote pads move beside the circuit; the two complex
vehicles sit where their enlarged profiles keep the road visible. Pad, vehicle
and fin footprints agree with core barriers and retain deliberate runoff.

Geometry stays in the existing static batch. The 96-billboard cryogenic-vapor
pool is unchanged, with vents following the new positions. The interactive camera
does not zoom out to include rocket tips. The service, hairpin-wing and low-tip
Hop routes are unchanged.

## Snowy Tahoe

Four exterior service/parking pockets add two tracked snowplows and four winter
SUVs, with blades, treads, snow-covered roofs and ski racks. Their geometry
follows the original hillside, stays inside dimension-matched solid footprints
and merges into the existing scenery batch. The pockets are added **after** the
terrain bake, preserving the entire terrain heightfield and racing heights.

160 far trees are replaced by 160 authored roadside firs; the total remains 499.
Their low crowns, height-aware setbacks and road-ray checks preserve the complete
driving surface. Existing resort planting and equipment remain in place.

Appearance is edited in `src/presentation/themes.ts` (`landmarkShowcase`,
`snowyTahoeAppearance`); shared positions live in `core/tracks/venue-parcels.ts`
and `core/tracks/tahoe-roadside.ts`. Controls use the two size variables at the
top of `src/style.css`. Shadow topology lives in `presentation/vehicle-shadow.ts`.

## Verification

See `SCALE_AND_SNOW_TEST_REPORT.md` for final check results and local review media.
Physical iPhone/iPad Safari comfort and performance remain pending hardware testing.
The owner subsequently authorized committing and pushing the verified update.
Publication uses the existing main-branch GitHub Pages checks and deployment.
