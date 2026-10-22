import type { Point } from '../core/types';

export const cityLand = [
  { x: -125, z: -85, width: 250, depth: 109 },
  { x: -125, z: 24, width: 82, depth: 91 },
  { x: 43, z: 24, width: 82, depth: 91 },
] as const;
export interface CityBuilding { id: string; x: number; z: number; width: number; depth: number; height: number; style: 'painted' | 'brick' | 'office'; color: number }
export const cityBuildings: readonly CityBuilding[] = [
  ...[-31, -23, -16].map((x, i) => ({ id: `civic-front-${i}`, x, z: -16, width: 5.5, depth: 8, height: 5 + i * 1.4, style: 'painted' as const, color: i })),
  ...[-30, -20].map((x, i) => ({ id: `civic-rear-${i}`, x, z: -2, width: 7, depth: 9, height: 7 + i * 2, style: 'brick' as const, color: i + 3 })),
  ...[6, 13, 20].map((x, i) => ({ id: `market-${i}`, x, z: -16.5, width: 5, depth: 8, height: 4.5 + i, style: 'painted' as const, color: i + 2 })),
  ...[1, 9, 18].map((x, i) => ({ id: `waterfront-${i}`, x, z: 14, width: 6, depth: 7, height: 4.2 + i * 0.6, style: 'painted' as const, color: i + 1 })),
  ...[-22, -9, 5].flatMap((z, i) => [84.5, 94.5].map((x, j) => ({ id: `east-${i}-${j}`, x, z, width: 6, depth: 9, height: 6 + (i + j) % 3 * 2, style: 'brick' as const, color: i + j }))),
  ...[-1, 9, 19].map((z, i) => ({ id: `west-${i}`, x: -94, z, width: 10, depth: 7, height: 6 + i * 1.5, style: 'painted' as const, color: i + 2 })),
  ...[76, 88, 102].flatMap((x, i) => [76, 94].map((z, j) => ({ id: `skyline-${i}-${j}`, x, z, width: 8, depth: 10, height: 8 + (i + j) % 3 * 4, style: 'office' as const, color: i }))),
].map(b => ({ ...b, x: -b.x }));
export function buildingFootprint(b: CityBuilding): Point[] {
  return [{ x: b.x - b.width / 2, z: b.z - b.depth / 2 }, { x: b.x + b.width / 2, z: b.z - b.depth / 2 }, { x: b.x + b.width / 2, z: b.z + b.depth / 2 }, { x: b.x - b.width / 2, z: b.z + b.depth / 2 }];
}
export function onCityLand(p: Point) { return cityLand.some(a => p.x >= a.x && p.x <= a.x + a.width && p.z >= a.z && p.z <= a.z + a.depth); }
