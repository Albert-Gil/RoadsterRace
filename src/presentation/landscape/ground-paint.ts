import type { Point, TrackBarrier, TrackDefinition } from '../../core/types';
import type { GroundPainter } from './paint';
import { offsetPath } from './paths';
import { noise2, smoothstep } from './noise';
import type { LooseRock } from './rocks';
import type { Plant } from './plants';
import type { Extent } from './terrain';

/**
 * Reusable painting passes for a venue's ground map (presentation only). Colours are given as
 * 'r,g,b' strings; alpha is per pass. Every pass draws in world metres through the painter.
 */
type Rand = () => number;
const anywhere = (e: Extent, rand: Rand) => ({ x: e.minX + rand() * (e.maxX - e.minX), z: e.minZ + rand() * (e.maxZ - e.minZ) });

/** Soft light and dark patches over the whole map. */
export function tone(g: GroundPainter, rand: Rand, count: number, light: string, dark: string, strength = 1) {
  for (let i = 0; i < count; i++) {
    const p = anywhere(g.extent, rand), isLight = rand() < 0.5;
    g.blot(p.x, p.z, 3 + rand() ** 2 * 16, isLight ? light : dark, (isLight ? 0.09 : 0.07) * strength, 0.5 + rand() * 0.5, rand() * 3);
  }
}
/** Short wind ripples where `weight` (0..1) allows. */
export function ripples(g: GroundPainter, rand: Rand, count: number, weight: (x: number, z: number) => number, angle = -0.64, alpha = 0.09) {
  for (let i = 0; i < count; i++) {
    const p = anywhere(g.extent, rand); if (rand() > weight(p.x, p.z)) continue;
    const len = 1.5 + rand() * 3.5, a = angle + (rand() - 0.5) * 0.25, wob = (rand() - 0.5) * 0.6;
    g.stroke([-1, -0.33, 0.33, 1].map((t, k) => ({ x: p.x + Math.cos(a) * len * t * 0.5 + (k % 2 ? wob : 0), z: p.z + Math.sin(a) * len * t * 0.5 })), 0.18, rand() < 0.5 ? 'rgb(255,248,232)' : 'rgb(110,90,70)', alpha);
  }
}
/** Dry wash beds: pale sand, darker cut banks, braided channels and cobbles. */
export function washBeds(g: GroundPainter, rand: Rand, washes: readonly (readonly Point[])[], bed = '250,244,232', bank = '96,76,60', width = 9) {
  for (const wash of washes) {
    g.stroke(wash, width, `rgb(${bed})`, 0.45);
    for (const side of [-1, 1]) g.stroke(offsetPath(wash, i => side * (width / 2 + 0.1 + 0.9 * noise2(i * 0.05, side, 3))), 0.9, `rgb(${bank})`, 0.32);
    for (let k = 0; k < 3; k++) g.stroke(offsetPath(wash, i => width * 0.29 * noise2(i * 0.04 + k * 7, k, 11)), 0.5, k % 2 ? 'rgb(255,252,244)' : 'rgb(150,130,108)', 0.3);
    for (let i = 0; i < wash.length; i++) for (let k = 0; k < 4; k++) {
      const o = offsetPath(wash, (rand() - 0.5) * (width - 1))[i];
      g.dot(o.x, o.z, 0.08 + rand() * 0.14, rand() < 0.5 ? 'rgba(110,92,78,0.75)' : 'rgba(170,150,130,0.7)');
    }
  }
}
/** Compacted, slightly darker ground along the course. */
export function runoffWear(g: GroundPainter, track: TrackDefinition, colour = '118,104,92', strength = 1) {
  g.stroke([...track.centerline, track.centerline[0]], 2 * 21, `rgb(${colour})`, 0.085 * strength);
  g.stroke([...track.centerline, track.centerline[0]], 2 * 14, `rgb(${colour})`, 0.06 * strength);
  for (const s of track.hopShortcuts ?? []) g.stroke(s.branch, s.width + 10, `rgb(${colour})`, 0.07 * strength);
}
/** Slide marks where cars ran wide (outside of corners) and, optionally, gravel traps at the tightest. */
export function cornerMarks(g: GroundPainter, rand: Rand, track: TrackDefinition, corners: readonly { from: number; to: number; side: number; sharpness: number }[], options: { gravel?: boolean; mark?: string; inner?: number } = {}) {
  const line = track.centerline, n = line.length, mark = options.mark ?? '84,66,50', inside = options.inner ?? 9.6;
  const slice = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => line[(from + k) % n]);
  for (const corner of corners) {
    const len = corner.to - corner.from, outside = corner.side; // A right turn (heading rising) runs wide to its left: positive offsets.
    if (options.gravel && corner.sharpness > 1.1) {
      const arc = slice(corner.from + Math.floor(len * 0.15), corner.to + 4), inner = offsetPath(arc, outside * inside);
      const outer = offsetPath(arc, i => outside * (inside + 7.5 * Math.sin(Math.PI * Math.min(1, (i + 0.5) / arc.length))));
      g.fill([...inner, ...outer.slice().reverse()], 'rgb(150,140,130)', 0.22);
      for (let k = 0; k < arc.length * 70; k++) {
        const f = rand() * (arc.length - 1), i = Math.floor(f), u = f - i, t = rand();
        const ax = inner[i].x + (inner[i + 1].x - inner[i].x) * u, az = inner[i].z + (inner[i + 1].z - inner[i].z) * u, bx = outer[i].x + (outer[i + 1].x - outer[i].x) * u, bz = outer[i].z + (outer[i + 1].z - outer[i].z) * u;
        g.dot(ax + (bx - ax) * t, az + (bz - az) * t, 0.07 + rand() * 0.1, rand() < 0.55 ? 'rgba(92,86,82,0.7)' : 'rgba(205,198,188,0.75)');
      }
      g.stroke(inner, 0.25, 'rgb(90,80,70)', 0.3);
    }
    for (let m = 0; m < 1 + Math.floor(corner.sharpness * 1.4); m++) {
      const start = corner.from + Math.floor(len * (0.3 + rand() * 0.4)), run = slice(start, start + 14 + Math.floor(rand() * 22)), wide = 1 + rand() * 4.2, base = inside + 0.2 + rand() * 1.4;
      const path = offsetPath(run, i => outside * (base + wide * Math.sin(Math.PI * i / (run.length - 1)))), alpha = 0.1 + rand() * 0.1;
      for (const wheel of [-0.8, 0.8]) g.stroke(offsetPath(path, wheel), 0.32, `rgb(${mark})`, alpha);
    }
  }
}
/** Pebbles with a lit edge toward the sun; `keep` (0..1) sets the local density. */
export function pebbles(g: GroundPainter, rand: Rand, count: number, keep: (x: number, z: number) => number, dark = ['104,84,68', '138,124,112'], light = '255,248,236') {
  for (let i = 0; i < count; i++) {
    const p = anywhere(g.extent, rand); if (rand() > keep(p.x, p.z)) continue;
    const r = 0.05 + rand() ** 2 * 0.16;
    g.dot(p.x - r * 0.35, p.z - r * 0.35, r, `rgba(${light},0.45)`);
    g.dot(p.x, p.z, r, `rgba(${dark[rand() < 0.6 ? 0 : 1]},0.7)`);
  }
}
/** Cracked mud: polygonal crack networks in patches where `weight` is high. */
export function mudCracks(g: GroundPainter, rand: Rand, patches: number, weight: (x: number, z: number) => number, colour = '92,70,54') {
  for (let k = 0, made = 0; k < patches * 20 && made < patches; k++) {
    const c = anywhere(g.extent, rand); if (rand() > weight(c.x, c.z)) continue;
    made++;
    const radius = 4 + rand() * 9, cells: Point[] = [];
    for (let i = 0; i < radius * radius * 0.9; i++) { const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius; cells.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }); }
    g.blot(c.x, c.z, radius * 1.1, '255,246,230', 0.12);
    // Join each cell to its two nearest neighbours: an irregular polygon net.
    for (const p of cells) {
      const near = cells.filter(q => q !== p).map(q => ({ q, d: Math.hypot(q.x - p.x, q.z - p.z) })).sort((a, b) => a.d - b.d).slice(0, 3);
      for (const { q, d } of near) if (d < 2.2) g.stroke([p, { x: (p.x + q.x) / 2 + (rand() - 0.5) * 0.3, z: (p.z + q.z) / 2 + (rand() - 0.5) * 0.3 }, q], 0.07, `rgb(${colour})`, 0.32 * smoothstep(radius, radius * 0.5, Math.hypot(p.x - c.x, p.z - c.z)));
    }
  }
}
/** Thin wandering animal or foot trails. */
export function trails(g: GroundPainter, rand: Rand, count: number, accept: (p: Point) => boolean, colour = '120,96,76') {
  for (let k = 0, made = 0; k < count * 20 && made < count; k++) {
    let p = anywhere(g.extent, rand); if (!accept(p)) continue;
    made++;
    let a = rand() * Math.PI * 2; const path: Point[] = [p];
    for (let i = 0; i < 40 + rand() * 60; i++) { a += (rand() - 0.5) * 0.5; p = { x: p.x + Math.cos(a) * 2, z: p.z + Math.sin(a) * 2 }; if (!accept(p)) break; path.push(p); }
    if (path.length > 4) g.stroke(path, 0.35, `rgb(${colour})`, 0.16);
  }
}
/** Contact shadows: formations, loose rocks and plants sit in the ground rather than on it. */
export function contactShadows(g: GroundPainter, rocks: readonly TrackBarrier[], loose: readonly LooseRock[], plants: readonly Plant[], tint = '52,40,32') {
  for (const b of rocks) g.soft(b.footprint, 2.5 + b.height * 0.15, tint, 0.55);
  for (const r of loose) g.blot(r.x + r.size * 0.2, r.z + r.size * 0.2, r.size * 0.95, tint, 0.32);
  for (const p of plants) g.blot(p.x, p.z, p.kind === 'joshua' || p.kind === 'juniper' || p.kind === 'cypress' || p.kind === 'palm' ? Math.max(1.5, p.size * 0.35) : p.size * 0.7, tint, p.kind === 'grass' || p.kind === 'dunegrass' ? 0.2 : 0.3);
}
