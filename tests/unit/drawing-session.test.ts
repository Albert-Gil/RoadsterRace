import { describe, expect, it } from 'vitest';
import { findCircuit } from '../../src/content/circuits';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { DrawingSession } from '../../src/drawing/session';

const track = findCircuit('coastal-launch').track, lap = createPracticeSamples(track, 7);
/** Feeds a lap as pointer events: down at the first sample, moves, up at the last (times in ms). */
function stroke(session: DrawingSession, samples = lap, pointer = 1, offset = 0) {
  expect(session.begin(pointer, samples[0], samples[0].time + offset)).toBe(true);
  for (const p of samples.slice(1, -1)) session.add(p, p.time + offset);
  return session.end(pointer, samples.at(-1)!, samples.at(-1)!.time + offset);
}

describe('drawing session (whole lap)', () => {
  it('records the stroke exactly and compiles it to the same route as the samples', () => {
    const session = new DrawingSession(track, 1, 0), end = stroke(session);
    expect(end?.kind).toBe('compile');
    if (end?.kind !== 'compile') return;
    expect(end.request.samples.map(p => [p.x, p.z, p.time])).toEqual(lap.map(p => [p.x, p.z, p.time]));
    const result = compileRoute(end.request.samples, track), reference = compileRoute(lap, track);
    const outcome = session.accept(end.request, result, end.progress);
    expect(outcome.kind).toBe('preview');
    if (outcome.kind === 'preview' && reference.ok) expect(outcome.route).toEqual(reference.route);
  });
  it('refuses a start outside the start box', () => {
    const session = new DrawingSession(track, 1, 0);
    expect(session.begin(1, { x: lap[40].x, z: lap[40].z }, 0)).toBe(false);
    expect(session.samples).toEqual([]);
  });
  it('drops a compiler reply for an older stroke, another turn or another venue', () => {
    const session = new DrawingSession(track, 1, 0), first = stroke(session);
    if (first?.kind !== 'compile') throw new Error('no compile');
    const late = compileRoute(first.request.samples, track);
    stroke(session, lap, 2, 5000); // redraw before the first reply arrives
    expect(session.accept(first.request, late, first.progress).kind).toBe('stale');
    const next = new DrawingSession(track, 1, 1);
    expect(next.accept(first.request, late, first.progress).kind).toBe('stale');
    const golden = findCircuit('golden-gate').track, elsewhere = new DrawingSession(golden, 1, 0);
    expect(elsewhere.accept({ ...first.request, session: elsewhere, turn: 0, revision: elsewhere.revision }, late, first.progress).kind).toBe('stale');
  });
  it('clears an interrupted fresh lap', () => {
    const session = new DrawingSession(track, 1, 0);
    session.begin(1, lap[0], 0); session.add(lap[1], 10);
    expect(session.cancel()).toBe('cleared');
    expect(session.samples).toEqual([]);
    expect(session.cancel()).toBe('none');
  });
});

describe('drawing session (phone sectors)', () => {
  const half = lap.slice(0, Math.floor(lap.length / 2));
  it('continues a lifted stroke in a sector, joining the clock without the pause', () => {
    const session = new DrawingSession(track, 3, 0);
    expect(session.sectorMode).toBe(true);
    expect(session.chooseWhole()).toBe(true); expect(session.sectorMode).toBe(false);
    const phone = new DrawingSession(track, 3, 0);
    phone.overview = false;
    const end = stroke(phone, half);
    expect(end?.kind).toBe('sector');
    const before = phone.samples.length, lastTime = phone.last!.time;
    const candidates = phone.continueCandidates();
    expect(candidates[0]).toBe(before - 1);
    // Ten seconds later the next touch continues at the glowing end.
    const rest = lap.slice(half.length);
    phone.continueFrom(candidates[0], 2, 20_000, rest[0]);
    expect(phone.strokeStarts.at(-1)).toBe(before);
    expect(phone.last!.time - lastTime).toBeLessThan(1000);
    for (const p of rest.slice(1, -1)) phone.add(p, 20_000 + p.time);
    const finish = phone.end(2, rest.at(-1)!, 20_000 + rest.at(-1)!.time);
    expect(finish?.kind).toBe('compile');
  });
  it('restores the cut-back line when a continuing touch is interrupted, and undoes touches', () => {
    const phone = new DrawingSession(track, 3, 0);
    phone.overview = false;
    stroke(phone, half);
    const kept = phone.samples.length;
    phone.continueFrom(phone.continueCandidates()[3], 2, 30_000, lap[half.length]);
    expect(phone.cancel()).toBe('restored');
    expect(phone.samples.length).toBe(kept);
    phone.continueFrom(phone.continueCandidates()[0], 3, 40_000, lap[half.length]);
    phone.add(lap[half.length + 1], 40_100);
    phone.end(3, lap[half.length + 2], 40_200);
    expect(phone.undo()).toBe('continue');
    expect(phone.samples.length).toBe(kept);
    expect(phone.undo()).toBe('restart');
    expect(phone.restartSector(0)).toBe(true);
    expect(phone.samples).toEqual([]);
  });
});
