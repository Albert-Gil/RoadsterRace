// Regenerates src/content/ramp-clearing.json: the slowest takeoff speed at which each automatic
// ramp, and each manual Hop gap on a drawn shortcut, still lands, measured with the real simulation (src/core/ramp-clearing.ts). The drawing
// preview warns below these speeds. Rerun after changing vehicle rules or a listed track:
//   node tools/ramp-clearing.mjs
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
registerHooks({
  resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (specifier.startsWith('.')) return next(`${specifier}.ts`, context); throw error; } },
  load(url, context, next) { if (!url.endsWith('.ts')) return next(url, context); return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform', sourceUrl: url }) }; },
});
const { circuits } = await import('../src/content/circuits.ts');
const { RULES } = await import('../src/core/simulation.ts');
const { automaticJumps, hopGaps, minimumClearingSpeed, minimumShortcutPace } = await import('../src/core/ramp-clearing.ts');
const tracks = (process.argv.slice(2).length ? process.argv.slice(2) : ['san-diego-fleet']).map(id => circuits.find(c => c.id === id)?.track ?? (() => { throw new Error(`Unknown circuit ${id}`); })());
const table = { rules: RULES.version, tracks: {} };
for (const track of tracks) {
  table.tracks[track.id] = { version: track.version, crossings: {} };
  for (const jump of [...automaticJumps(track), ...hopGaps(track)]) {
    table.tracks[track.id].crossings[jump.id] = jump.activation === 'hop' ? minimumShortcutPace(track, jump) : minimumClearingSpeed(track, jump);
    console.log(track.id, jump.id, table.tracks[track.id].crossings[jump.id], 'm/s');
  }
}
writeFileSync(new URL('../src/content/ramp-clearing.json', import.meta.url), JSON.stringify(table, null, 2) + '\n');
