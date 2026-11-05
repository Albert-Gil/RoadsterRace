import {test,expect,type Page} from '@playwright/test';
import {waitForPhase} from './ui';
const ready=(page:Page)=>page.waitForFunction(()=>(window as any).__roadster?.getGraphics().renderReady,null,{timeout:120000});
// Real D3D11 also varies edge pixels on the unchanged baseline. This strict
// image oracle uses software; the separate budget/timing suites use the GPU.
test.use({launchOptions:{
 executablePath:process.env.CHROME_PATH??(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],
}});
test('static scenery shadows are drawn once and every frame looks the same as drawing all casters', async ({ page }) => {
  test.setTimeout(300000); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click(); await page.getByRole('button', { name: 'Draw racing line' }).click();
  await waitForPhase(page, 'drawing'); await ready(page);
  await page.waitForFunction(() => { const g = (window as any).__roadster.getGraphics(); return g.staticShadows.perFrameCasters < g.shadowCasters; }, null, { timeout: 120000 });
  // Each capture is the frame drawn right after the switch, read from the drawing buffer.
  const frames = await page.evaluate(async () => {
    const game = (window as any).__roadster, world = game.getWorld();
    const next = (on: boolean | null) => new Promise<{ image: string; shadows: { enabled: boolean; bakes: number; perFrameCasters: number } }>(resolve => {
      if (on !== null) world.setStaticShadows(on);
      world.scene.onAfterRenderObservable.addOnce(() => resolve({ image: world.engine.getRenderingCanvas().toDataURL(), shadows: game.getGraphics().staticShadows }));
    });
    const cached = await next(null), everyCaster = await next(false), copyTaken = await next(true), fromCopy = await next(null);
    return { cached: cached.shadows, casters: game.getGraphics().shadowCasters, everyCaster: everyCaster.shadows, copyTaken: copyTaken.shadows, fromCopy: fromCopy.shadows,
      same: [everyCaster, copyTaken, fromCopy].map(frame => frame.image === cached.image) };
  });
  expect(frames.cached.enabled).toBe(true); expect(frames.cached.perFrameCasters).toBeLessThan(frames.casters);
  expect(frames.everyCaster).toMatchObject({ enabled: false, perFrameCasters: frames.casters });
  expect(frames.copyTaken.bakes).toBe(frames.cached.bakes + 1); expect(frames.fromCopy).toMatchObject({ bakes: frames.copyTaken.bakes, perFrameCasters: frames.cached.perFrameCasters });
  expect(frames.same).toEqual([true, true, true]);
  expect(errors).toEqual([]);
});
