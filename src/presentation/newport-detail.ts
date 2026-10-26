import type { Scene } from '@babylonjs/core/scene';
import type { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point, TrackDefinition } from '../core/types';
import { NEWPORT, type NewportLandscapeLayout } from './newport-landscape';
import { random } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { edgeDistance, insidePolygon } from './landscape/mesh';
import { contactShadows, cornerMarks, runoffWear, tone } from './landscape/ground-paint';
import { courseCorners } from './landscape/scatter';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

/**
 * Paints the island's sand (neutral grey leaves the sand's colour alone): groomed rings around the
 * course, the wet band, swash and wrack lines at the shore, churned sand and slide marks off the
 * course, footprints, towels and contact shadows.
 */
export function* paintGround(scene: Scene, track: TrackDefinition, layout: NewportLandscapeLayout): Generator<void, DynamicTexture> {
  const N = NEWPORT, e = N.map, g = new GroundPainter('newport-island', scene, e, 2048), c = g.ctx, rand = random(23);
  const built = (p: Point, margin: number) => track.barriers.some(b => insidePolygon(p, b.footprint) || edgeDistance(p, b.footprint) < margin);
  const loop = (r: number, wobble = (_a: number) => 0) => Array.from({ length: 361 }, (_, i) => { const a = i / 360 * Math.PI * 2; return layout.onRing(a, r + wobble(a)); });
  tone(g, rand, 700, '255,250,238', '120,100,80');
  g.grain(9, 0.18);
  // Groomed rings around the beach, broken around the course and the infield buildings.
  for (let k = 0, r = 0.92; r > 0.35; k++, r -= 0.032) {
    let run: Point[] = [];
    const flush = () => { if (run.length > 3) { g.stroke(run, 2.4, k % 2 ? 'rgb(150,128,104)' : 'rgb(255,252,244)', k % 2 ? 0.05 : 0.07); } run = []; };
    for (const p of loop(r, a => 0.006 * Math.sin(a * 5 + k))) { if (layout.D(p.x, p.z) > 14 && !built(p, 3)) run.push(p); else flush(); }
    flush();
  }
  yield;
  runoffWear(g, track, '150,126,100', 1);
  cornerMarks(g, rand, track, courseCorners(track), { mark: '118,94,72' });
  // The shore: a darker wet band, swash lines and a wrack line of kelp and shells.
  for (const [r, alpha] of [[0.94, 0.06], [0.952, 0.09], [0.964, 0.12], [0.976, 0.14]] as const) g.stroke(loop(r), 2.2, 'rgb(110,92,74)', alpha);
  for (let k = 0; k < 5; k++) g.stroke(loop(0.968 - k * 0.006, a => 0.004 * Math.abs(Math.sin(a * (17 + k * 3) + k))), 0.12, 'rgb(255,255,250)', 0.3 - k * 0.04);
  for (const p of loop(0.935, a => 0.004 * Math.sin(a * 23))) for (let i = 0; i < 3; i++) if (rand() < 0.5) g.dot(p.x + (rand() - 0.5) * 1.2, p.z + (rand() - 0.5) * 1.2, 0.06 + rand() * 0.07, rand() < 0.6 ? 'rgba(70,72,48,0.6)' : 'rgba(255,250,240,0.7)');
  yield;
  // Footprints and towels on the upper beach.
  for (let k = 0, made = 0; k < 300 && made < 16; k++) {
    const a = rand() * Math.PI * 2; let p = layout.onRing(a, 0.6 + rand() * 0.3); if (layout.D(p.x, p.z) < 18 || built(p, 2)) continue;
    made++;
    let h = a + (rand() < 0.5 ? 1.4 : -1.4);
    for (let i = 0; i < 70; i++) {
      h += (rand() - 0.5) * 0.3; const dx = Math.cos(h) * 0.7, dz = Math.sin(h) * 0.7; p = { x: p.x + dx, z: p.z + dz };
      if (layout.ring(p) > 0.95 || layout.D(p.x, p.z) < 14 || built(p, 1)) break;
      const side = i % 2 ? 1 : -1; g.dot(p.x - dz / 0.7 * 0.12 * side, p.z + dx / 0.7 * 0.12 * side, 0.08, 'rgba(130,106,84,0.4)');
    }
  }
  const towels = ['200,58,60', '60,96,190', '236,196,70', '255,255,255', '60,150,140', '230,120,170'];
  for (let k = 0, made = 0; k < 600 && made < 18; k++) {
    const p = layout.onRing(rand() * Math.PI * 2, 0.78 + rand() * 0.13); if (layout.D(p.x, p.z) < 26 || built(p, 3)) continue;
    made++;
    const w = 1.7 + rand() * 0.3, d = 0.8 + rand() * 0.2, colour = towels[made % towels.length];
    c.save(); c.translate(g.px(p.x), g.py(p.z)); c.rotate(rand() * Math.PI);
    c.fillStyle = `rgb(${colour})`; c.fillRect(-g.m(w / 2), -g.m(d / 2), g.m(w), g.m(d));
    if (made % 2) { c.fillStyle = 'rgba(255,255,255,0.75)'; for (let s = -w / 2 + 0.2; s < w / 2; s += 0.4) c.fillRect(g.m(s), -g.m(d / 2), g.m(0.1), g.m(d)); }
    c.restore();
  }
  const { loose, plants } = layout.scatter();
  contactShadows(g, [], loose.filter(r => layout.ring(r) < 0.99), plants, '96,74,56');
  c.globalAlpha = 1;
  if (import.meta.env.DEV) Object.assign(window, { __newportGround: c.canvas }); // Capture tools read the painted map.
  return g.finish();
}

/** Paints the map in steps, then puts it on the island's sand material. */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: NewportLandscapeLayout, material: StandardMaterial): Generator<void, void> {
  material.diffuseTexture = yield* paintGround(scene, track, layout);
}
