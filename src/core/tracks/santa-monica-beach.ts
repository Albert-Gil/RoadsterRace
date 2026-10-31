import type { Point } from '../types';

/**
 * Santa Monica v4: solid beach structures beside the road, in the venue's authored (unreflected)
 * space. Each is a 'building' barrier with exactly this footprint and height; presentation draws
 * the structure, its pad and the people on it inside the same rectangle. All stand on beach land
 * outside the loop, at least 6 m beyond the road edge and clear of the start/finish touch zone.
 * Heights stay at or below 4 m so no generic roof hardware is added.
 */
export type SantaBeachKind = 'lifeguard-tower' | 'surf-rental' | 'spectator-terrace' | 'food-truck' | 'beach-cafe' | 'beach-club';
export interface SantaBeachStructure { id: string; kind: SantaBeachKind; x: number; z: number; width: number; depth: number; height: number }

export const santaBeachStructures: readonly SantaBeachStructure[] = [
  // Beside the long beach straight, from the start corner: terrace, lifeguard tower, roped club, surf rental.
  { id: 'beach-terrace-west', kind: 'spectator-terrace', x: -73, z: -52, width: 4.5, depth: 14, height: 2.9 },
  { id: 'beach-lifeguard-tower', kind: 'lifeguard-tower', x: -73.5, z: -24, width: 4, depth: 7, height: 3.9 },
  { id: 'beach-club-west', kind: 'beach-club', x: -73, z: -12, width: 5.5, depth: 11, height: 2.5 },
  { id: 'beach-surf-rental', kind: 'surf-rental', x: -74, z: 0, width: 5, depth: 8, height: 3.2 },
  // Along the far side of the bend towards the pier: cafe, roped club, terrace and food truck.
  { id: 'beach-cafe', kind: 'beach-cafe', x: -55, z: 50, width: 8, depth: 6, height: 2.7 },
  { id: 'beach-club-north', kind: 'beach-club', x: -42, z: 51, width: 9, depth: 6, height: 2.5 },
  { id: 'beach-terrace-north', kind: 'spectator-terrace', x: -27, z: 49.5, width: 14, depth: 4.5, height: 2.9 },
  { id: 'beach-food-truck', kind: 'food-truck', x: 6, z: 60, width: 8, depth: 4, height: 3 },
];

/** The structure's axis-aligned collision rectangle (authored space). */
export const santaBeachFootprint = (s: SantaBeachStructure): Point[] => {
  const x0 = s.x - s.width / 2, z0 = s.z - s.depth / 2;
  return [{ x: x0, z: z0 }, { x: x0 + s.width, z: z0 }, { x: x0 + s.width, z: z0 + s.depth }, { x: x0, z: z0 + s.depth }];
};
