import type { TrackDefinition } from '../core/types';
import { insideBarrier } from '../core/barriers';
import { supported } from '../core/support';
import { gateCoordinates, startGate } from '../core/start-finish';
import { courseDistance, terrainArrays, type TerrainArrays } from './landscape/terrain-fields';
import { Geometry, edgeDistance, hex, mix } from './landscape/mesh';
import { arrayBuffers, geometryArrays, type MeshArrays } from './landscape/mesh-arrays';
import { smoothstep } from './landscape/noise';
import { yosemiteAppearance as art } from './themes';
import { yosemiteGeology } from './yosemite-geology';
import { yosemiteTreeTemplates, yosemiteUndergrowth } from './yosemite-forest';
import { yosemiteMeadowColor } from './yosemite-surfaces';
import { CREEK_BANK, creekSide, yosemiteBankGround } from './yosemite-creek-bank';

export type { MeshArrays };
export interface TreePlacement { x: number; z: number; height: number; near?: boolean }
export interface YosemiteLandscapeData { land: TerrainArrays; cliffs: MeshArrays; forest: MeshArrays; flowers: MeshArrays; trees: TreePlacement[] }

/** Every buffer of the data, for postMessage transfer lists. */
export const transferables = (data: YosemiteLandscapeData) => arrayBuffers(data.land, data.cliffs, data.forest, data.flowers);

/**
 * Capitan Yosemite's valley scenery as plain arrays (no Babylon scene): the meadow and hills, the
 * weathered granite skins, the ponderosa and cedar forest and the undergrowth. Pure and
 * deterministic, so it runs in a scenery worker (yosemite-landscape.worker.ts) or inline.
 */
export function yosemiteLandscapeData(track: TrackDefinition): YosemiteLandscapeData {
  // Smooth creek banks replace the core grid's per-node carving in the rendered ground only.
  const D = courseDistance(track, art.extent, 4), ground = yosemiteBankGround(track), height = (x: number, z: number) => ground(x, z);
  const land = terrainArrays({ extent: art.extent, cell: 4, height(x, z) { if (!supported({ x, z }, track) && !(creekSide({ x, z },track) < CREEK_BANK.blendTo)) return -3; return ground(x, z) - (1 - smoothstep(7, 10, D(x, z))) * .8; }, color: yosemiteMeadowColor });
  // The distant extension has very long triangles. Fade its border to one quiet
  // meadow tone and up-normal so copied edge patches cannot become radial stripes.
  // This changes only colours/normals, far outside the entire driving corridor.
  const { positions: landPositions, colors: landColors, normals: landNormals } = land, horizon = mix(hex(art.meadow), hex(art.dryMeadow), .35);
  for (let i = 0; i < landPositions.length; i += 3) {
    const x = landPositions[i], z = landPositions[i + 2], edge = Math.min(x - art.extent.minX, art.extent.maxX - x, z - art.extent.minZ, art.extent.maxZ - z), fade = 1 - smoothstep(0, 26, edge); if (!fade) continue;
    const c = i / 3 * 4; for (let j = 0; j < 3; j++) landColors[c + j] += (horizon[j] - landColors[c + j]) * fade;
    landNormals[i] *= 1 - fade; landNormals[i + 1] += (1 - landNormals[i + 1]) * fade; landNormals[i + 2] *= 1 - fade;
    const length = Math.hypot(landNormals[i], landNormals[i + 1], landNormals[i + 2]) || 1; for (let j = 0; j < 3; j++) landNormals[i + j] /= length;
  }
  const cliffs = geometryArrays(yosemiteGeology(track), 12);
  let seed = 6923; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const trees: TreePlacement[] = [], gate = startGate(track);
  for (let i = 0; i < 18000 && trees.length < art.treeCount; i++) {
    const x = -245 + rand() * 500, z = -160 + rand() * 430, h = art.treeHeight[0] + rand() * (art.treeHeight[1] - art.treeHeight[0]), p = { x, z };
    if (!supported(p, track) || D(x, z) < 26 + h * 1.1 || track.barriers.some(b => insideBarrier(p, b))) continue;
    trees.push({ x, z, height: h });
  }
  let nearCount = 0;
  for (let i = 0; i < 16000 && nearCount < art.nearTreeCount; i++) {
    const x = -145 + rand() * 295, z = -110 + rand() * 250, h = art.nearTreeHeight[0] + rand() * (art.nearTreeHeight[1] - art.nearTreeHeight[0]), p = { x, z }, d = D(x, z), g = gateCoordinates(p, track), r = h * .27;
    if (d < art.nearTreeSetback + 1 + h * art.nearTreeSightline || d > 31 || !supported(p, track)) continue;
    if (g.along > -gate.leadIn - 8 && g.along < 8 + 8 && Math.abs(g.across) < gate.width / 2 + 16) continue;
    if (track.barriers.some(b => insideBarrier(p, b) || edgeDistance(p, b.footprint) < r + .5) || trees.some(t => Math.hypot(t.x - x, t.z - z) < (t.height + h) * .17)) continue;
    trees.push({ x, z, height: h, near: true }); nearCount++;
  }
  for (const reserve of track.barriers.filter(b => b.kind === 'infield')) {
    const xs = reserve.footprint.map(p => p.x), zs = reserve.footprint.map(p => p.z);
    for (let i = 0; i < 260; i++) {
      const p = { x: Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), z: Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs)) }, h = 4.5 + rand() * 5.5, r = h * .27;
      if (!insideBarrier(p, reserve) || edgeDistance(p, reserve.footprint) < r || track.barriers.filter(b => b !== reserve).some(b => insideBarrier(p, b) || edgeDistance(p, b.footprint) < r + .4)) continue;
      if (trees.some(t => Math.hypot(t.x - p.x, t.z - p.z) < (t.height + h) * .16)) continue;
      trees.push({ ...p, height: h });
    }
  }
  const forest = new Geometry(), templates = yosemiteTreeTemplates();
  for (const [i, t] of trees.entries()) forest.instance(templates[i % templates.length], { x: t.x, y: height(t.x, t.z) - .05, z: t.z, scale: t.height, heading: i * 2.39996 });
  const groundDetail = new Geometry();
  let patches = 0;
  for (let i = 0; i < 5000 && patches < 1400; i++) {
    const x = -185 + rand() * 370, z = -155 + rand() * 370, p = { x, z }; if (D(x, z) < 24 || !supported(p, track) || track.barriers.some(b => insideBarrier(p, b))) continue;
    yosemiteUndergrowth(groundDetail, x, height(x, z), z, .35 + rand() * .85, i); patches++;
  }
  for (const reserve of track.barriers.filter(b => b.kind === 'infield')) {
    const xs = reserve.footprint.map(p => p.x), zs = reserve.footprint.map(p => p.z);
    for (let i = 0; i < 120; i++) {
      const p = { x: Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), z: Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs)) };
      if (!insideBarrier(p, reserve) || edgeDistance(p, reserve.footprint) < 1.4 || track.barriers.some(b => b !== reserve && insideBarrier(p, b))) continue;
      yosemiteUndergrowth(groundDetail, p.x, height(p.x, p.z), p.z, .4 + rand() * .5, i);
    }
  }
  return { land, cliffs, forest: geometryArrays(forest, 12), flowers: geometryArrays(groundDetail, 12), trees };
}
