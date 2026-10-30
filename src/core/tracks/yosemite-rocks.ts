import type { TrackBarrier } from '../types';
import { outcrop } from './outcrop';

/** Authored valley geology, not cosmetic scatter. Every visible mass has a real footprint.
 * Exterior walls stop well outside the driving/branch corridor; their foundations cannot
 * change its heightfield. These are original, compressed Yosemite-inspired landforms.
 */
const formations: [string, number, number, number, number, number, number][] = [
  ['sentinel-buttress', -2, 0, 11, 17, 31, .2],
  ['sentinel-shoulder', -3, -21, 11, 9, 13, .5],
  ['valley-erratic', -6, 43, 6, 6, 9, .7],
  ['west-cathedral', -193, 39, 32, 54, 84, .1],
  ['west-cathedral-spire', -205, 94, 25, 27, 96, .4],
  ['west-cathedral-shoulder', -177, -21, 24, 30, 40, .3],
  ['west-glacier-wall', -222, -52, 33, 46, 90, .2],
  ['west-glacier-dome', -240, -116, 30, 36, 75, -.2],
  ['south-cathedral-foot', -167, -104, 21, 25, 25, .3],
  ['south-valley-wall', -100, -166, 47, 28, 70, -.1],
  ['south-valley-shoulder', -41, -161, 29, 22, 44, .2],
  ['south-sentinel-wall', 45, -172, 45, 29, 80, .1],
  ['south-sentinel-foot', 100, -165, 29, 24, 43, -.2],
  ['east-washington-column', 204, -37, 28, 45, 90, .1],
  ['east-royal-arches', 203, 39, 35, 49, 74, -.2],
  ['east-royal-shoulder', 193, 104, 33, 24, 45, .1],
  ['east-dome-foot', 213, 163, 29, 32, 60, -.1],
  ['north-three-brothers-low', -134, 179, 35, 29, 48, .1],
  ['north-three-brothers-middle', -92, 203, 33, 30, 75, .1],
  ['north-three-brothers-high', -49, 227, 35, 34, 103, .1],
  ['north-clouds-rest', 22, 228, 42, 37, 110, -.15],
  ['north-tenaya-dome', 85, 246, 34, 38, 94, .2],
  ['north-distant-ridge', -164, 264, 53, 35, 108, .1],
  ['east-distant-ridge', 259, 235, 33, 54, 112, -.2],
];

// Smaller glacial erratics and talus clusters make the feet of the walls irregular.
const erratics: [number, number, number, number, number][] = [
  [-153, 22, 6, 12, 9], [-147, 62, 7, 8, 11], [-157, 113, 9, 7, 12],
  [-144, 143, 10, 8, 11], [-113, 151, 8, 7, 8], [-53, 157, 11, 7, 12],
  [3, 153, 7, 9, 9], [47, 149, 8, 8, 10], [110, 143, 9, 7, 10],
  [159, 60, 7, 9, 10], [164, 11, 8, 9, 12], [158, -59, 6, 9, 9],
  [143, -118, 8, 7, 8], [91, -121, 9, 6, 9], [48, -124, 8, 8, 8],
  [-16, -125, 9, 7, 8], [-65, -122, 11, 7, 10], [-117, -120, 8, 7, 8],
  [-148, -58, 6, 9, 8], [-159, -3, 6, 7, 8],
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
