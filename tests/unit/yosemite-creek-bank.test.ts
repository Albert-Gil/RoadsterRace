import { expect, test } from 'vitest';
import { yosemiteTrack as track } from '../../src/core/tracks/yosemite';
import { terrainElevation } from '../../src/core/elevation';
import { supported } from '../../src/core/support';
import { insideBarrier } from '../../src/core/barriers';
import { yosemiteRivers,yosemiteLakes } from '../../src/core/tracks/yosemite-water';
import { CREEK_BANK, creekSide, yosemiteBankGround } from '../../src/presentation/yosemite-creek-bank';

const ground = yosemiteBankGround(track), water = -2.4,bodies=[...yosemiteRivers(track),...yosemiteLakes(track)];
test('rendered creek banks are continuous and keep the water edge on the authoritative banks', () => {
  let near = 0;
  for (let z = -170; z <= 26; z += 0.5) for (let x = -2; x <= 56; x += 0.5) {
    const p = { x, z }, side = creekSide(p,track), y = ground(x, z);
    if (side >= CREEK_BANK.blendTo) { expect(y).toBe(terrainElevation(p, track)); continue; }
    near++;
    // Continuous: no steps between neighbouring samples beyond the bank slope (under 1.2 m per metre,
    // steeper where the meadow stands higher) or a step the core terrain itself has there.
    const core = terrainElevation(p, track);
    for (const [dx, dz] of [[0.5, 0], [0, 0.5]]) {
      const step = Math.abs(ground(x + dx, z + dz) - y), coreStep = Math.abs(terrainElevation({ x: x + dx, z: z + dz }, track) - core);
      expect(step, `${x}, ${z}`).toBeLessThan(Math.max(0.6, coreStep + 0.05));
    }
    if (side <= -0.75) {const level=Math.min(...bodies.filter(b=>insideBarrier(p,{id:b.id,height:0,footprint:b.footprint})).map(b=>b.level));expect(y, `in the water at ${x}, ${z}`).toBeLessThan(level);}
    if (side >= 0.75 && supported(p, track)) expect(y, `on the bank at ${x}, ${z}`).toBeGreaterThan(water);
  }
  expect(near).toBeGreaterThan(4000);
});
