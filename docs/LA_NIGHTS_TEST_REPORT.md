# LA nights verification — 24 October 2026

This is a local, uncommitted addition. No push or deployment was performed.

## Gameplay and compatibility

- 375 unit cases passed across the full suite and targeted reruns. The initial full run passed 370/373 cases; three six-lap, four-car cases exceeded the previous 30-second wall-clock timeout while browser tests were running. Reruns passed, and that correctness test now allows 90 seconds on busy hosts without changing its simulated steps or assertions. Two additional combined-branch/failure cases also passed.
- Main route, channel jump and manual-Hop alley complete six laps individually. A five-second drawn pace completes six laps using both shortcuts together, with no recovery. A slow channel approach fails physically and recovers without crediting the crossing.
- Channel landings pass at 20/30/42 m/s; manual-Hop obstacle clearance passes at 20/25/30 m/s. Missed Hop impacts the real divider. Partial/reverse branches and unauthorized water crossings are rejected.
- All three CPU difficulties finish six laps with deterministic plans, increasing aggregate pace and normal vehicle rules. Shared-car contact/thrust checks pass.
- All 15 legacy fixtures (the original five venues, with one/two/four cars) match HEAD exactly. Physics v13, compiler v11 and the first five track versions remain unchanged.
- Old five-round schedules remain intact; new Full Tours include LA nights as round six.

## Browser and presentation

- Nine integration checks passed: real touch drawing at 844×390, 390×844 and 1024×768; actual channel-jump and Hop races; complete six-round Solo and Multiplayer tournaments with resume; one-car and four-car rendering budgets.
- After final artwork batching and vehicle-lighting changes, all five targeted browser checks passed again: audio across all six venues, both actual shortcut races, phone captures and rendering budgets.
- Maximum sampled draw calls with shadows and live ability effects: **84 Time Trial / 126 Solo Race with four cars**, within 90/150 targets. These counts are not a physical-device frame-rate measurement.
- All 20 short recordings decode; existing music streams and LA nights selects the city ambience. No required audio requests failed.
- `pnpm typecheck`, `pnpm docs:rules`, `pnpm test:legacy`, the production build with `/RoadsterRace/` base path, and `git diff --check` passed.
- Local Pages smoke passed with full races enabled: real touch drawing, completed main-route and channel-jump races, sound, persisted driver preferences, base-aware Home navigation and no development inspector. No page errors or failed asset requests were recorded. This tested the production files locally; it did not publish them.

## Evidence

- Phone and desktop captures: `artifacts/venue-detail/after/la-nights-{844,390,1440}.png`.
- Jump and Hop captures: `artifacts/la-nights/channel-flight.png`, `backlot-hop.png`, `jump-plan.png`.
- Actual browser gameplay recording: `artifacts/la-nights/gameplay.mp4` (silent video captured from the browser, not a rendered promotional animation).
- Logs: `artifacts/la-unit.log`, `la-recheck.log`, `la-final-contact.log`, `la-browser.log`, `la-final-visual.log`, `la-legacy.log`, `la-build.log`.
- Production smoke: `artifacts/la-pages.log` and `artifacts/la-nights/production-report.json`.

Physical iPhone Safari performance, sound and drawing comfort remain pending hardware testing. Automated mobile viewports do not replace that check.
