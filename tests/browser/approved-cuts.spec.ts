import { expect, test } from '@playwright/test';

// User-approved choices from the per-venue shortcut review maps.
for (const [circuit, label, from, skip, blocked] of [
  ['coastal-launch', 1, 42, 72, true], ['launchsite', 1, 222, 114, true],
  ['launchsite', 2, 174, 78, false], ['golden-gate', 1, 54, 102, true],
  ['golden-gate', 2, 120, 84, true], ['golden-gate', 3, 174, 72, false],
  ['la-nights', 1, 48, 78, false],
] as const) test(`${circuit} review ${label} previews ${blocked ? 'a physical hazard' : 'an open cut'}`, async ({ page }) => {
  await page.goto(`/?circuit=${circuit}`);
  await page.getByRole('button', { name: 'Time Trial', exact: true }).click();
  await page.getByRole('button', { name: 'Draw racing line', exact: true }).click();
  await page.waitForFunction(() => (window as any).__roadster.getGraphics().renderReady);
  const points = await page.evaluate(({ from, skip }) => {
    const g = (window as any).__roadster, t = g.getTrack(), end = from + skip;
    const sample = (s: number) => {
      let i = t.distances.findIndex((d: number) => d >= s); i = Math.max(1, i);
      const a = t.centerline[i - 1], b = t.centerline[i], u = (s - t.distances[i - 1]) / (t.distances[i] - t.distances[i - 1]);
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
    };
    const a = sample(from), b = sample(end);
    return [...t.centerline.filter((_: unknown, i: number) => t.distances[i] < from),
      ...Array.from({ length: 31 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / 30, z: a.z + (b.z - a.z) * i / 30 })),
      ...t.centerline.filter((_: unknown, i: number) => t.distances[i] > end)].map(p => g.project(p));
  }, { from, skip });
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Race this line', exact: true })).toBeVisible();
  const hazards = await page.evaluate(() => (window as any).__roadster.getRoute().hazards ?? []);
  if (blocked) expect(hazards.some((h: { kind: string }) => h.kind === 'barrier')).toBe(true);
  else expect(hazards).toHaveLength(0);
});
