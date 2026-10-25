/**
 * In-race and planning controls grow with large touch screens. Sizes are tuned on a phone whose
 * short side is about 430 CSS px (iPhone 16 Pro Max), where the scale is 1; an iPad's larger
 * short side gives proportionally larger targets up to `max`. Mouse/trackpad layouts stay at 1.
 */
export const UI_SCALE = Object.freeze({ referenceShortSide: 430, max: 1.6 });
export function uiScale(width: number, height: number, coarsePointer: boolean) {
  if (!coarsePointer) return 1;
  return Math.min(UI_SCALE.max, Math.max(1, Math.min(width, height) / UI_SCALE.referenceShortSide));
}
