import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
// Run the production TypeScript core directly; the renderer is intentionally absent.
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) { if (specifier.startsWith('.')) return next(`${specifier}.ts`, context); throw error; }
  },
  load(url, context, next) {
    if (!url.endsWith('.ts')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform', sourceUrl: url }) };
  },
});
const { compileRoute, createPracticeSamples } = await import('../src/core/route.ts');
const { RaceSimulation } = await import('../src/core/simulation.ts');
const { coastalTrack } = await import('../src/core/track.ts');
const report = [];
for (const drawingSeconds of [2, 4, 7, 14, 24]) {
  const compiled = compileRoute(createPracticeSamples(coastalTrack, drawingSeconds), coastalTrack);
  if (!compiled.ok) throw new Error(compiled.message);
  const simulation = new RaceSimulation(compiled.route, coastalTrack), trace = [];
  let maxLineError = 0, sandSeconds = 0, driftSeconds = 0;
  for (let tick = 0; tick < 18000 && !simulation.state.finished; tick++) {
    simulation.step(); const s = simulation.state;
    maxLineError = Math.max(maxLineError, s.lineError); sandSeconds += s.sandAmount / 60; driftSeconds += Number(s.drifting) / 60;
    if (tick % 6 === 0) trace.push({ time: s.time, ...s.position, speed: s.speed, lineError: s.lineError, heading: s.heading, slipAngle: s.slipAngle, sandAmount: s.sandAmount, progress: s.distance });
  }
  report.push({ drawingSeconds, finished: simulation.state.finished, time: simulation.state.finishTime, maxLineError, sandSeconds, driftSeconds, driftCount: simulation.state.driftCount, progress: simulation.state.distance, checkpoint: simulation.state.checkpoint });
  if (drawingSeconds === 2) writeFileSync('artifacts/drift-telemetry.json', JSON.stringify({ track: coastalTrack.centerline, route: compiled.route.points, trace }, null, 2));
}
console.log(JSON.stringify(report, null, 2));
writeFileSync('artifacts/physics-report.json', JSON.stringify(report, null, 2));
