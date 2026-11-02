import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { sceneryWork } from '../../src/presentation/landscape/scenery-worker';
import { terrainArrays } from '../../src/presentation/landscape/terrain-fields';
import { StaticShadowCache } from '../../src/presentation/static-shadows';
import { snowyTahoeTrack } from '../../src/core/tracks/snowy-tahoe';
import { tahoeLandscapeData, tahoeTransferables } from '../../src/presentation/tahoe-landscape-data';

/** A stand-in module worker that answers every request with `reply`. */
function fakeWorker(reply: (request: unknown) => unknown) {
  const listeners: Record<string, ((event: { data?: unknown; message?: string; preventDefault?(): void }) => void)[]> = {};
  const worker = { terminated: false, addEventListener: (type: string, f: (event: { data?: unknown }) => void) => { (listeners[type] ??= []).push(f); },
    postMessage(request: unknown) { queueMicrotask(() => { const answer = reply(request); if (answer instanceof Error) listeners.error?.forEach(f => f({ message: answer.message, preventDefault() {} })); else listeners.message?.forEach(f => f({ data: answer })); }); },
    terminate() { worker.terminated = true; } };
  return worker;
}

describe('scenery workers', () => {
  it('use the worker answer, and fall back to generating here when workers fail or are missing', async () => {
    const g = globalThis as { Worker?: unknown }, previous = g.Worker; g.Worker = function () {};
    try {
      const answered = fakeWorker(() => ({ data: 'from worker' })), work = sceneryWork(() => answered as unknown as Worker, { trackVersion: 1 }, () => 'inline');
      expect(await work.result).toBe('from worker'); expect(answered.terminated).toBe(true);
      expect(await sceneryWork(() => fakeWorker(() => ({ error: 'track v2 requested' })) as unknown as Worker, {}, () => 'inline').result).toBe('inline');
      expect(await sceneryWork(() => fakeWorker(() => new Error('script missing')) as unknown as Worker, {}, () => 'inline').result).toBe('inline');
      expect(await sceneryWork(() => { throw new Error('blocked'); }, {}, () => 'inline').result).toBe('inline');
    } finally { g.Worker = previous; }
    expect(await sceneryWork(() => { throw new Error('unused'); }, {}, () => 'no workers here').result).toBe('no workers here');
  });
  it('produces transferable typed arrays, identical on every run', () => {
    const a = tahoeLandscapeData(snowyTahoeTrack), b = tahoeLandscapeData(snowyTahoeTrack);
    expect(a.forest.positions).toEqual(b.forest.positions); expect(a.hills.colors).toEqual(b.hills.colors);
    const buffers = tahoeTransferables(a);
    expect(buffers).toHaveLength(10); expect(buffers.every(buffer => buffer instanceof ArrayBuffer && buffer.byteLength > 0)).toBe(true);
    expect(a.hills.indices.length).toBe((a.hills.cols - 1) * (a.hills.rows - 1) * 6 + 6 * (2 * (a.hills.cols + a.hills.rows) - 4));
  });
  it('builds a terrain grid with a closing skirt', () => {
    const t = terrainArrays({ extent: { minX: 0, maxX: 8, minZ: 0, maxZ: 4 }, cell: 2, height: (x, z) => x * 0.1 + z, color: () => [1, 0.5, 0.25] });
    expect([t.cols, t.rows]).toEqual([5, 3]); expect(t.positions.length / 3).toBe(15 + 12);
    expect(Math.max(...t.indices)).toBe(26); expect(t.heights[7]).toBeCloseTo(4 * 0.1 + 2, 5);
  });
});

describe('static shadow cache', () => {
  it('draws every caster each frame where it cannot copy shadow maps (no WebGL 2)', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
      const light = new DirectionalLight('sun', new Vector3(0.5, -1, 0.4), scene), generator = new ShadowGenerator(256, light), cache = new StaticShadowCache(scene, generator);
      const rock = MeshBuilder.CreateBox('rock', {}, scene), car = MeshBuilder.CreateBox('car', {}, scene);
      cache.add(rock, false); cache.add(car, true);
      const names = () => generator.getShadowMap()!.renderList!.map(mesh => mesh.name);
      expect(cache.enabled).toBe(false); expect(names()).toEqual(['car', 'rock']);
      cache.setEnabled(true); expect(names()).toEqual(['car', 'rock']);
    } finally { scene.dispose(); engine.dispose(); }
  });
});
