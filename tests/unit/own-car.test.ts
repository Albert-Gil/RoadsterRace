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

import { OwnCarDisplay, lipDistances } from '../../src/duels/own-car';

describe('your own car near Fleet jumps', () => {
  const fleet = findCircuit('san-diego-fleet').track;
  const lines = [false, 'support-a-lane', 'support-b-lane'] as const;
  const routeOf = (lane: false | string) => { const r = compileRoute(createPracticeSamples(fleet, 7, lane), fleet); if (!r.ok) throw new Error(r.message); return r.route; };
  const carOn = (r: typeof route, distance: number, extra: Partial<CarView> = {}): CarView => {
    const p = sampleRoute(r, distance);
    return { ...car(0), position: { x: p.x, z: p.z }, heading: p.heading, speed: 30, ...extra } as CarView;
  };
  it('finds the car on its own section of the line, never a neighbouring deck', () => {
    for (const lane of lines) {
      const r = routeOf(lane);
      for (let d = 5; d < r.length - 5; d += 3) {
        const p = sampleRoute(r, d);
        expect(Math.abs(routeDistanceNear(r, p, d - 4) - d)).toBeLessThan(1.5);
      }
    }
  });
  it('stops the lead at every takeoff lip until the room confirms the flight', () => {
    for (const lane of lines) {
      const r = routeOf(lane), lips = lipDistances(r, fleet);
      expect(lips.length).toBeGreaterThan(0);
      for (const lip of lips) {
        const before = carOn(r, lip - 3);
        const pose = ownCarAhead(r, before, 200, undefined, lip - 3, lips)!;
        expect(routeDistanceNear(r, pose, lip - 3)).toBeLessThanOrEqual(lip + 0.01);
      }
    }
  });
  it('hands over to the authoritative flight and never steps backwards', () => {
    const r = routeOf('support-a-lane'), lip = lipDistances(r, fleet)[0], display = new OwnCarDisplay(r, fleet);
    let last = -Infinity;
    for (let t = 0; t <= 30; t++) {
      const d = lip - 12 + t * 0.5, airborne = d > lip;
      const c = carOn(r, d, airborne ? { movement: 'airborne', elevation: 26 } : {});
      const buffered = (() => { const p = sampleRoute(r, d - 3); return { x: p.x, z: p.z, y: 24, heading: p.heading }; })();
      const pose = display.update(t * 16.7, c, 200, buffered);
      const at = routeDistanceNear(r, pose, d);
      expect(at).toBeGreaterThanOrEqual(last - 1e-6);
      if (!airborne) expect(at).toBeLessThanOrEqual(lip + 0.01);
      last = at;
    }
    // Long after takeoff the drawn car is the room's own flight pose.
    const flying = carOn(r, lip + 10, { movement: 'airborne', elevation: 27 });
    const pose = display.update(5000, flying, 200, undefined);
    expect(pose.y).toBe(27);
    expect(Math.hypot(pose.x - flying.position.x, pose.z - flying.position.z)).toBeLessThan(0.01);
  });
});
