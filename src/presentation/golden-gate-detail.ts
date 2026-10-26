import type { Scene } from '@babylonjs/core/scene';
import type { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Point, TrackDefinition } from '../core/types';
import { samplePolyline } from '../core/geometry';
import { GOLDEN, type GoldenLayout } from './golden-gate-landscape';
import { random } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { contactShadows, cornerMarks, trails } from './landscape/ground-paint';
import { courseCorners } from './landscape/scatter';
import type { Extent } from './landscape/terrain';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

const P = (x: number, z: number): Point => ({ x, z });
const box = (b: Extent) => [P(b.minX, b.minZ), P(b.maxX, b.minZ), P(b.maxX, b.maxZ), P(b.minX, b.maxZ)];
/** A band along edge a-b, from d0 to d1 metres toward the land. */
function band(layout: GoldenLayout, a: Point, b: Point, d0: number, d1: number) {
  const len = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len, mid = P((a.x + b.x) / 2 + nx, (a.z + b.z) / 2 + nz), s = layout.onLand(mid) ? 1 : -1;
  const at = (p: Point, d: number) => P(p.x + nx * s * d, p.z + nz * s * d);
  return { polygon: [at(a, d0), at(b, d0), at(b, d1), at(a, d1)], at, len, ux: (b.x - a.x) / len, uz: (b.z - a.z) / len };
}
/** Points along an ellipse. */
const ellipse = (x: number, z: number, rx: number, rz: number, angle = 0, n = 48) => Array.from({ length: n }, (_, i) => {
  const t = i / n * Math.PI * 2, u = Math.cos(t) * rx, v = Math.sin(t) * rz;
  return P(x + u * Math.cos(angle) - v * Math.sin(angle), z + u * Math.sin(angle) + v * Math.cos(angle));
});

/**
 * Paints the city's ground map in full colour (the land's material is white): lawns with mowing
 * stripes, sidewalks along the course, plazas, seawall promenades and quays, paths, tennis courts,
 * the lagoon and fountain, flower beds, picnic blankets, slide marks and contact shadows.
 */
