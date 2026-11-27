import { describe, expect, it } from 'vitest';
import { resolveBallot } from '../../src/core/rematch-vote';

describe('rematch ballot', () => {
  it('waits for every seat', () => {
    expect(resolveBallot([])).toBe('pending');
    expect(resolveBallot(['same', null])).toBe('pending');
    expect(resolveBallot(['home', undefined, 'same'])).toBe('pending');
  });
  it('races the same lines only when everyone chose it', () => {
    expect(resolveBallot(['same', 'same'])).toBe('same');
    expect(resolveBallot(['same', 'same', 'same', 'same'])).toBe('same');
  });
  it('any redraw vote means fresh lines for everyone; any Home vote wins over both', () => {
    expect(resolveBallot(['same', 'redraw', 'same'])).toBe('redraw');
    expect(resolveBallot(['redraw', 'redraw'])).toBe('redraw');
    expect(resolveBallot(['same', 'redraw', 'home'])).toBe('home');
    expect(resolveBallot(['home', 'same'])).toBe('home');
  });
});
