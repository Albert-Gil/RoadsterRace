import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule } from 'node:vm';

// Run with node --experimental-vm-modules. Baseline files are read from Git;
// neither checkout nor working files are switched or modified.
const baseline = '78e0888', records = [];
async function runtime(ref) {
  const cache = new Map();
  async function module(path) {
    if (!cache.has(path)) cache.set(path, (async () => {
      const text = ref ? execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' }) : await readFile(path, 'utf8');
      return new SourceTextModule(stripTypeScriptTypes(text, { mode: 'transform' }), { identifier: path });
    })());
    return cache.get(path);
  }
  const linker = (specifier, parent) => module(posix.normalize(posix.join(posix.dirname(parent.identifier), `${specifier}.ts`)));
  const entries = [];
  for (const path of ['src/content/circuits.ts', 'src/core/route.ts', 'src/core/local-race.ts']) {
    const m = await module(path); if (m.status === 'unlinked') await m.link(linker); if (m.status !== 'evaluated') await m.evaluate(); entries.push(m.namespace);
  }
  return { circuits: entries[0].circuits, ...entries[1], ...entries[2] };
}
const old = await runtime(baseline), current = await runtime();
for (const circuit of old.circuits) for (const count of [2, 4]) {
  const run = runtime => {
    const track = runtime.circuits.find(c => c.id === circuit.id).track;
    const compiled = runtime.compileRoute(runtime.createPracticeSamples(track), track); assert.equal(compiled.ok, true);
    const race = new runtime.LocalRace(Array(count).fill(compiled.route), track, 2);
    for (let tick = 0; tick < 18000 && !race.finished; tick++) {
      for (let p = 0; p < count; p++) if ((tick + p * 63) % 300 === 0) race.pressThrust(p);
      race.step();
    }
    assert.equal(race.finished, true); return race.racers.map(r => ({ finish: r.state.finishTime, laps: r.state.lapTimes, drifts: r.state.driftCount, collisions: r.state.collisionCount, recoveries: r.state.recoveryCount }));
  };
  const before = run(old), after = run(current);
  for (let p = 0; p < count; p++) {
    assert.ok(Math.abs(before[p].finish - after[p].finish) < 1e-8);
    before[p].laps.forEach((time, i) => assert.ok(Math.abs(time - after[p].laps[i]) < 1e-8));
    for (const key of ['drifts', 'collisions', 'recoveries']) assert.equal(before[p][key], after[p][key]);
  }
  records.push({ circuit: circuit.id, count, before, after });
}
await mkdir('artifacts/santa-monica', { recursive: true });
await writeFile('artifacts/santa-monica/legacy-multiplayer.json', JSON.stringify({ baseline, passed: true, records }, null, 2));
console.log(`All ${records.length} legacy multiplayer fixtures match ${baseline}.`);
