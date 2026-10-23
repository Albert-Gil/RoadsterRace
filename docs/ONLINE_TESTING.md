# GitHub Pages testing

Testing address: https://albert-gil.github.io/RoadsterRace/

Golden Gate: https://albert-gil.github.io/RoadsterRace/?circuit=golden-gate

The repository and testing website are public. There is no login or backend. Multiplayer still means two to four people sharing one device. The noindex/nofollow tag discourages search indexing; it does not restrict access.

## Release workflow

Push to main, open a pull request, or manually run **Verify and deploy testing site** in GitHub Actions. Verification uses Node 24, pnpm 11.25.0 and the frozen lockfile, then type checking, unit tests, production build and production browser smoke. Only successful main builds deploy. Pull requests verify without deployment permissions. Releases are serialized. Only dist/ is included in the Pages artifact; browser evidence is saved in separate Actions artifacts. Production smoke checks run in five parallel groups (one per venue plus session/phone checks) because hosted software WebGL is slow. Every group must pass before deployment; the matrix does not omit checks. Use `PAGES_ONLY=coastal-launch`, `launchsite`, `golden-gate`, `santa-monica` or `sessions` for a focused local smoke, or leave it unset for the full sequential run.

Repository Pages settings must use **GitHub Actions** as the source. No custom domain or secrets are required. The site works independently of the development computer after deployment. Later successful main pushes update the same address. Revert a faulty commit and push the revert to redeploy the previous behavior.

The setup screen shows **TEST BUILD** followed by the first seven characters of the release commit. Include that value, device/browser, circuit, mode and a screenshot when reporting a bug.

## Local and production builds

Normal `pnpm dev` uses `/`. To reproduce Pages in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/RoadsterRace/'
$env:ROADSTER_BUILD_ID = 'pages-local'
pnpm build
$env:WEBGL_BACKEND = 'd3d11' # Windows Intel GPU; omit on Linux CI
pnpm test:pages
```

The smoke starts isolated development/production servers on loopback ports 5177/4177 and closes them afterward. It records screen coordinates from a development page, then sends real browser touch events to the built game. Production has no development inspector or practice shortcut. It checks all courses, production asset paths/fonts, sound activation, Home navigation, saved names/paint, portrait/Graphite, standalone metadata/icons, four-player private drawing/shared start and saved tournament resumption. Linux uses Playwright Chromium (`pnpm exec playwright install --with-deps chromium`); Windows uses installed Chrome, overridable with CHROME_PATH.

Set `PAGES_FULL_RACES=1` to additionally finish the three solo races, four-player race and a complete three-round two-player tournament. Set `PAGES_URL=https://albert-gil.github.io/RoadsterRace/` to repeat the same tests against the hosted build. Screenshots and JSON results are stored locally in ignored `artifacts/pages/`.

Clear VITE_BASE_PATH/ROADSTER_BUILD_ID afterward to return to ordinary root builds. Build-time assets use Vite rewriting; runtime assets, optional GLB/audio and Home use `src/presentation/urls.ts`. External/data/blob references are preserved. Keep future runtime local assets behind this helper.

## iPhone/iPad checklist — pending physical verification

1. Open the testing URL in Safari over cellular with the development computer off.
2. Check landscape and portrait; rotate while drawing and during a paused race.
3. Safari Share → Add to Home Screen → enable Open as Web App if offered → Add. Open the new icon and confirm browser chrome is absent and safe areas work.
4. Enable sound by tapping the speaker, draw a lap, confirm, use thrust, and finish a race.
5. Check app switching/pause/resume, local multiplayer corner ownership, and a tournament.
6. Record exact device, iOS/Safari version, build label and sustained performance.

Browser touch emulation supplements these checks; it does not certify physical Safari. There is no service worker or offline mode, so the link needs internet and cannot keep serving an old cached application shell. Ordinary browser/HTTP caching still applies; reload after a deployment when checking a new build label.

Preferences and tournament progress remain on each browser/device. The hosted origin has separate storage from localhost and home-network URLs. Home Screen storage behavior must be checked on the actual iOS version. No analytics, accounts, leaderboards or remote multiplayer are included.
