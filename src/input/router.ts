import type { Ability } from '../core/types';
import { PointerOwnership } from './ownership';

/** Desktop bindings by player: thrust A/L/Q/P, hop Z/K/W/O. Solo uses Space and H. */
export const THRUST_KEYS = ['KeyA', 'KeyL', 'KeyQ', 'KeyP'] as const;
export const HOP_KEYS = ['KeyZ', 'KeyK', 'KeyW', 'KeyO'] as const;
export const CORNERS = ['bottom left', 'bottom right', 'top left', 'top right'] as const;

export interface FocusedPad { disabled: boolean; racer: number; ability: Ability }
/** Pure key mapping. A focused ability button takes Space/Enter for assistive and keyboard use. */
export function keyCommand(code: string, humans: number, focused?: FocusedPad): { player: number; ability: Ability } {
  let player = humans === 1 && code === 'Space' ? 0 : humans > 1 ? (THRUST_KEYS as readonly string[]).indexOf(code) : -1;
  let ability: Ability = 'thrust';
  const hopPlayer = humans === 1 && code === 'KeyH' ? 0 : humans > 1 ? (HOP_KEYS as readonly string[]).indexOf(code) : -1;
  if (hopPlayer >= 0) { player = hopPlayer; ability = 'hop'; }
  if ((code === 'Space' || code === 'Enter') && focused) { player = focused.disabled ? -1 : focused.racer; ability = focused.ability; }
  return { player, ability };
}

export interface InputRouterHandlers {
  humans(): number;
  /** Pads accept presses (ready check and racing). */
  padsActive(): boolean;
  /** Mapped keys are consumed (ready, countdown and racing). */
  keysActive(): boolean;
  activate(player: number, ability: Ability): void;
  pause(): void;
  /** Optional extra keys, after ability and Escape handling (development shortcuts). */
  extraKey?(event: KeyboardEvent): void;
}

/** Routes race pads and keyboard to ability commands. One press is one command; holding never repeats. */
export class InputRouter {
  readonly touches = new PointerOwnership();
  private heldKeys = new Set<string>();
  constructor(private controls: HTMLElement, private handlers: InputRouterHandlers) {
    controls.addEventListener('pointerdown', e => {
      const pad = (e.target as HTMLElement).closest<HTMLButtonElement>('.ability-control');
      if (!pad || pad.disabled || !handlers.padsActive() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const ability = pad.dataset.ability as Ability;
      e.preventDefault(); if (this.touches.down(e.pointerId, Number(pad.dataset.racer), ability)) { pad.setPointerCapture(e.pointerId); handlers.activate(Number(pad.dataset.racer), ability); }
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) controls.addEventListener(name, e => { this.touches.up((e as PointerEvent).pointerId, name !== 'pointerup'); });
    // Assistive technologies may activate a button without pointer events.
    controls.addEventListener('click', e => { const pad = (e.target as HTMLElement).closest<HTMLButtonElement>('.ability-control'); if (pad && !pad.disabled && e.detail === 0) handlers.activate(Number(pad.dataset.racer), pad.dataset.ability as Ability); });
    window.addEventListener('keydown', e => this.keydown(e));
    window.addEventListener('keyup', e => { this.heldKeys.delete(e.code); });
  }
  private keydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) {
      if (e.code === 'Enter') (e.target as HTMLElement).blur();
      return;
    }
    const active = document.activeElement?.matches('.ability-control') ? document.activeElement as HTMLButtonElement : undefined;
    const focused = active ? { disabled: active.disabled, racer: Number(active.dataset.racer), ability: active.dataset.ability as Ability } : undefined;
    const { player, ability } = keyCommand(e.code, this.handlers.humans(), focused);
    if (player >= 0 && player < this.handlers.humans() && this.handlers.keysActive()) { e.preventDefault(); if (!this.heldKeys.has(e.code) && !e.repeat) this.handlers.activate(player, ability); this.heldKeys.add(e.code); }
    if (e.code === 'Escape') this.handlers.pause();
    this.handlers.extraKey?.(e);
  }
  /** Release every held touch and key (interruptions, phase changes). */
  clear() { this.touches.clear(); this.heldKeys.clear(); }
}
