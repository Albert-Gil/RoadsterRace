import { ACTIVATION_KEYS, PressTracker, type PressContext } from './press-context';

/** The page's one press tracker (src/input/press-context.ts). Screens call `pressTracker.nextScreen()`. */
export const pressTracker = new PressTracker();

function contextOf(target: EventTarget | null): PressContext {
  const element = target instanceof Element ? target : null;
  if (element?.closest('.ability-control')) return 'pad';
  if (element?.closest('canvas')) return 'drawing';
  return 'menu';
}

/**
 * Capture-phase listeners on the document, ahead of every screen's own handlers: they record where each
 * press began and stop a click (or a keyboard auto-repeat) that would act on a screen the press did not
 * begin on. Returns a function that removes them.
 */
export function installPressGuard(doc: Document = document) {
  const now = () => performance.now();
  const listeners: [string, (e: Event) => void][] = [
    ['pointerdown', e => pressTracker.pointerDown((e as PointerEvent).pointerId, contextOf(e.target))],
    ['pointerup', e => pressTracker.pointerUp((e as PointerEvent).pointerId, now())],
    ['pointercancel', e => pressTracker.pointerCancel((e as PointerEvent).pointerId)],
    ['keydown', e => {
      const k = e as KeyboardEvent;
      // A held Enter repeats keydown; on a focused button each repeat would click again.
      if (!pressTracker.keyDown(k.code, k.repeat) && ACTIVATION_KEYS.has(k.code) && (k.target as Element | null)?.closest?.('button, [role="button"], a[href]')) e.preventDefault();
    }],
    ['keyup', e => pressTracker.keyUp((e as KeyboardEvent).code, now())],
    ['click', e => { if (!pressTracker.allowsClick((e as MouseEvent).detail, now())) { e.preventDefault(); e.stopImmediatePropagation(); } }],
  ];
  for (const [type, listener] of listeners) doc.addEventListener(type, listener, true);
  return () => { for (const [type, listener] of listeners) doc.removeEventListener(type, listener, true); };
}
