import type { Scene } from '@babylonjs/core/scene';
import type { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { TrackDefinition } from '../core/types';
import type { LaunchsiteLayout } from './launchsite';
import { fbm2, noise2, random, smoothstep } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { offsetPath } from './landscape/paths';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

/** Paints the ground map: tone, washes, roads, run-off wear, slide marks, gravel, pebbles and contact shadows. */
export function* paintGround(scene: Scene, track: TrackDefinition, layout: LaunchsiteLayout): Generator<void, DynamicTexture> {
  const g = new GroundPainter('launchsite-ground', scene, layout.extent, 2048), c = g.ctx, rand = random(77);
  const { extent: e } = layout;
  // Mid-scale tone: soft light and dark patches (vertex tints carry the broad colour).
  for (let i = 0; i < 900; i++) {
    const x = e.minX + rand() * (e.maxX - e.minX), z = e.minZ + rand() * (e.maxZ - e.minZ), light = rand() < 0.5;
    g.blot(x, z, 3 + rand() ** 2 * 16, light ? '255,250,238' : '95,78,62', light ? 0.09 : 0.07, 0.5 + rand() * 0.5, rand() * 3);
  }
  g.grain(5, 0.2);
  // Wind ripples on the dunes: faint crests across the wind.
  for (let i = 0; i < 5200; i++) {
    const x = e.minX + rand() * (e.maxX - e.minX), z = e.minZ + rand() * (e.maxZ - e.minZ), d = layout.D(x, z);
    if (d < 30 || rand() > smoothstep(30, 80, d)) continue;
    const len = 1.5 + rand() * 3.5, a = -0.64 + (rand() - 0.5) * 0.25, wob = (rand() - 0.5) * 0.6;
    const pts = [-1, -0.33, 0.33, 1].map((t, k) => ({ x: x + Math.cos(a) * len * t * 0.5 + (k % 2 ? wob : 0), z: z + Math.sin(a) * len * t * 0.5 }));
    g.stroke(pts, 0.18, rand() < 0.5 ? 'rgb(255,248,232)' : 'rgb(110,90,70)', 0.09);
  }
  yield;
  // Run-off apron: compacted, slightly darker sand along the course, worn smoother near the edge.
  g.stroke([...track.centerline, track.centerline[0]], 2 * 21, 'rgb(118,104,92)', 0.085);
  g.stroke([...track.centerline, track.centerline[0]], 2 * 14, 'rgb(118,104,92)', 0.06);
  for (const s of track.hopShortcuts ?? []) g.stroke(s.branch, s.width + 10, 'rgb(118,104,92)', 0.07);
  // Dry washes: pale bed, darker cut banks, braided channels and cobbles.
  for (const wash of layout.washes) {
    g.stroke(wash, 9, 'rgb(250,244,232)', 0.45);
    for (const side of [-1, 1]) g.stroke(offsetPath(wash, i => side * (4.6 + 0.9 * noise2(i * 0.05, side, 3))), 0.9, 'rgb(96,76,60)', 0.32);
    for (let k = 0; k < 3; k++) g.stroke(offsetPath(wash, i => 2.6 * noise2(i * 0.04 + k * 7, k, 11)), 0.5, k % 2 ? 'rgb(255,252,244)' : 'rgb(150,130,108)', 0.3);
    for (let i = 0; i < wash.length; i++) for (let k = 0; k < 4; k++) {
      const o = offsetPath(wash, (rand() - 0.5) * 8)[i];
      g.dot(o.x, o.z, 0.08 + rand() * 0.14, rand() < 0.5 ? 'rgba(110,92,78,0.75)' : 'rgba(170,150,130,0.7)');
    }
  }
  // Graded roads: compacted bed, berms, wheel ruts; the two-track fades out at its end.
  for (const road of layout.roads) {
    const p = road.path;
    if (road.track) {
      for (const side of [-1, 1]) { const rut = offsetPath(p, side * 0.85); for (let i = 1; i < rut.length; i++) g.stroke([rut[i - 1], rut[i]], 0.42, 'rgb(112,92,74)', 0.24 * Math.min(1, (rut.length - i) / 40)); }
      continue;
    }
    g.stroke(p, road.width + 1.6, 'rgb(130,112,94)', 0.16);
    g.stroke(p, road.width, 'rgb(246,238,224)', 0.4);
    for (const side of [-1, 1]) {
      g.stroke(offsetPath(p, side * (road.width / 2 + 0.5)), 0.7, 'rgb(98,80,64)', 0.25);
      for (const lane of [0.6, 1.9]) g.stroke(offsetPath(p, side * lane), 0.32, 'rgb(105,88,72)', 0.2);
    }
  }
  yield;
  // Slide marks where cars ran wide, and gravel at the outside of the tightest corners.
  const line = track.centerline, n = line.length;
  const slice = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => line[(from + k) % n]);
  for (const corner of layout.scatter().corners) {
    const len = corner.to - corner.from, outside = corner.side; // A right turn (heading rising) runs wide to its left: positive offsets.
    if (corner.sharpness > 1.1) {
      const arc = slice(corner.from + Math.floor(len * 0.15), corner.to + 4), inner = offsetPath(arc, outside * 9.6);
      const outer = offsetPath(arc, i => outside * (9.6 + 7.5 * Math.sin(Math.PI * Math.min(1, (i + 0.5) / arc.length))));
      g.fill([...inner, ...outer.slice().reverse()], 'rgb(150,140,130)', 0.22);
      for (let k = 0; k < arc.length * 70; k++) {
        const f = rand() * (arc.length - 1), i = Math.floor(f), u = f - i, t = rand();
        const ax = inner[i].x + (inner[i + 1].x - inner[i].x) * u, az = inner[i].z + (inner[i + 1].z - inner[i].z) * u, bx = outer[i].x + (outer[i + 1].x - outer[i].x) * u, bz = outer[i].z + (outer[i + 1].z - outer[i].z) * u;
        g.dot(ax + (bx - ax) * t, az + (bz - az) * t, 0.07 + rand() * 0.1, rand() < 0.55 ? 'rgba(92,86,82,0.7)' : 'rgba(205,198,188,0.75)');
      }
      g.stroke(inner, 0.25, 'rgb(90,80,70)', 0.3);
    }
    for (let m = 0; m < 1 + Math.floor(corner.sharpness * 1.4); m++) {
      const start = corner.from + Math.floor(len * (0.3 + rand() * 0.4)), run = slice(start, start + 14 + Math.floor(rand() * 22)), wide = 1 + rand() * 4.2, base = 9.8 + rand() * 1.4;
      const path = offsetPath(run, i => outside * (base + wide * Math.sin(Math.PI * i / (run.length - 1))));
      const alpha = 0.1 + rand() * 0.1;
      for (const wheel of [-0.8, 0.8]) g.stroke(offsetPath(path, wheel), 0.32, 'rgb(84,66,50)', alpha);
    }
  }
  // A couple of spin marks in the wide run-off.
  for (const [x, z] of [[-90, -24], [60, -54]]) for (let k = 0; k < 2; k++) g.stroke(Array.from({ length: 25 }, (_, i) => ({ x: x + Math.cos(i / 24 * 5.4) * (2.4 + k * 1.5), z: z + Math.sin(i / 24 * 5.4) * (2.4 + k * 1.5) * 0.85 })), 0.32, 'rgb(84,66,50)', 0.18);
  // Launch pad blast: soot and streaks fanning out from the pad.
  g.blot(97, 20, 30, '60,50,44', 0.22);
  for (let i = 0; i < 90; i++) { const a = rand() * Math.PI * 2, r0 = 10 + rand() * 6, r1 = r0 + 6 + rand() * 18; g.stroke([{ x: 97 + Math.cos(a) * r0, z: 20 + Math.sin(a) * r0 }, { x: 97 + Math.cos(a) * r1, z: 20 + Math.sin(a) * r1 }], 0.4 + rand() * 0.8, 'rgb(70,58,48)', 0.06); }
  yield;
  // Pebbles: denser on desert pavement and near rock; a lit edge toward the sun.
  for (let i = 0; i < 46000; i++) {
    const x = e.minX + rand() * (e.maxX - e.minX), z = e.minZ + rand() * (e.maxZ - e.minZ), d = layout.D(x, z);
    const pavement = smoothstep(0.12, 0.42, fbm2(x / 24, z / 24, 3, 41)), keep = 0.18 + 0.82 * pavement * smoothstep(24, 40, d);
    if (d < 10 || rand() > keep) continue;
    const r = 0.05 + rand() ** 2 * 0.16;
    g.dot(x - r * 0.35, z - r * 0.35, r, 'rgba(255,248,236,0.45)');
    g.dot(x, z, r, rand() < 0.6 ? 'rgba(104,84,68,0.7)' : 'rgba(138,124,112,0.7)');
  }
  yield;
  // Contact shadows: formations, loose rocks and plants sit in the ground rather than on it.
  for (const b of layout.rocks) g.soft(b.footprint, 2.5 + b.height * 0.15, '52,38,30', 0.55);
  for (const r of layout.scatter().loose) g.blot(r.x + r.size * 0.2, r.z + r.size * 0.2, r.size * 0.95, '52,40,32', 0.32);
  for (const p of layout.scatter().plants) g.blot(p.x, p.z, p.kind === 'joshua' ? 1.8 : p.size * 0.7, '58,46,30', p.kind === 'grass' ? 0.2 : 0.3);
  c.globalAlpha = 1;
  if (import.meta.env.DEV) Object.assign(window, { __launchsiteGround: c.canvas }); // Capture tools read the painted map.
  return g.finish();
}

