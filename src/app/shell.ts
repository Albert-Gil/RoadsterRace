import { assetUrl } from '../presentation/urls';

/** Static application frame. Phase content is rendered into #panel, #race-controls and the canvas. */
export const appShellMarkup = () => `
  <main class="playground" data-phase="welcome" data-players="1">
    <canvas id="race-canvas" aria-label="Coastal racing circuit. Draw your line with a finger or mouse." tabindex="0"></canvas>
    <div id="course-space" aria-hidden="true"></div>
    <div class="scene-vignette" aria-hidden="true"></div>
    <div id="vehicle-labels" aria-hidden="true">${[0, 1, 2, 3].map(i => `<span class="vehicle-label" data-car="${i}" hidden>${i + 1}</span>`).join('')}</div>
    <header class="topbar">
      <a class="brand" href="${assetUrl('')}" aria-label="Roadster Race home"><img class="brand-mark" alt="" width="38" height="38"><span class="brand-name"></span></a>
      <div class="topbar-center"><span class="live-dot"></span><span id="mode-label">SOLO PLAYGROUND</span></div>
      <div class="header-actions"><button class="quiet-button home-link" data-action="home" aria-label="Home"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>Home</span></button><button class="icon-button sound-control sound-on" id="sound-button" aria-label="Turn sound off" aria-pressed="true" title="Sound"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z" fill="currentColor"/><path class="sound-waves" d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path class="sound-slash" d="m4 3 17 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="sound-label">Sound on</span></button><button class="quiet-button touch-test-link" data-action="diagnostics">Touch test <span aria-hidden="true">↗</span></button></div>
    </header>
    <div class="circuit-caption"><span class="caption-line"></span><div>01 / COASTAL LAUNCH<small>One circuit. Endless possibilities.</small></div></div>
    <section class="race-hud" aria-label="Race timing" hidden><div><small>TIME</small><strong id="race-time">00:00.00</strong></div><span class="hud-divider"></span><div><small id="lap-label">LAP</small><strong id="race-lap">1 <i>/ 2</i></strong></div><span class="hud-divider"></span><div><small id="pace-label">PACE</small><strong id="race-speed">0 <i>km/h</i></strong></div></section>
    <section id="panel" class="panel" aria-live="polite"></section>
    <div class="countdown" hidden><span id="countdown-value">3</span><small id="countdown-label">YOUR LINE. YOUR MOMENT.</small></div>
    <div class="tutorial-coach" role="status" aria-live="polite" hidden></div><div class="race-notice" role="status"></div><div id="race-controls"></div>
    <button class="pause-button icon-button" data-action="pause" aria-label="Pause race" hidden>Ⅱ</button>
    <div class="race-progress" hidden><span></span></div>
    <div class="rotate-note"><span aria-hidden="true">↻</span> Turn your device sideways for the best line.</div>
    <section id="diagnostics" class="diagnostics" hidden aria-label="Four-player touch test">
      <div class="diagnostics-heading"><span class="eyebrow">FOUR CORNERS. FOUR PLAYERS.</span><h1>Touch is personal.</h1><p>Press together. Slide away. Each touch stays with its own corner.</p><button class="quiet-button" data-action="exit-diagnostics">← Back to the circuit</button><button class="quiet-button" data-action="reset-diagnostics">Reset counts</button></div>
      ${[0, 1, 2, 3].map(i => `<button class="diagnostic-pad pad-${i}" data-player="${i}" aria-label="Player ${i + 1} touch pad"><span class="player-number">0${i + 1}</span><strong>PLAYER ${i + 1}</strong><span class="pad-status">READY</span><small><b class="pad-count">0</b> presses · <b class="pad-cancel">0</b> cancels</small></button>`).join('')}
      <p class="diagnostics-footnote">Touch ownership check · real iPhone/iPad verification pending</p>
    </section>
    <div class="lower-wordmark" aria-hidden="true">DRAW. RACE. REPEAT.</div>
  </main>`;
