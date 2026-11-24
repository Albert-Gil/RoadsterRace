/**
 * Phone-sized touch screens draw in zoomed sectors; tablets (iPad and larger), desktops and
 * laptops keep the single-stroke overview. Detection uses the screen's short side in CSS
 * pixels and a coarse (finger) pointer, never the user-agent string: every iPhone's short
 * side is 320–440 px, every iPad's is at least 744 px. `?sectors=on|off` overrides it.
 * Automated browsers keep the single-stroke overview unless `?sectors=on` asks for sectors
 * (as automation starts on the Low graphics tier), so whole-lap touch fixtures keep working.
 */
export const PHONE_SHORT_SIDE_MAX = 500;

export function phoneSizedTouchScreen(win: Pick<Window, 'innerWidth' | 'innerHeight' | 'matchMedia' | 'location' | 'navigator'> = window) {
  const override = new URLSearchParams(win.location.search).get('sectors');
  if (override === 'on') return true;
  if (override === 'off' || win.navigator?.webdriver) return false;
  const coarse = win.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse && Math.min(win.innerWidth, win.innerHeight) <= PHONE_SHORT_SIDE_MAX;
}
