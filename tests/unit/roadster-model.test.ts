import { expect, test } from 'vitest';
import { buildRoadsterGeometry } from '../../src/presentation/roadster-geometry.js';
import { defaultPreferences, finishFor, parsePreferences } from '../../src/presentation/race-settings';
import { defaultPaintId, paintFinishes, themes, sceneTuning } from '../../src/presentation/themes';
import { VEHICLE_DIMENSIONS } from '../../src/core/vehicle-size';
import { circuits } from '../../src/content/circuits';
import { FLIGHT_RULES } from '../../src/core/support';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { LapGhost } from '../../src/presentation/lap-ghost';

test('the steel default preserves explicitly saved finishes and all six paint identities', () => {
  expect(paintFinishes).toHaveLength(6);
  expect(defaultPreferences().drivers[0].paint).toBe(defaultPaintId);
  const steel = finishFor(defaultPaintId);
  expect(steel.name).toBe('Stainless steel gray');
  expect(themes.coastal.scene.paint).toBe(steel.color);
  expect(themes.graphite.scene.paint).toBe(steel.color);
  for (const finish of paintFinishes) {
    const saved = defaultPreferences(); saved.drivers[0].paint = finish.id;
    expect(parsePreferences(JSON.stringify(saved)).drivers[0].paint).toBe(finish.id);
  }
});

test.each(['race', 'showcase'] as const)('%s car retains its envelope, valid normals and fixed brake assemblies', detail => {
  const g = buildRoadsterGeometry(detail), scale = 2.2 / 2.0201642066907674;
  const parts = [...Object.values(g.body), ...g.wheels.flatMap(w => [...Object.values(w.spin), ...Object.values(w.fixed), ...Object.values(w.spin), ...Object.values(w.fixed)])];
  const triangles = parts.reduce((sum, p) => sum + p.p.length / 9, 0);
  expect(triangles).toBeLessThanOrEqual(detail === 'race' ? 10000 : 50000);
  for (const part of parts) {
    expect(part.p.every(Number.isFinite)).toBe(true);
    expect(part.n).toHaveLength(part.p.length);
    for (let i = 0; i < part.n.length; i += 3) expect(Math.hypot(...part.n.slice(i, i + 3))).toBeCloseTo(1, 4);
  }
  const body = Object.values(g.body).flatMap(p => p.p);
  expect(g.body.steel.p.length).toBeGreaterThan(0);
  expect(Math.max(...g.body.steel.p.filter((_,i)=>i%3===1))).toBeGreaterThan(1.1);
  const xs = body.filter((_, i) => i % 3 === 0), zs = body.filter((_, i) => i % 3 === 2);
  expect((Math.max(...xs) - Math.min(...xs)) * scale).toBeLessThanOrEqual(5.2);
  expect((Math.max(...zs) - Math.min(...zs)) * scale).toBeLessThanOrEqual(2.201);
  expect(g.mounts.map(w => [w.x, w.y, w.z, w.r])).toEqual([[1.325, .345, .79, .34], [-1.455, .35, .815, .35]]);
  for (const wheel of g.wheels) {
    expect(wheel.fixed.caliper.p.length).toBeGreaterThan(0);
    expect(wheel.fixed.disc.p.length).toBeGreaterThan(0);
    expect(wheel.spin.caliper).toBeUndefined();
    // At least 20 angular samples prevent the original octagonal racing tyres.
    const angles = new Set(Array.from({ length: wheel.spin.tire.p.length / 3 }, (_, i) => Math.round(Math.atan2(wheel.spin.tire.p[i * 3 + 1], wheel.spin.tire.p[i * 3]) * 1000)));
    expect(angles.size).toBeGreaterThanOrEqual(20);
  }
});

test('the cosmetic replay uses the complete new body and wheels in one isolated mesh', () => {
  const engine = new NullEngine(), scene = new Scene(engine), ghost = new LapGhost(scene);
  try {
    expect(scene.meshes).toHaveLength(1); expect(ghost.visible).toBe(false);
    expect(scene.meshes[0].getTotalIndices() / 3).toBe(9904);
    ghost.update({ t: 0, x: 1, z: 2, y: 8, heading: .2, thrust: true });
    expect(ghost.visible).toBe(true); expect(scene.meshes[0].position.asArray()).toEqual([1, 8, 2]);
    expect(scene.meshes[0].isPickable).toBe(false); expect(scene.meshes[0].receiveShadows).toBe(false);
    expect(scene.particleSystems).toHaveLength(0); expect(scene.lights).toHaveLength(0);
    ghost.update(null); expect(ghost.visible).toBe(false);
  } finally { scene.dispose(); engine.dispose(); }
});

test('all venues apply a second multiplicative 15% enlargement to collisions and artwork', () => {
  const growth = 1.15 * 1.15;
  expect(VEHICLE_DIMENSIONS.width).toBeCloseTo(2.2 * growth, 10);
  expect(VEHICLE_DIMENSIONS.length).toBeCloseTo(5.2 * growth, 10);
  expect(FLIGHT_RULES.carHeight).toBeCloseTo(1.05 * growth, 10);
  expect(sceneTuning.vehicle.racingScale / 1.12).toBeCloseTo(growth, 10);
  for (const {track} of circuits) {
    expect(track.carWidth).toBe(VEHICLE_DIMENSIONS.width); expect(track.carLength).toBe(VEHICLE_DIMENSIONS.length);
    expect(track.roadWidth).toBe(16);
  }
});
