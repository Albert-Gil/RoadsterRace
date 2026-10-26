import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { Point } from '../../core/types';
import type { Extent } from './terrain';
import { random } from './noise';

/**
 * A painted ground map over a terrain extent (presentation only): one canvas, drawn in world
 * metres, uploaded once. Neutral grey is "no change"; the terrain material multiplies it with the
 * venue's ground colour and the terrain's vertex tints, so paint only adds marks and tone.
 */
export class GroundPainter {
  readonly texture: DynamicTexture;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number; readonly height: number;
  private readonly sx: number; private readonly sz: number;
  constructor(name: string, scene: Scene, readonly extent: Extent, width = 2048, readonly neutral = 226) {
    this.width = width; this.height = Math.round(width * (extent.maxZ - extent.minZ) / (extent.maxX - extent.minX));
    this.texture = new DynamicTexture(name, { width: this.width, height: this.height }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE; this.texture.anisotropicFilteringLevel = 4;
    this.ctx = this.texture.getContext() as CanvasRenderingContext2D;
    this.sx = this.width / (extent.maxX - extent.minX); this.sz = this.height / (extent.maxZ - extent.minZ);
    this.ctx.fillStyle = `rgb(${neutral},${neutral},${neutral})`; this.ctx.fillRect(0, 0, this.width, this.height);
  }
  /** Canvas pixel of a world point (the canvas's first row is the texture's v = 0, the extent's minZ). */
  px(x: number) { return (x - this.extent.minX) * this.sx; }
  py(z: number) { return (z - this.extent.minZ) * this.sz; }
  /** Metres to pixels. */
  m(metres: number) { return metres * this.sx; }
  trace(points: readonly Point[], close = false) {
    const c = this.ctx; c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(this.px(p.x), this.py(p.z)) : c.moveTo(this.px(p.x), this.py(p.z)));
    if (close) c.closePath();
  }
  stroke(points: readonly Point[], width: number, style: string, alpha = 1) {
    const c = this.ctx; c.save(); c.globalAlpha = alpha; c.strokeStyle = style; c.lineWidth = Math.max(0.6, this.m(width)); c.lineCap = 'round'; c.lineJoin = 'round';
    this.trace(points); c.stroke(); c.restore();
  }
  fill(points: readonly Point[], style: string, alpha = 1) { const c = this.ctx; c.save(); c.globalAlpha = alpha; c.fillStyle = style; this.trace(points, true); c.fill(); c.restore(); }
  /** Soft round blot fading to transparent. */
  blot(x: number, z: number, radius: number, rgb: string, alpha: number, flatten = 1, angle = 0) {
    const c = this.ctx, r = this.m(radius); if (r < 0.5) return;
    c.save(); c.translate(this.px(x), this.py(z)); c.rotate(angle); c.scale(1, flatten);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
  }
  dot(x: number, z: number, radius: number, style: string) { const c = this.ctx; c.fillStyle = style; c.beginPath(); c.arc(this.px(x), this.py(z), Math.max(0.5, this.m(radius)), 0, Math.PI * 2); c.fill(); }
  /** A blurred silhouette (contact shadows, damp patches): drawn off-canvas, its shadow lands in place. */
  soft(points: readonly Point[], blur: number, rgb: string, alpha: number) {
    const c = this.ctx, shift = this.width + this.height + 200;
    c.save(); c.shadowColor = `rgba(${rgb},${alpha})`; c.shadowBlur = this.m(blur); c.shadowOffsetX = shift; c.fillStyle = '#000';
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(this.px(p.x) - shift, this.py(p.z)) : c.moveTo(this.px(p.x) - shift, this.py(p.z))); c.closePath(); c.fill(); c.restore();
  }
  /** Fine grain over everything: a random tile of light and dark specks. */
  grain(seed: number, strength = 0.22, size = 256) {
    const tile = document.createElement('canvas'); tile.width = tile.height = size;
    const t = tile.getContext('2d')!, image = t.createImageData(size, size), rand = random(seed);
    for (let i = 0; i < size * size; i++) {
      const v = rand(), light = v > 0.5, k = Math.abs(v - 0.5) * 2;
      image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = light ? 255 : 40; image.data[i * 4 + 3] = Math.round(255 * k ** 3);
    }
    t.putImageData(image, 0, 0);
    const c = this.ctx, pattern = c.createPattern(tile, 'repeat'); if (!pattern) return;
    c.save(); c.globalAlpha = strength; c.fillStyle = pattern; c.fillRect(0, 0, this.width, this.height); c.restore();
  }
  finish() { this.texture.update(false); return this.texture; }
}
