import { graphicsGovernor, graphicsLevels, graphicsTiers, type GraphicsLevel } from './themes';

/** The player's graphics choice. Auto detects a tier and steps down if frames run slow. */
export type GraphicsChoice = 'auto' | GraphicsLevel;
export const graphicsChoices: readonly GraphicsChoice[] = ['auto', ...graphicsLevels];
export const GRAPHICS_KEY = 'roadster-race.graphics.v1';

/** Rendering backend. WebGL 2 is the default; WebGPU is an opt-in experiment with WebGL fallback. */
export type RendererChoice = 'webgl2' | 'webgpu';
export const isRendererChoice = (value: unknown): value is RendererChoice => value === 'webgl2' || value === 'webgpu';
export const isGraphicsChoice = (value: unknown): value is GraphicsChoice => typeof value === 'string' && (graphicsChoices as readonly string[]).includes(value);

/** Device preferences, kept apart from race preferences: the tier choice and the renderer. */
export interface GraphicsPreference { choice: GraphicsChoice; renderer: RendererChoice }
function stored(): Partial<GraphicsPreference> {
  try { const saved = JSON.parse(localStorage.getItem(GRAPHICS_KEY) ?? 'null'); return saved && typeof saved === 'object' ? saved : {}; } catch { return {}; }
}
/** `?graphics=` and `?renderer=` override the saved values for testing. */
export function loadGraphicsPreference(search = typeof location === 'undefined' ? '' : location.search): GraphicsPreference {
  const params = new URLSearchParams(search), saved = stored(), choice = params.get('graphics'), renderer = params.get('renderer');
  return {
    choice: isGraphicsChoice(choice) ? choice : isGraphicsChoice(saved.choice) ? saved.choice : 'auto',
    renderer: isRendererChoice(renderer) ? renderer : isRendererChoice(saved.renderer) ? saved.renderer : 'webgl2',
  };
}
export const loadGraphicsChoice = (search?: string) => loadGraphicsPreference(search).choice;
export function saveGraphicsPreference(preference: GraphicsPreference) {
  try { localStorage.setItem(GRAPHICS_KEY, JSON.stringify(preference)); } catch { /* The choice still applies for this session. */ }
}

export interface DeviceSignals {
  /** Unmasked WebGL renderer string when available (e.g. "Apple GPU", "ANGLE (NVIDIA ...)"). */
  renderer: string;
  coarsePointer: boolean;
  cores: number;
  /** navigator.deviceMemory in GB (Chromium only). */
  memory?: number;
  /** Physical pixels of the larger screen side. */
  screenPixels: number;
  /** User agent mentions a phone/tablet OS. */
  mobileOs: boolean;
}

/**
 * Initial tier from coarse device signals. Deliberately conservative: the governor only ever
 * steps down, so a device that starts too high costs a few seconds, one that starts too low never recovers.
 */
export function detectGraphicsLevel(s: DeviceSignals): GraphicsLevel {
  const r = s.renderer.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(r)) return 'low';
  if ((s.memory !== undefined && s.memory <= 2) || s.cores <= 2) return 'low';
  if (/apple (gpu|m\d)/.test(r) || r === 'apple gpu') return s.coarsePointer || s.mobileOs ? 'high' : 'ultra';
  if (s.coarsePointer || s.mobileOs) {
    // Recent Android flagships report Adreno 7xx/8xx, Mali-G7xx/G9xx, Immortalis or Xclipse.
    if (/adreno \(tm\) ([7-9]\d\d)|adreno.* [7-9]\d\d|immortalis|mali-g(7[1-9]|[89]\d|\d{3})|xclipse/.test(r)) return 'high';
    if (/adreno|mali|powervr|xclipse/.test(r)) return 'medium';
    return 'medium';
  }
  if (/nvidia|geforce|rtx|quadro|radeon|amd|arc\(tm\)|intel\(r\) arc/.test(r)) return 'ultra';
  if (/intel/.test(r)) return s.screenPixels > 2600 ? 'medium' : 'high';
  return 'high';
}

export function readDeviceSignals(renderer: string): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const dpr = window.devicePixelRatio || 1;
  return {
    renderer, coarsePointer: matchMedia('(pointer: coarse)').matches, cores: nav.hardwareConcurrency || 4, memory: nav.deviceMemory,
    screenPixels: Math.max(screen.width, screen.height) * dpr,
    // iPadOS reports a desktop Mac user agent; touch points distinguish it.
    mobileOs: /android|iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1),
  };
}

/**
 * Session-wide automatic tier: detected once, then only lowered by the frame governor.
 * Automated browsers (tests, CI smoke checks) start on Low, which renders the same scene draw
 * calls as Medium on the fastest path for software WebGL; tests pick other tiers explicitly.
 */
let automaticLevel: GraphicsLevel | null = null;
export function automaticGraphicsLevel(renderer: string) {
  return automaticLevel ??= typeof navigator !== 'undefined' && navigator.webdriver ? 'low' : detectGraphicsLevel(readDeviceSignals(renderer));
}
export function lowerAutomaticLevel() { if (automaticLevel) automaticLevel = lowerLevel(automaticLevel); return automaticLevel; }
export const resolveGraphics = (choice: GraphicsChoice, renderer: string): GraphicsLevel => choice === 'auto' ? automaticGraphicsLevel(renderer) : choice;

/** Render scale for a tier: density capped by the tier's pixel ratio and its megapixel budget. */
export function renderPixelRatio(level: GraphicsLevel, cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  const tier = graphicsTiers[level], area = Math.max(1, cssWidth * cssHeight);
  return Math.max(0.5, Math.min(devicePixelRatio || 1, tier.maxPixelRatio, Math.sqrt(tier.pixelBudget * 1e6 / area)));
}

export const lowerLevel = (level: GraphicsLevel): GraphicsLevel => graphicsLevels[Math.max(0, graphicsLevels.indexOf(level) - 1)];

/**
 * Watches real frame intervals. After a warm-up (shader compilation), if a whole window
 * averages slower than the budget it requests one step down, then waits a fresh window.
 * Long gaps (tab switches, pauses) are ignored. It never steps back up within a session.
 */
export class FrameGovernor {
  private elapsed = 0;
  private window: number[] = [];
  private windowTime = 0;
  constructor(private settings = graphicsGovernor) {}
  reset() { this.elapsed = 0; this.window = []; this.windowTime = 0; }
  /** Returns true when the tier should drop one level. */
  sample(frameMs: number): boolean {
    if (!(frameMs > 0) || frameMs > this.settings.ignoreFrameMs) return false;
    this.elapsed += frameMs / 1000;
    if (this.elapsed < this.settings.warmupSeconds) return false;
    this.window.push(frameMs); this.windowTime += frameMs / 1000;
    if (this.windowTime < this.settings.windowSeconds) return false;
    const mean = this.window.reduce((sum, value) => sum + value, 0) / this.window.length;
    this.window = []; this.windowTime = 0;
    if (mean <= this.settings.frameBudgetMs) return false;
    this.elapsed = 0; return true;
  }
}
