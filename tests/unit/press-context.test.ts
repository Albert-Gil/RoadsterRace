import { describe, expect, it } from 'vitest';
import { PressTracker } from '../../src/input/press-context';

describe('a press belongs to the screen where it began', () => {
  it('lets a menu click through only when its press began on this screen', () => {
    const t = new PressTracker();
    t.pointerDown(1, 'menu'); t.pointerUp(1, 100);
    expect(t.allowsClick(1, 120)).toBe(true);
    t.pointerDown(2, 'menu'); t.nextScreen(); t.pointerUp(2, 200);
    expect(t.allowsClick(1, 210)).toBe(false);
  });
  it('never lets a drawing or pad press click a menu control', () => {
    const t = new PressTracker();
    t.pointerDown(1, 'drawing'); t.pointerUp(1, 0); expect(t.allowsClick(1, 10)).toBe(false);
    t.pointerDown(2, 'pad'); t.pointerUp(2, 0); expect(t.allowsClick(1, 10)).toBe(false);
  });
  it('drops a cancelled press and everything after blur, backgrounding or rotation', () => {
    const t = new PressTracker();
    t.pointerDown(1, 'menu'); t.pointerCancel(1); expect(t.allowsClick(1, 0)).toBe(false);
    t.pointerDown(2, 'menu'); t.clear(); t.pointerUp(2, 0); expect(t.allowsClick(1, 0)).toBe(false);
  });
  it('refuses a held activation key from the previous screen and every auto-repeat', () => {
    const t = new PressTracker();
    expect(t.keyDown('Enter', false)).toBe(true);
    expect(t.allowsClick(0, 0)).toBe(true);           // Enter clicks on key down, same screen
    expect(t.keyDown('Enter', true)).toBe(false);      // auto-repeat: the caller suppresses it
    t.nextScreen();
    expect(t.allowsClick(0, 10)).toBe(false);          // still held across the screen change
    t.keyUp('Enter', 20); expect(t.allowsClick(0, 25)).toBe(false); // Space-style click right after release
    expect(t.allowsClick(0, 500)).toBe(true);          // assistive activation later is fine
    t.keyDown('Space', false); t.keyUp('Space', 600); expect(t.allowsClick(0, 610)).toBe(true);
  });
  it('allows assistive activation with no pointer or key behind it', () => {
    expect(new PressTracker().allowsClick(0, 0)).toBe(true);
  });
});
