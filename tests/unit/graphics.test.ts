import { describe, expect, it } from 'vitest';
import { FrameGovernor, detectGraphicsLevel, isGraphicsChoice, loadGraphicsChoice, loadGraphicsPreference, lowerLevel, renderPixelRatio, type DeviceSignals } from '../../src/presentation/graphics';
import { detailMap, neutralDetailMap } from '../../src/presentation/surface-maps';
import { graphicsGovernor, graphicsLevels, graphicsTiers, surfaceFinishes, venueSkies, type SurfaceKind } from '../../src/presentation/themes';

const device = (overrides: Partial<DeviceSignals>): DeviceSignals => ({ renderer: '', coarsePointer: false, cores: 8, screenPixels: 1920, mobileOs: false, ...overrides });

describe('graphics tier detection', () => {
  it('keeps software renderers and very small devices on Low', () => {
    expect(detectGraphicsLevel(device({ renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' }))).toBe('low');
    expect(detectGraphicsLevel(device({ renderer: 'llvmpipe (LLVM 15.0.7, 256 bits)' }))).toBe('low');
    expect(detectGraphicsLevel(device({ renderer: 'Apple GPU', memory: 2 }))).toBe('low');
  });
  it('starts Apple phones and tablets on High and Apple desktops on Ultra', () => {
    expect(detectGraphicsLevel(device({ renderer: 'Apple GPU', coarsePointer: true, mobileOs: true }))).toBe('high');
    expect(detectGraphicsLevel(device({ renderer: 'Apple GPU' }))).toBe('ultra');
  });
  it('separates discrete desktop GPUs from integrated ones', () => {
    expect(detectGraphicsLevel(device({ renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)' }))).toBe('ultra');
    expect(detectGraphicsLevel(device({ renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' }))).toBe('high');
    expect(detectGraphicsLevel(device({ renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', screenPixels: 3840 }))).toBe('medium');
  });
  it('treats unknown mobile GPUs conservatively', () => {
    expect(detectGraphicsLevel(device({ renderer: 'Mali-G52', coarsePointer: true, mobileOs: true }))).toBe('medium');
    expect(detectGraphicsLevel(device({ renderer: 'Adreno (TM) 740', coarsePointer: true, mobileOs: true }))).toBe('high');
  });
});

describe('graphics choices and render scale', () => {
  it('accepts only known choices and lets the URL override storage', () => {
    expect(isGraphicsChoice('auto')).toBe(true); expect(isGraphicsChoice('ultra')).toBe(true); expect(isGraphicsChoice('extreme')).toBe(false);
    expect(loadGraphicsChoice('?graphics=low')).toBe('low');
    expect(loadGraphicsChoice('?graphics=bogus')).toBe('auto');
    expect(loadGraphicsPreference('').renderer).toBe('webgl2');
    expect(loadGraphicsPreference('?renderer=webgpu&graphics=high')).toEqual({ choice: 'high', renderer: 'webgpu' });
    expect(loadGraphicsPreference('?renderer=vulkan').renderer).toBe('webgl2');
  });
  it('lowers one level at a time and stops at Low', () => {
    expect(lowerLevel('ultra')).toBe('high'); expect(lowerLevel('medium')).toBe('low'); expect(lowerLevel('low')).toBe('low');
  });
  it('caps density by tier and by the megapixel budget', () => {
    expect(renderPixelRatio('low', 440, 956, 3)).toBe(1);
    expect(renderPixelRatio('high', 440, 956, 3)).toBe(2);
    // A 13-inch tablet renders below its native density on High.
    const tablet = renderPixelRatio('high', 1032, 1376, 2);
    expect(tablet).toBeLessThan(2); expect(1032 * 1376 * tablet ** 2).toBeLessThanOrEqual(graphicsTiers.high.pixelBudget * 1e6 + 1);
    expect(renderPixelRatio('ultra', 1920, 1080, 1)).toBe(1);
  });
  it('orders tiers by cost', () => {
    const budgets = graphicsLevels.map(level => graphicsTiers[level].pixelBudget), shadows = graphicsLevels.map(level => graphicsTiers[level].shadowMapSize);
    expect([...budgets].sort((a, b) => a - b)).toEqual(budgets); expect([...shadows].sort((a, b) => a - b)).toEqual(shadows);
    expect(graphicsTiers.low.skyLighting).toBe(false); expect(graphicsTiers.medium.postProcessing).toBe(false);
  });
});

describe('frame governor', () => {
  const run = (governor: FrameGovernor, ms: number, seconds: number) => { let drops = 0; for (let t = 0; t < seconds * 1000; t += ms) if (governor.sample(ms)) drops++; return drops; };
  it('never steps down while frames meet the budget', () => {
    expect(run(new FrameGovernor(), 16.7, 30)).toBe(0);
  });
  it('steps down after the warm-up when a whole window runs slow, then waits again', () => {
    const governor = new FrameGovernor(), seconds = graphicsGovernor.warmupSeconds + graphicsGovernor.windowSeconds + 0.5;
    expect(run(governor, 40, seconds)).toBe(1);
    expect(run(governor, 40, graphicsGovernor.warmupSeconds)).toBe(0);
  });
  it('ignores long pauses such as tab switches', () => {
    expect(run(new FrameGovernor(), 1000, 60)).toBe(0);
  });
});

describe('procedural surface detail', () => {
  const kinds: SurfaceKind[] = ['asphalt', 'sand', 'dirt', 'concrete', 'grass', 'rock', 'water'];
  it('produces seamless tiles with encoded normals and tone', () => {
    for (const kind of kinds) {
      const size = 64, pixels = detailMap(kind, size);
      expect(pixels).toHaveLength(size * size * 4);
      // Opposite edges are neighbours when the tile repeats: their heights stay close.
      let seam = 0; for (let y = 0; y < size; y++) seam = Math.max(seam, Math.abs(pixels[(y * size) * 4 + 2] - pixels[(y * size + size - 1) * 4 + 2]));
      expect(seam).toBeLessThan(80);
      // Normals lean in every direction around the flat midpoint, and tone varies.
      const red = Array.from({ length: size * size }, (_, i) => pixels[i * 4]), tone = Array.from({ length: size * size }, (_, i) => pixels[i * 4 + 3]);
      expect(Math.min(...red)).toBeLessThan(128); expect(Math.max(...red)).toBeGreaterThan(128);
      expect(Math.max(...tone) - Math.min(...tone)).toBeGreaterThan(40);
    }
  });
  it('is deterministic and cached', () => {
    expect(detailMap('sand', 32)).toBe(detailMap('sand', 32));
    expect(Array.from(neutralDetailMap(2))).toEqual(new Array(16).fill(128));
  });
  it('gives every venue a sky file and every finish a known kind', () => {
    for (const sky of Object.values(venueSkies)) expect(sky.file).toMatch(/^[a-z]+$/);
    for (const finish of Object.values(surfaceFinishes)) expect(kinds).toContain(finish.kind);
  });
});
