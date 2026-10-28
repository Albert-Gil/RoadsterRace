/** Physical components inside the protected venue parcels; presentation shares their dimensions. */
export const launchsiteVessels = [
  { id: 'utility-vessel-0', x: -20, z: 3, radius: 3.7, height: 10.5 },
  { id: 'utility-vessel-1', x: -19, z: 13, radius: 4.3, height: 9.4 },
  { id: 'utility-vessel-2', x: -18.5, z: 24, radius: 3.8, height: 8.5 },
  { id: 'utility-vessel-3', x: -17, z: 33, radius: 2.9, height: 7.2 },
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
