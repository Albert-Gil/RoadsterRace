import { assetUrl } from '../presentation/urls';
import { homeIcon, settingsIcon } from '../ui/panels/common';

/** Static application frame. Phase content is rendered into #panel, #settings, #race-controls and the canvas. */
export const appShellMarkup = () => `
  <main class="playground" data-phase="welcome" data-players="1">
    <canvas id="race-canvas" aria-label="Racing circuit. Draw your line with a finger or mouse." tabindex="0"></canvas>
    <div id="course-space" aria-hidden="true"></div>
    <picture class="home-hero" aria-hidden="true"><source media="(orientation: portrait)"><img alt="" decoding="async"></picture>
    <div class="scene-vignette" aria-hidden="true"></div>
    <div id="vehicle-labels" aria-hidden="true">${[0, 1, 2, 3].map(i => `<span class="vehicle-label" data-car="${i}" hidden>${i + 1}</span>`).join('')}</div>
    <header class="topbar">
      <a class="brand" href="${assetUrl('')}" aria-label="Roadster Race home"><img class="brand-mark" alt="" width="46" height="36"><span class="brand-name"></span></a>
      <div class="topbar-center"><span id="mode-label">SOLO RACE</span><span class="topbar-title">Race setup</span></div>
      <div class="header-actions"><button class="quiet-button home-link" data-action="home" aria-label="Home">${homeIcon}<span>Home</span></button><button class="icon-button settings-button" data-action="settings" aria-label="Settings" aria-haspopup="dialog">${settingsIcon}</button></div>
    </header>
    <section class="race-hud" aria-label="Race timing" hidden><div><small>TIME</small><strong id="race-time">00:00.00</strong></div><span class="hud-divider"></span><div><small id="lap-label">LAP</small><strong id="race-lap">1 <i>/ 2</i></strong></div><span class="hud-divider"></span><div><small id="pace-label">PACE</small><strong id="race-speed">0 <i>km/h</i></strong></div></section>
    <section id="panel" class="panel" aria-live="polite"></section>
    <div class="countdown" hidden><span id="countdown-value">3</span><small id="countdown-label">YOUR LINE. YOUR MOMENT.</small></div>
    <div class="tutorial-coach" role="status" aria-live="polite" hidden></div><div class="race-notice" role="status"></div><div id="race-controls"></div>
    <button class="pause-button icon-button" data-action="pause" aria-label="Pause race" hidden><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5v14M15 5v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    <div class="race-progress" hidden><span></span></div>
    <dialog id="settings" class="settings-sheet" aria-labelledby="settings-title"></dialog>
    <section id="diagnostics" class="diagnostics" hidden aria-label="Four-player touch test">
      <div class="diagnostics-heading"><span class="eyebrow">FOUR CORNERS. FOUR PLAYERS.</span><h1>Touch is personal.</h1><p>Press together. Slide away. Each touch stays with its own corner.</p><button class="secondary-button" data-action="exit-diagnostics">← Back</button><button class="quiet-button" data-action="reset-diagnostics">Reset counts</button></div>
      ${[0, 1, 2, 3].map(i => `<button class="diagnostic-pad pad-${i}" data-player="${i}" aria-label="Player ${i + 1} touch pad"><span class="player-number">0${i + 1}</span><strong>PLAYER ${i + 1}</strong><span class="pad-status">READY</span><small><b class="pad-count">0</b> presses · <b class="pad-cancel">0</b> cancels</small></button>`).join('')}
      <p class="diagnostics-footnote">Touch ownership check · real iPhone/iPad verification pending</p>
    </section>
  </main>`;
