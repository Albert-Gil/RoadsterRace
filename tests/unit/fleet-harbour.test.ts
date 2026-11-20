import { describe, expect, it } from 'vitest';
import { sanDiegoFleetTrack as track } from '../../src/core/tracks/san-diego-fleet';
import { fleetHarbour, harbourClearance } from '../../src/presentation/fleet-harbour';
import { fleetHarbourAppearance as art } from '../../src/presentation/themes';

describe('San Diego Fleet harbour life (visual pass 5)', () => {
  const clear = harbourClearance(track);
  it('places every authored vessel and buoy clear of ships, lanes and crossings', () => {
    for (const v of art.vessels) expect(clear(v), `${v.kind} at ${v.x}, ${v.z}`).toBeGreaterThanOrEqual(art.clearance);
    expect(fleetHarbour(track, -1.6).vessels.length).toBe(art.vessels.length);
  });
  it('keeps vessel geometry low and away from every ship', () => {
    const { solid, foam } = fleetHarbour(track, -1.6);
    for (let i = 0; i < solid.positions.length; i += 3) {
      expect(solid.positions[i + 1]).toBeLessThan(-1.6 + 22);
      expect(clear({ x: solid.positions[i], z: solid.positions[i + 2] })).toBeGreaterThan(art.clearance - 20);
    }
    for (let i = 0; i < foam.positions.length; i += 3) expect(foam.positions[i + 1]).toBeCloseTo(-1.6 + art.foamLift, 5);
  });
});
