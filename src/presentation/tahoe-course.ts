import type { Point, TrackDefinition } from '../core/types';
import { cumulative, samplePolyline } from '../core/geometry';
import { tahoeShore } from '../core/tracks/tahoe-terrain';
import { Geometry, hex, mix } from './landscape/mesh';
import { tahoeCourseAppearance as art } from './themes';

/**
 * Snowy Tahoe course readability (presentation only; no new support, barrier or force).
 * - Flat dye dashes painted just inside both road edges, as on groomed ski courses.
 * - An orange snow fence standing on the forest reserve's existing protected rim.
 * Both share one vertex-coloured batch.
 */
export function tahoeCourseMarkings(track: TrackDefinition, surface: (x: number, z: number) => number) {
  const g = new Geometry(), orange = hex(art.dye), blue = hex(art.dyeAlt);
  const dashes = (path: Point[], closed: boolean) => {
    const ds = cumulative(closed ? [...path, path[0]] : path), length = ds.at(-1)!, ring = closed ? [...path, path[0]] : path;
    for (let s = art.dashStart; s + art.dashLength < length - art.dashStart * (closed ? 0 : 1); s += art.dashSpacing) {
      const color = Math.floor(s / art.dashSpacing) % art.blueEvery === 0 ? blue : orange;
      for (const side of [-1, 1]) {
        const rows = [s, s + art.dashLength].map(at => {
          const p = samplePolyline(ring, ds, at), q = samplePolyline(ring, ds, Math.min(length, at + .3)), l = Math.hypot(q.x - p.x, q.z - p.z) || 1;
          const nx = -(q.z - p.z) / l * side, nz = (q.x - p.x) / l * side;
          return [art.inset, art.inset + art.dashWidth].map(offset => {
            const d = track.roadWidth / 2 - offset, x = p.x + nx * d, z = p.z + nz * d;
            return g.vertex(x, surface(x, z) + art.lift, z, color);
          });
        });
        g.triangle(rows[0][0], rows[1][0], rows[1][1]); g.triangle(rows[0][0], rows[1][1], rows[0][1]);
      }
    }
  };
  dashes(track.centerline, true);
  for (const lane of track.hopShortcuts ?? []) dashes(lane.branch, false);

  // Snow fence on the forest reserve rim: inside its collision footprint, so it marks the
  // existing protected boundary rather than adding a visual obstacle on drivable snow.
  const reserve = track.barriers.find(b => b.id === 'forest-reserve');
  if (reserve) {
    const rim = inset(reserve.footprint, art.fenceInset), ds = cumulative([...rim, rim[0]]), loop = [...rim, rim[0]], length = ds.at(-1)!;
    const n = Math.ceil(length / art.fenceSpacing), mesh = hex(art.fence), post = hex(art.post);
    let previous: { top: number; bottom: number; x: number; z: number } | undefined;
    for (let i = 0; i <= n; i++) {
      const p = samplePolyline(loop, ds, i / n * length), base = surface(p.x, p.z) + art.fenceBase;
      const sag = i % 2 ? art.fenceSag : 0, top = base + art.fenceHeight - sag;
      if (previous) for (const facing of [1, -1]) {
        const a = g.vertex(previous.x, previous.bottom, previous.z, mesh), b = g.vertex(p.x, base + .05, p.z, mesh), c = g.vertex(p.x, top, p.z, mix(mesh, [1, 1, 1], .12)), d = g.vertex(previous.x, previous.top, previous.z, mix(mesh, [1, 1, 1], .12));
        if (facing > 0) { g.triangle(a, b, c); g.triangle(a, c, d); } else { g.triangle(a, c, b); g.triangle(a, d, c); }
      }
      // A flat orange top rail keeps the fence legible from the high overview camera.
      if (previous) {
        const dx = p.x - previous.x, dz = p.z - previous.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * art.fenceCap / 2, nz = dx / l * art.fenceCap / 2, bright = mix(mesh, [1, 1, 1], .2);
        const a = g.vertex(previous.x + nx, previous.top + .02, previous.z + nz, bright), b = g.vertex(p.x + nx, top + .02, p.z + nz, bright), c = g.vertex(p.x - nx, top + .02, p.z - nz, bright), d = g.vertex(previous.x - nx, previous.top + .02, previous.z - nz, bright);
        g.triangle(a, b, c); g.triangle(a, c, d); g.triangle(a, c, b); g.triangle(a, d, c);
      }
      if (i % art.postEvery === 0) postBox(g, p.x, base - .1, p.z, art.postWidth, art.fenceHeight + .35, post);
      previous = { top, bottom: base + .05, x: p.x, z: p.z };
    }
  }
  return g;
}

/** Shore-to-deep colour band over the lake surface; alpha fades to the existing deep water. */
export function tahoeShallows(extent: { minZ: number; maxZ: number }, waterY: number) {
  const g = new Geometry(), shallow = hex(art.shallows), mid = hex(art.midWater), rows: number[][] = [];
  const bands = art.shallowBands;
  for (let z = extent.minZ - 60; z <= extent.maxZ + 60; z += art.shallowStep) {
    const shore = tahoeShore(z);
    rows.push(bands.map(([offset, alpha], i) => { const v = g.vertex(shore - art.shoreOverlap + offset, waterY + art.shallowLift, z, i < 2 ? shallow : mid); g.colors[v * 4 + 3] = alpha; return v; }));
  }
  for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < bands.length - 1; i++) {
    g.triangle(rows[r][i], rows[r + 1][i], rows[r + 1][i + 1]); g.triangle(rows[r][i], rows[r + 1][i + 1], rows[r][i + 1]);
  }
  return g;
}

function postBox(g: Geometry, x: number, y: number, z: number, w: number, h: number, color: [number, number, number]) {
  const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [g.vertex(x + u * w / 2, y, z + v * w / 2, color), g.vertex(x + u * w / 2, y + h, z + v * w / 2, color)]);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.triangle(c[i][0], c[j][0], c[j][1]); g.triangle(c[i][0], c[j][1], c[i][1]); }
  g.triangle(c[0][1], c[1][1], c[2][1]); g.triangle(c[0][1], c[2][1], c[3][1]);
}

/** Moves each vertex of a convex-ish parcel toward its centroid by `distance` metres. */
function inset(footprint: readonly Point[], distance: number) {
  const cx = footprint.reduce((s, p) => s + p.x, 0) / footprint.length, cz = footprint.reduce((s, p) => s + p.z, 0) / footprint.length;
  const rim: Point[] = [];
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i], b = footprint[(i + 1) % footprint.length], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
    for (let k = 0; k < n; k++) {
      const p = { x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }, l = Math.hypot(cx - p.x, cz - p.z) || 1;
      rim.push({ x: p.x + (cx - p.x) / l * distance, z: p.z + (cz - p.z) / l * distance });
    }
  }
  return rim;
}
