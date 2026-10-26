import type { Scene } from '@babylonjs/core/scene';
import type { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Point, TrackDefinition } from '../core/types';
import { LA, type LALayout, type Street } from './la-landscape';
import { random } from './landscape/noise';
import { GroundPainter } from './landscape/paint';
import { offsetPath } from './landscape/paths';
import { cornerMarks, runoffWear, tone } from './landscape/ground-paint';
import { courseCorners } from './landscape/scatter';
export { buildFormation, looseRocks } from './landscape/rocks';
export { plantGeometry } from './landscape/plants';

const P = (x: number, z: number): Point => ({ x, z });
const horizontal = (s: Street) => s.from.z === s.to.z;

/** 'r,g,b' of a hex colour scaled by k. */
const shade = (hex: string, k: number) => [1, 3, 5].map(i => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * k))).join(',');

/**
 * Paints the city ground in full colour (on a white material) from the night's ground colour,
 * keeping the streets darker than the race road: sidewalks and avenues
 * with lane markings, intersections with crosswalks, parking lots with stalls and oil stains,
 * manholes, worn and slide-marked concrete along the course, and contact shadows.
 */
export function* paintGround(scene: Scene, track: TrackDefinition, layout: LALayout, base: string): Generator<void, DynamicTexture> {
  const L = LA, e = L.map, g = new GroundPainter('la-city-ground', scene, e, 2048), c = g.ctx, rand = random(31);
  const street = `rgb(${shade(base, 0.72)})`, white = 'rgb(150,160,176)', yellow = 'rgb(176,146,82)';
  c.fillStyle = `rgb(${shade(base, 1)})`; c.fillRect(0, 0, g.width, g.height);
  tone(g, rand, 900, shade(base, 1.5), shade(base, 0.6), 1.2);
  g.grain(13, 0.1);
  // Sidewalks, curbs and carriageways.
  for (const s of L.streets) g.stroke([s.from, s.to], s.width + 6, `rgb(${shade(base, 1.38)})`, 1);
  for (const s of L.streets) { for (const side of [-1, 1]) g.stroke(offsetPath([s.from, s.to], side * (s.width / 2 + 0.15)), 0.35, `rgb(${shade(base, 1.9)})`, 0.7); g.stroke([s.from, s.to], s.width, street, 1); }
  // Lane markings: a double yellow centre and dashed lanes on avenues, a dashed centre on side streets.
  const dashed = (s: Street, offset: number, colour: string, dash = 3, period = 9) => {
    const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z), ux = (s.to.x - s.from.x) / len, uz = (s.to.z - s.from.z) / len;
    for (let t = 0; t < len; t += period) g.stroke([P(s.from.x + ux * t - uz * offset, s.from.z + uz * t + ux * offset), P(s.from.x + ux * (t + dash) - uz * offset, s.from.z + uz * (t + dash) + ux * offset)], 0.22, colour, 0.9);
  };
  for (const s of L.streets) {
    if (s.width >= 16) { for (const o of [-0.22, 0.22]) g.stroke(offsetPath([s.from, s.to], o), 0.18, yellow, 0.9); for (const o of [-s.width / 4, s.width / 4]) dashed(s, o, white); }
    else dashed(s, 0, yellow, 2.5, 6);
  }
  yield;
  // Intersections: clear the markings, add crosswalks and stop lines on every approach.
  for (const a of L.streets.filter(horizontal)) for (const b of L.streets.filter(s => !horizontal(s))) {
    const x = b.from.x, z = a.from.z, hx = b.width / 2, hz = a.width / 2;
    const [x0, x1] = [Math.min(a.from.x, a.to.x), Math.max(a.from.x, a.to.x)], [z0, z1] = [Math.min(b.from.z, b.to.z), Math.max(b.from.z, b.to.z)];
    if (x < x0 || x > x1 || z < z0 - hz || z > z1 + hz) continue;
    g.fill([P(x - hx, z - hz), P(x + hx, z - hz), P(x + hx, z + hz), P(x - hx, z + hz)], street, 1);
    for (const side of [-1, 1]) {
      // Along the horizontal street: zebra bars run with the traffic (along x), stepping across it.
      if (side < 0 ? x0 < x - hx - 3 : x1 > x + hx + 3) {
        for (let k = -hz + 0.6; k < hz; k += 1.1) g.stroke([P(x + side * (hx + 0.8), z + k), P(x + side * (hx + 3.6), z + k)], 0.5, white, 0.85);
        g.stroke([P(x + side * (hx + 4.4), z - hz), P(x + side * (hx + 4.4), z + hz)], 0.3, white, 0.75);
      }
      if (side < 0 ? z0 < z - hz - 3 : z1 > z + hz + 3) {
        for (let k = -hx + 0.6; k < hx; k += 1.1) g.stroke([P(x + k, z + side * (hz + 0.8)), P(x + k, z + side * (hz + 3.6))], 0.5, white, 0.85);
        g.stroke([P(x - hx, z + side * (hz + 4.4)), P(x + hx, z + side * (hz + 4.4))], 0.3, white, 0.75);
      }
    }
  }
  // Manholes and storm drains.
  for (const s of L.streets) {
    const len = Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z), ux = (s.to.x - s.from.x) / len, uz = (s.to.z - s.from.z) / len;
    for (let t = 20 + rand() * 20; t < len; t += 34 + rand() * 20) { const o = (rand() - 0.5) * s.width * 0.5; g.dot(s.from.x + ux * t - uz * o, s.from.z + uz * t + ux * o, 0.45, 'rgba(36,36,44,0.8)'); }
    for (let t = 15; t < len; t += 40) for (const side of [-1, 1]) { const p = P(s.from.x + ux * t - uz * side * (s.width / 2 - 0.4), s.from.z + uz * t + ux * side * (s.width / 2 - 0.4)); g.stroke([P(p.x - ux * 0.6, p.z - uz * 0.6), P(p.x + ux * 0.6, p.z + uz * 0.6)], 0.4, 'rgb(30,30,36)', 0.8); }
  }
  yield;
  // Parking lots: asphalt, stall lines back to back, oil stains.
  for (const lot of L.lots) {
    g.fill([P(lot.minX - 0.3, lot.minZ - 0.3), P(lot.maxX + 0.3, lot.minZ - 0.3), P(lot.maxX + 0.3, lot.maxZ + 0.3), P(lot.minX - 0.3, lot.maxZ + 0.3)], `rgb(${shade(base, 1.9)})`, 0.7);
    g.fill([P(lot.minX, lot.minZ), P(lot.maxX, lot.minZ), P(lot.maxX, lot.maxZ), P(lot.minX, lot.maxZ)], street, 1);
    const longX = lot.rows === 'x', span = longX ? lot.maxX - lot.minX : lot.maxZ - lot.minZ, depth = longX ? lot.maxZ - lot.minZ : lot.maxX - lot.minX;
    const at = (a: number, b: number) => longX ? P(lot.minX + a, lot.minZ + b) : P(lot.minX + b, lot.minZ + a);
    for (let row = 0; row * 14 + 11 <= depth; row++) {
      for (let k = 0; k * 2.7 <= span - 2; k++) g.stroke([at(1 + k * 2.7, row * 14), at(1 + k * 2.7, row * 14 + 11)], 0.14, white, 0.8);
      g.stroke([at(1, row * 14 + 5.5), at(1 + Math.floor((span - 2) / 2.7) * 2.7, row * 14 + 5.5)], 0.14, white, 0.8);
      for (let k = 0; (k + 1) * 2.7 <= span - 2; k++) for (const half of [0, 1]) if (rand() < 0.5) { const p = at(1 + (k + 0.5) * 2.7, row * 14 + 2.75 + half * 5.5); g.blot(p.x + (rand() - 0.5), p.z + (rand() - 0.5), 0.5 + rand() * 0.6, '20,20,28', 0.35); }
    }
  }
  // Worn concrete along the course and slide marks where cars ran wide.
  runoffWear(g, track, shade(base, 0.6), 1.2);
  cornerMarks(g, rand, track, courseCorners(track), { mark: shade(base, 0.4) });
  // Contact shadows under palms and parked cars.
  const { plants, cars } = layout.scatter();
  for (const p of plants) g.blot(p.x, p.z, 1.6, '20,20,28', 0.35);
  for (const car of cars) g.blot(car.x, car.z, 2.8, '20,20,28', 0.4, 0.5, Math.PI / 2 - car.heading);
  c.globalAlpha = 1;
  if (import.meta.env.DEV) Object.assign(window, { __laGround: c.canvas }); // Capture tools read the painted map.
  return g.finish();
}

/** Paints the map in steps, then puts it on the city ground's material. */
export function* paintInto(scene: Scene, track: TrackDefinition, layout: LALayout, material: StandardMaterial, base: string): Generator<void, void> {
  material.diffuseTexture = yield* paintGround(scene, track, layout, base);
  material.diffuseColor = Color3.White();
}
