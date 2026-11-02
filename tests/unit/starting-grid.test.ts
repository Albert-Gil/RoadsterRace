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
    // One row: every car the same distance behind the line (owner request 2026-11-01).
    const along = poses.map(p => gateCoordinates(p, track).along);
    expect(Math.max(...along) - Math.min(...along)).toBeLessThan(1e-6); expect(along[0]).toBeLessThan(0);
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

test.each(circuits)('$id lines up identical edge anchors side by side, packed toward that edge', ({ track }) => {
  for (const edge of [-7.5, -6, 6, 7.5]) {
    const routes = Array.from({length:4}, () => line(track, edge));
    for (let rotation = 0; rotation < 4; rotation++) {
      const poses = startingGrid(track, routes, rotation), coordinates = poses.map(p => gateCoordinates(p, track));
      expect(Math.max(...coordinates.map(c => c.along)) - Math.min(...coordinates.map(c => c.along))).toBeLessThan(1e-6);
      // Packed against the drawn edge with a car-width gap; the rotation decides who sits nearest it.
      const sorted = coordinates.map(c => c.across).sort((a, b) => a - b);
      for (let i = 1; i < 4; i++) expect(sorted[i] - sorted[i - 1]).toBeCloseTo(track.carWidth + 0.45, 6);
      const anchor = routes[0].points[0], gap = poses.map(p => Math.hypot(p.x - anchor.x, p.z - anchor.z));
      const nearest = gap.indexOf(Math.min(...gap)), slot = edge < 0 ? 0 : 3;
      expect(nearest).toBe((slot - rotation + 4) % 4);
    }
    const race = new LocalRace(routes,track,1);
    // Cars far from their drawn anchor cross over while the five-second contact-free start lasts.
    for(let tick=0;tick<300;tick++)race.step();
    expect(race.racers.every(car => !car.gridPending && car.state.distance > 2 && car.state.recoveryCount === 0)).toBe(true);
  }
}, 60000);

test('two to four cars each start the same distance behind the line on every circuit', () => {
  for (const { track } of circuits) for (const count of [2, 3, 4]) {
    const routes = Array.from({ length: count }, () => compileRoute(createPracticeSamples(track, 7), track)).map(r => { if (!r.ok) throw Error(r.message); return r.route; });
    const along = startingGrid(track, routes).map(p => gateCoordinates(p, track).along);
    expect(Math.max(...along) - Math.min(...along), `${track.id} ${count}`).toBeLessThan(1e-6);
  }
});
