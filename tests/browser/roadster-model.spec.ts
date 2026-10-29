import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { waitForPhase } from './ui';

test('steel paint, shared geometry and fixed brakes render correctly through a race', async ({ page }) => {
  mkdirSync('artifacts/vehicle-upgrade', { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?circuit=coastal-launch&graphics=medium');
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stainless steel gray', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '1 lap', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  const model = await page.evaluate(() => {
    const g = (window as any).__roadster, w = g.getWorld(), car = w.vehicles[0];
    const steel = { metal: car.paint.metallic, roughness: car.paint.roughness, texture: car.paint.bumpTexture?.name };
    car.setPaint('#d51f35'); const painted = { metal: car.paint.metallic, bump: car.paint.bumpTexture };
    car.setPaint('#aeb4b8'); car.update({ x: 0, z: 0, heading: 0 }, 20, false, .1);
    const root = car.root.getChildMeshes(), rest = Array.from(car.brakePositions);
    car.update({ x: 0, z: 0, heading: 0 }, 20, false, .2, 0, false, 1);
    const rangeMoved = (r: any) => Array.from(car.brakePositions.slice(r.from,r.to)).some((v,i)=>Math.abs((v as number)-(rest[r.from+i] as number))>.0001);
    return { steel, painted, triangles: car.triangleCount, fixed: root.filter((m: any) => m.name.startsWith('fixed-brakes')).map((m: any) => m.rotation.asArray()), assemblies: car.brakes.metadata.fixedWheelAssemblies, frontSteers: car.brakeRanges.slice(0,2).every(rangeMoved), rearFixed: car.brakeRanges.slice(2).every((r:any)=>!rangeMoved(r)), spinning: car.wheels.map((v: any) => v.mesh.rotation.x) };
  });
  expect(model.steel).toEqual({ metal: .86, roughness: .28, texture: 'satin-steel-micro-brushing' });
  expect(model.painted).toEqual({ metal: .5, bump: null });
  expect(model.triangles).toBeLessThanOrEqual(10000);
  expect(model.fixed).toHaveLength(1); expect(model.assemblies).toBe(4); expect(model.frontSteers).toBe(true); expect(model.rearFixed).toBe(true);
  expect(model.fixed.every((r: number[]) => r.every(v => v === 0))).toBe(true);
  expect(model.spinning.every((r: number) => r > 0)).toBe(true);
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line', exact: true }).click(); await waitForPhase(page, 'racing');
  await page.keyboard.press('Space'); await page.keyboard.press('h');
  await page.screenshot({ path: 'artifacts/vehicle-upgrade/racing-desktop.png' });
  await waitForPhase(page, 'results'); expect(errors).toEqual([]);
  writeFileSync('artifacts/vehicle-upgrade/model.json', JSON.stringify({ model, errors }, null, 2));
});

test('steel normal detail renders on the requested WebGPU backend or its WebGL fallback', async ({ page }) => {
  mkdirSync('artifacts/vehicle-upgrade', { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?circuit=coastal-launch&graphics=medium&renderer=webgpu');
  await expect(page.getByRole('button', { name: 'Time Trial', exact: true }), errors.join('\n')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.evaluate(() => (window as any).__roadster.usePracticeLine());
  await page.getByRole('button', { name: 'Race this line', exact: true }).click();
  await waitForPhase(page, 'racing');
  const graphics = await page.evaluate(() => (window as any).__roadster.getGraphics());
  expect(['webgpu', 'webgl2']).toContain(graphics.renderer); expect(graphics.renderReady).toBe(true); expect(errors).toEqual([]);
  writeFileSync('artifacts/vehicle-upgrade/renderer.json', JSON.stringify({ graphics, errors }, null, 2));
});
