import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { gateCoordinates, startGate } from '../../src/core/start-finish';
import { LocalRace, startingGrid } from '../../src/core/local-race';
import { barrierContact } from '../../src/core/barriers';
import { vehicleContact } from '../../src/core/vehicle-contact';
import type { TrackDefinition } from '../../src/core/types';

function line(track: TrackDefinition, across: number) {
  const gate = startGate(track);
  const samples = createPracticeSamples(track, 7).map(sample => {
    const { along } = gateCoordinates(sample, track);
    const blend = Math.max(0, 1 - Math.abs(along) / 22);
    // Change only the straight containing the gate, never a parallel remote road.
    if (Math.hypot(sample.x - gate.center.x, sample.z - gate.center.z) > 24) return sample;
    const offset = across * blend * blend * (3 - 2 * blend);
    return { ...sample, x: sample.x + gate.forward.z * offset, z: sample.z - gate.forward.x * offset };
  });
  const result = compileRoute(samples, track);
  if (!result.ok) throw new Error(`${track.id}: ${result.message}`);
  return result.route;
}

test.each(circuits)('$id starts near each drawn gate anchor and joins forward in every grid rotation', ({ track }) => {
  const routes = [-6, -2, 2, 6].map(offset => line(track, offset));
  const gate = startGate(track);
  for (let rotation = 0; rotation < 4; rotation++) {
    const poses = startingGrid(track, routes, rotation);
    poses.forEach((pose, i) => {
      expect(Math.abs(gateCoordinates(pose, track).across - gateCoordinates(routes[i].points[0], track).across)).toBeLessThan(0.3);
      expect(barrierContact(pose, pose.heading, track)).toBeNull();
      for (let j = 0; j < i; j++) expect(vehicleContact({position:pose,heading:pose.heading,velocity:{x:0,z:0}}, {position:poses[j],heading:poses[j].heading,velocity:{x:0,z:0}},track)).toBeNull();
    });
    const race = new LocalRace(routes, track, 1, rotation);
    for (let tick = 0; tick < 180; tick++) {
      race.step();
      for (const car of race.racers) {
        // No start-point orbit, reverse heading, false recovery or credited grid distance.
        expect(Math.sin(car.state.heading) * gate.forward.x + Math.cos(car.state.heading) * gate.forward.z).toBeGreaterThan(0.75);
        expect(car.state.recoveryCount).toBe(0);
        if (car.gridPending) expect(car.state.distance).toBe(0);
      }
    }
    expect(race.racers.every(car => !car.gridPending && car.state.distance > 2)).toBe(true);
  }
});

test.each(circuits)('$id separates identical edge anchors without sending cars across the road', ({ track }) => {
  for (const edge of [-7.5, -6, 6, 7.5]) {
    const routes = Array.from({length:4}, () => line(track, edge));
    const poses = startingGrid(track, routes);
    expect(poses.every(p => Math.abs(gateCoordinates(p, track).across - edge) < 4)).toBe(true);
    const race = new LocalRace(routes,track,1);
    // Four larger cars sharing an edge anchor can occupy four safe staggered
    // rows. All join before the five-second contact-free start ends.
    for(let tick=0;tick<300;tick++)race.step();
    expect(race.racers.every(car => !car.gridPending && car.state.distance > 2 && car.state.recoveryCount === 0)).toBe(true);
  }
}, 60000);
