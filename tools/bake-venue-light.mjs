import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { browserOptions } from './browser-options.mjs';

// Offline sky visibility for stationary scenery. Run against a local dev server.
// Each channel stores the surrounding skyline height in one 120-degree sector.
// Keeping height (not a ground-only shadow) lets roofs, bridges and lower roads
// share an atlas without painting a building's ground shadow onto its roof.
function bake() {
  const world = window.__roadster.getWorld(), path = world.track.centerline;
  const xs = path.map(p => p.x), zs = path.map(p => p.z), pad = 52;
  const left = Math.floor(Math.min(...xs) - pad), bottom = Math.floor(Math.min(...zs) - pad);
  const width = Math.ceil(Math.max(...xs) + pad - left), depth = Math.ceil(Math.max(...zs) + pad - bottom);
  const size = 384, grid = new Float32Array(size * size).fill(-12);
  for (const mesh of world.scene.meshes) {
    if (!mesh.isEnabled() || !mesh.isVisible || mesh.layerMask === 0 || mesh.parent || !mesh.material ||
        mesh.material.disableLighting || mesh.material.alpha < .98 || mesh.metadata?.dynamicScenery || mesh.getClassName() === 'LinesMesh' ||
        mesh.name === 'alpine-loading-ground' || mesh.name === 'valley-loading-ground') continue;
    const positions = mesh.getVerticesData('position'), indices = mesh.getIndices();
    if (!positions || !indices) continue;
    const m = mesh.computeWorldMatrix(true).m, points = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2];
      points[i] = (x*m[0] + y*m[4] + z*m[8] + m[12] - left) * size/width - .5;
      points[i+1] = x*m[1] + y*m[5] + z*m[9] + m[13];
      points[i+2] = (x*m[2] + y*m[6] + z*m[10] + m[14] - bottom) * size/depth - .5;
    }
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i]*3, b = indices[i+1]*3, c = indices[i+2]*3;
      const x = points[a], z = points[a+2], dx = points[b]-x, dz = points[b+2]-z, ex = points[c]-x, ez = points[c+2]-z;
      const det = dx*ez - dz*ex;
      if (Math.abs(det) < 1e-6) continue;
      const minX = Math.max(0, Math.ceil(Math.min(x,x+dx,x+ex))), maxX = Math.min(size-1, Math.floor(Math.max(x,x+dx,x+ex)));
      const minZ = Math.max(0, Math.ceil(Math.min(z,z+dz,z+ez))), maxZ = Math.min(size-1, Math.floor(Math.max(z,z+dz,z+ez)));
      for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
        const u = ((ix-x)*ez-(iz-z)*ex)/det, v = (dx*(iz-z)-dz*(ix-x))/det;
        if (u < 0 || v < 0 || u+v > 1) continue;
        const y = points[a+1] + u*(points[b+1]-points[a+1]) + v*(points[c+1]-points[a+1]);
        grid[iz*size+ix] = Math.max(grid[iz*size+ix], y);
      }
    }
  }
  let peak = 0;
  for (const h of grid) peak = Math.max(peak, h);
  const floor = -12, range = Math.ceil(peak-floor);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(size,size);
  const offsets = Array.from({length:3}, (_,sector) => {
    const taps = [];
    for (const radius of [2.5, 5, 9]) for (const fan of [-.75,-.25,.25,.75]) {
      const a = sector*2*Math.PI/3 + fan;
      taps.push([Math.round(Math.cos(a)*radius*size/width), Math.round(Math.sin(a)*radius*size/depth)]);
    }
    return taps;
  });
  for (let z=0; z<size; z++) for (let x=0; x<size; x++) {
    const pixel = (z*size+x)*4;
    offsets.forEach((taps,sector) => {
      let sum = 0;
      for (const [dx,dz] of taps) sum += grid[Math.max(0,Math.min(size-1,z+dz))*size + Math.max(0,Math.min(size-1,x+dx))];
      image.data[pixel+sector] = Math.round(255*(sum/taps.length-floor)/range);
    });
    image.data[pixel+3]=255;
  }
  ctx.putImageData(image,0,0);
  return { frame: {left,bottom,width,depth,floor,range}, png:canvas.toDataURL('image/png').split(',')[1] };
}

const base = process.env.ART_URL || 'http://127.0.0.1:5173/';
const output = 'public/assets/venue-light', manifest = {};
await mkdir(output, {recursive:true});
const browser = await chromium.launch(browserOptions());
try {
  const page = await browser.newPage({viewport:{width:844,height:390}, reducedMotion:'reduce'});
  page.setDefaultTimeout(120000);
  await page.goto(base);
  const ids = await page.evaluate(async () => (await import('/src/content/circuits.ts')).circuits.map(c => c.id));
  for (const id of ids) {
    await page.goto(base+'?circuit='+id+'&graphics=low');
    await page.getByRole('button',{name:'Time Trial',exact:true}).click();
    await page.getByRole('button',{name:'Draw racing line',exact:true}).click();
    await page.waitForFunction(() => window.__roadster?.getGraphics().renderReady);
    await page.evaluate(() => window.__roadster.getWorld().sceneryRuntime.lateShadowCasters?.then(()=>true));
    const { frame, png } = await page.evaluate(bake);
    manifest[id] = frame;
    const bytes = execFileSync(process.env.FFMPEG_PATH || 'ffmpeg',
      ['-v','error','-i','pipe:0','-frames:v','1','-c:v','libwebp','-lossless','1','-compression_level','6','-f','webp','pipe:1'],
      {input:Buffer.from(png,'base64'), maxBuffer:4*1024*1024});
    await writeFile(output+'/'+id+'.webp',bytes);
    console.log(id, bytes.length+' bytes');
  }
  await writeFile('src/presentation/venue-light-frames.json',JSON.stringify(manifest,null,2)+'\n');
} finally { await browser.close(); }
