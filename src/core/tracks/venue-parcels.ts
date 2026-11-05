/** Physical components inside the protected venue parcels; presentation shares their dimensions. */
export const launchsiteVessels = [
  { id: 'utility-vessel-0', x: -20, z: 3, radius: 3.7, height: 10.5 },
  { id: 'utility-vessel-1', x: -19, z: 13, radius: 4.3, height: 9.4 },
  { id: 'utility-vessel-2', x: -18.5, z: 24, radius: 3.8, height: 8.5 },
  { id: 'utility-vessel-3', x: -17, z: 33, radius: 2.9, height: 7.2 },
] as const;

/**
 * Launchsite v10 rocket yard: two unbranded stages lying on tall transport stands and a vertical
 * propellant tank on the protected yard plinth (1.25 m). Each stage spans x from `from` to `to`,
 * centred on `z`; its top is the stand plus the body diameter above the plinth. All three stand
 * taller than a manual Hop's 8 m peak, with gaps narrower than a car, so the yard reads as (and
 * is) impassable. The low tip inside the S is a separate Hop obstacle (hop-obstacles.ts).
 */
export const launchsiteRocketStages = [
  { id: 'rocket-yard-booster', from: 47, to: 86, z: 32, diameter: 7, cradle: 2.2 },
  { id: 'rocket-yard-upper-stage', from: 31, to: 46, z: 31, diameter: 6, cradle: 2.4 },
] as const;
export const launchsiteYardTank = { id: 'rocket-yard-tank', x: 28.3, z: 29.5, radius: 2.1, height: 9 } as const;
/** Separate staging pads; solid vehicle silhouettes, away from roads, gates and Hop lanes. */
export const launchsiteRemoteRockets = [
  {id:'north-booster-pad',x:-24,z:-58,height:30,radius:2},
  {id:'north-stage-pad',x:12,z:-56,height:28,radius:1.9},
  {id:'west-booster-pad',x:-99,z:33,height:26,radius:1.85},
] as const;

// Golden Gate's authoring coordinates are mirrored by its existing track/art builders.
export const goldenMarketFrontage = [
  { id: 'market-frontage-0', x: 5.9, z: -26, width: 7.3, depth: 6.5, height: 4.6 },
  { id: 'market-frontage-1', x: 14.2, z: -26.1, width: 6.9, depth: 6.3, height: 6.4 },
  { id: 'market-frontage-2', x: 22.5, z: -26, width: 7.4, depth: 6.4, height: 5.2 },
  // The seven-metre interval after this building is a planted pocket plaza.
  { id: 'market-frontage-3', x: 38.5, z: -26.1, width: 7.4, depth: 6.3, height: 7.8 },
  { id: 'market-frontage-4', x: 47, z: -26, width: 7.4, depth: 6.5, height: 5.8 },
  { id: 'market-frontage-5', x: 55.3, z: -26.1, width: 6.9, depth: 6.3, height: 4.4 },
  { id: 'market-frontage-6', x: 63.2, z: -26, width: 7.1, depth: 6.4, height: 6.6 },
] as const;
