import type { TrackBarrier } from '../types';
import { outcrop } from './outcrop';

/** Authored valley geology, not cosmetic scatter. Every visible mass has a real footprint.
 * Roadside walls retain at least five metres of runoff from both driving corridors.
 * Their foundations may shape the surrounding ground, never the road profile. These are original, compressed Yosemite-inspired landforms.
 */
const formations: [string, number, number, number, number, number, number][] = [
  ['sentinel-buttress', -2, 0, 11, 17, 31, .2],
  ['sentinel-shoulder', -3, -21, 11, 9, 13, .5],
  ['valley-erratic', -6, 43, 6, 6, 9, .7],
  ['west-cathedral', -144.194, 35.413, 21.76, 36.72, 32.2, 0.1],
  ['west-cathedral-spire', -133.806, 56.066, 17, 18.36, 35.8, 0.4],
  ['west-cathedral-shoulder', -135.645, -37.657, 16.32, 20.4, 19, 0.3],
  ['west-glacier-wall', -138.681, -50.576, 22.44, 31.28, 34, 0.2],
  ['west-glacier-dome', -136.203, -72.473, 20.4, 24.48, 29.5, -0.2],
  ['south-cathedral-foot', -125.658, -77.524, 14.28, 17, 14.5, 0.3],
  ['south-valley-wall', -91.963, -111.149, 31.96, 19.04, 28, -0.1],
  ['south-valley-shoulder', -41, -110.935, 19.72, 14.96, 20.2, 0.2],
  ['south-sentinel-wall', 45, -104.747, 30.6, 19.72, 31, 0.1],
  ['south-sentinel-foot', 97.215, -101.615, 19.72, 16.32, 19.9, -0.2],
  ['east-washington-column', 155.224, -33.695, 19.04, 30.6, 34, 0.1],
  ['east-royal-arches', 143.77, 48.017, 23.8, 33.32, 29.2, -0.2],
  ['east-royal-shoulder', 136.131, 78.517, 22.44, 16.32, 20.5, 0.1],
  ['east-dome-foot', 131.85, 94.749, 19.72, 21.76, 25, -0.1],
  ['north-three-brothers-low', -86.655, 107.289, 23.8, 19.72, 21.4, 0.1],
  ['north-three-brothers-middle', -57.856, 121.581, 22.44, 20.4, 29.5, 0.1],
  ['north-three-brothers-high', -26.779, 137.343, 23.8, 23.12, 37.9, 0.1],
  ['north-clouds-rest', 1.186, 141.475, 28.56, 25.16, 40, -0.15],
  ['north-tenaya-dome', 74.487, 128.956, 23.12, 25.84, 35.2, 0.2],
  ['north-distant-ridge', -86.191, 115.783, 36.04, 23.8, 39.4, 0.1],
  ['east-distant-ridge', 133.242, 105.272, 22.44, 36.72, 40.6, -0.2],
];

// Smaller glacial erratics and talus clusters make the feet of the walls irregular.
const erratics: [number, number, number, number, number][] = [
  [-126.937, 25.379, 6, 12, 9], [-124.632, 50.658, 7, 8, 11], [-107.851, 69.312, 9, 7, 12],
  [-90.529, 91.079, 10, 8, 11], [-79.736, 97.752, 8, 7, 8], [-37.583, 120.235, 11, 7, 12],
  [-3.843, 123.436, 7, 9, 9], [58.168, 107.518, 8, 8, 10], [88.893, 103.788, 9, 7, 10],
  [127.836, 58.631, 7, 9, 10], [135.456, -7.248, 8, 9, 12], [136.92, -53.379, 6, 9, 9],
  [117.975, -83.337, 8, 7, 8], [91, -92.236, 9, 6, 9], [48, -92.018, 8, 8, 8],
  [-16, -93.191, 9, 7, 8], [-65, -105.477, 11, 7, 10], [-101.741, -88.058, 8, 7, 8],
  [-125.803, -53.87, 6, 9, 8], [-122.368, 11.653, 6, 7, 8],
];

export function yosemiteValleyRocks(): TrackBarrier[] {
  return [
    ...formations.map(([id, x, z, rx, rz, height, rotation], i): TrackBarrier => ({
      id: `valley-${id}`, kind: 'rock', height, terrainAnchor: true,
      footprint: outcrop(x, z, rx, rz, rotation, .7 + i * .83),
    })),
    ...erratics.map(([x, z, rx, rz, height], i): TrackBarrier => ({
      id: `valley-talus-${i + 1}`, kind: 'rock', height, terrainAnchor: true,
      footprint: outcrop(x, z, rx, rz, i * .31, 2.3 + i * .7),
    })),
  ];
}
