import { describe, expect, it } from 'vitest';
import table from '../../src/content/ramp-clearing.json';
import { sanDiegoFleetTrack as fleet } from '../../src/core/tracks/san-diego-fleet';
import { coastalTrack } from '../../src/core/track';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { automaticJumps, hopGaps, landsAt } from '../../src/core/ramp-clearing';
import { clearingSpeeds, rampWarnings } from '../../src/core/ramp-warnings';

const route = (seconds: number, branch: string | false = false) => {
  const compiled = compileRoute(createPracticeSamples(fleet, seconds, branch), fleet);
  if (!compiled.ok) throw new Error(compiled.message);
  return compiled.route;
};

describe('ramp clearing guidance', () => {
  it('has a current clearing speed for every automatic Fleet ramp and both support-ship Hops', () => {
    const speeds = clearingSpeeds(fleet)!;
    expect(speeds).toBeDefined();
    expect(Object.keys(speeds).sort()).toEqual([...automaticJumps(fleet), ...hopGaps(fleet)].map(j => j.id).sort());
    expect(hopGaps(fleet).map(j => j.id).sort()).toEqual(['support-a-hop', 'support-b-hop']);
  });
  it('still matches the simulation at the table edge (rerun tools/ramp-clearing.mjs if this fails)', () => {
    const jump = fleet.jumps!.find(j => j.id === 'carrier-a-crossing')!, speed = clearingSpeeds(fleet)![jump.id];
    expect(landsAt(fleet, jump, speed)).toBe(true);
    expect(landsAt(fleet, jump, speed - 0.25)).toBe(false);
  });
  it('flags slow lines at every automatic ramp and leaves fast lines alone', () => {
    expect(rampWarnings(route(7), fleet)).toEqual([]);
    expect(rampWarnings(route(12), fleet).map(w => w.id)).toEqual(['carrier-a-crossing', 'destroyer-a-return', 'carrier-b-crossing', 'destroyer-b-return']);
    expect(rampWarnings(route(12, 'support-a-lane'), fleet).map(w => w.id)).toContain('support-a-return');
  });
  it('warns before a support-ship Hop on a shortcut drawn too slowly, and not on one drawn briskly', () => {
    // Measured on real drawn lines (tools/ramp-clearing.mjs): 7 s shortcut lines clear with a well-timed Hop;
    // 8.5 s lines fail at the gap whatever the timing.
    for (const lane of ['support-a-lane', 'support-b-lane']) {
      expect(rampWarnings(route(7, lane), fleet)).toEqual([]);
      const slow = rampWarnings(route(8.5, lane), fleet);
      expect(slow.filter(w => w.kind === 'hop').map(w => w.id)).toEqual([lane.replace('-lane', '-hop')]);
    }
    expect(rampWarnings(route(12), fleet).every(w => w.kind === 'ramp')).toBe(true);
  });
  it('stays silent on tracks without a table and when the table is stale', () => {
    const coastal = compileRoute(createPracticeSamples(coastalTrack, 12), coastalTrack);
    if (!coastal.ok) throw new Error(coastal.message);
    expect(rampWarnings(coastal.route, coastalTrack)).toEqual([]);
    expect(rampWarnings(route(12), fleet, { ...table, rules: table.rules - 1 })).toEqual([]);
  });
});
