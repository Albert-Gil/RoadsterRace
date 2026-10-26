import { Engine } from '@babylonjs/core/Engines/engine';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';

import type { RendererChoice } from './graphics';

const options = { stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' as const };

export function createWebGLEngine(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { ...options, disableWebGL2Support: false, useHighPrecisionMatrix: true }, false);
  if (engine.webGLVersion < 2) { engine.dispose(); throw new Error('This prototype needs WebGL 2. Please try a current Safari or Chrome browser.'); }
  return engine;
}

/**
 * Creates the requested engine. WebGPU loads on demand (its own chunk) and falls back to
 * WebGL 2 when the browser, adapter or device is unavailable. Returns the backend in use.
 */
export async function createEngine(canvas: HTMLCanvasElement, renderer: RendererChoice): Promise<{ engine: AbstractEngine; renderer: RendererChoice }> {
  if (renderer === 'webgpu' && typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      // The engine plus its texture, render-target and multi-render extensions (side-effect modules).
      const [{ WebGPUEngine }] = await Promise.all([import('@babylonjs/core/Engines/webgpuEngine'), import('@babylonjs/core/Engines/WebGPU/Extensions/index')]);
      if (await WebGPUEngine.IsSupportedAsync) {
        const engine = new WebGPUEngine(canvas, { ...options, antialias: true, adaptToDeviceRatio: false });
        await engine.initAsync();
        return { engine, renderer: 'webgpu' };
      }
    } catch (error) { console.warn('WebGPU is unavailable; using WebGL 2.', error); }
  }
  return { engine: createWebGLEngine(canvas), renderer: 'webgl2' };
}

/** Renderer description for tier detection (WebGL renderer string, or WebGPU vendor/architecture). */
export function rendererName(engine: AbstractEngine) {
  // getInfo exists on both engines (WebGPU: adapter vendor/architecture) but is not declared on AbstractEngine.
  const info = (engine as AbstractEngine & { getInfo(): { vendor: string; renderer: string } }).getInfo();
  return engine.isWebGPU ? `${info.vendor} ${info.renderer}` : info.renderer;
}
