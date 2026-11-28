import { describe, expect, it } from 'vitest';
import { admits, capacitySettings, circuitWeight, DEFAULT_CAPACITY, MEASURED_WEIGHTS } from '../../server/capacity';
import { defaultDuelVenues } from '../../src/duels/protocol';

/** Circuits rooms offered before the weighted limit: the defaults and San Diego Fleet. */
const earlier = [...defaultDuelVenues, 'san-diego-fleet'];

describe('weighted room capacity', () => {
  const defaults = capacitySettings({});

  it('still admits two rooms of every circuit offered before weights existed', () => {
    expect(defaults).toMatchObject({ maxRooms: 2, capacity: DEFAULT_CAPACITY });
    for (const a of earlier) for (const b of earlier) expect(admits([a], b, defaults), `${a}+${b}`).toBe(true);
    expect(admits(['coastal-launch', 'coastal-launch'], 'coastal-launch', defaults)).toBe(false);
  });

  it('limits the heavy circuits but never refuses an idle server', () => {
    for (const heavy of ['lax', 'capitan-yosemite', 'snowy-tahoe']) {
      expect(admits([], heavy, defaults)).toBe(true);
      expect(admits([heavy], heavy, defaults), heavy).toBe(false);
      expect(admits(['san-diego-fleet'], heavy, defaults), heavy).toBe(false);
    }
    expect(admits(['coastal-launch'], 'canyon-south-rim', defaults)).toBe(true);
    expect(circuitWeight('not-a-circuit', defaults)).toBe(Math.max(...Object.values(MEASURED_WEIGHTS)));
  });

  it('reads the budget, room count and weight overrides from the environment', () => {
    const tuned = capacitySettings({ DUEL_CAPACITY: '30', DUEL_MAX_ROOMS: '4', DUEL_WEIGHTS: 'lax=5, capitan-yosemite = 6,bad=,x=abc' });
    expect(tuned.capacity).toBe(30);
    expect(tuned.maxRooms).toBe(4);
    expect(circuitWeight('lax', tuned)).toBe(5);
    expect(circuitWeight('capitan-yosemite', tuned)).toBe(6);
    expect(admits(['lax', 'lax', 'capitan-yosemite'], 'lax', tuned)).toBe(true);
    expect(admits(['lax', 'lax', 'lax', 'lax'], 'coastal-launch', tuned)).toBe(false);
    expect(capacitySettings({ DUEL_CAPACITY: '-1', DUEL_MAX_ROOMS: '0' })).toMatchObject({ capacity: DEFAULT_CAPACITY, maxRooms: 2 });
  });

  it('lets an open room switch circuit when the new weight fits without its old one', () => {
    const budget = capacitySettings({ DUEL_CAPACITY: '2' });
    expect(admits(['coastal-launch', 'coastal-launch'], 'golden-gate', budget, 'coastal-launch')).toBe(false);
    expect(admits(['coastal-launch'], 'golden-gate', budget, 'coastal-launch')).toBe(true);
  });
});
