import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import { sectionAt } from '../core/elevation';
import type { CanyonLayout } from './canyon-landscape';
import { fbm2, random, smoothstep } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { offsetPath } from './landscape/paths';
import { contactShadows, mudCracks, pebbles, ripples, tone, trails, washBeds } from './landscape/ground-paint';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

/** Paints the canyon floor in steps, then puts the map on the terrain material. */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: CanyonLayout, material: StandardMaterial): Generator<void, void> {
  const g = new GroundPainter('canyon-ground', scene, layout.extent, 2048), rand = random(91), { loose, plants } = layout.scatter();
  tone(g, rand, 1000, '255,236,214', '90,52,38');
  g.grain(9, 0.2);
  ripples(g, rand, 2500, (x, z) => 0.5 * smoothstep(26, 70, layout.D(x, z)), -0.4, 0.07);
  yield;
  washBeds(g, rand, layout.washes, '252,232,206', '98,62,46');
  // Cracked mud where floodwater pools: low flats beside the washes and in hollows.
  mudCracks(g, rand, 26, (x, z) => (layout.D(x, z) > 28 ? 1 : 0) * Math.max(Math.exp(-((Math.max(0, layout.W(x, z) - 6) / 10) ** 2)), smoothstep(0.25, 0.5, -fbm2(x / 40, z / 40, 2, 13))), '96,58,42');
  trails(g, rand, 14, p => layout.D(p.x, p.z) > 30, '128,88,66');
  // Dark feet of the trail embankments: shade where the supports meet the floor.
  const n = track.centerline.length, half = (i: number) => (sectionAt(track, track.distances[i])?.flight ? 0 : sectionAt(track, track.distances[i])!.supportWidth / 2);
  for (const side of [-1, 1]) {
    const foot = offsetPath(track.centerline, i => side * (half(i) + 1.2));
    for (let i = 1; i < n; i++) if (half(i) && half(i - 1)) g.stroke([foot[i - 1], foot[i]], 2.6, 'rgb(64,40,30)', 0.2);
  }
  yield;
  pebbles(g, rand, 42000, (x, z) => { const d = layout.D(x, z); return d < 16 ? 0 : 0.2 + 0.8 * smoothstep(0.1, 0.4, fbm2(x / 22, z / 22, 3, 43)) * smoothstep(20, 40, d); }, ['98,62,48', '140,108,92'], '255,238,220');
  yield;
  contactShadows(g, layout.rocks.filter(b => b.kind === 'rock'), loose, plants, '60,34,26');
  if (import.meta.env.DEV) Object.assign(window, { __canyonGround: g.ctx.canvas });
  material.diffuseTexture = g.finish();
}
