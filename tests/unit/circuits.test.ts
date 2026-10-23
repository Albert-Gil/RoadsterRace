import { describe, expect, test } from 'vitest';
import { circuits, findCircuit, circuitMapPath } from '../../src/content/circuits';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { RaceSimulation } from '../../src/core/simulation';
import { LocalRace } from '../../src/core/local-race';
import { mix, projectToPolyline } from '../../src/core/geometry';

describe('playable circuit registry', () => {
  test('only known circuits resolve; maps represent distinct physical layouts', () => {
    expect(new Set(circuits.map(c => c.id)).size).toBe(circuits.length);
    expect(findCircuit('orbital-launchyard').track).toBe(orbitalTrack);
    expect(findCircuit('constructor').id).toBe('coastal-launch');
    expect(circuitMapPath(circuits[0].track)).not.toBe(circuitMapPath(orbitalTrack));
    expect(orbitalTrack.length).toBeGreaterThan(360); expect(orbitalTrack.length).toBeLessThan(460);
  });
  for (const circuit of circuits) describe(circuit.id, () => {
    test('solid footprints preserve at least five metres of deliberate runoff', () => {
      const track = circuit.track;
      for (const barrier of track.barriers) {
        if (barrier.kind === 'pier-rail') { expect(track.supports?.length).toBeGreaterThan(0); continue; }
        if (barrier.kind === 'bridge-rail' || barrier.kind === 'bridge-support') {
          expect(track.bridges?.some(b => b.id === barrier.bridgeId)).toBe(true); continue;
        }
        let minimum = Infinity;
        for (let i = 0; i < barrier.footprint.length; i++) for (let j = 0; j <= 40; j++) {
          const p = mix(barrier.footprint[i], barrier.footprint[(i + 1) % barrier.footprint.length], j / 40);
          minimum = Math.min(minimum, projectToPolyline(p, track.centerline, track.distances).distance - track.roadWidth / 2);
        }
        expect(minimum, `${barrier.id}: ${minimum.toFixed(2)}m runoff`).toBeGreaterThanOrEqual(5);
      }
    });
    test.each([2, 4, 7, 14, 24])('%i-second pace plan compiles and finishes both laps', seconds => {
      const result = compileRoute(createPracticeSamples(circuit.track, seconds), circuit.track);
      expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.message);
      const race = new RaceSimulation(result.route, circuit.track);
      for (let i = 0; i < 18000 && !race.state.finished; i++) race.step();
      expect(race.state.finished).toBe(true); expect(race.state.lapTimes).toHaveLength(2);
      expect(Number.isFinite(race.state.position.x + race.state.position.z)).toBe(true);
    });
    test('a deliberate wide outer-sand plan remains valid and completes the race', () => {
      const track = circuit.track, samples = createPracticeSamples(track, 7).map((p, i, all) => {
        const a = all[Math.max(0, i - 1)], b = all[Math.min(all.length - 1, i + 1)], len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const winding = Math.sign(track.centerline.slice(1).reduce((sum, q, j) => sum + all[j].x * q.z - q.x * all[j].z, 0));
        const phase = (track.distances[i] - (track.supports ? track.length - 85 : 8)) / 72, offset = phase > 0 && phase < 1 ? Math.sin(phase * Math.PI) ** 2 * 12 * winding : 0;
        return { ...p, x: p.x + (b.z - a.z) / len * offset, z: p.z - (b.x - a.x) / len * offset };
      });
      const result = compileRoute(samples, track); if (!result.ok) throw new Error(result.message);
      const race = new RaceSimulation(result.route, track); let reachedSand = false;
      for (let i = 0; i < 18000 && !race.state.finished; i++) { race.step(); reachedSand ||= race.state.sandAmount > 0.5; }
      expect(race.state.finished).toBe(true); expect(reachedSand).toBe(true);
    });
    test('four cars complete six laps and cannot use another circuit’s plan', () => {
      const result = compileRoute(createPracticeSamples(circuit.track, 7), circuit.track);
      if (!result.ok) throw new Error(result.message);
      const race = new LocalRace(Array(4).fill(result.route), circuit.track, 6);
      for (let i = 0; i < 18000 && !race.finished; i++) race.step();
      expect(race.finished).toBe(true); expect(race.racers.every(r => r.state.lapTimes.length === 6)).toBe(true);
      const other = circuits.find(c => c.id !== circuit.id)!;
      expect(() => new LocalRace([result.route], other.track)).toThrow('same circuit');
    }, 30000);
  });
});
