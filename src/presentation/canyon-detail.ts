import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { TrackDefinition } from '../core/types';
import type { CanyonLayout } from './canyon-landscape';
import { fbm2, random, smoothstep } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { contactShadows, mudCracks, pebbles, ripples, tone, trails, washBeds } from './landscape/ground-paint';
import { canyonTrails, canyonBankToes, canyonTrailEdges } from './canyon-earthwork';
import { canyonIntegration } from './themes';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

/** Paints the canyon floor in steps, then puts the map on the terrain material. */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: CanyonLayout, material: StandardMaterial, shoulder?: StandardMaterial): Generator<void, void> {
  const g = new GroundPainter('canyon-ground', scene, layout.extent, 2048), rand = random(91), { loose, plants } = layout.scatter();
  tone(g, rand, 1000, '255,236,214', '90,52,38');
  g.grain(9, 0.2);
  ripples(g, rand, 2500, (x, z) => 0.5 * smoothstep(26, 70, layout.D(x, z)), -0.4, 0.07);
  yield;
  washBeds(g, rand, layout.washes, '252,232,206', '98,62,46');
  // The floor's sediment follows the same landforms as the carved trail foundations.
  // Long, branching rills on the visible flats replace disconnected decorative stains.
  for (let i = 0; i < 55; i++) {
    const x = layout.extent.minX + rand() * (layout.extent.maxX - layout.extent.minX);
    const z = layout.extent.minZ + rand() * (layout.extent.maxZ - layout.extent.minZ);
    if (layout.D(x, z) < 29) continue;
    const points = Array.from({ length: 16 }, (_, j) => ({ x: x + j * 1.6, z: z + Math.sin(j * 0.32 + i) * 1.4 + j * 0.28 }));
    g.stroke(points, 1.2, 'rgb(106,64,46)', 0.15); g.stroke(points, 0.4, 'rgb(250,207,159)', 0.23);
  }
  // Cracked mud where floodwater pools: low flats beside the washes and in hollows.
  mudCracks(g, rand, 26, (x, z) => (layout.D(x, z) > 28 ? 1 : 0) * Math.max(Math.exp(-((Math.max(0, layout.W(x, z) - 6) / 10) ** 2)), smoothstep(0.25, 0.5, -fbm2(x / 40, z / 40, 2, 13))), '96,58,42');
  trails(g, rand, 14, p => layout.D(p.x, p.z) > 30, '128,88,66');
  // Sediment fans and soft contact at the base make the trail emerge from the floor.
  // These are flat paint: they add no support or obstacle beyond the authored road.
  for (const trail of canyonTrails(track)) for (const side of canyonBankToes(trail)) {
    g.stroke(side, 2.2, 'rgb(79,48,33)', 0.18);
    for (let i = 3; i < side.length - 1; i += 9) {
      const p = side[i], center = trail.path[i], dx = p.x - center.x, dz = p.z - center.z, d = Math.hypot(dx, dz) || 1;
      const height = (center.y ?? 0) + 2.6;
      g.blot(p.x, p.z, 2.8 + height * 0.2, '70,43,31', 0.19, 0.8);
      g.blot(p.x + dx / d * 2.8, p.z + dz / d * 2.8, 3.2 + height * 0.28, '206,150,105', 0.22, 0.65, Math.atan2(dz, dx));
    }
  }
  yield;
  pebbles(g, rand, 42000, (x, z) => { const d = layout.D(x, z); return d < 16 ? 0 : 0.2 + 0.8 * smoothstep(0.1, 0.4, fbm2(x / 22, z / 22, 3, 43)) * smoothstep(20, 40, d); }, ['98,62,48', '140,108,92'], '255,238,220');
  yield;
  contactShadows(g, layout.rocks.filter(b => b.kind === 'rock'), loose, plants, '60,34,26');
  if (import.meta.env.DEV) Object.assign(window, { __canyonGround: g.ctx.canvas });
  material.diffuseTexture = g.finish();
  yield;
  if (shoulder) {
    const cap = new GroundPainter('canyon-trail-sediment', scene, layout.extent, canyonIntegration.shoulderMapSize);
    tone(cap, rand, 1200, '255,239,214', '115,77,54', 1.5); cap.grain(733, 0.19);
    for (const trail of canyonTrails(track)) {
      // Compacted travel and diffuse shoulder deposits remain muted beneath pace colours.
      cap.stroke(trail.path, track.roadWidth + 1.4, 'rgb(158,132,105)', 0.10);
      for (const edge of canyonTrailEdges(trail)) for (let i = 1; i < edge.length - 1; i += 3) {
        const p = edge[i], c = trail.path[i], dx = c.x - p.x, dz = c.z - p.z, len = Math.hypot(dx, dz) || 1;
        const x = p.x + dx / len * 0.8, z = p.z + dz / len * 0.8;
        cap.blot(x, z, 1.5 + rand() * 2.8, rand() < 0.55 ? '255,220,171' : '107,65,43', 0.13 + rand() * 0.12, 0.4, Math.atan2(dz, dx));
        if (rand() < 0.35) cap.stroke(edge.slice(Math.max(0, i - 1), i + 2), 0.12 + rand() * 0.35, 'rgb(109,66,43)', 0.32);
      }
    }
    pebbles(cap, rand, 28000, (x, z) => layout.D(x, z) < 22 ? 0.8 : 0, ['126,89,62', '174,127,85'], '255,230,193');
    shoulder.diffuseTexture?.dispose(); shoulder.diffuseTexture = cap.finish();
  }
}
