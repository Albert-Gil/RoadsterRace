import { expect, test } from 'vitest';
import { getMessageBytes, Protocol } from '@colyseus/core';
import { coastalTrack } from '../../src/core/track';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';
import { packCar, packFrame, unpackCar, unpackFrame } from '../../src/duels/protocol';

test('protocol 2 cars round-trip within display precision and never carry cooldowns', () => {
  const r = compileRoute(createPracticeSamples(coastalTrack, 6), coastalTrack);
  if (!r.ok) throw new Error(r.message);
  const race = new LocalRace([r.route, r.route], coastalTrack, 1);
  race.pressThrust(0);
  for (let i = 0; i < 400; i++) race.step();
  for (const { state } of race.racers) {
    const car = unpackCar(packCar(state));
    expect(car.position.x).toBeCloseTo(state.position.x, 2); expect(car.position.z).toBeCloseTo(state.position.z, 2);
    expect(car.heading).toBeCloseTo(state.heading, 3); expect(car.speed).toBeCloseTo(state.speed, 2);
    expect(car.time).toBeCloseTo(state.time, 3); expect(car.thrustUntil).toBeCloseTo(state.thrustUntil, 3);
    expect([car.movement, car.surface, car.flightOrigin, car.finished, car.drifting, car.recoveryWaiting, car.lap, car.hopCount])
      .toEqual([state.movement, state.surface, state.flightOrigin, state.finished, state.drifting, state.recoveryWaiting, state.lap, state.hopCount]);
    expect(car).not.toHaveProperty('hopReadyAt'); expect(car).not.toHaveProperty('thrustReadyAt');
  }
  const frame = { round: 1, tick: race.tick, countdown: 0, cars: race.racers.map(x => x.state), order: race.standings(), events: [] };
  const back = unpackFrame(packFrame(frame));
  expect(back.order.map(s => [s.player, s.rank, s.finished])).toEqual(frame.order.map(s => [s.player, s.rank, s.finished]));
  // Every car field is a small integer, so a four-car frame stays compact on the wire.
  expect(getMessageBytes.raw(Protocol.ROOM_DATA, 'frame', packFrame({ ...frame, cars: [...frame.cars, ...frame.cars] })).byteLength).toBeLessThan(320);
});
