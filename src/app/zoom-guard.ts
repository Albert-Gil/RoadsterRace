/**
 * Keeps the game at its designed 1:1 scale. Browsers otherwise zoom on a double tap or a pinch
 * outside the drawing canvas, which strands players away from the fixed course camera.
 * Drawing, racing and ability controls already own their touches (touch-action: none).
 */
export function installZoomGuard(doc: Document = document, view: Window = window) {
  const block = (event: Event) => event.preventDefault();
  // Safari's proprietary pinch events; preventing them stops page zoom (including the iOS app web view).
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(type, block, { passive: false });
  doc.addEventListener('dblclick', block, { passive: false });
  doc.addEventListener('touchmove', event => { if (event.touches.length > 1 && event.cancelable) event.preventDefault(); }, { passive: false });
  // If something still scaled the page (assistive zoom, a focused field), return to 1:1 once idle.
  const viewport = view.visualViewport, meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport || !meta) return;
  const original = meta.content, editing = () => doc.activeElement instanceof HTMLInputElement || doc.activeElement instanceof HTMLSelectElement || doc.activeElement instanceof HTMLTextAreaElement;
  let pending = 0;
  const snapBack = () => {
    view.clearTimeout(pending);
    pending = view.setTimeout(() => {
      if (viewport.scale <= 1.01 || editing()) return;
      meta.content = `${original}, minimum-scale=1, maximum-scale=1`;
      view.requestAnimationFrame(() => view.requestAnimationFrame(() => { meta.content = original; }));
    }, 350);
  };
  viewport.addEventListener('resize', snapBack);
  doc.addEventListener('focusout', snapBack);
}
