import { angleDelta, clamp, distance, mix } from './geometry';
import type { Point, TrackBarrier, TrackDefinition } from './types';

const dot = (a: Point, b: Point) => a.x * b.x + a.z * b.z;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, z: a.z - b.z });
// Track definitions are immutable during a race. Broad-phase bounds avoid distant polygon work.
const boundsCache = new WeakMap<TrackBarrier, { minX: number; maxX: number; minZ: number; maxZ: number; area: number }>();
function bounds(barrier: TrackBarrier) {
  let value = boundsCache.get(barrier);
  if (!value) {
    const v = barrier.footprint;
    value = { minX: Math.min(...v.map(p => p.x)), maxX: Math.max(...v.map(p => p.x)), minZ: Math.min(...v.map(p => p.z)), maxZ: Math.max(...v.map(p => p.z)), area: v.reduce((sum, p, i) => { const n = v[(i + 1) % v.length]; return sum + p.x * n.z - n.x * p.z; }, 0) };
    boundsCache.set(barrier, value);
  }
  return value;
}
function closest(p: Point, a: Point, b: Point) {
  const d = sub(b, a), t = clamp(dot(sub(p, a), d) / (dot(d, d) || 1), 0, 1);
  return mix(a, b, t);
}
export function insideBarrier(p: Point, barrier: TrackBarrier) {
  let inside = false; const v = barrier.footprint;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const a = v[i], b = v[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function segmentPair(a: Point, b: Point, c: Point, d: Point) {
  const ab = sub(b, a), cd = sub(d, c), ac = sub(c, a), cross = ab.x * cd.z - ab.z * cd.x;
  if (Math.abs(cross) > 1e-9) {
    const t = (ac.x * cd.z - ac.z * cd.x) / cross, u = (ac.x * ab.z - ac.z * ab.x) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { const p = mix(a, b, t); return { p, q: p, gap: 0 }; }
  }
  const pairs = [[a, closest(a, c, d)], [b, closest(b, c, d)], [closest(c, a, b), c], [closest(d, a, b), d]];
  return pairs.map(([p, q]) => ({ p, q, gap: distance(p, q) })).sort((x, y) => x.gap - y.gap)[0];
}

/** Full longitudinal capsule, independent of artwork. Positive depth means overlap. */
export function barrierContact(position: Point, heading: number, track: TrackDefinition, clearance = 0, elevation = 0, protectFlight = false, permitted: readonly string[] = []) {
  const radius = track.carWidth / 2 + clearance, half = (track.carLength - track.carWidth) / 2;
  const axis = { x: Math.sin(heading) * half, z: Math.cos(heading) * half };
  const a = sub(position, axis), b = { x: position.x + axis.x, z: position.z + axis.z };
  let result: { depth: number; normal: Point; point: Point; barrier: TrackBarrier } | null = null;
  for (const barrier of track.barriers) {
    // Above-road obstacles protect the infield/rails in this milestone. Submerged
    // landing faces retain their real height so an approved jump can pass above.
    if(barrier.kind==='cliff-face'&&barrier.sectionId===position.sectionId)continue;
    const crossingFace = barrier.kind==='cliff-face'&&permitted.includes(barrier.id);
    const jumpable = barrier.kind!=='cliff-face'&&permitted.includes(barrier.id);
    const protectedColumn = protectFlight && !jumpable && !crossingFace && (barrier.baseHeight ?? 0) + barrier.height > 1e-6
      && (!track.sections || barrier.kind==='infield' || barrier.kind==='cliff-face' || barrier.sectionId===position.sectionId);
    if (!protectedColumn && (elevation >= (barrier.baseHeight ?? 0) + barrier.height + (jumpable ? 0.15 : 0) - 1e-6 || elevation + 1.05 <= (barrier.baseHeight ?? 0))) continue;
    const box = bounds(barrier);
    if (Math.max(a.x, b.x) + radius < box.minX || Math.min(a.x, b.x) - radius > box.maxX || Math.max(a.z, b.z) + radius < box.minZ || Math.min(a.z, b.z) - radius > box.maxZ) continue;
    const inside = insideBarrier(position, barrier), v = barrier.footprint;
    let nearest: ReturnType<typeof segmentPair> | null = null, outward: Point = { x: 0, z: 1 };
    const area = box.area;
    for (let i = 0; i < v.length; i++) {
      const c = v[i], d = v[(i + 1) % v.length], pair = segmentPair(a, b, c, d);
      if (!nearest || pair.gap < nearest.gap) {
        nearest = pair; const edge = sub(d, c), length = Math.hypot(edge.x, edge.z) || 1, sign = area >= 0 ? 1 : -1;
        outward = { x: edge.z / length * sign, z: -edge.x / length * sign };
      }
    }
    if (!nearest) continue;
    const depth = inside ? radius + nearest.gap : radius - nearest.gap;
    if (depth < -1e-7 || result && depth <= result.depth) continue;
    const normal = nearest.gap > 1e-7 && !inside ? { x: (nearest.p.x - nearest.q.x) / nearest.gap, z: (nearest.p.z - nearest.q.z) / nearest.gap } : outward;
    result = { depth, normal, point: nearest.q, barrier };
  }
  return result;
}

/** Bounded swept capsule: samples are closer than 1/5 of its radius, including rotational motion. */
export function sweepVehicle(from: Point, to: Point, oldHeading: number, heading: number, velocity: Point, track: TrackDefinition, fromHeight = 0, toHeight = fromHeight, protectFlight = false, permitted: readonly string[] = []) {
  const angle = angleDelta(oldHeading, heading), travel = distance(from, to) + Math.abs(angle) * track.carLength / 2;
  const steps = Math.max(1, Math.ceil(travel / 0.18));
  let position = { ...from }, motion = { x: (to.x - from.x) / steps, z: (to.z - from.z) / steps }, v = { ...velocity };
  let impact = 0, point: Point | undefined, collided = false;
  for (let i = 1; i <= steps; i++) {
    position = { ...position, x: position.x + motion.x, z: position.z + motion.z };
    for (let pass = 0; pass < 4; pass++) {
      const contact = barrierContact(position, oldHeading + angle * i / steps, track, 0, fromHeight + (toHeight - fromHeight) * i / steps, protectFlight, permitted);
      if (!contact) break;
      collided = true; const n = contact.normal, incoming = Math.min(0, dot(v, n));
      impact = Math.max(impact, -incoming); point = contact.point;
      position.x += n.x * (contact.depth + 0.002); position.z += n.z * (contact.depth + 0.002);
      const friction = 1 - Math.min(0.2, -incoming * 0.007);
      v = { x: (v.x - n.x * incoming) * friction, z: (v.z - n.z * incoming) * friction };
      const blocked = Math.min(0, dot(motion, n)); motion = { x: (motion.x - n.x * blocked) * friction, z: (motion.z - n.z * blocked) * friction };
    }
  }
  return { position, velocity: v, impact, point, collided };
}

export function blockedRouteSection(points: Point[], track: TrackDefinition, permitted: readonly string[] = []) {
  const physical = permitted.length ? { ...track, barriers: track.barriers.filter(b => !permitted.includes(b.id)) } : track;
  const crossingPhysical=track.sections?{...physical,barriers:physical.barriers.filter(b=>b.kind!=='cliff-face')}:physical;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], heading = Math.atan2(b.x - a.x, b.z - a.z), count = Math.max(1, Math.ceil(distance(a, b) / 0.4));
    for (let j = 0; j <= count; j++) {
      const p = mix(a, b, j / count);
      const approvedCrossing=track.sections&&track.jumps?.some(j=>j.kind==='crest'&&p.courseProgress!==undefined&&p.courseProgress>=j.entryProgress&&p.courseProgress<=j.exitProgress&&Math.abs((p.x-j.from.x)*j.forward.z-(p.z-j.from.z)*j.forward.x)<=(j.width-track.carWidth)/2);
      if (barrierContact(p, heading, approvedCrossing?crossingPhysical:physical, 0.12, track.sections ? p.y??0 : 0)) return { point: p, section: [a, b] };
    }
  }
  return null;
}

/**
 * Per-point vehicle contact along a drawn line (capsule at the point, heading along the line,
 * no extra clearance). Used to mark hazards; the line itself is never rejected for them.
 */
export function routeContacts(points: Point[], track: TrackDefinition, permitted: readonly string[] = []): boolean[] {
  const physical = permitted.length ? { ...track, barriers: track.barriers.filter(b => !permitted.includes(b.id)) } : track;
  const crossingPhysical = track.sections ? { ...physical, barriers: physical.barriers.filter(b => b.kind !== 'cliff-face') } : physical;
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], heading = Math.atan2(b.x - a.x, b.z - a.z);
    const approvedCrossing = track.sections && track.jumps?.some(j => j.kind === 'crest' && p.courseProgress !== undefined && p.courseProgress >= j.entryProgress && p.courseProgress <= j.exitProgress && Math.abs((p.x - j.from.x) * j.forward.z - (p.z - j.from.z) * j.forward.x) <= (j.width - track.carWidth) / 2);
    return !!barrierContact(p, heading, approvedCrossing ? crossingPhysical : physical, 0, track.sections ? p.y ?? 0 : 0);
  });
}
