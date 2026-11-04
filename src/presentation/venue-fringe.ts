import type { Point, TrackDefinition } from '../core/types';
import { roadEdges } from '../core/road-geometry';
import { cumulative } from '../core/geometry';
import { projectToPolylineNear as projectToPolyline } from '../core/nearest';
import { groundHeight, supported, jumpCoordinates } from '../core/support';
import { insideBarrier } from '../core/barriers';
import { gateCoordinates, startGate } from '../core/start-finish';
import { onCityLand } from '../content/golden-city';
import { Geometry, hex, mix } from './landscape/mesh';
import { noise2 } from './landscape/noise';
import { venueFinish, type VenueFinish } from './themes';
import { yosemiteMeadowColor } from './yosemite-surfaces';

/** Ground-colour seams, erosion and gravel, baked into the existing roadside batch.
 * Only the main road is dressed: alternate lanes must remain undisclosed.
 * These thin skins add neither support nor collision geometry.
 */
export function venueFringe(track: TrackDefinition, style: keyof typeof venueFinish) {
  const art: VenueFinish = venueFinish[style], g = new Geometry(), gate = startGate(track);
  const paths = [track.centerline, ...(track.hopShortcuts ?? []).map(h => h.branch), ...(track.jumps ?? []).map(j => j.branch)]
    .map(p => ({ p, d: cumulative(p) }));
  const hopPaths = (track.hopShortcuts ?? []).map(h => ({ h, d: cumulative(h.branch) }));
  const distance = (p: Point) => Math.min(...paths.map(a => projectToPolyline(p, a.p, a.d).distance));
  const evaluate = (p: Point) => {
    const q = gateCoordinates(p, track);
    if (q.along > -gate.leadIn - 3 && q.along < 11 && Math.abs(q.across) < gate.width / 2 + 11) return false;
    if (!supported(p, track) || (style === 'bay' && !onCityLand(p)) || distance(p) < track.roadWidth / 2 + .04) return false;
    if (track.barriers.some(b => insideBarrier(p, b))) return false;
    if (hopPaths.some(({ h, d }) => projectToPolyline(p, h.branch, d).distance < h.width / 2 + 6)) return false;
    return !(track.jumps ?? []).some(j => { const c = jumpCoordinates(p, j); return c.along > -14 && c.along < j.rampLength + j.gap + 16 && Math.abs(c.across) < j.width / 2 + 6; });
  };
  // Adjacent strips share edge samples. Cache their exact queries during this
  // one build, keeping vertex order and geometry unchanged while avoiding
  // repeated terrain/support searches on the elevated venues.
  const samples = new Map<string, Point>(), allowed = new WeakMap<Point, boolean>(), heights = new WeakMap<Point, number>();
  const usable = (p: Point) => {
    let value = allowed.get(p);
    if (value === undefined) { value = evaluate(p); allowed.set(p, value); }
    return value;
  };
  const edges = [0, 1, 2].map(layer => roadEdges(track.centerline, track.roadWidth + art.inset * 2 + layer * art.spread));
  let patches = 0;
  for (let i = 0; i < track.centerline.length - 3; i += 3) for (const side of [0, 1]) {
    const points = [0, 1, 2].map(layer => [i, i + 3].map(index => {
      const key = `${side}/${layer}/${index}`, cached = samples.get(key);
      if (cached) return cached;
      const p = edges[layer][side][index], c = track.centerline[index], w = layer ? 1 + noise2(c.x * .27, c.z * .27, 29) * .22 : 1;
      const inner = edges[0][side][index];
      const point = { x: inner.x + (p.x - inner.x) * w, z: inner.z + (p.z - inner.z) * w, courseProgress: track.distances[index] };
      samples.set(key, point); return point;
    }));
    if (!points.flat().every(usable)) continue;
    const ids = points.map((row, layer) => row.map(p => {
      const fleck = .5 + noise2(p.x * .9, p.z * .9, 41) * .5;
      let height = heights.get(p);
      if (height === undefined) { height = groundHeight(p, track); heights.set(p, height); }
      const ground = style === 'yosemite' ? yosemiteMeadowColor(p.x,p.z,height) : hex(art.ground);
      const color = mix(hex(art.edge), ground, layer / 2);
      return g.vertex(p.x, height + .062 - layer * .012, p.z, mix(color, hex(art.grit), fleck * .12 * (1-layer/2)));
    }));
    const tri = (a: number, b: number, c: number) => {
      const p = g.positions, cross = (p[b * 3] - p[a * 3]) * (p[c * 3 + 2] - p[a * 3 + 2]) - (p[b * 3 + 2] - p[a * 3 + 2]) * (p[c * 3] - p[a * 3]);
      if (cross < 0) g.triangle(a, b, c); else g.triangle(a, c, b);
    };
    for (let layer = 0; layer < 2; layer++) { tri(ids[layer][0], ids[layer][1], ids[layer + 1][0]); tri(ids[layer][1], ids[layer + 1][1], ids[layer + 1][0]); }
    patches++;
  }
  return { geometry: g, patches };
}
