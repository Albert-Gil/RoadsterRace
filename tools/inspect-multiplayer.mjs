import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Race with friends' }).click();
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.screenshot({ path: 'artifacts/multiplayer-setup-phone.png' });
  await page.getByRole('button', { name: 'Plan your lines' }).click();
  for (let i = 0; i < 4; i++) {
    if (i) await page.getByRole('button', { name: `I'm Player ${i + 1}` }).click();
    await page.evaluate(() => window.__roadster.usePracticeLine());
    await page.getByRole('button', { name: 'Lock in my line' }).click();
  }
  const points = await page.locator('.racer-pad').evaluateAll(pads => pads.map((pad, i) => { const r = pad.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: i + 1 }; }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 10 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await page.waitForFunction(() => window.__roadster.getState().phase === 'racing');
  console.log('Held ready through start', await page.evaluate(() => window.__roadster.getState().players.map(p => p.thrustCount)));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p, i) => ({ ...points[3 - i], id: p.id })) });
  await page.waitForTimeout(5500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(200);
  console.log('Pad styles', await page.locator('.racer-pad').evaluateAll(pads => pads.map(pad => ({ charge: pad.style.getPropertyValue('--charge'), background: getComputedStyle(pad).background, innerBackground: getComputedStyle(pad.firstElementChild).background, transform: getComputedStyle(pad).transform, active: pad.matches(':active') }))));
  await page.screenshot({ path: 'artifacts/multiplayer-coastal-phone.png' });
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/multiplayer-graphite-phone.png' });
  await page.waitForFunction(() => window.__roadster.getState().phase === 'results', undefined, { timeout: 65000 });
  console.log('Phone results', await page.locator('#panel').evaluate(panel => ({ box: panel.getBoundingClientRect().toJSON(), scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight, actionsVisible: [...panel.querySelectorAll('button')].every(button => { const r = button.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }) })));
  await page.screenshot({ path: 'artifacts/multiplayer-four-results-phone.png' });
} finally { await browser.close(); }
