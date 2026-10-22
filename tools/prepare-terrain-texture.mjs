import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
// Encoding only: preserve the complete generated material, without painting/retouching it.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  for (const role of ['coastal-embankment-v1', 'asphalt-v1']) {
  await page.goto(`http://127.0.0.1:5173/artifacts/generated/${role}.png`);
  const encoded = await page.evaluate(async role => {
    const image = new Image(); image.src = `/artifacts/generated/${role}.png`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = Math.min(768, image.width); canvas.height = Math.round(image.height * canvas.width / image.width); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: canvas.toDataURL('image/webp', 0.82).split(',')[1] };
  }, role);
  const buffer = Buffer.from(encoded.data, 'base64'); await writeFile(`public/assets/textures/${role}.webp`, buffer);
  console.log(JSON.stringify({ role, width: encoded.width, height: encoded.height, bytes: buffer.length }));
  }
} finally { await browser.close(); }
