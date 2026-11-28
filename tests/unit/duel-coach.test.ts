import { describe, expect, it } from 'vitest';
import { CoachCards, COACH_STORAGE_KEY, coachOrder } from '../../src/duels/coach';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m }; };

describe('guided first online race', () => {
  it('never shows a card while racing or loading', () => {
    for (const kind of ['race', 'loading', 'menu', 'reconnecting', 'entry', 'connecting'] as const) expect(coachOrder(kind, true)).toEqual([]);
  });
  it('shows each card once per device, in order, and remembers dismissals', () => {
    const store = memory(), cards = new CoachCards(store);
    expect(cards.next('room', true)).toBe('invite');
    expect(cards.next('room', false)).toBe('private-lines');
    cards.dismiss('invite');
    expect(cards.next('room', true)).toBe('private-lines');
    cards.dismiss('private-lines');
    expect(cards.next('room', true)).toBeUndefined();
    expect(cards.next('waiting', false)).toBe('pads');
    expect(cards.next('results', false)).toBe('rematch');
    const again = new CoachCards(store);
    expect(again.next('room', true)).toBeUndefined();
    expect(again.next('waiting', true)).toBe('pads');
  });
  it('Settings shows them again; damaged or missing storage just shows the cards', () => {
    const store = memory(), cards = new CoachCards(store);
    cards.dismiss('invite');
    CoachCards.reset(store);
    expect(store.m.has(COACH_STORAGE_KEY)).toBe(false);
    expect(new CoachCards(store).next('room', true)).toBe('invite');
    store.setItem(COACH_STORAGE_KEY, '{oops');
    expect(new CoachCards(store).next('room', true)).toBe('invite');
    const none = new CoachCards(undefined);
    none.dismiss('invite');
    expect(none.next('room', true)).toBe('private-lines');
  });
});
