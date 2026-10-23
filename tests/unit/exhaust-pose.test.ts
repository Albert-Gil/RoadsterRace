import { expect, test } from 'vitest';
import { hopOutlet } from '../../src/presentation/exhaust-pose';
import { hopEffects } from '../../src/presentation/themes';

test('all four pitched outlets query their own ramp surface', () => {
  const pose = { x: 7, z: 0, y: 1.05, heading: Math.PI / 2, pitch: Math.atan(0.15), surfaceAt: (x: number) => x * 0.15 };
  const outlets = hopEffects.mounts.map(m => hopOutlet(pose, m));
  for (const outlet of outlets) expect(outlet.y - outlet.supportY!).toBeCloseTo(hopEffects.nozzleHeight, 10);
  expect(outlets[2].supportY).toBeGreaterThan(outlets[0].supportY!);
});

test('an unsupported outlet never borrows support from the car centre', () => {
  const pose = { x: 0, z: 0, heading: 0, supportY: 0, surfaceAt: (x: number) => x > 0 ? undefined : 0 };
  expect(hopOutlet(pose, { x: 0.52, z: 1.8 }).supportY).toBeUndefined();
  expect(hopOutlet(pose, { x: -0.52, z: 1.8 }).supportY).toBe(0);
});
