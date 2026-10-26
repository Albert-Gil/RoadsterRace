import type { Scene } from '@babylonjs/core/scene';
import type { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Point, TrackDefinition } from '../core/types';
import { SANTA, type SantaLayout } from './santa-monica-landscape';
import { random } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { offsetPath } from './landscape/paths';
import { contactShadows, cornerMarks, runoffWear, tone } from './landscape/ground-paint';
import { courseCorners } from './landscape/scatter';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

const P = (x: number, z: number): Point => ({ x, z });

/**
 * Paints the beach map (neutral grey leaves the sand's colour alone): groomed lanes, the swash,
 * foam and wrack lines, the bike path, volleyball courts, towels, footprints, a lifeguard truck's
 * tracks, slide marks off the course and contact shadows.
 */
export function* paintGround(scene: Scene, track: TrackDefinition, layout: SantaLayout): Generator<void, DynamicTexture> {
  const S = SANTA, e = S.extent, g = new GroundPainter('santa-monica-beach', scene, e, 1536), c = g.ctx, rand = random(57);
  const sand = (p: Point) => p.x < layout.shoreX(p.z) - 1 && layout.flatness(p.x, p.z) > 1.5 && !layout.inCourt(p, 1);
  tone(g, rand, 1100, '255,250,238', '120,100,80');
  g.grain(5, 0.18);
  // Groomed sand: the beach rake's lanes run parallel to the shore, broken around the course and anything built.
  for (let k = 0, d = -16; layout.shoreX(0) + d > e.minX; k++, d -= 2.6) {
    let run: Point[] = [];
    const flush = () => { if (run.length > 3) { g.stroke(run, 2.6, k % 2 ? 'rgb(150,128,104)' : 'rgb(255,252,244)', k % 2 ? 0.05 : 0.07); g.stroke(offsetPath(run, 1.3), 0.12, 'rgb(140,118,96)', 0.12); } run = []; };
    for (let z = e.minZ; z <= e.maxZ; z += 3) {
      const p = P(layout.shoreX(z) + d + 0.5 * Math.sin(z / 37 + k * 0.7), z);
      if (p.x > e.minX && layout.D(p.x, p.z) > 16 && sand(p) && layout.height(p.x, p.z) < S.level + 0.15) run.push(p); else flush();
    }
    flush();
  }
  yield;
  // Churned sand along the course and slide marks where cars ran wide.
  runoffWear(g, track, '150,126,100', 1);
  cornerMarks(g, rand, track, courseCorners(track), { mark: '118,94,72' });
  // The shore: swash lines on the wet sand, a wrack line of kelp and shells, foam on the slope.
  for (let k = 0; k < 6; k++) {
    const line: Point[] = [];
    for (let z = e.minZ; z <= e.maxZ; z += 1.5) line.push(P(layout.shoreX(z) - 0.4 - k * 0.9 - 0.5 * Math.abs(Math.sin(z / (5 + k) + k * 1.3)), z));
    g.stroke(line, 0.14, 'rgb(255,255,250)', 0.3 - k * 0.035);
  }
  for (let z = e.minZ; z <= e.maxZ; z += 0.9) {
    const x = layout.shoreX(z) - 6 + (rand() - 0.5) * 1.6;
    if (rand() < 0.5) g.dot(x, z + (rand() - 0.5), 0.07 + rand() * 0.08, rand() < 0.6 ? 'rgba(70,72,48,0.6)' : 'rgba(255,250,240,0.7)');
    if (rand() < 0.05) g.stroke([P(x, z), P(x + (rand() - 0.5) * 1.5, z + 0.8 + rand())], 0.14, 'rgb(60,66,40)', 0.45);
  }
  for (const [d, alpha, width] of [[2.6, 0.6, 0.5], [3.2, 0.35, 0.3], [5.4, 0.22, 0.6]] as const) {
    const line: Point[] = [];
    for (let z = e.minZ; z <= e.maxZ; z += 1.2) line.push(P(layout.shoreX(z) + d + 0.35 * Math.sin(z / 4.3 + d), z));
    g.stroke(line, width, 'rgb(255,255,255)', alpha);
  }
  yield;
  // The beach bike path: concrete with sand drifted over its edges and a dashed yellow centre line.
  g.stroke(layout.bike, 3.9, 'rgb(150,140,128)', 0.5);
  g.stroke(layout.bike, 3.2, 'rgb(255,255,255)', 0.95);
  for (let i = 0; i < layout.bike.length - 2; i += 3) g.stroke([layout.bike[i], layout.bike[i + 1]], 0.12, 'rgb(255,210,70)', 0.9);
  for (let i = 0; i < layout.bike.length; i += 2) if (rand() < 0.5) { const side = rand() < 0.5 ? -1 : 1, p = offsetPath(layout.bike, side * 1.5)[i]; g.blot(p.x, p.z, 0.8 + rand() * 1.2, '226,226,226', 0.6); }
  // Volleyball courts: raked sand and blue boundary ropes.
  for (const court of S.courts) {
    const b = layout.courtBox(court), outline = [P(b.minX, b.minZ), P(b.maxX, b.minZ), P(b.maxX, b.maxZ), P(b.minX, b.maxZ), P(b.minX, b.minZ)];
    g.fill(outline, 'rgb(250,246,236)', 0.35);
    for (let i = 0; i < 40; i++) { const p = P(b.minX + rand() * 16, b.minZ + rand() * 8); g.blot(p.x, p.z, 0.6 + rand(), '140,118,96', 0.12); }
    g.stroke(outline, 0.07, 'rgb(40,92,210)', 0.95);
    g.stroke([P(court.x, b.minZ - 0.6), P(court.x, b.maxZ + 0.6)], 0.08, 'rgb(60,60,60)', 0.6);
  }
  // Footprints wandering down to the water, and a lifeguard truck's tracks along the beach.
  for (let k = 0, made = 0; k < 400 && made < 34; k++) {
    let p = P(e.minX + 40 + rand() * (layout.shoreX(0) - e.minX - 50), e.minZ + rand() * (e.maxZ - e.minZ)); if (!sand(p) || layout.D(p.x, p.z) < 20) continue;
    made++;
    let a = (rand() - 0.5) * 1.2;
    for (let i = 0; i < 120; i++) {
      a += (rand() - 0.5) * 0.3; const dx = Math.cos(a) * 0.7, dz = Math.sin(a) * 0.7; p = P(p.x + dx, p.z + dz);
      if (!sand(p) || layout.D(p.x, p.z) < 14) break;
      const side = i % 2 ? 1 : -1; g.dot(p.x - dz / 0.7 * 0.12 * side, p.z + dx / 0.7 * 0.12 * side, 0.08, 'rgba(130,106,84,0.4)');
    }
  }
  const truck: Point[] = [];
  for (let z = e.minZ; z <= e.maxZ; z += 3) truck.push(P(layout.shoreX(z) - 19 + 2.5 * Math.sin(z / 61), z));
  for (const wheel of [-0.9, 0.9]) {
    const rut = offsetPath(truck, wheel);
    for (let i = 1; i < rut.length; i++) if (layout.D(rut[i].x, rut[i].z) > 14 && sand(rut[i])) g.stroke([rut[i - 1], rut[i]], 0.3, 'rgb(140,116,92)', 0.16);
  }
  // Towels and a few sand castles near the water.
  const towels = ['200,58,60', '60,96,190', '236,196,70', '255,255,255', '60,150,140', '230,120,170'];
  for (let k = 0, made = 0; k < 900 && made < 46; k++) {
    const z = e.minZ + 10 + rand() * (e.maxZ - e.minZ - 20), p = P(layout.shoreX(z) - 12 - rand() * 60, z);
    if (!sand(p) || layout.D(p.x, p.z) < 26 || layout.height(p.x, p.z) > S.level + 0.2) continue;
    made++;
    const w = 1.7 + rand() * 0.3, d = 0.8 + rand() * 0.2, colour = towels[made % towels.length];
    c.save(); c.translate(g.px(p.x), g.py(p.z)); c.rotate(rand() * Math.PI);
    c.fillStyle = `rgb(${colour})`; c.fillRect(-g.m(w / 2), -g.m(d / 2), g.m(w), g.m(d));
    if (made % 2) { c.fillStyle = 'rgba(255,255,255,0.75)'; for (let s = -w / 2 + 0.2; s < w / 2; s += 0.4) c.fillRect(g.m(s), -g.m(d / 2), g.m(0.1), g.m(d)); }
    c.restore();
  }
  yield;
  // Contact shadows: the venue's blocks, the groyne and its blocks on the sand, dune plants.
  for (const b of layout.barriers.filter(b => b.kind === 'infield')) g.soft(b.footprint, 2, '96,74,56', 0.3);
  const { loose, plants } = layout.scatter();
  contactShadows(g, layout.rocks, loose.filter(r => r.y > S.level - 1.2), [...plants, ...layout.decor()], '96,74,56');
  c.globalAlpha = 1;
  if (import.meta.env.DEV) Object.assign(window, { __santaGround: c.canvas }); // Capture tools read the painted map.
  return g.finish();
}

/** Paints the map in steps, then puts it on the beach's sand material. */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: SantaLayout, material: StandardMaterial): Generator<void, void> {
  material.diffuseTexture = yield* paintGround(scene, track, layout);
}
