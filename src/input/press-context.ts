/**
 * Which screen a press began on. A press belongs to the screen (and context: drawing canvas, ability pad or
 * menu) where it went down; releasing it after the screen changed must not activate anything on the new
 * screen. Release, cancellation, lost capture, blur, backgrounding and rotation forget the press. Keyboard
 * auto-repeat never re-activates a focused button. Assistive activation (a click with no pointer or key
 * behind it) is always allowed. Pure state; src/input/press-guard.ts wires it to the document.
 */
export type PressContext = 'drawing' | 'pad' | 'menu';
export const ACTIVATION_KEYS = new Set(['Enter', 'NumpadEnter', 'Space']);

export class PressTracker {
  /** Bumped on every screen change (phase change or a new overlay screen). */
  screen = 0;
  private pointers = new Map<number, { screen: number; context: PressContext }>();
  private keys = new Map<string, number>();
  /** The last released pointer press, for the click that follows its release. */
  private released?: { screen: number; context: PressContext; at: number };
  /** The last released key: Space activates a button on key up, just after the release. */
  private releasedKey?: { code: string; screen: number; at: number };

  nextScreen() { this.screen++; }
  pointerDown(id: number, context: PressContext) { this.pointers.set(id, { screen: this.screen, context }); }
  /** Release: remembers the press for the click the browser dispatches next. */
  pointerUp(id: number, now: number) {
    const press = this.pointers.get(id);
    this.pointers.delete(id);
    this.released = press ? { ...press, at: now } : undefined;
  }
  /** Cancel or lost capture: the press ends without activating anything. */
  pointerCancel(id: number) { this.pointers.delete(id); this.released = undefined; }
  /** Returns false for keyboard auto-repeat (the caller suppresses the repeated activation). */
  keyDown(code: string, repeat: boolean) {
    if (repeat) return false;
    this.keys.set(code, this.screen);
    return true;
  }
  keyUp(code: string, now: number) {
    const began = this.keys.get(code);
    this.keys.delete(code);
    this.releasedKey = began === undefined ? undefined : { code, screen: began, at: now };
  }
  /** Blur, backgrounding or rotation: forget every press in progress. */
  clear() { this.pointers.clear(); this.keys.clear(); this.released = undefined; this.releasedKey = undefined; }
  /** The context a pointer press began in, if it is still down. */
  context(id: number) { return this.pointers.get(id)?.context; }

  /**
   * May this click activate a control on the current screen? A pointer click (detail > 0) needs a menu press
   * that began on this screen and was just released. A keyboard or assistive click (detail 0) is refused only
   * while an activation key that went down on an earlier screen is still held or just released.
   */
  allowsClick(detail: number, now: number) {
    if (detail > 0) {
      // Not consumed: a label forwards a second click to its control for the same press.
      const press = this.released;
      return !!press && press.context === 'menu' && press.screen === this.screen && now - press.at < 1000;
    }
    const key = this.releasedKey;
    this.releasedKey = undefined;
    if (key && ACTIVATION_KEYS.has(key.code) && now - key.at < 200 && key.screen !== this.screen) return false;
    for (const [code, began] of this.keys) if (ACTIVATION_KEYS.has(code) && began !== this.screen) return false;
    return true;
  }
}
