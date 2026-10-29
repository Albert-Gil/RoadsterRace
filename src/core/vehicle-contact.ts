import type { Point, TrackDefinition } from './types';
import { clamp, mix } from './geometry';
import { sweepVehicle } from './barriers';
import { terrainElevation } from './elevation';
import { VEHICLE_DIMENSIONS } from './vehicle-size';

export interface ContactBody { position: Point; velocity: Point; heading: number; elevation?: number; movement?:'grounded'|'airborne' }
export const CONTACT_RULES = Object.freeze({ restitution: 0.1, friction: 0.2, passes: 4, ghostStartSeconds: 5 });
const dot = (a: Point, b: Point) => a.x * b.x + a.z * b.z;
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, z: a.z - b.z });
function axis(body: ContactBody, track: TrackDefinition) {
  const h = (track.carLength - track.carWidth) / 2, d = { x: Math.sin(body.heading) * h, z: Math.cos(body.heading) * h };
  return [sub(body.position, d), { x: body.position.x + d.x, z: body.position.z + d.z }];
}
function closest(a: Point, b: Point, p: Point) { const d = sub(b, a); return mix(a, b, clamp(dot(sub(p, a), d) / (dot(d, d) || 1), 0, 1)); }
export function vehicleContact(a: ContactBody, b: ContactBody, track: TrackDefinition) {
  if (!track.terrain && Math.abs((a.elevation ?? 0) - (b.elevation ?? 0)) >= VEHICLE_DIMENSIONS.height) return null;
  const [a0, a1] = axis(a, track), [b0, b1] = axis(b, track);
  const da = sub(a1, a0), db = sub(b1, b0), cross = da.x * db.z - da.z * db.x;
  const ab = sub(b0, a0);
  let pairs = [[a0, closest(b0, b1, a0)], [a1, closest(b0, b1, a1)], [closest(a0, a1, b0), b0], [closest(a0, a1, b1), b1]];
  if (Math.abs(cross) > 1e-9) { const t = (ab.x * db.z - ab.z * db.x) / cross, u = (ab.x * da.z - ab.z * da.x) / cross; if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { const p = mix(a0, a1, t); pairs = [[p, p]]; } }
  pairs.sort((p, q) => dot(sub(p[0], p[1]), sub(p[0], p[1])) - dot(sub(q[0], q[1]), sub(q[0], q[1])));
  const [p, q] = pairs[0], d = sub(q, p), length = Math.hypot(d.x, d.z), depth = track.carWidth - length;
  if (depth < 0) return null;
  if(track.terrain){
    // Grounded bodies tilt with the continuous hill. Compare them at the common
    // contact position, rather than mistaking uphill centre heights for flight.
    const point=mix(p,q,.5),height=terrainElevation(point,track);
    const atContact=(body:ContactBody)=>(body.elevation??0)+(body.movement==='airborne'?0:height-terrainElevation(body.position,track));
    if(Math.abs(atContact(a)-atContact(b))>=VEHICLE_DIMENSIONS.height)return null;
  }
  const center = sub(b.position, a.position), nlen = Math.hypot(center.x, center.z);
  const normal = length > 1e-7 ? { x: d.x / length, z: d.z / length } : nlen > 1e-7 ? { x: center.x / nlen, z: center.z / nlen } : { x: Math.cos(a.heading), z: -Math.sin(a.heading) };
  return { normal, depth, point: mix(p, q, 0.5) };
}
/** Swept relative capsules: bounded subdivision includes rotation, not just endpoint overlap. */
export function sweptContact(a0: ContactBody, a: ContactBody, b0: ContactBody, b: ContactBody, track: TrackDefinition) {
  const steps = Math.max(1, Math.ceil((Math.hypot(a.position.x - a0.position.x, a.position.z - a0.position.z) + Math.hypot(b.position.x - b0.position.x, b.position.z - b0.position.z) + (Math.abs(a.heading - a0.heading) + Math.abs(b.heading - b0.heading)) * track.carLength) / 0.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, aa = { ...a, elevation: (a0.elevation ?? 0) + ((a.elevation ?? 0) - (a0.elevation ?? 0)) * t, position: mix(a0.position, a.position, t), heading: a0.heading + (a.heading - a0.heading) * t }, bb = { ...b, elevation: (b0.elevation ?? 0) + ((b.elevation ?? 0) - (b0.elevation ?? 0)) * t, position: mix(b0.position, b.position, t), heading: b0.heading + (b.heading - b0.heading) * t };
    const contact = vehicleContact(aa, bb, track); if (contact) return { ...contact, t, a: aa.position, b: bb.position };
  }
  return null;
}
export function contactImpulse(a: ContactBody, b: ContactBody, normal: Point) {
  const relative = sub(b.velocity, a.velocity), incoming = dot(relative, normal);
  if (incoming >= 0) return 0;
  const impulse = -(1 + CONTACT_RULES.restitution) * incoming / 2;
  const tangent = { x: -normal.z, z: normal.x }, friction = clamp(-dot(relative, tangent) / 2, -impulse * CONTACT_RULES.friction, impulse * CONTACT_RULES.friction);
  const push = { x: normal.x * impulse + tangent.x * friction, z: normal.z * impulse + tangent.z * friction };
  a.velocity = sub(a.velocity, push); b.velocity = { x: b.velocity.x + push.x, z: b.velocity.z + push.z };
  return -incoming;
}
export function separateBody(body: ContactBody, delta: Point, track: TrackDefinition, permitted: readonly string[] = []) {
  const result = sweepVehicle(body.position, { ...body.position, x: body.position.x + delta.x, z: body.position.z + delta.z }, body.heading, body.heading, body.velocity, track, body.elevation ?? 0, body.elevation ?? 0, (body.elevation ?? 0) > 0, permitted);
  body.position = result.position; body.velocity = result.velocity;
}
