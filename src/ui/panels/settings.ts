// Pure panel markup. Callers pass already-resolved display data; nothing here touches the DOM or game state.
import { escapeHtml } from '../../presentation/race-settings';
import { graphicsChoices, type GraphicsChoice, type RendererChoice } from '../../presentation/graphics';
import { graphicsTiers, type GraphicsLevel } from '../../presentation/themes';
import { chevronIcon, closeIcon, deviceIcon, soundIcon, switchMark } from './common';

export interface GraphicsView { choice: GraphicsChoice; level: GraphicsLevel; renderer: RendererChoice; activeRenderer: RendererChoice }
export interface SettingsView { soundOn: boolean; graphics: GraphicsView; buildId: string }

const graphicsName = (choice: GraphicsChoice) => choice === 'auto' ? 'Auto' : graphicsTiers[choice].label;
const rendererNote = (renderer: RendererChoice, active: RendererChoice) => renderer === 'webgpu' && active !== 'webgpu' ? 'WebGPU unavailable here · using WebGL 2' : renderer === 'webgpu' ? 'Experimental. Changing the renderer reloads the game.' : 'Changing the renderer reloads the game.';

/** The Sound toggle shared by Settings and the Pause menu. Only the Settings copy carries the #sound-button id. */
export const soundToggle = (soundOn: boolean, id = false) => `<button class="setting-row sound-toggle"${id ? ' id="sound-button"' : ''} data-action="sound" aria-pressed="${soundOn}">${soundIcon}<span class="setting-name">Sound</span>${switchMark}</button>`;

/** Settings sheet: sound, the four-player touch test, graphics quality and renderer. Opened from Home and race setup. */
export function settingsPanel({ soundOn, graphics: { choice, level, renderer, activeRenderer }, buildId }: SettingsView) {
  return `<div class="settings-body">
    <div class="settings-head"><h2 id="settings-title">Settings</h2><button class="icon-button" data-action="close-settings" aria-label="Close settings">${closeIcon}</button></div>
    <div class="settings-grid">
      <div class="settings-column">
        <section class="setting-group" aria-labelledby="settings-audio"><h3 id="settings-audio" class="setting-label">Audio</h3>${soundToggle(soundOn, true)}<p class="setting-note">Engine, effects and menu music.</p></section>
        <section class="setting-group" aria-labelledby="settings-device"><h3 id="settings-device" class="setting-label">Device</h3><button class="setting-row" data-action="diagnostics">${deviceIcon}<span class="setting-name">Touch test</span>${chevronIcon}</button><p class="setting-note">Check that four players can press at once.</p></section>
      </div>
      <div class="settings-column">
        <section class="setting-group" aria-labelledby="settings-graphics"><h3 id="settings-graphics" class="setting-label">Graphics</h3>
          <div class="segmented graphics-options" role="group" aria-label="Graphics quality">${graphicsChoices.map(option => `<button data-action="graphics" data-graphics="${option}" aria-pressed="${choice === option}">${graphicsName(option)}</button>`).join('')}</div>
          <p class="setting-note">${choice === 'auto' ? `Auto · ${graphicsTiers[level].label} on this device. Steps down if the frame rate drops.` : 'Fixed for this device.'}</p></section>
        <section class="setting-group" aria-labelledby="settings-renderer"><h3 id="settings-renderer" class="setting-label">Renderer</h3>
          <div class="segmented renderer-options" role="group" aria-label="Renderer">${(['webgl2', 'webgpu'] as const).map(option => `<button data-action="renderer" data-renderer="${option}" aria-pressed="${renderer === option}">${option === 'webgl2' ? 'WebGL 2' : 'WebGPU (beta)'}</button>`).join('')}</div>
          <p class="setting-note">${rendererNote(renderer, activeRenderer)}</p></section>
      </div>
    </div>
    <p class="build-id">TEST BUILD ${escapeHtml(buildId)}</p>
  </div>`;
}
