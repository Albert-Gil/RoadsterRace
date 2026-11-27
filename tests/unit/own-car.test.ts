import { describe, expect, it } from 'vitest';
import { findCircuit } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { ownCarAhead, routeDistanceNear, OWN_AHEAD_CAP_MS } from '../../src/duels/own-car';
import { FramePlayback } from '../../src/duels/playback';
import type { CarView, RaceFrame } from '../../src/duels/protocol';

const track = findCircuit('coastal-launch').track, compiled = compileRoute(createPracticeSamples(track, 7), track);
if (!compiled.ok) throw new Error(compiled.message);
const route = compiled.route;
const car = (distance: number, extra: Partial<CarView> = {}): CarView => {
  const p = sampleRoute(route, distance);
  return { position: { x: p.x, z: p.z }, elevation: 0, heading: p.heading, speed: 30, verticalVelocity: 0, time: 5, lap: 1, finished: false, finishTime: null,
    thrustUntil: -1, flightStartedAt: -1, recoveringUntil: -1, recoveryWaiting: false, recoveryCount: 0, movement: 'grounded', flightOrigin: null,
    surface: 'asphalt', sandAmount: 0, drifting: false, steeringRate: 0, acceleration: 0, slipAngle: 0, hopCount: 0, ...extra } as CarView;
};

describe('your own car drawn closer to the present', () => {
  it('moves along your own line by speed x time, capped at 200 ms', () => {
    const start = car(200), d0 = routeDistanceNear(route, start.position);
    expect(d0).toBeCloseTo(200, 0);
    const pose = ownCarAhead(route, start, 100)!;
    expect(routeDistanceNear(route, pose)).toBeCloseTo(203, 0);
    const capped = ownCarAhead(route, start, 1000)!;
    expect(routeDistanceNear(route, capped)).toBeCloseTo(200 + 30 * OWN_AHEAD_CAP_MS / 1000, 0);
  });
  it('never extrapolates in flight, during recovery, after the finish or with no lead', () => {
    expect(ownCarAhead(route, car(200, { movement: 'airborne' }), 100)).toBeNull();
    expect(ownCarAhead(route, car(200, { recoveringUntil: 6 }), 100)).toBeNull();
    expect(ownCarAhead(route, car(200, { recoveryWaiting: true }), 100)).toBeNull();
    expect(ownCarAhead(route, car(200, { finished: true }), 100)).toBeNull();
    expect(ownCarAhead(route, car(200), 0)).toBeNull();
  });
  it('leads the newest frame by the time a press sent now needs to reach the room', () => {
    const playback = new FramePlayback(), frame = (tick: number) => ({ round: 1, tick, countdown: 0, cars: [], order: [], events: [] }) as unknown as RaceFrame;
    // Frames arrive 80 ms after the server sent them; the newest is tick 60 (1 s).
    playback.push(frame(57), 1000 + 950 + 80); playback.push(frame(60), 1000 + 1000 + 80);
    // At wall time 2130 the server is at 1130 ms (tick 67.8); a press sent now lands 80 ms later, at 1210 ms:
    // 210 ms ahead of the newest frame. Without a measured delay the lead is only the frame's age (50 ms).
    expect(playback.aheadOf(playback.latest!, 2130, 80)).toBeCloseTo(210, 0);
    expect(playback.aheadOf(playback.latest!, 2130)).toBeCloseTo(50, 0);
  });
});
