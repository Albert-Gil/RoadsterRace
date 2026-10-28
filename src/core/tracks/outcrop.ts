import type { Point } from '../types';

/** A natural rock formation's footprint: an irregular, star-shaped polygon (deterministic). */
export const outcrop = (x: number, z: number, rx: number, rz: number, rotation: number, seed: number): Point[] => Array.from({ length: 14 }, (_, i) => {
  const a = i / 14 * Math.PI * 2, r = 1 + 0.16 * Math.sin(3 * a + seed) + 0.09 * Math.sin(5 * a + 2.3 * seed) + 0.05 * Math.sin(7 * a + 0.7 * seed);
  const px = Math.cos(a) * rx * r, pz = Math.sin(a) * rz * r;
  return { x: x + px * Math.cos(rotation) - pz * Math.sin(rotation), z: z + px * Math.sin(rotation) + pz * Math.cos(rotation) };
});

/** Rubble spanning a lane, with irregular faces and full-width ends for overlapping protection. */
export function rubbleRow(x: number, z: number, width: number, depth: number): Point[] {
  const face = (side: number) => Array.from({ length: 9 }, (_, i) => {
    const u = i / 8, rough = 0.67 + 0.19 * Math.sin(i * 2.1 + side) + 0.14 * Math.cos(i * 3.7);
    return { x: x + u * width, z: z + side * depth / 2 * rough };
  });
  return [...face(-1), ...face(1).reverse()];
}