export function* paintGround(scene: Scene, track: TrackDefinition, layout: GoldenLayout): Generator<void, DynamicTexture> {
  const G = GOLDEN, g = new GroundPainter('golden-gate-ground', scene, G.land, 2048), c = g.ctx, rand = random(91), e = G.land;
  const anywhere = () => P(e.minX + rand() * (e.maxX - e.minX), e.minZ + rand() * (e.maxZ - e.minZ));
  // Lawn: mottled green with drier and lusher patches, then mowing stripes.
  c.fillStyle = 'rgb(108,134,72)'; c.fillRect(0, 0, g.width, g.height);
  for (let i = 0; i < 760; i++) { const p = anywhere(), light = rand() < 0.5; g.blot(p.x, p.z, 4 + rand() ** 2 * 18, light ? '200,198,118' : '44,80,38', light ? 0.13 : 0.11, 0.5 + rand() * 0.5, rand() * 3); }
  c.save(); c.translate(g.px(0), g.py(0)); c.rotate(0.42); c.fillStyle = 'rgb(226,238,176)'; c.globalAlpha = 0.065;
  for (let k = -g.m(420), w = g.m(3.4); k < g.m(420); k += 2 * w) c.fillRect(k, -g.m(420), w, g.m(840));
  c.restore();
  g.grain(17, 0.12);
  // Worn desire lines across the lawns.
  trails(g, rand, 14, p => layout.onLand(p) && !layout.paved(p, 1) && layout.D(p.x, p.z) > 16, '170,150,104');
  yield;

  // Sidewalks along the course: a curb shadow at the lawn's edge, pale paving, joints and drains.
  const loop = [...track.centerline, track.centerline[0]];
  g.stroke(loop, 2 * 12.9, 'rgb(84,82,70)', 0.5);
  g.stroke(loop, 2 * 12.5, 'rgb(198,192,178)', 1);
  for (let s = 0; s < track.length; s += 2.4) {
    const a = samplePolyline(track.centerline, track.distances, s), b = samplePolyline(track.centerline, track.distances, Math.min(track.length, s + 0.5)), l = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
    for (const side of [-1, 1]) g.stroke([P(a.x + nx * side * 8.3, a.z + nz * side * 8.3), P(a.x + nx * side * 12.4, a.z + nz * side * 12.4)], 0.07, 'rgb(120,114,100)', 0.3);
    if (Math.round(s / 2.4) % 13 === 0) for (const side of [-1, 1]) g.dot(a.x + nx * side * 9, a.z + nz * side * 9, 0.32, 'rgba(70,68,64,0.8)');
  }
  // Plazas around the city blocks: pavers, a curb and lamp bases.
  for (const plaza of layout.plazas) {
    g.fill(box({ minX: plaza.minX - 0.3, maxX: plaza.maxX + 0.3, minZ: plaza.minZ - 0.3, maxZ: plaza.maxZ + 0.3 }), 'rgb(92,88,76)', 0.45);
    g.fill(box(plaza), 'rgb(188,180,164)');
    for (let x = plaza.minX + 1.5; x < plaza.maxX; x += 1.5) g.stroke([P(x, plaza.minZ), P(x, plaza.maxZ)], 0.05, 'rgb(120,112,98)', 0.22);
    for (let z = plaza.minZ + 1.5; z < plaza.maxZ; z += 1.5) g.stroke([P(plaza.minX, z), P(plaza.maxX, z)], 0.05, 'rgb(120,112,98)', 0.22);
  }
  yield;

  // Seawalls: coping, a planting strip and the promenade (or a windbreak bed); quays: coping and paving.
  const B = G.bands;
  G.seaEdges.forEach(([ia, ib, kind]) => {
    const a = G.outline[ia], b = G.outline[ib];
    if (kind === 'promenade') {
      const walk = band(layout, a, b, B.planting, B.promenade);
      g.fill(band(layout, a, b, B.promenade - 0.1, B.promenade + 0.3).polygon, 'rgb(84,82,70)', 0.45);
      g.fill(walk.polygon, 'rgb(178,166,146)');
      for (let s = 0; s < walk.len; s += 3) g.stroke([walk.at(P(a.x + walk.ux * s, a.z + walk.uz * s), B.planting), walk.at(P(a.x + walk.ux * s, a.z + walk.uz * s), B.promenade)], 0.06, 'rgb(118,108,92)', 0.3);
      g.stroke([walk.at(a, B.promenade - 0.5), walk.at(b, B.promenade - 0.5)], 0.3, 'rgb(150,138,118)', 0.6);
      for (let s = 6; s < walk.len; s += 12) {
        const p = walk.at(P(a.x + walk.ux * s, a.z + walk.uz * s), B.promenade - 0.9);
        g.dot(p.x, p.z, 0.22, 'rgba(60,62,64,0.85)');
        if (Math.round(s / 12) % 2) { const q = walk.at(P(a.x + walk.ux * (s + 4), a.z + walk.uz * (s + 4)), B.promenade - 0.9); g.stroke([P(q.x - walk.ux * 0.9, q.z - walk.uz * 0.9), P(q.x + walk.ux * 0.9, q.z + walk.uz * 0.9)], 0.45, 'rgb(104,78,58)', 0.9); }
      }
    }
    g.fill(band(layout, a, b, B.coping, kind === 'promenade' ? B.planting : 6.8).polygon, 'rgb(96,82,62)');
    for (let i = 0; i < 260; i++) { const t = rand(), d = B.coping + rand() * ((kind === 'promenade' ? B.planting : 6.8) - B.coping), p = band(layout, a, b, 0, 0).at(P(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t), d); g.dot(p.x, p.z, 0.08 + rand() * 0.1, rand() < 0.5 ? 'rgba(70,58,44,0.7)' : 'rgba(132,116,90,0.6)'); }
    g.fill(band(layout, a, b, -0.2, B.coping).polygon, 'rgb(214,210,200)');
    g.stroke([band(layout, a, b, 0, 0).at(a, B.coping), band(layout, a, b, 0, 0).at(b, B.coping)], 0.12, 'rgb(130,126,116)', 0.6);
  });
  for (const [ia, ib] of G.quayEdges) {
    const a = G.outline[ia], b = G.outline[ib], quay = band(layout, a, b, 0, B.quay);
    g.fill(band(layout, a, b, B.quay - 0.1, B.quay + 0.3).polygon, 'rgb(84,82,70)', 0.45);
    g.fill(quay.polygon, 'rgb(182,172,152)');
    for (let s = 0; s < quay.len; s += 2.5) g.stroke([quay.at(P(a.x + quay.ux * s, a.z + quay.uz * s), B.coping), quay.at(P(a.x + quay.ux * s, a.z + quay.uz * s), B.quay)], 0.05, 'rgb(120,110,94)', 0.28);
    g.fill(band(layout, a, b, -0.2, B.coping).polygon, 'rgb(214,210,200)');
    for (let s = 3; s < quay.len; s += 6) { const p = quay.at(P(a.x + quay.ux * s, a.z + quay.uz * s), 1); g.dot(p.x, p.z, 0.2, 'rgba(52,54,56,0.9)'); }
  }
  yield;

  // Park paths: a darker edge and raked gravel.
  for (const path of layout.paths) { g.stroke(path, 3, 'rgb(140,128,100)', 0.55); g.stroke(path, 2.4, 'rgb(206,192,156)'); }
  for (let i = 0; i < 9000; i++) {
    const p = anywhere(); if (layout.pathField(p.x, p.z) > 1.1) continue;
    g.dot(p.x, p.z, 0.05 + rand() * 0.07, rand() < 0.5 ? 'rgba(150,136,110,0.6)' : 'rgba(236,226,200,0.6)');
  }
  // Tennis courts: a green surround, blue courts, white lines, the net.
  for (const court of G.courts) {
    g.fill(box(layout.courtBox(court)), 'rgb(74,124,90)');
    g.fill(box({ minX: court.x - 11.885, maxX: court.x + 11.885, minZ: court.z - 5.485, maxZ: court.z + 5.485 }), 'rgb(62,104,152)');
    const line = (pts: Point[]) => g.stroke(pts, 0.08, 'rgb(244,244,238)', 0.95);
    for (const dz of [-5.485, -4.115, 4.115, 5.485]) line([P(court.x - 11.885, court.z + dz), P(court.x + 11.885, court.z + dz)]);
    for (const dx of [-11.885, 11.885]) line([P(court.x + dx, court.z - 5.485), P(court.x + dx, court.z + 5.485)]);
    for (const dx of [-6.4, 6.4]) line([P(court.x + dx, court.z - 4.115), P(court.x + dx, court.z + 4.115)]);
    line([P(court.x - 6.4, court.z), P(court.x + 6.4, court.z)]);
    g.stroke([P(court.x, court.z - 6), P(court.x, court.z + 6)], 0.12, 'rgb(36,38,40)', 0.9);
    g.stroke(box(layout.courtBox(court)).concat([P(court.x - 13.4, court.z - 7)]), 0.12, 'rgb(46,52,50)', 0.6);
  }
  // The lagoon: a gravel ring path, a stone rim, deep water, ripples and lily pads.
  const pond = G.pond;
  g.stroke([...ellipse(pond.x, pond.z, pond.rx + 3.2, pond.rz + 3.2, pond.angle), ellipse(pond.x, pond.z, pond.rx + 3.2, pond.rz + 3.2, pond.angle)[0]], 2.2, 'rgb(206,192,156)');
  g.fill(ellipse(pond.x, pond.z, pond.rx + 0.7, pond.rz + 0.7, pond.angle), 'rgb(168,160,146)');
  g.fill(ellipse(pond.x, pond.z, pond.rx, pond.rz, pond.angle), 'rgb(46,88,96)');
  g.blot(pond.x, pond.z, pond.rx * 0.8, '30,64,74', 0.6, pond.rz / pond.rx, pond.angle);
  g.blot(pond.x - 3, pond.z - 2, 5, '150,190,190', 0.18);
  const inPond = (t: number, k: number) => { const u = Math.cos(t) * pond.rx * k, v = Math.sin(t) * pond.rz * k; return P(pond.x + u * Math.cos(pond.angle) - v * Math.sin(pond.angle), pond.z + u * Math.sin(pond.angle) + v * Math.cos(pond.angle)); };
  for (let i = 0; i < 26; i++) { const p = inPond(rand() * Math.PI * 2, 0.7 + rand() * 0.22); g.dot(p.x, p.z, 0.25 + rand() * 0.25, rand() < 0.15 ? 'rgba(236,180,200,0.95)' : 'rgba(76,120,60,0.95)'); }
  // The fountain plaza in the infield.
  const f = G.fountain;
  g.fill(ellipse(f.x, f.z, f.r + 0.3, f.r + 0.3), 'rgb(84,82,70)', 0.45);
  g.fill(ellipse(f.x, f.z, f.r, f.r), 'rgb(194,186,170)');
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.stroke([P(f.x + Math.cos(a) * f.r * 0.6, f.z + Math.sin(a) * f.r * 0.6), P(f.x + Math.cos(a) * f.r, f.z + Math.sin(a) * f.r)], 0.05, 'rgb(128,120,104)', 0.35); }
  g.fill(ellipse(f.x, f.z, f.r * 0.52, f.r * 0.52), 'rgb(222,218,208)');
  g.fill(ellipse(f.x, f.z, f.r * 0.45, f.r * 0.45), 'rgb(66,116,128)');
  g.blot(f.x, f.z, f.r * 0.3, '220,240,240', 0.6);
  g.dot(f.x, f.z, 0.35, 'rgb(200,196,186)');
  // Flower beds.
  const flowers = ['214,64,86', '240,196,64', '146,92,200', '246,244,236', '232,120,60'];
  for (const bed of G.beds) {
    g.fill(ellipse(bed.x, bed.z, bed.rx + 0.25, bed.rz + 0.25), 'rgb(206,200,186)');
    g.fill(ellipse(bed.x, bed.z, bed.rx, bed.rz), 'rgb(88,70,52)');
    for (let i = 0; i < bed.rx * bed.rz * 30; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.95, colour = flowers[(Math.floor(a * 2) + Math.floor(r * 3)) % flowers.length];
      g.dot(bed.x + Math.cos(a) * r * bed.rx, bed.z + Math.sin(a) * r * bed.rz, 0.07 + rand() * 0.06, `rgba(${colour},0.95)`);
    }
  }
  // Picnic blankets on the open lawns.
  const blankets = ['200,58,52', '58,92,172', '226,186,70', '236,236,228', '64,140,120'];
  for (let k = 0, made = 0; k < 600 && made < 22; k++) {
    const p = anywhere(); if (!layout.onLand(p) || layout.paved(p, 2) || layout.D(p.x, p.z) < 30 || layout.fromSea(p) < 8) continue;
    made++;
    const a = rand() * Math.PI, w = 1.5 + rand() * 0.5, d = 1.2 + rand() * 0.4, colour = blankets[made % blankets.length];
    c.save(); c.translate(g.px(p.x), g.py(p.z)); c.rotate(a);
    c.fillStyle = `rgb(${colour})`; c.fillRect(-g.m(w / 2), -g.m(d / 2), g.m(w), g.m(d));
    c.fillStyle = 'rgba(250,250,246,0.7)'; for (let s = -w / 2 + 0.25; s < w / 2; s += 0.5) c.fillRect(g.m(s), -g.m(d / 2), g.m(0.12), g.m(d));
    c.restore();
  }
  yield;

  // Slide marks where cars ran wide onto the sidewalk.
  cornerMarks(g, rand, track, courseCorners(track), { mark: '52,52,54', inner: 9.4 });
  // Contact shadows: blocks, park boulders, rocks on land and every plant.
  for (const b of layout.blocks) g.soft(b.footprint, 2.2, '40,44,36', 0.42);
  const { loose, plants } = layout.scatter();
  contactShadows(g, layout.rocks, loose.filter(r => r.y > -1), plants.filter(p => p.z > e.minZ), '38,48,30');
  c.globalAlpha = 1;
  if (import.meta.env.DEV) Object.assign(window, { __goldenGround: c.canvas }); // Capture tools read the painted map.
  return g.finish();
}

/** Paints the map in steps, then puts it on the city's land (full colour on a white material). */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: GoldenLayout, material: StandardMaterial): Generator<void, void> {
  material.diffuseTexture = yield* paintGround(scene, track, layout);
  material.diffuseColor = Color3.White();
}
